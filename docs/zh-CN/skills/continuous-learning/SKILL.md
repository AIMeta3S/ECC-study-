---
name: continuous-learning
description: "[DEPRECATED - 使用 continuous-learning-v2] 遗留的 v1 stop-hook skill 提取器。v2 是严格的超集,提供基于 instinct、项目级、hook 可靠的学习。请勿调用 v1;将 continuous learning、session learning 和 pattern 提取请求路由至 continuous-learning-v2。"
metadata:
  origin: ECC
---

# Continuous Learning Skill - DEPRECATED

> **已于 2026-04-28 弃用。**请改用 `continuous-learning-v2`。v2 是严格的超集:stop-hook 观察变为 PreToolUse/PostToolUse 观察,完整 skill 变为带置信度评分的原子 instinct,仅全局存储变为项目级外加全局提升。
>
> 本文件保留用于存档参考以及与现有安装的向后兼容。

---

## 原始 v1 文档(存档)

在结束时自动评估 Claude Code session,以提取可重用的 pattern,这些 pattern 可保存为已学习的 skill。

## 何时激活

- 设置从 Claude Code session 自动提取 pattern
- 为 session 评估配置 Stop hook
- 在 `~/.claude/skills/learned/` 中审查或管理已学习的 skill
- 调整提取 threshold 或 pattern 类别
- 比较 v1(本版本)与 v2(基于 instinct)方法

## 状态

本 v1 skill 仍受支持,但对于新安装,`continuous-learning-v2` 是首选方案。当您明确需要更简单的 Stop-hook 提取流程,或需要与旧版已学习 skill 工作流兼容时,请保留 v1。

## 工作原理

本 skill 作为 **Stop hook** 在每个 session 结束时运行:

1. **Session 评估**:检查 session 是否有足够的消息(默认:10 条以上)
2. **Pattern 检测**:从 session 中识别可提取的 pattern
3. **Skill 提取**:将有用的 pattern 保存到 `~/.claude/skills/learned/`

## 配置

编辑 `config.json` 以自定义:

```json
{
  "min_session_length": 10,
  "extraction_threshold": "medium",
  "auto_approve": false,
  "learned_skills_path": "~/.claude/skills/learned/",
  "patterns_to_detect": [
    "error_resolution",
    "user_corrections",
    "workarounds",
    "debugging_techniques",
    "project_specific"
  ],
  "ignore_patterns": [
    "simple_typos",
    "one_time_fixes",
    "external_api_issues"
  ]
}
```

## Pattern 类型

| Pattern | 说明 |
|---------|------|
| `error_resolution` | 特定错误如何被解决 |
| `user_corrections` | 来自用户纠正的 pattern |
| `workarounds` | 针对 framework/library 怪癖的解决方案 |
| `debugging_techniques` | 有效的调试方法 |
| `project_specific` | 项目特定约定 |

## Hook 配置

添加到您的 `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "~/.claude/skills/continuous-learning/evaluate-session.sh"
      }]
    }]
  }
}
```

## 为什么使用 Stop Hook

- **轻量级**:在 session 结束时运行一次
- **非阻塞**:不会给每条消息增加延迟
- **完整上下文**:可访问完整的 session transcript

## 相关资源

- [The Longform Guide](https://x.com/affaanmustafa/status/2014040193557471352) - 关于 continuous learning 的章节
- `/learn` 命令 - 在 session 中途手动提取 pattern

---

## 对比说明(调研:2025 年 1 月)

### 对比 Homunculus

Homunculus v2 采用了更复杂的方法:

| 特性 | 我们的方法 | Homunculus v2 |
|------|-----------|---------------|
| 观察 | Stop hook(session 结束时) | PreToolUse/PostToolUse hooks(100% 可靠) |
| 分析 | 主 context | 后台 agent(Haiku) |
| 粒度 | 完整 skill | 原子"instinct" |
| 置信度 | 无 | 0.3-0.9 加权 |
| 演进 | 直接成为 skill | Instinct → 聚类 → skill/command/agent |
| 共享 | 无 | 导出/导入 instinct |

**来自 homunculus 的关键洞察:**
> "v1 依赖 skill 来观察。skill 是概率性的——它们大约在 50-80% 的时间触发。v2 使用 hook 进行观察(100% 可靠),并以 instinct 作为学习行为的原子单元。"

### 潜在的 v2 增强

1. **基于 instinct 的学习** - 更小的、原子的行为,带置信度评分
2. **后台观察者** - Haiku agent 并行分析
3. **置信度衰减** - instinct 在被反驳时降低置信度
4. **领域标记** - code-style、testing、git、debugging 等
5. **演进路径** - 将相关 instinct 聚类为 skill/command

完整规范请参见:`docs/continuous-learning-v2-spec.md`。
