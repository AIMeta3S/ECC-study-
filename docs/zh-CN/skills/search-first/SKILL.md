---
name: search-first
description: 先调研后编码的工作流。在编写自定义代码之前，先搜索现有的工具、库和模式。调用 researcher agent。
metadata:
  origin: ECC
---

# /search-first — 先调研再编码

将"先搜索现有解决方案、再进行实现"的工作流系统化。

## 触发条件

在以下情况使用此 skill：
- 开始一个可能已有现成解决方案的新功能
- 添加依赖或集成
- 用户要求"添加 X 功能"，而你正准备编写代码
- 在创建新的 utility、helper 或抽象之前

## 工作流

```
┌─────────────────────────────────────────────┐
│  0. TOOL AVAILABILITY PREFLIGHT             │
│     Check search channels before relying on │
│     them; report skipped channels honestly   │
├─────────────────────────────────────────────┤
│  1. NEED ANALYSIS                           │
│     Define what functionality is needed      │
│     Identify language/framework constraints  │
├─────────────────────────────────────────────┤
│  2. PARALLEL SEARCH (researcher agent)      │
│     ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│     │  npm /   │ │  MCP /   │ │  GitHub / │  │
│     │  PyPI    │ │  Skills  │ │  Web      │  │
│     └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────┤
│  3. EVALUATE                                │
│     Score candidates (functionality, maint, │
│     community, docs, license, deps)         │
├─────────────────────────────────────────────┤
│  4. DECIDE                                  │
│     ┌─────────┐  ┌──────────┐  ┌─────────┐  │
│     │  Adopt  │  │  Extend  │  │  Build   │  │
│     │ as-is   │  │  /Wrap   │  │  Custom  │  │
│     └─────────┘  └──────────┘  └─────────┘  │
├─────────────────────────────────────────────┤
│  5. IMPLEMENT                               │
│     Install package / Configure MCP /       │
│     Write minimal custom code               │
└─────────────────────────────────────────────┘
```

## 决策矩阵

| 信号 | 行动 |
|--------|--------|
| 完全匹配、维护良好、MIT/Apache 许可证 | **Adopt** — 直接安装并使用 |
| 部分匹配、基础良好 | **Extend** — 安装 + 编写薄封装 |
| 多个弱匹配 | **Compose** — 组合 2-3 个小包 |
| 未找到合适的 | **Build** — 编写自定义代码，但以调研为依据 |

## 如何使用

### 步骤 0：工具可用性预检

这是 agent 指导，不是可执行的 setup 脚本。只检查与当前任务和项目相关的渠道。

| 渠道 | 检查方式 | 缺失时 |
|---------|-------|------------|
| 仓库搜索 | `rg --files` 和有针对性的 `rg` 查询 | 声明仅检查了可见文件 |
| Package registry | `npm --version`、`python -m pip --version` 或项目 package manager | 使用 web/docs 搜索，避免声称已覆盖 registry |
| GitHub CLI | `gh auth status` | 仅使用公开 web 或本地 git history |
| MCP/docs 工具 | 可用 tool 列表或本地 MCP 配置 | 回退到官方 docs/web 搜索 |
| Skills 目录 | `ls ~/.claude/skills ~/.codex/skills`（如适用） | 说明没有可用的本地 skill 目录 |

### 快速模式（内联）

在编写 utility 或添加功能之前，先在脑中过一遍：

0. 这在仓库中是否已存在？→ 先用 `rg` 搜索相关的 modules/tests
1. 这是一个常见问题吗？→ 搜索 npm/PyPI
2. 是否有现成的 MCP？→ 检查 `~/.claude/settings.json` 并搜索
3. 是否有现成的 skill？→ 检查 `~/.claude/skills/`
4. 是否有现成的 GitHub 实现/模板？→ 在编写全新代码之前，先运行 GitHub 代码搜索查找有维护的 OSS

### 完整模式（agent）

对于非 trivial 的功能，启动 researcher agent：

```
Agent(subagent_type="general-purpose", prompt="
  Research existing tools for: [DESCRIPTION]
  Language/framework: [LANG]
  Constraints: [ANY]

  Search: npm/PyPI, MCP servers, Claude Code skills, GitHub
  Return: Structured comparison with recommendation
")
```

较老的 Claude Code 文档可能称之为 `Task(...)`；请使用当前活跃 harness 所暴露的 agent/subagent tool 名称。

## 按类别的搜索快捷参考

### 开发工具
- Linting → `eslint`、`ruff`、`textlint`、`markdownlint`
- Formatting → `prettier`、`black`、`gofmt`
- Testing → `jest`、`pytest`、`go test`
- Pre-commit → `husky`、`lint-staged`、`pre-commit`

### AI/LLM 集成
- Claude SDK → 用 Context7 获取最新 docs
- Prompt 管理 → 检查 MCP servers
- 文档处理 → `unstructured`、`pdfplumber`、`mammoth`

### 数据与 API
- HTTP 客户端 → `httpx`（Python）、`ky`/`undici`（Node）
- 校验 → `zod`（TS）、`pydantic`（Python）
- Database → 先检查是否有 MCP server

### 内容与发布
- Markdown 处理 → `remark`、`unified`、`markdown-it`
- 图像优化 → `sharp`、`imagemin`

## 集成点

### 与 planner agent 配合
planner 应在 Phase 1（架构评审）之前调用 researcher：
- researcher 识别可用的工具
- planner 将它们纳入实现计划
- 避免在计划中"重复造轮子"

### 与 architect agent 配合
architect 应就以下事项咨询 researcher：
- 技术栈决策
- 集成模式发现
- 现有参考架构

### 与 iterative-retrieval skill 配合
组合使用以实现渐进式发现：
- Cycle 1：广度搜索（npm、PyPI、MCP）
- Cycle 2：详细评估排名靠前的候选
- Cycle 3：测试与项目约束的兼容性

## 示例

### 示例 1："添加死链检查"
```
Need: Check markdown files for broken links
Search: npm "markdown dead link checker"
Found: textlint-rule-no-dead-link (score: 9/10)
Action: ADOPT — npm install textlint-rule-no-dead-link
Result: Zero custom code, battle-tested solution
```

### 示例 2："添加 HTTP 客户端封装"
```
Need: Resilient HTTP client with retries and timeout handling
Search: npm "http client retry", PyPI "httpx retry"
Found: got (Node) with retry plugin, httpx (Python) with built-in retry
Action: ADOPT — use got/httpx directly with retry config
Result: Zero custom code, production-proven libraries
```

### 示例 3："添加配置文件 linter"
```
Need: Validate project config files against a schema
Search: npm "config linter schema", "json schema validator cli"
Found: ajv-cli (score: 8/10)
Action: ADOPT + EXTEND — install ajv-cli, write project-specific schema
Result: 1 package + 1 schema file, no custom validation logic
```

## 反模式

- **急于写代码**：尚未检查是否已存在就编写 utility
- **忽视 MCP**：不检查是否已有 MCP server 提供该能力
- **静默跳过**：当某个搜索渠道不可用时却报告"未找到"
- **过度定制**：对库封装得过重，使其丧失原有优势
- **依赖膨胀**：为一个小功能安装庞大的 package
