---
name: context-budget
description: 审计 Claude Code 在 agents、skills、MCP servers 和 rules 上的 context window 消耗。识别臃肿、冗余组件，并生成按优先级排序的 token 节省建议。
metadata:
  origin: ECC
---

# Context Budget

分析 Claude Code 会话中每个已加载组件的 token 开销，并给出可执行的优化建议以回收 context 空间。

## 何时使用

- 会话性能迟缓或输出质量下降
- 近期添加了大量 skills、agents 或 MCP servers
- 想了解实际可用的 context 余量
- 计划添加更多组件，需要确认是否还有空间
- 运行 `/context-budget` 命令（本 skill 为其提供支持）

## 工作原理

### 阶段 1：盘点

扫描所有组件目录并估算 token 消耗：

**Agents**（`agents/*.md`）
- 统计每个文件的行数和 token 数（words × 1.3）
- 提取 `description` frontmatter 的长度
- 标记：文件 >200 行（过重），description >30 words（frontmatter 臃肿）

**Skills**（`skills/*/SKILL.md`）
- 统计每个 SKILL.md 的 token 数
- 标记：文件 >400 行
- 检查 `.agents/skills/` 中是否有重复副本——跳过相同副本以避免重复计数

**Rules**（`rules/**/*.md`）
- 统计每个文件的 token 数
- 标记：文件 >100 行
- 检测同一语言模块下 rules 文件之间的内容重叠

**MCP Servers**（`.mcp.json` 或活动的 MCP 配置）
- 统计已配置的 server 数量和总 tool 数
- 估算每个 tool 的 schema 开销约为 500 tokens
- 标记：tool 数 >20 的 server，以及封装简单 CLI 命令（`gh`、`git`、`npm`、`supabase`、`vercel`）的 server

**CLAUDE.md**（项目级 + 用户级）
- 统计 CLAUDE.md 链中每个文件的 token 数
- 标记：合计 >300 行

### 阶段 2：分类

将每个组件归入相应类别：

| 类别 | 标准 | 操作 |
|--------|----------|--------|
| **始终需要** | 在 CLAUDE.md 中被引用、为某个活跃 command 提供支持，或匹配当前项目类型 | 保留 |
| **有时需要** | 特定领域（如语言 patterns），且未在 CLAUDE.md 中引用 | 考虑按需激活 |
| **很少需要** | 无 command 引用、内容重叠，或无明显的项目匹配 | 移除或 lazy-load |

### 阶段 3：检测问题

识别以下问题模式：

- **agent description 臃肿** —— frontmatter 中超过 30 words 的 description 会被加载进每次 Task tool 调用
- **过重的 agents** —— 超过 200 行的文件会在每次 spawn 时撑大 Task tool 的 context
- **冗余组件** —— skill 重复 agent 逻辑，rules 重复 CLAUDE.md 内容
- **MCP 过度订阅** —— server 数 >10，或 server 封装了本可免费使用的 CLI tool
- **CLAUDE.md 臃肿** —— 冗长的解释、过时的章节、本应作为 rules 的指令

### 阶段 4：报告

生成 context budget 报告：

```
Context Budget Report
═══════════════════════════════════════

Total estimated overhead: ~XX,XXX tokens
Context model: Claude Sonnet (200K window)
Effective available context: ~XXX,XXX tokens (XX%)

Component Breakdown:
┌─────────────────┬────────┬───────────┐
│ Component       │ Count  │ Tokens    │
├─────────────────┼────────┼───────────┤
│ Agents          │ N      │ ~X,XXX    │
│ Skills          │ N      │ ~X,XXX    │
│ Rules           │ N      │ ~X,XXX    │
│ MCP tools       │ N      │ ~XX,XXX   │
│ CLAUDE.md       │ N      │ ~X,XXX    │
└─────────────────┴────────┴───────────┘

WARNING: Issues Found (N):
[ranked by token savings]

Top 3 Optimizations:
1. [action] → save ~X,XXX tokens
2. [action] → save ~X,XXX tokens
3. [action] → save ~X,XXX tokens

Potential savings: ~XX,XXX tokens (XX% of current overhead)
```

在 verbose 模式下，额外输出每个文件的 token 计数、最重文件的逐行明细、重叠组件之间具体的重复行，以及带每个 tool schema 大小估算的 MCP tool 列表。

## 示例

**基础审计**
```
User: /context-budget
Skill: Scans setup → 16 agents (12,400 tokens), 28 skills (6,200), 87 MCP tools (43,500), 2 CLAUDE.md (1,200)
       Flags: 3 heavy agents, 14 MCP servers (3 CLI-replaceable)
       Top saving: remove 3 MCP servers → -27,500 tokens (47% overhead reduction)
```

**Verbose 模式**
```
User: /context-budget --verbose
Skill: Full report + per-file breakdown showing planner.md (213 lines, 1,840 tokens),
       MCP tool list with per-tool sizes, duplicated rule lines side by side
```

**扩展前检查**
```
User: I want to add 5 more MCP servers, do I have room?
Skill: Current overhead 33% → adding 5 servers (~50 tools) would add ~25,000 tokens → pushes to 45% overhead
       Recommendation: remove 2 CLI-replaceable servers first to stay under 40%
```

## 最佳实践

- **Token 估算**：对散文类内容使用 `words × 1.3`，对代码密集型文件使用 `chars / 4`
- **MCP 是最大的杠杆**：每个 tool schema 约耗费 500 tokens；一个含 30 个 tool 的 server 比你所有 skills 加起来还耗费更多
- **Agent description 始终被加载**：即使 agent 从未被调用，其 description 字段也会出现在每次 Task tool 的 context 中
- **Verbose 模式用于调试**：当需要精确定位驱动开销的具体文件时使用，不用于常规审计
- **变更后审计**：在添加任何 agent、skill 或 MCP server 后运行，以尽早发现蔓延
