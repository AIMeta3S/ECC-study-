---
name: strategic-compact
description: 建议在逻辑间隔处手动执行 context compaction，以便在整个任务阶段保留上下文，而不是依赖任意的 auto-compaction。
metadata:
  origin: ECC
---

# Strategic Compact Skill

建议在工作流的战略节点手动执行 `/compact`，而不是依赖任意的 auto-compaction。

## 何时激活

- 运行接近上下文限制（200K+ tokens）的长会话时
- 处理多阶段任务（研究 → 规划 → 实现 → 测试）时
- 在同一会话中切换不相关任务时
- 完成一个重要里程碑并开始新工作时
- 当响应变慢或变得不够连贯时（上下文压力）

## 为什么需要战略式 Compaction

Auto-compaction 在任意时间点触发：
- 常发生在任务中途，丢失重要上下文
- 不感知逻辑任务边界
- 可能打断复杂的多步操作

在逻辑边界处进行战略式 compaction：
- **探索之后、执行之前** —— compact 掉研究上下文，保留实现计划
- **完成一个里程碑之后** —— 为下一阶段重新开始
- **重大上下文切换之前** —— 清除探索上下文以进入不同任务

## 工作原理

`suggest-compact.js` 脚本在 PreToolUse（Edit/Write）时运行，结合两个信号：

1. **上下文大小（主要信号）** —— 从会话 transcript（hook payload 中的 `transcript_path`）读取最新的 `usage` 记录，将 `input_tokens + cache_read_input_tokens + cache_creation_input_tokens` 求和（即该轮次的真实上下文大小）。在按窗口缩放的阈值处建议 `/compact` —— 200k 窗口下为 160k tokens，1M 窗口下为 250k（通过 `[1m]` 模型标记检测，或在观察到的 tokens 已超过 200k 时推断）—— 并在上下文每增长 60k tokens 后再次提醒
2. **工具调用次数（次要信号）** —— 统计会话中的工具调用次数；在可配置的阈值（默认：50 次）处建议，之后每 25 次再建议一次

仅凭工具调用次数只是窗口压力的弱代理信号：少数几次大文件读取或 MCP 响应就可能用极少的调用次数填满窗口，而大量小调用可能在窗口几乎为空时就超过 50 次。上下文大小信号才在真正关键时触发。

## Hook 配置

**作为插件安装？** 无需任何设置。插件的 `hooks/hooks.json` 已经注册了 `suggest-compact.js`（钩子 ID `pre:edit-write:suggest-compact`，在 `standard` 和 `strict` 钩子配置档中生效）。不要把下面的代码块复制到 `~/.claude/settings.json` — 插件安装中不存在 `~/.claude/scripts/`，并且重复注册插件钩子会导致双重执行。

**如果是手动安装**（`./install.sh`），添加到你的 `~/.claude/settings.json`：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit",
        "hooks": [{ "type": "command", "command": "node ~/.claude/scripts/hooks/suggest-compact.js" }]
      },
      {
        "matcher": "Write",
        "hooks": [{ "type": "command", "command": "node ~/.claude/scripts/hooks/suggest-compact.js" }]
      }
    ]
  }
}
```

## 配置项

环境变量：
- `COMPACT_THRESHOLD` —— 首次建议前的工具调用次数（默认：50）
- `COMPACT_CONTEXT_THRESHOLD` —— 触发上下文大小建议前的上下文 tokens 数（默认：200k 窗口下 160000，1M 窗口下 250000；`0` 禁用上下文信号）
- `COMPACT_CONTEXT_INTERVAL` —— 建议重复触发前新增的上下文 tokens 数（默认：60000）
- `COMPACT_STATE_TTL_DAYS` —— 临时目录中每会话状态文件在多少天后被视为过期并清理（默认：14）

## Compaction 决策指南

使用下表决定何时 compact：

| 阶段转换 | 是否 Compact？ | 原因 |
|-----------------|----------|-----|
| 研究 → 规划 | 是 | 研究上下文体积庞大；计划才是蒸馏后的产出 |
| 规划 → 实现 | 是 | 计划已在 TodoWrite 或文件中；释放上下文给代码 |
| 实现 → 测试 | 视情况 | 如果测试引用了近期代码则保留；如果切换焦点则 compact |
| 调试 → 下一个功能 | 是 | 调试痕迹会污染无关工作的上下文 |
| 实现中途 | 否 | 丢失变量名、文件路径和部分状态的代价很高 |
| 失败尝试之后 | 是 | 在尝试新方法前清除死胡同式的推理 |

## Compaction 后保留什么

理解哪些内容会持久化，有助于你放心地 compact：

| 保留 | 丢失 |
|----------|------|
| CLAUDE.md 指令 | 中间推理与分析 |
| TodoWrite 任务列表 | 你先前读取过的文件内容 |
| Memory 文件（`~/.claude/memory/`） | 多步对话上下文 |
| Git 状态（commits、branches） | 工具调用历史与计数 |
| 磁盘上的文件 | 口头表达的细微用户偏好 |

## 最佳实践

1. **计划完成后 compact** —— 一旦计划在 TodoWrite 中定稿，compact 以重新开始
2. **调试完成后 compact** —— 在继续之前清除错误排查上下文
3. **不要在实现中途 compact** —— 为相关变更保留上下文
4. **阅读建议** —— hook 告诉你*何时*，由你决定*是否*
5. **compact 之前先写入** —— 在 compact 之前把重要上下文保存到文件或 memory
6. **使用带摘要的 `/compact`** —— 添加自定义消息：`/compact Focus on implementing auth middleware next`

## Token 优化模式

### 触发词表懒加载
不在会话启动时加载完整 skill 内容，而是使用一张将关键词映射到 skill 路径的触发词表。Skill 仅在被触发时加载，可将基线上下文减少 50%+：

| 触发词 | Skill | 加载时机 |
|---------|-------|-----------|
| "test", "tdd", "coverage" | tdd-workflow | 用户提到测试时 |
| "security", "auth", "xss" | security-review | 安全相关工作时 |
| "deploy", "ci/cd" | deployment-patterns | 部署上下文时 |

### 上下文构成感知
监控是什么在消耗你的上下文窗口：
- **CLAUDE.md 文件** —— 始终加载，保持精简
- **已加载的 skill** —— 每个 skill 增加 1-5K tokens
- **对话历史** —— 随每次交互增长
- **工具结果** —— 文件读取、搜索结果会增加体积

### 重复指令检测
重复上下文的常见来源：
- 同样的规则同时出现在 `~/.claude/rules/` 和项目 `.claude/rules/` 中
- 重复 CLAUDE.md 指令的 skill
- 多个 skill 覆盖重叠的领域

### 上下文优化工具
- `token-optimizer` MCP —— 通过内容去重实现 95%+ 的 token 缩减
- `context-mode` —— 上下文虚拟化（演示过从 315KB 降到 5.4KB）

## 相关

- [The Longform Guide](https://x.com/affaanmustafa/status/2014040193557471352) —— Token 优化章节
- Memory 持久化 hook —— 用于在 compaction 后保留的状态
- `continuous-learning` skill —— 在会话结束前提取模式
