---
name: codehealth-mcp
description: 通过 CodeScene MCP 提供实时的结构性 Code Health 反馈 —— 在编辑前审查、在修改后验证分数 delta、对 commit 和 PR 进行把关。在审查代码质量、refactor 文件、检查 AI 修改是否降低了文件健康度，或在 commit/PR 之前使用。
metadata:
  origin: community
---

# Code Health MCP (CodeScene)

面向 AI 辅助编程的结构性可维护性反馈。通过**设计层面**的健康度分数和回归门禁，补充 style/lint 类 skill（`coding-standards`、`plankton-code-quality`）。

**上游仓库：** [codescene-oss/codescene-mcp-server](https://github.com/codescene-oss/codescene-mcp-server)
**包：** `@codescene/codehealth-mcp`（通过 npx 以 stdio 方式运行）

## 安全与边界

**可选启用（ECC）：** `mcp-configs/mcp-servers.json` 中的 `codescene` 块仅为模板。ECC plugin 安装时不会自动启用内置的 MCP server。仅在需要时将该条目复制到你的配置中。可以在 ECC 安装/同步时通过 `ECC_DISABLED_MCPS=codescene,...` 将其排除。

**凭证：** 不内置 token。请自行设置 `CS_ACCESS_TOKEN`（参见上游仓库中的 [getting-a-personal-access-token.md](https://github.com/codescene-oss/codescene-mcp-server/blob/main/docs/getting-a-personal-access-token.md)）。切勿将 token commit 到仓库中。

**工具读取的内容：** 工具被调用时会分析你所指向的**本地仓库**中的文件和 git 状态（你传入的路径，以及 `analyze_change_set` 所需的分支上下文）。工具不会自行运行。对于 standalone 模式，请遵循上游隐私文档：[codescene-mcp-server README](https://github.com/codescene-oss/codescene-mcp-server#frequently-asked-questions) 和 [CodeScene policies](https://codescene.com/policies)。请勿将此 skill 用于机密、凭证或你不希望被分析的路径。

**当 MCP 不可用时（离线、token 失效、server 崩溃）：** 不要编造 Code Health 分数。告知用户检查已跳过。仅在用户明确同意后继续。MCP 不可用时，优先使用 lint/tests/verification-loop 进行把关。一旦 server 重新连接，恢复检查。

## 适用场景

- 用户要求**审查代码质量**、**refactor** 文件，或检查 **AI 的修改是否降低**了可维护性
- 在编辑 **hotspot**、legacy 模块或不熟悉的文件之前
- 在需要可维护性保障的 **commit** 或 **pull request** 之前
- 在 agent 生成的大规模 diff 之后 —— 验证 Code Health 未出现回归
- 与 `verification-loop`、`tdd-workflow` 或 `/quality-gate` 配合，作为结构性检查（不能替代 tests/lint）

## 激活时机

触发条件与上方的**适用场景**相同 —— 这个标题是 ECC 用于 skill 自动激活的标识。

## 工作原理

### 1. 连接 MCP server

将 `mcp-configs/mcp-servers.json` 中的 `codescene` 条目复制到你的 harness MCP 配置中。

**Claude Code**（`~/.claude.json` → `mcpServers`）：

```json
"codescene": {
  "command": "npx",
  "args": ["-y", "@codescene/codehealth-mcp"],
  "env": {
    "CS_ACCESS_TOKEN": "YOUR_CS_ACCESS_TOKEN_HERE"
  }
}
```

**项目级配置：** 将相同的块合并到仓库根目录下的 `.mcp.json` 中。

Token 设置在上游仓库中有文档说明（见上方链接）。对于下方列出的四个工具，standalone 模式不要求付费的 CodeScene 平台账户。依赖分数之前，请重启会话并确认 `codescene` server 已连接。

### 2. 仅调用 standalone 工具

| 工具 | 使用时机 |
|------|----------|
| `code_health_review` | 在修改文件**之前**进行完整的结构性分析 |
| `code_health_score` | 每次修改后获取快速数值分数（delta 检查） |
| `pre_commit_code_health_safeguard` | 拦截引入 Code Health 回归的 commit |
| `analyze_change_set` | 在开启 PR **之前**进行分支级检查 |

**不要**调用平台专用工具（例如仓库级技术债务 hotspot 列表）。**不要**引用 `delta_analysis` —— 在 standalone 模式下不可用。

### 3. 解读分数（1–10）

| 范围 | 含义 | Agent 行为 |
|------|------|-----------|
| **9.0–10.0** | 绿色 —— 健康 | 扩展较为安全；仍建议采用纵向切片 |
| **4.0–8.9** | 黄色 —— 存在债务 | 谨慎处理；不要随手 refactor |
| **1.0–3.9** | 红色 —— 严重债务 | 仅限小范围修改 |

### 4. 运行反馈循环

**修改文件之前**

1. 对目标路径运行 `code_health_review`。
2. 记录基线分数和列出的 code smell。
3. 规划完成任务所需的最小改动。

按分数确定范围：**低于 5** —— 仅做最小 diff；**5–7** —— 不做大范围 refactor；**高于 7** —— refactor 较为安全，但每次编辑后仍需验证。

**每次修改之后**

1. 对同一文件运行 `code_health_score`。
2. 与 `code_health_review` 得到的基线进行比较。
3. 如果分数**回归**，先修复再继续。绝不在分数低于起始值时将任务标记为完成。

**每次 commit 之前** —— 对仓库路径运行 `pre_commit_code_health_safeguard`。

**开启 PR 之前** —— 针对 base branch（例如 `main`）运行 `analyze_change_set`。

## 示例

### 示例：Flask 可维护性改进

在 `pallets/flask` 上，一个仅使用 standalone 工具的 agent 循环：

1. 对目标模块运行 `code_health_review`（基线 **4.82**）
2. 针对列出的 code smell 进行有针对性的 refactor
3. 每次编辑后运行 `code_health_score`
4. commit 之前运行 `pre_commit_code_health_safeguard`
5. 开启 PR 之前运行 `analyze_change_set`

结果：Code Health **4.82 → 9.1**（仅需免费的 standalone token）。

### 示例：AGENTS.md 强制执行块

粘贴到项目的 `AGENTS.md` 或 `CLAUDE.md` 中：

```md
## Code Health (CodeScene MCP)

Before modifying any file: run `code_health_review`, note score and issues.

- Score below 5: problematic range — scope changes narrowly.
- Score 5–7: warning range — no broad refactors.

After each change: run `code_health_score` to verify delta.

- If score regressed: fix before continuing; never declare done if score dropped.

Before every commit: run `pre_commit_code_health_safeguard`.

Before PR: run `analyze_change_set`.
```

### 示例：反模式与正确循环

```markdown
# BAD: Edit first, check later
[large refactor without code_health_review]

# BAD: Ignore score drop
"Tests pass" → mark task done while Code Health decreased

# BAD: Broad refactor on red-score file (below 5)
Drive-by cleanup across the module

# GOOD: review → small change → score → commit safeguard → analyze_change_set
```

## 与 ECC 配合使用

| ECC skill / 流程 | Code Health MCP 作用 |
|------------------|----------------------|
| `coding-standards` | 命名风格；Code Health = 结构/复杂度 |
| `plankton-code-quality` | 编写时的 lint/format；Code Health = 编辑前/后的结构性门禁 |
| `verification-loop` / `/quality-gate` | 在"完成"之前增加结构性回归检查 |
| `security-review` | 安全性与可维护性 —— 相关时两者都用 |
| `tdd-workflow` | 测试通过 ≠ 健康的设计 —— refactor 后检查分数 |

**上下文提示：** ECC 建议保持较少的 MCP 数量。在进行实质性编辑时启用 `codescene`；不需要时禁用。

## 相关 skill

- `coding-standards` —— 基础规范
- `plankton-code-quality` —— 编写时的 lint/format hook
- `verification-loop` —— build/test/lint 门禁
- `tdd-workflow` —— 测试先行开发
- `security-review` —— 安全检查清单
- `documentation-lookup` —— 通过 Context7 获取库文档（正交关系）
