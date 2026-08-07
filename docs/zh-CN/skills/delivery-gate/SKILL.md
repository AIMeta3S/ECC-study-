---
name: delivery-gate
description: Stop hook，在质量检查通过前阻止 Claude 结束会话。检测合理化模式（基于文本表面的启发式规则）、陈旧的学习日志（基于文件系统 mtime）以及磁盘空间不足。通过机械地强制执行学习记录习惯来补充 self-audit。
version: 1.1.1
metadata:
  origin: ECC
---

# Delivery Gate — Claude Code 的机械式质量门禁

一个 **Stop hook**，在 Claude 结束会话前检查三件事，仅使用**确定性检查**——文件修改时间戳、磁盘使用量以及对 transcript 文本的 regex 模式匹配。不使用 AI 推理。

这与推理型门禁（如 `self-audit`）不同：delivery-gate 检查机器可验证的事实；self-audit 从四个推理维度检查输出质量。二者共同构成 defense in depth：
- **delivery-gate**："今天是否更新过学习库？磁盘空间是否安全？"
- **self-audit**："文件内容是否正确、完整且诚实？"

这与 CI pipeline 门禁的模式相同——自动化的确定性检查，验证机器可读的事实，而非信任自报告的状态。

## 它检查什么

| 检查项 | 机制 | 命中时行为 |
|-------|-----------|--------|
| 合理化模式 | 对 transcript 尾部做 regex 匹配 | **仅警告**（从不阻止） |
| 陈旧的学习库 | 对 5 个可配置路径检查 mtime | 部分陈旧时警告；当 >=3 个陈旧 OR growth-log 陈旧且为复杂任务时**阻止** |
| 磁盘空间 < 50GB | `shutil.disk_usage` | 警告 |
| 磁盘空间 < 15GB | `shutil.disk_usage` | **阻止**（exit 2） |

合理化检测会对诸如"暂时跳过测试"和"预先存在的 bug"等模式发出警告——这些是思考可能被中途打断的表面信号。它本身从不阻止结束，因为 regex 启发式规则可能产生误报。阻止条件为：磁盘空间危急、`>=3 个学习库陈旧`，或 `growth-log` 特定陈旧（三者均要求任务为复杂任务，即 >=3 次编辑）。

## 为什么需要

Claude Code 的内置检查覆盖代码质量（build → type → lint → test）。但还存在另一种失败模式：agent 产出了可工作的代码，却忽视了**会话卫生**——学习未被记录、走合理化的捷径、磁盘悄悄耗尽。

经过许多次"交付即遗忘"的会话后，人类并未成长。此 hook 强制建立习惯：复杂任务 → 必须触及学习库。

## 安装

```bash
cp quality-gate.py ~/.claude/scripts/
```

添加到 `~/.claude/settings.json`：
```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "python3 ~/.claude/scripts/quality-gate.py",
        "timeout": 5000
      }]
    }]
  }
}
```

## 学习库

在你项目的 memory 目录中创建这些文件。此 hook 会检查其中至少一个是否在今日被更新：

```
memory/
├── growth-log/          # 每日学习条目（目录）
├── decisions/log.md     # 决策日志
├── output-index.md      # 会话产出的索引
├── ratings-tracker.md   # skill 评分随时间变化记录
└── tooling_capabilities.md  # 已知工具清单
```

自定义 `LIBS` 字典以匹配你自己的文件结构。

## 配置

编辑 `quality-gate.py`：

| 变量 | 默认值 | 用途 |
|----------|---------|---------|
| `RATIONALIZE` | 4 个模式 | 用于合理化检测的 regex 模式 |
| `LIBS` | 5 个库 | 检查今日更新的文件/目录 |
| `COMPLEX_THRESHOLD` | 3 | 判定为复杂任务的 Edit/Write 调用次数 |
| `DISK_WARN_GB` | 50 | 低于此值发出警告 |
| `DISK_CRIT_GB` | 15 | 低于此值阻止结束 |

## 示例

**简单会话——允许结束：**
```
edit_count=1 (< 3, not complex) → exit 0
```

**复杂任务，已记录学习——允许结束：**
```
edit_count=5 (complex) → checks LIBS → growth-log updated today → exit 0
```

**复杂任务，未记录学习——被阻止：**
```
edit_count=4 (complex) → checks LIBS → all 5 stale → exit 2
stderr: "Blocked: complex task completed but no learning captured today."
```

**磁盘空间不足——被阻止：**
```
disk_free=12GB < 15GB critical → exit 2
stderr: "Blocked: disk space at 12GB (threshold: 15GB)."
```

## 局限性

此 hook 强制的是**触及学习库的习惯**，而非所记录内容的**质量**。如果 `output-index.md` 被更新但跳过了 `growth-log`，hook 仍会通过（5 个库中触及了 1 个）。这是有意为之：机械式门禁只检查机器可验证的事实。要进行内容质量验证，请与 `self-audit` 搭配使用。

## 兼容性

- Python 3.8+（使用 `from __future__ import annotations`）
- 跨平台：Windows、macOS、Linux
- 除 stdlib 外零依赖

## 质量

此代码经过了 4 轮自动化 code review（CodeRabbit + Greptile），发现并修复了 9 个真实 bug。

## 另请参阅

- `self-audit` —— 推理质量门禁（完整性/一致性/有据性/诚实性）
- `verification-loop` —— 代码质量检查（build/type/lint/test）
- `gateguard` —— PreToolUse 安全门禁
