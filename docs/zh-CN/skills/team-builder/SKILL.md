---
name: team-builder
description: 交互式 agent 选择器，用于组合和调度并行团队
metadata:
  origin: community
---

# Team Builder

按需浏览和组合 agent 团队的交互式菜单。兼容扁平布局（flat）与按领域分子目录（domain-subdirectory）的 agent 集合。

## 何时使用

- 你有多个 agent persona（markdown 文件），想为某项任务挑选要使用哪些
- 你想从不同领域（domain）组建一支临时团队（例如 Security + SEO + Architecture）
- 你想在决定之前先浏览有哪些可用 agent

## 前置条件

Agent 文件必须是包含 persona prompt（身份、规则、工作流、交付物）的 markdown 文件。第一个 `# Heading` 用作 agent 名称，第一段用作描述。

同时支持扁平布局和子目录布局：

**子目录布局** —— 领域从文件夹名推断：

```
agents/
├── engineering/
│   ├── security-engineer.md
│   └── software-architect.md
├── marketing/
│   └── seo-specialist.md
└── sales/
    └── discovery-coach.md
```

**扁平布局** —— 领域从共享的文件名前缀推断。当一个前缀被 2 个及以上文件共有时，该前缀即视为一个领域。具有唯一前缀的文件归入 "General"。注意：该算法在第一个 `-` 处切分，因此多词领域（例如 `product-management`）应改用子目录布局：

```
agents/
├── engineering-security-engineer.md
├── engineering-software-architect.md
├── marketing-seo-specialist.md
├── marketing-content-strategist.md
├── sales-discovery-coach.md
└── sales-outbound-strategist.md
```

## 配置

通过两种方式发现 agent，并按 agent 名称合并去重：

1. **`claude agents` 命令**（主要方式）—— 运行 `claude agents` 获取 CLI 已知的全部 agent，包括用户 agent、插件 agent（例如 `everything-claude-code:architect`）和内置 agent。这会自动覆盖 ECC marketplace 安装项，无需任何路径配置。
2. **文件 glob**（后备方式，用于读取 agent 内容）—— agent markdown 文件从以下位置读取：
   - `./agents/**/*.md` + `./agents/*.md` —— 项目本地 agent
   - `~/.claude/agents/**/*.md` + `~/.claude/agents/*.md` —— 全局用户 agent

当名称冲突时，排在前面的来源优先：用户 agent > 插件 agent > 内置 agent。如果用户指定了自定义路径，则改用该路径。

## 工作原理

### 第 1 步：发现可用 agent

运行 `claude agents` 获取完整 agent 列表。解析每一行：
- **插件 agent** 以 `plugin-name:` 为前缀（例如 `everything-claude-code:security-reviewer`）。将 `:` 之后的部分作为 agent 名称，将 plugin 名称作为领域。
- **用户 agent** 没有前缀。从 `~/.claude/agents/` 或 `./agents/` 读取对应的 markdown 文件以提取名称和描述。
- **内置 agent**（例如 `Explore`、`Plan`）默认跳过，除非用户明确要求包含。

对于从 markdown 文件加载的用户 agent：
- **子目录布局：** 从父文件夹名提取领域
- **扁平布局：** 收集所有文件名前缀（第一个 `-` 之前的文本）。只有当某个前缀出现在 2 个或以上文件名中时才构成领域（例如 `engineering-security-engineer.md` 和 `engineering-software-architect.md` 都以 `engineering` 开头 → Engineering 领域）。具有唯一前缀的文件（例如 `code-reviewer.md`、`tdd-guide.md`）归入 "General"
- 从第一个 `# Heading` 提取 agent 名称。若未找到标题，则从文件名推导名称（去掉 `.md`，将连字符替换为空格，转为 title-case）
- 从标题后的第一段提取一行摘要

如果运行 `claude agents` 并探测文件位置后仍未发现 agent，告知用户："未找到 agent。请运行 `claude agents` 验证你的配置。" 然后停止。

### 第 2 步：呈现领域菜单

```
Available agent domains:
1. Engineering — Software Architect, Security Engineer
2. Marketing — SEO Specialist
3. Sales — Discovery Coach, Outbound Strategist

Pick domains or name specific agents (e.g., "1,3" or "security + seo"):
```

- 跳过没有 agent 的领域（空目录）
- 显示每个领域的 agent 数量

### 第 3 步：处理选择

接受灵活的输入：
- 数字："1,3" 选中 Engineering 和 Sales 的所有 agent
- 名称："security + seo" 对已发现的 agent 进行模糊匹配
- "all from engineering" 选中该领域的所有 agent

如果选中的 agent 超过 5 个，按字母序列出它们，并请用户收窄范围："你已选中 N 个 agent（上限 5 个）。请选择保留哪些，或回复 'first 5' 使用字母序的前五个。"

确认选择：
```
Selected: Security Engineer + SEO Specialist
What should they work on? (describe the task):
```

### 第 4 步：并行生成 agent

1. 读取每个所选 agent 的 markdown 文件
2. 如果尚未提供任务描述，则提示用户输入
3. 使用 Agent tool 并行生成所有 agent：
   - `subagent_type: "general-purpose"`
   - `prompt: "{agent file content}\n\nTask: {task description}"`
   - 每个 agent 独立运行 —— 无需 agent 间通信
4. 如果某个 agent 失败（错误、超时或输出为空），在结果中内联标注失败（例如 "Security Engineer: failed — [reason]"），并继续处理成功 agent 的结果

### 第 5 步：综合结果

收集所有输出并呈现统一报告：
- 结果按 agent 分组
- 综合分析部分，重点呈现：
  - 各 agent 之间达成共识之处
  - 建议之间的冲突或张力
  - 推荐的后续步骤

如果只选中了 1 个 agent，跳过综合分析，直接呈现输出。

## 规则

- **仅动态发现。** 绝不硬编码 agent 列表。目录中的新文件会自动出现在菜单中。
- **每队最多 5 个 agent。** 超过 5 个会收益递减并消耗过多 token。在选择时强制执行此限制。
- **并行调度。** 所有 agent 同时运行 —— 使用 Agent tool 的并行调用模式。
- **使用并行 Agent 调用，而非 TeamCreate。** 本 skill 使用并行的 Agent tool 调用来处理独立工作。只有当 agent 之间必须相互辩论或回应时，才需要 TeamCreate（用于多 agent 对话的 Claude Code tool）。

## 示例

```
User: team builder

Claude:
Available agent domains:
1. Engineering (2) — Software Architect, Security Engineer
2. Marketing (1) — SEO Specialist
3. Sales (4) — Discovery Coach, Outbound Strategist, Proposal Strategist, Sales Engineer
4. Support (1) — Executive Summary

Pick domains or name specific agents:

User: security + seo

Claude:
Selected: Security Engineer + SEO Specialist
What should they work on?

User: Review my Next.js e-commerce site before launch

[Both agents spawn in parallel, each applying their specialty to the codebase]

Claude:
## Security Engineer Findings
- [findings...]

## SEO Specialist Findings
- [findings...]

## Synthesis
Both agents agree on: [...]
Tension: Security recommends CSP that blocks inline styles, SEO needs inline schema markup. Resolution: [...]
Next steps: [...]
```
