---
name: continuous-learning-v2
description: 基于 instinct 的学习系统，通过 hooks 观察 sessions，创建带有 confidence scoring 的原子 instinct，并将它们演化为 skills/commands/agents。v2.1 增加了 project-scoped instincts 以防止跨项目污染。
metadata:
  origin: ECC
version: 2.1.0
---

# Continuous Learning v2.1 - 基于 Instinct
的架构

一个高级学习系统，通过原子化的 "instincts" ——带有 confidence scoring 的小型学习行为——将你的 Claude Code sessions 转化为可复用的知识。

**v2.1** 增加了 **project-scoped instincts** —— React 模式保留在你的 React 项目中，Python 约定保留在你的 Python 项目中，而通用模式（如"始终验证输入"）则全局共享。

## 何时激活

- 设置从 Claude Code sessions 的自动学习
- 通过 hooks 配置基于 instinct 的行为提取
- 调整已学习行为的 confidence 阈值
- 审查、导出或导入 instinct 库
- 将 instincts 演化为完整的 skills、commands 或 agents
- 管理 project-scoped 与 global instincts
- 将 instincts 从 project 作用域提升到 global 作用域

## v2.1 的新特性

| 特性 | v2.0 | v2.1 |
|---------|------|------|
| 存储 | 全局（`~/.claude/homunculus/`） | Project-scoped（`${XDG_DATA_HOME:-~/.local/share}/ecc-homunculus/projects/<hash>/`） |
| 作用域 | 所有 instincts 到处适用 | Project-scoped + global |
| 检测 | 无 | git remote URL / repo 路径 |
| 提升 | N/A | 在 2+ 个项目中出现时 Project → global |
| Commands | 4 个（status/evolve/export/import） | 6 个（+promote/projects） |
| 跨项目 | 污染风险 | 默认隔离 |

## v2 的新特性（对比 v1）

| 特性 | v1 | v2 |
|---------|----|----|
| 观察 | Stop hook（session 结束时） | PreToolUse/PostToolUse（100% 可靠） |
| 分析 | 主 context | Background agent（Haiku） |
| 粒度 | 完整 skills | 原子化的 "instincts" |
| Confidence | 无 | 0.3-0.9 加权 |
| 演化 | 直接到 skill | Instincts -> 聚类 -> skill/command/agent |
| 共享 | 无 | 导出/导入 instincts |

## Instinct 模型

一个 instinct 是一个小型的学习行为：

```yaml
---
id: prefer-functional-style
trigger: "when writing new functions"
confidence: 0.7
domain: "code-style"
source: "session-observation"
scope: project
project_id: "a1b2c3d4e5f6"
project_name: "my-react-app"
---

# Prefer Functional Style

## Action
Use functional patterns over classes when appropriate.

## Evidence
- Observed 5 instances of functional pattern preference
- User corrected class-based approach to functional on 2025-01-15
```

**属性：**
- **原子性** —— 一个 trigger，一个 action
- **Confidence 加权** —— 0.3 = 试探性，0.9 = 接近确定
- **Domain 标记** —— code-style、testing、git、debugging、workflow 等
- **有 evidence 支撑** —— 跟踪是什么 observations 创建了它
- **作用域感知** —— `project`（默认）或 `global`

## 工作原理

```
Session 活动（在一个 git repo 中）
      |
      | Hooks 捕获 prompts + tool use（100% 可靠）
      | + 检测项目 context（git remote / repo 路径）
      v
+---------------------------------------------+
|  projects/<project-hash>/observations.jsonl  |
|   (prompts, tool calls, outcomes, project)   |
+---------------------------------------------+
      |
      | Observer agent 读取（background，Haiku）
      v
+---------------------------------------------+
|          模式检测（PATTERN DETECTION）        |
|   * 用户纠正 -> instinct                    |
|   * 错误解决 -> instinct                    |
|   * 重复的工作流 -> instinct                |
|   * 作用域决策：project 还是 global？       |
+---------------------------------------------+
      |
      | 创建/更新
      v
+---------------------------------------------+
|  projects/<project-hash>/instincts/personal/ |
|   * prefer-functional.yaml (0.7) [project]   |
|   * use-react-hooks.yaml (0.9) [project]     |
+---------------------------------------------+
|  instincts/personal/  (GLOBAL)               |
|   * always-validate-input.yaml (0.85) [global]|
|   * grep-before-edit.yaml (0.6) [global]     |
+---------------------------------------------+
      |
      | /evolve 聚类 + /promote
      v
+---------------------------------------------+
|  projects/<hash>/evolved/ (project-scoped)   |
|  evolved/ (global)                           |
|   * commands/new-feature.md                  |
|   * skills/testing-workflow.md               |
|   * agents/refactor-specialist.md            |
+---------------------------------------------+
```

## 项目检测

系统会自动检测你当前的项目：

1. **`CLAUDE_PROJECT_DIR` 环境变量**（最高优先级）
2. **`git remote get-url origin`** —— 进行 hash 以创建可移植的项目 ID（同一 repo 在不同机器上获得相同的 ID）
3. **`git rev-parse --show-toplevel`** —— 使用 repo 路径作为 fallback（与机器相关）
4. **Global fallback** —— 如果没有检测到项目，instincts 归入 global 作用域

每个项目获得一个 12 字符的 hash ID（例如 `a1b2c3d4e5f6`）。位于 `${XDG_DATA_HOME:-~/.local/share}/ecc-homunculus/projects.json` 的 registry 文件将 ID 映射为人类可读的名称。

### 数据目录

Continuous-learning-v2 将 observer 数据存储在 `~/.claude` 之外，这样 Claude Code 的 sensitive-path guard 就不会阻止 background 的 instinct 写入：

1. 当 `CLV2_HOMUNCULUS_DIR` 设置为绝对路径时
2. `$XDG_DATA_HOME/ecc-homunculus`
3. `$HOME/.local/share/ecc-homunculus`

数据位于 `~/.claude/homunculus` 的现有用户可以一次性迁移：

```bash
bash skills/continuous-learning-v2/scripts/migrate-homunculus.sh
```

## 快速开始

### 1. 启用 Observation Hooks

**如果作为 plugin 安装**（推荐）：

不需要额外的 `settings.json` hook block。Claude Code v2.1+ 会自动加载 plugin 的 `hooks/hooks.json`，`observe.sh` 已经在那里注册。

如果你之前将 `observe.sh` 复制到了 `~/.claude/settings.json`，请删除那个重复的 `PreToolUse` / `PostToolUse` block。重复的 plugin hook 会导致双重执行以及 `${CLAUDE_PLUGIN_ROOT}` 解析错误，因为该变量仅在 plugin 管理的 `hooks/hooks.json` 条目内可用。

**如果手动安装**到 `~/.claude/skills`，请将以下内容添加到你的 `~/.claude/settings.json`：

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "~/.claude/skills/continuous-learning-v2/hooks/observe.sh"
      }]
    }],
    "PostToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "~/.claude/skills/continuous-learning-v2/hooks/observe.sh"
      }]
    }]
  }
}
```

### 2. 初始化目录结构

系统会在首次使用时自动创建目录，但你也可以手动创建：

```bash
# 全局目录
mkdir -p "${XDG_DATA_HOME:-$HOME/.local/share}/ecc-homunculus"/{instincts/{personal,inherited},evolved/{agents,skills,commands},projects}

# 当 hook 首次在 git repo 中运行时，项目目录会自动创建
```

### 3. 使用 Instinct Commands

```bash
/instinct-status     # 显示已学习的 instincts（project + global）
/evolve              # 将相关的 instincts 聚类为 skills/commands
/instinct-export     # 将 instincts 导出为文件
/instinct-import     # 从他人那里导入 instincts
/promote             # 将 project instincts 提升到 global 作用域
/projects            # 列出所有已知项目及其 instinct 计数
```

## Commands

| Command | 描述 |
|---------|-------------|
| `/instinct-status` | 显示所有 instincts（project-scoped + global）及其 confidence |
| `/evolve` | 将相关的 instincts 聚类为 skills/commands，建议提升项 |
| `/instinct-export <file>` | 导出 instincts（可按 scope/domain 过滤） |
| `/instinct-import <file>` | 导入 instincts，支持 scope 控制 |
| `/promote [id]` | 将 project instincts 提升到 global 作用域 |
| `/projects` | 列出所有已知项目及其 instinct 计数 |

## 配置

编辑 `config.json` 以控制 background observer：

```json
{
  "version": "2.1",
  "observer": {
    "enabled": false,
    "run_interval_minutes": 5,
    "min_observations_to_analyze": 20
  }
}
```

| 键 | 默认值 | 描述 |
|-----|---------|-------------|
| `observer.enabled` | `false` | 启用 background observer agent |
| `observer.run_interval_minutes` | `5` | observer 分析 observations 的频率 |
| `observer.min_observations_to_analyze` | `20` | 运行分析前所需的最小 observations 数 |

其他行为（observation 捕获、instinct 阈值、项目作用域划分、提升标准）通过 `instinct-cli.py` 和 `observe.sh` 中的代码默认值进行配置。

## 文件结构

```
${XDG_DATA_HOME:-~/.local/share}/ecc-homunculus/
+-- identity.json           # 你的 profile、技术水平
+-- projects.json           # Registry：project hash -> name/path/remote
+-- observations.jsonl      # 全局 observations（fallback）
+-- instincts/
|   +-- personal/           # 全局自动学习的 instincts
|   +-- inherited/          # 全局导入的 instincts
+-- evolved/
|   +-- agents/             # 全局生成的 agents
|   +-- skills/             # 全局生成的 skills
|   +-- commands/           # 全局生成的 commands
+-- projects/
    +-- a1b2c3d4e5f6/       # Project hash（来自 git remote URL）
    |   +-- project.json    # 项目级 metadata 镜像（id/name/root/remote）
    |   +-- observations.jsonl
    |   +-- observations.archive/
    |   +-- instincts/
    |   |   +-- personal/   # 项目特定的自动学习
    |   |   +-- inherited/  # 项目特定的导入
    |   +-- evolved/
    |       +-- skills/
    |       +-- commands/
    |       +-- agents/
    +-- f6e5d4c3b2a1/       # 另一个项目
        +-- ...
```

## 作用域决策指南

| 模式类型 | 作用域 | 示例 |
|-------------|-------|---------|
| 语言/框架约定 | **project** | "使用 React hooks"、"遵循 Django REST 模式" |
| 文件结构偏好 | **project** | "测试放在 `__tests__`/"、"组件放在 src/components/" |
| 代码风格 | **project** | "使用函数式风格"、"优先使用 dataclasses" |
| 错误处理策略 | **project** | "错误使用 Result type" |
| 安全实践 | **global** | "验证用户输入"、"Sanitize SQL" |
| 通用最佳实践 | **global** | "先写测试"、"始终处理错误" |
| 工具工作流偏好 | **global** | "Edit 前 Grep"、"Write 前先 Read" |
| Git 实践 | **global** | "Conventional commits"、"小而专注的 commits" |

## Instinct 提升（Project -> Global）

当同一个 instinct 以高 confidence 出现在多个项目中时，它就是提升到 global 作用域的候选对象。

**自动提升标准：**
- 同一 instinct ID 出现在 2+ 个项目中
- 平均 confidence >= 0.8

**如何提升：**

```bash
# 提升特定的 instinct
python3 instinct-cli.py promote prefer-explicit-errors

# 自动提升所有符合条件的 instincts
python3 instinct-cli.py promote

# 预览而不做更改
python3 instinct-cli.py promote --dry-run
```

`/evolve` command 也会建议提升候选对象。

## Confidence 评分

Confidence 随时间演化：

| 分数 | 含义 | 行为 |
|-------|---------|----------|
| 0.3 | 试探性 | 建议但不强制 |
| 0.5 | 中等 | 相关时应用 |
| 0.7 | 强 | 自动批准应用 |
| 0.9 | 接近确定 | 核心行为 |

**Confidence 增加**的条件：
- 模式被反复观察到
- 用户没有纠正建议的行为
- 来自其他来源的类似 instincts 一致

**Confidence 减少**的条件：
- 用户明确纠正该行为
- 长时间没有观察到该模式
- 出现矛盾的 evidence

## 为什么用 Hooks 而不是 Skills 来做 Observation？

> "v1 依赖 skills 来观察。Skills 是概率性的——它们根据 Claude 的判断大约在 50-80% 的时间触发。"

Hooks **100% 会触发**，是确定性的。这意味着：
- 每一次 tool call 都会被观察到
- 不会遗漏任何模式
- 学习是全面的

## 向后兼容

v2.1 与 v2.0 和 v1 完全兼容：
- 现有的 global instincts 可以通过 `scripts/migrate-homunculus.sh` 从 `~/.claude/homunculus/instincts/` 迁移
- v1 现有的 `~/.claude/skills/learned/` skills 仍然可用
- Stop hook 仍然运行（但现在也会馈送到 v2）
- 渐进式迁移：两者并行运行

## 隐私

- Observations 保留在你的**本地**机器上
- Project-scoped instincts 按项目隔离
- 只有 **instincts**（模式）可以被导出——不包括原始 observations
- 不会共享实际的代码或对话内容
- 你可以控制什么被导出和提升

## 相关

- [ECC-Tools GitHub App](https://github.com/apps/ecc-tools) - 从 repo 历史生成 instincts
- Homunculus - 启发了 v2 基于 instinct 架构的社区项目（原子化 observations、confidence scoring、instinct 演化 pipeline）
- [The Longform Guide](https://x.com/affaanmustafa/status/2014040193557471352) - 持续学习章节

---

*基于 instinct 的学习：一次一个项目地把你的模式教给 Claude。*
