---
name: configure-ecc
<<<<<<< HEAD
description: Everything Claude Code 的交互式安装器 — 引导用户选择并将 skills 和 rules 安装到用户级或项目级目录，验证路径，并可选地优化已安装的文件。
=======
description: 在 Claude Code、Codex 或 Kimi 内引导 ECC 安装、更新或重新配置，同时严格遵守各家工具真实的插件、范围和 Hook 能力。
>>>>>>> upstream/main
metadata:
  origin: ECC
---

# 配置 Everything Claude Code

<<<<<<< HEAD
Everything Claude Code 项目的交互式分步安装向导。使用 `AskUserQuestion` 引导用户有选择地安装 skills 和 rules，然后验证正确性并提供优化选项。
=======
在当前工具内运行对话式向导：先检查，只收集受支持的选项，预览，只确认
一次，以非交互方式执行，验证，最后才显示欢迎信息。不要把 ECC 克隆到
临时目录，也不要手动复制插件组件。
>>>>>>> upstream/main

在用户自己操作的终端中，规范入口是 `ecc setup` 和 `npx ecc-universal setup`。
在工具内请改用下方参数完整的非交互命令。

<<<<<<< HEAD
- 用户说 "configure ecc"、"install ecc"、"setup everything claude code" 或类似内容
- 用户希望有选择地安装本项目中的 skills 或 rules
- 用户希望验证或修复现有的 ECC 安装
- 用户希望针对其项目优化已安装的 skills 或 rules

## 前置条件

在激活前，Claude Code 必须能访问此 skill。有两种引导方式：
1. **通过 Plugin**：`/plugin install ecc@ecc` — 该 plugin 会自动加载此 skill
2. **手动**：仅将此 skill 复制到 `~/.claude/skills/configure-ecc/SKILL.md`，然后说 "configure ecc" 激活

---

## Step 0：克隆 ECC 仓库

在任何安装之前，将最新的 ECC 源码克隆到 `/tmp`：
=======
## 按当前工具分流

- Claude Code：使用下面完整的范围与 Hook 向导。
- Codex：使用 Codex 原生插件生命周期；不要提供 Claude 范围，也不要映射
  Claude 的四种 ECC Hook 配置。
- Kimi：把项目表面安装到 `./.kimi-code`；Kimi 不支持 ECC 的 Claude 生命周期
  Hook 配置。
- 无法确定工具时，先说明检测依据，再询问要配置哪一个，不要直接修改。

此技能是安装后的重新配置路径，无法拦截或取代提供商内置的首次安装界面。

## Claude Code：运行完整对话式向导

### 1. 只读检查

运行以下两条命令，总结 ECC 的安装范围、启用状态和 marketplace 来源：
>>>>>>> upstream/main

```bash
claude plugin list --json
claude plugin marketplace list --json
```

<<<<<<< HEAD
将 `ECC_ROOT=/tmp/everything-claude-code` 设置为后续所有复制操作的源。

如果克隆失败（网络问题等），使用 `AskUserQuestion` 询问用户提供一个本地路径，指向已存在的 ECC clone。

---

## Step 1：选择安装级别
=======
只有一个现有 `ecc@ecc` 时，将本次视为重新配置。不要把 Claude 提供商所有的
“Open home page”控件当作安装证据。若 setup 报告多个 ECC 范围、旧版或手动
安装、配置损坏或 marketplace 冲突，请停止并原样报告恢复建议，不要猜测要删除哪个。

### 2. 只收集两个选择

只询问一次安装范围，并要求且仅要求一个值：

- `user | project | local`
- `user` 对当前用户全局可用。
- `project` 通过仓库设置共享。
- `local` 仅当前项目私有。
>>>>>>> upstream/main

界面中只能把选中的一个范围显示为已选或正在安装。如果用户从唯一现有范围
切换到另一范围，说明这是范围迁移，并在下方命令中加入 `--move-scope`。

<<<<<<< HEAD
```
Question: "ECC 组件应该安装到哪里？"
Options:
  - "用户级 (~/.claude/)" — "应用于你的所有 Claude Code 项目"
  - "项目级 (.claude/)" — "仅应用于当前项目"
  - "两者都装" — "通用/共享项放在用户级，项目特定项放在项目级"
```

将选择存储为 `INSTALL_LEVEL`。设置目标目录：
- 用户级：`TARGET=~/.claude`
- 项目级：`TARGET=.claude`（相对于当前项目根目录）
- 两者都装：`TARGET_USER=~/.claude`, `TARGET_PROJECT=.claude`

如果目标目录不存在则创建：
=======
只询问一次 Hook 模式，并要求且仅要求一个值：

- `off | minimal | standard | strict`
- `off` 保留技能和命令，但关闭 ECC Hook 自动化。
- `minimal` 只启用最轻量的生命周期和安全自动化。
- `standard` 平衡质量和安全自动化。
- `strict` 启用最严格的检查和提醒。

Hook 偏好是个人 Claude 插件配置，不会跟随所选安装范围。

### 3. 预览并只确认一次

优先使用插件自带的 setup 脚本。替换两个已选值，只在范围迁移时加入
`--move-scope`：

>>>>>>> upstream/main
```bash
node "$CLAUDE_PLUGIN_ROOT/scripts/setup.js" --mode claude-plugin \
  --scope <scope> --hooks <hooks> [--move-scope] --dry-run --json
```

<<<<<<< HEAD
---

## Step 2：选择并安装 Skills

### 2a：选择范围（Core vs Niche）

默认选择 **Core（推荐新用户使用）** — 复制 `.agents/skills/*` 以及 `skills/search-first/`，用于研究优先的工作流。此套件涵盖工程、evals、verification、security、战略压缩、前端设计以及 Anthropic 跨职能 skills（article-writing、content-engine、market-research、frontend-slides）。

使用 `AskUserQuestion`（单选）：
```
Question: "仅安装 core skills，还是包含 niche/framework 包？"
Options:
  - "仅 Core（推荐）" — "tdd、e2e、evals、verification、research-first、security、frontend patterns、compacting、跨职能 Anthropic skills"
  - "Core + 选定 niche" — "在 core 基础上添加框架/领域特定 skills"
  - "仅 Niche" — "跳过 core，安装特定的框架/领域 skills"
Default: 仅 Core
```

如果用户选择 niche 或 core + niche，继续下面的类别选择，且只包含他们选择的那些 niche skills。

### 2b：选择 Skill 类别

下面有 7 个可选的类别组。后续的详细确认清单涵盖 8 个类别下的 45 个 skills，以及 1 个独立模板。使用 `AskUserQuestion` 并设置 `multiSelect: true`：

```
Question: "你想安装哪些 skill 类别？"
Options:
  - "Framework & Language" — "Django、Laravel、Spring Boot、Quarkus、Go、Python、Java、Frontend、Backend patterns"
  - "Database" — "PostgreSQL、ClickHouse、JPA/Hibernate patterns"
  - "Workflow & Quality" — "TDD、verification、learning、security review、compaction"
  - "Research & APIs" — "Deep research、Exa search、Claude API patterns"
  - "Social & Content Distribution" — "X/Twitter API、与 content-engine 配合的 crossposting"
  - "Media Generation" — "fal.ai image/video/audio 配合 VideoDB"
  - "Orchestration" — "dmux 多 agent 工作流"
  - "All skills" — "安装所有可用 skills"
```

### 2c：确认单个 Skills

对于每个选定的类别，打印下面的完整 skills 列表，并让用户确认或取消选择特定项。如果列表超过 4 项，以文本形式打印列表，并使用 `AskUserQuestion` 提供 "Install all listed" 选项加上 "Other" 供用户粘贴特定名称。

**类别：Framework & Language（25 个 skills）**

| Skill | 描述 |
|-------|-------------|
| `backend-patterns` | Node.js/Express/Next.js 的后端架构、API 设计、服务端最佳实践 |
| `coding-standards` | TypeScript、JavaScript、React、Node.js 的通用编码规范 |
| `django-patterns` | Django 架构、使用 DRF 的 REST API、ORM、缓存、信号、middleware |
| `django-security` | Django 安全：auth、CSRF、SQL injection、XSS 防护 |
| `django-tdd` | 使用 pytest-django、factory_boy、mocking、coverage 的 Django 测试 |
| `django-verification` | Django 验证循环：migrations、linting、测试、安全扫描 |
| `laravel-patterns` | Laravel 架构模式：路由、控制器、Eloquent、队列、缓存 |
| `laravel-security` | Laravel 安全：auth、策略、CSRF、mass assignment、rate limiting |
| `laravel-tdd` | 使用 PHPUnit 和 Pest、factories、fakes、coverage 的 Laravel 测试 |
| `laravel-verification` | Laravel 验证：linting、静态分析、测试、安全扫描 |
| `frontend-patterns` | React、Next.js、状态管理、性能、UI 模式 |
| `frontend-slides` | 零依赖的 HTML 演示文稿、样式预览以及 PPTX 转网页 |
| `golang-patterns` | 地道的 Go 模式、构建健壮 Go 应用的约定 |
| `golang-testing` | Go 测试：table-driven tests、子测试、基准测试、fuzzing |
| `java-coding-standards` | Spring Boot 和 Quarkus 的 Java 编码规范：命名、immutability、Optional、streams、CDI |
| `python-patterns` | Pythonic 惯用法、PEP 8、type hints、最佳实践 |
| `python-testing` | 使用 pytest、TDD、fixtures、mocking、参数化的 Python 测试 |
| `quarkus-patterns` | Quarkus 架构、Camel 消息、CDI 服务、Panache 数据访问 |
| `quarkus-security` | Quarkus 安全：JWT/OIDC、RBAC、输入验证、secrets 管理 |
| `quarkus-tdd` | 使用 JUnit 5、Mockito、REST Assured、Camel 测试的 Quarkus TDD |
| `quarkus-verification` | Quarkus 验证：build、静态分析、测试、native compilation |
| `springboot-patterns` | Spring Boot 架构、REST API、分层服务、缓存、async |
| `springboot-security` | Spring Security：authn/authz、验证、CSRF、secrets、rate limiting |
| `springboot-tdd` | 使用 JUnit 5、Mockito、MockMvc、Testcontainers 的 Spring Boot TDD |
| `springboot-verification` | Spring Boot 验证：build、静态分析、测试、安全扫描 |

**类别：Database（3 个 skills）**

| Skill | 描述 |
|-------|-------------|
| `clickhouse-io` | ClickHouse 模式、查询优化、分析、数据工程 |
| `jpa-patterns` | JPA/Hibernate 实体设计、关系、查询优化、transactions |
| `postgres-patterns` | PostgreSQL 查询优化、schema 设计、索引、安全 |

**类别：Workflow & Quality（8 个 skills）**

| Skill | 描述 |
|-------|-------------|
| `continuous-learning` | 旧版 v1 Stop-hook session 模式提取；新安装推荐使用 `continuous-learning-v2` |
| `continuous-learning-v2` | 基于 instinct 的学习，带置信度评分，可演化为 skills、agents 以及可选的旧版 command shims |
| `eval-harness` | 用于 eval-driven development (EDD) 的正式评估框架 |
| `iterative-retrieval` | 针对 subagent 上下文问题的渐进式上下文精炼 |
| `security-review` | 安全清单：auth、输入、secrets、API、支付功能 |
| `strategic-compact` | 在逻辑节点建议手动 context compaction |
| `tdd-workflow` | 强制执行 TDD，覆盖率 80%+：unit、integration、E2E |
| `verification-loop` | 验证与质量循环模式 |

**类别：Business & Content（5 个 skills）**

| Skill | 描述 |
|-------|-------------|
| `article-writing` | 使用笔记、示例或源文档，以指定语调进行长文写作 |
| `content-engine` | 多平台社交内容、脚本和内容复用工作流 |
| `market-research` | 标注来源的市场、竞争对手、基金和技术研究 |
| `investor-materials` | 路演 deck、单页介绍、投资人备忘录和财务模型 |
| `investor-outreach` | 个性化投资人 cold email、warm intro 和跟进 |

**类别：Research & APIs（2 个 skills）**

| Skill | 描述 |
|-------|-------------|
| `deep-research` | 使用 firecrawl 和 exa MCP 进行多来源深度研究，生成带引用的报告 |
| `exa-search` | 通过 Exa MCP 进行 web、代码、公司和人员研究的神经搜索 |

`claude-api` 是 Anthropic 官方 skill。当你希望使用官方的 Claude API 工作流而非 ECC 打包副本时，从 [`anthropics/skills`](https://github.com/anthropics/skills) 安装它。

**类别：Social & Content Distribution（2 个 skills）**

| Skill | 描述 |
|-------|-------------|
| `x-api` | 用于发布、threads、搜索和分析的 X/Twitter API 集成 |
| `crosspost` | 多平台内容分发，带平台原生适配 |

**类别：Media Generation（2 个 skills）**

| Skill | 描述 |
|-------|-------------|
| `fal-ai-media` | 通过 fal.ai MCP 统一生成 AI 媒体（图像、视频、音频） |
| `video-editing` | AI 辅助视频编辑，用于剪辑、结构化和增强真实素材 |

**类别：Orchestration（1 个 skill）**

| Skill | 描述 |
|-------|-------------|
| `dmux-workflows` | 使用 dmux 进行多 agent 编排，实现并行 agent 会话 |

**独立**

| Skill | 描述 |
|-------|-------------|
| `docs/examples/project-guidelines-template.md` | 用于创建项目特定 skills 的模板 |

### 2d：执行安装

对于每个选定的 skill，从正确的源根目录复制整个 skill 目录：

```bash
# Core skills 位于 .agents/skills/ 下
cp -R "$ECC_ROOT/.agents/skills/<skill-name>" "$TARGET/skills/"

# Niche skills 位于 skills/ 下
cp -R "$ECC_ROOT/skills/<skill-name>" "$TARGET/skills/"
```

当遍历 globbed 源目录时，绝不直接将带尾斜杠的源传给 `cp`。显式地将目录路径作为目标名：
=======
如果 `$CLAUDE_PLUGIN_ROOT` 不可用，使用已发布的 npm 包：

```bash
npx --yes --package ecc-universal ecc setup --mode claude-plugin \
  --scope <scope> --hooks <hooks> [--move-scope] --dry-run --json
```

只显示一次确认摘要，内容包含计划操作、唯一范围、唯一 Hook 模式、marketplace 操作和
任何从来源到目标的迁移。只问一个是/否问题。不要通过工具的 Shell 调用不带参数的
交互式 `ecc setup`，因为该 Shell 通常不是 TTY。

### 4. 应用明确选择

确认后，使用同一路径但去掉 `--dry-run`。保留每个明确选择，并请求 JSON：

```bash
node "$CLAUDE_PLUGIN_ROOT/scripts/setup.js" --mode claude-plugin \
  --scope <scope> --hooks <hooks> [--move-scope] --yes --json
```

备用命令：
>>>>>>> upstream/main

```bash
npx --yes --package ecc-universal ecc setup --mode claude-plugin \
  --scope <scope> --hooks <hooks> [--move-scope] --yes --json
```

<<<<<<< HEAD
注意：`continuous-learning` 和 `continuous-learning-v2` 有额外文件（config.json、hooks、scripts）— 确保复制整个目录，而不只是 SKILL.md。

---

## Step 3：选择并安装 Rules

使用 `AskUserQuestion` 并设置 `multiSelect: true`：

```
Question: "你想安装哪些 rule 集？"
Options:
  - "Common rules（推荐）" — "语言无关原则：编码风格、git workflow、测试、安全等（8 个文件）"
  - "TypeScript/JavaScript" — "TS/JS 模式、hooks、使用 Playwright 测试（5 个文件）"
  - "Python" — "Python 模式、pytest、black/ruff 格式化（5 个文件）"
  - "Go" — "Go 模式、table-driven tests、gofmt/staticcheck（5 个文件）"
```

执行安装：
```bash
# Common rules
cp -r $ECC_ROOT/rules/common $TARGET/rules/common

# 语言特定 rules（保留各语言目录）
cp -r $ECC_ROOT/rules/typescript $TARGET/rules/typescript   # 若选中
cp -r $ECC_ROOT/rules/python $TARGET/rules/python            # 若选中
cp -r $ECC_ROOT/rules/golang $TARGET/rules/golang            # 若选中
```

**重要**：如果用户选择了任何语言特定 rules 但未选择 common rules，警告他们：
> "语言特定 rules 是 common rules 的扩展。不安装 common rules 可能导致覆盖不全。是否也安装 common rules？"

---

## Step 4：安装后验证

安装完成后，执行这些自动检查：

### 4a：验证文件存在性
=======
### 5. 先验证，再显示欢迎信息

必须得到零退出状态，且 setup 结果中的 `scope` 和 `hooks` 必须等于所选值。然后独立运行：

```bash
claude plugin list --json
```

只有在所选范围中恰好存在一个已启用的 `ecc@ecc` 条目时才继续。如果
`$CLAUDE_PLUGIN_ROOT` 可用，把成功 setup 的 `action`（`installed`、`updated`、
`migrated`、`resumed` 或 `already-migrated`）传给内置渲染器：

调用前必须确认提供方报告的版本匹配 `scripts/lib/terminal-welcome.js` 中的
`ECC_VERSION_PATTERN`。异常版本文本应被拒绝，不得插入 shell 命令。

```bash
node -e 'const { renderTerminalWelcome } = require(process.env.CLAUDE_PLUGIN_ROOT + "/scripts/lib/terminal-welcome"); process.stdout.write(renderTerminalWelcome({ action: process.argv[1], version: process.argv[2], color: process.stdout.isTTY }));' "<action>" "<installed-version>"
```

欢迎信息只渲染一次。失败、预览、取消、范围或 Hook 不匹配、无法验证时都不显示；
改为报告错误和恢复方法。验证完成后，提醒用户运行 `/reload-plugins` 或重启 Claude Code。

## Codex：使用原生插件生命周期

使用 `codex plugin marketplace list --json` 和 `codex plugin list --available --json` 检查。
Codex 的原生插件命令没有 Claude 式 `user | project | local` 选择器。不要询问 Claude 范围或
Hook 四档模式。Codex 原生插件支持提供商专用 Hook，但 Codex 会要求用户明确信任。让 Codex
显示该信任决定；不要声称 Claude 的四种配置可以映射到 Codex。

如果缺少 ECC marketplace，请添加；否则刷新快照：
>>>>>>> upstream/main

列出所有已安装的文件，并确认它们存在于目标位置：
```bash
codex plugin marketplace add affaan-m/ECC
codex plugin marketplace upgrade ecc --json
```

<<<<<<< HEAD
### 4b：检查路径引用

扫描所有已安装的 `.md` 文件中的路径引用：
=======
只确认一次，然后安装或幂等刷新已安装缓存，并验证：

>>>>>>> upstream/main
```bash
codex plugin add ecc@ecc --json
codex plugin list --json
```

<<<<<<< HEAD
**对于项目级安装**，标记任何对 `~/.claude/` 路径的引用：
- 如果某个 skill 引用了 `~/.claude/settings.json` — 这通常没问题（settings 始终是用户级的）
- 如果某个 skill 引用了 `~/.claude/skills/` 或 `~/.claude/rules/` — 如果仅在项目级安装，这可能失效
- 如果某个 skill 按名称引用另一个 skill — 检查被引用的 skill 是否也已安装

### 4c：检查 Skills 间的交叉引用

某些 skills 会引用其他 skills。验证这些依赖关系：
- `django-tdd` 可能引用 `django-patterns`
- `laravel-tdd` 可能引用 `laravel-patterns`
- `quarkus-tdd` 可能引用 `quarkus-patterns`
- `springboot-tdd` 可能引用 `springboot-patterns`
- `continuous-learning-v2` 引用 `~/.claude/homunculus/` 目录
- `python-testing` 可能引用 `python-patterns`
- `golang-testing` 可能引用 `golang-patterns`
- `crosspost` 引用 `content-engine` 和 `x-api`
- `deep-research` 引用 `exa-search`（互补的 MCP 工具）
- `fal-ai-media` 引用 `videodb`（互补的 media skill）
- `x-api` 引用 `content-engine` 和 `crosspost`
- 语言特定 rules 引用对应的 `common/`

### 4d：报告问题

对于发现的每个问题，报告：
1. **File**：包含问题引用的文件
2. **Line**：行号
3. **Issue**：问题所在（例如 "引用了 ~/.claude/skills/python-patterns 但未安装 python-patterns"）
4. **Suggested fix**：处理方式（例如 "安装 python-patterns skill" 或 "将路径更新为 .claude/skills/"）

---

## Step 5：优化已安装的文件（可选）

使用 `AskUserQuestion`：

```
Question: "是否要针对你的项目优化已安装的文件？"
Options:
  - "优化 skills" — "移除无关章节、调整路径、针对你的技术栈定制"
  - "优化 rules" — "调整覆盖率目标、添加项目特定模式、自定义工具配置"
  - "两者都优化" — "对所有已安装文件进行全面优化"
  - "跳过" — "保持一切原样"
```

### 如果优化 skills：
1. 读取每个已安装的 SKILL.md
2. 询问用户项目的技术栈（如果尚未知晓）
3. 对于每个 skill，建议移除无关章节
4. 在安装目标位置就地编辑 SKILL.md 文件（而非源仓库）
5. 修复 Step 4 中发现的任何路径问题

### 如果优化 rules：
1. 读取每个已安装的 rule .md 文件
2. 询问用户偏好：
   - 测试覆盖率目标（默认 80%）
   - 首选格式化工具
   - Git workflow 约定
   - 安全要求
3. 在安装目标位置就地编辑 rule 文件

**关键**：只修改安装目标（`$TARGET/`）中的文件，绝不修改源 ECC 仓库（`$ECC_ROOT/`）中的文件。

---

## Step 6：安装摘要

从 `/tmp` 清理已克隆的仓库：
=======
只有 JSON 报告 ECC 已安装并提供 `installedPath` 时才继续，然后渲染已验证组合包的欢迎信息：

`installedPath` 只能使用 Codex JSON 返回的原始绝对路径，并拒绝控制字符。版本必须通过
`ECC_VERSION_PATTERN` 验证。请使用下面的 argument array 直接调用 `node`；这是工具 API
调用，不是 shell 命令：

```text
["<installedPath>/scripts/welcome.js", "--action", "configured", "--version", "<installed-version>"]
```

如果当前工具无法把可执行文件与 argument array 分开传递，请跳过欢迎信息。不得使用 Codex
JSON 中的值构造 shell 命令。

绝不要声称 Claude 的 `off | minimal | standard | strict` 配置已应用到 Codex。

## Kimi：安装项目表面

确认前说明能力摘要：目标为 `./.kimi-code`；ECC 生命周期 Hook 为 `hooks=unsupported`。
不要询问 Claude 范围或 Hook 模式。先预览：
>>>>>>> upstream/main

```bash
npx --yes --package ecc-universal ecc install --profile core --target kimi --dry-run
```

只针对该项目目标确认一次，然后执行去掉 `--dry-run` 的同一命令。使用以下命令验证：

```bash
npx --yes --package ecc-universal ecc doctor --target kimi
```
<<<<<<< HEAD
## ECC 安装完成

### 安装目标
- Level：[user-level / project-level / both]
- 路径：[target path]

### 已安装 Skills（[count]）
- skill-1, skill-2, skill-3, ...

### 已安装 Rules（[count]）
- common（8 个文件）
- typescript（5 个文件）
- ...

### 验证结果
- 发现 [count] 个问题，已修复 [count] 个
- [列出任何剩余问题]

### 已应用的优化
- [列出所做的更改，或 "None"]
```

---

## 故障排查

### "Skills 未被 Claude Code 识别"
- 验证 skill 目录包含 `SKILL.md` 文件（而非零散的 .md 文件）
- 对于用户级：检查 `~/.claude/skills/<skill-name>/SKILL.md` 是否存在
- 对于项目级：检查 `.claude/skills/<skill-name>/SKILL.md` 是否存在

### "Rules 不生效"
- Rules 是扁平文件，不在子目录中：`$TARGET/rules/coding-style.md`（正确）与 `$TARGET/rules/common/coding-style.md`（对于扁平安装不正确）
- 安装 rules 后重启 Claude Code

### "项目级安装后出现路径引用错误"
- 某些 skills 假定使用 `~/.claude/` 路径。运行 Step 4 验证以发现并修复这些问题。
- 对于 `continuous-learning-v2`，`~/.claude/homunculus/` 目录始终是用户级的 — 这是预期行为，不是错误。
=======

只有 doctor 成功，且已安装的指令和技能仍位于 `./.kimi-code` 内时才运行：

```bash
npx --yes --package ecc-universal ecc welcome --action configured
```

不要声称 Kimi 已安装或配置 ECC 生命周期 Hook。
>>>>>>> upstream/main
