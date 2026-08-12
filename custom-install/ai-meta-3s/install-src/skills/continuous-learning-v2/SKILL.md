---
name: continuous-learning-v2
description: 基于本能的学习系统，通过钩子观察会话，创建具有置信度评分的原子 instincts ，并将其演化为 skills/commands/agents。v2.1 版本增加了项目作用域的 instincts，以防止跨项目污染。
metadata:
  origin: ECC
version: 2.1.0
---

# Continuous Learning v2.1 - Instinct

一个先进的学习系统，通过原子化的"instincts"将你的 Claude Code 会话转化为可复用的知识 —— 带有置信度评分的小型学习行为

**v2.1** 增加了 **project-scoped instincts** —— React 模式保留在你的 React 项目中，Python 约定保留在你的 Python 项目中，而通用模式（如"始终验证输入"）则全局共享。

## 何时激活

- 设置了从 Claude Code 会话自动学习
- 通过 hooks 配置基于 instinct 的行为提取
- 调整已学习行为的置信度阈值
- 审查、导出或导入 instinct libraries
- 将 instincts 演化为完整的 skills、commands 或 agents
- 管理项目作用域和全局的 instincts
- 将 instincts 从项目作用域提升到全局范围

## The Instinct Model

An instinct is a small learned behavior:

```yaml
---
id: prefer-functional-style
trigger: "当编写新函数时"
confidence: 0.7
domain: "code-style"
source: "session-observation"
scope: 项目
project_id: "a1b2c3d4e5f6"
project_name: "my-react-app"
---

# 偏好函数式风格

## 动作
在适合时使用函数式模式而非类。

## 证据
- 观察到5次函数式模式偏好实例
- 用户在2025-01-15将基于类的方法纠正为函数式
```

**Properties:**
- **Atomic** -- one trigger, one action
- **Confidence-weighted** -- 0.3 = tentative, 0.9 = near certain
- **Domain-tagged** -- code-style, testing, git, debugging, workflow, etc.
- **Evidence-backed** -- tracks what observations created it
- **Scope-aware** -- `project` (default) or `global`

## 工作原理

```
Session Activity (in a git repo)
      |
      | Hooks capture prompts + tool use (100% reliable)
      | + detect project context (git remote / repo path)
      v
+---------------------------------------------+
|  projects/<project-hash>/observations.jsonl  |
|   (prompts, tool calls, outcomes, project)   |
+---------------------------------------------+
      |
      | Observer agent reads (background, Haiku)
      v
+---------------------------------------------+
|          PATTERN DETECTION                   |
|   * User corrections -> instinct             |
|   * Error resolutions -> instinct            |
|   * Repeated workflows -> instinct           |
|   * Scope decision: project or global?       |
+---------------------------------------------+
      |
      | Creates/updates
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
      | /evolve clusters + /promote
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

系统自动检测当前项目：

1. **`CLAUDE_PROJECT_DIR` 环境变量**（最高优先级）—— 作为显式覆盖优先采用，即使目录不是 git 仓库（按其绝对路径哈希处理）
2. **`git remote get-url origin`** —— 经哈希处理生成可移植项目ID（同一仓库在不同机器上得到相同ID）
3. **`git rev-parse --show-toplevel`** —— 使用仓库路径的回退方案（machine-specific）
4. **全局回退** —— 如果未检测到任何项目，instincts 归入全局作用域

每个项目获得一个12字符哈希ID（例如 `a1b2c3d4e5f6`）。位于 `${XDG_DATA_HOME:-~/.local/share}/ecc-homunculus/projects.json` 的注册文件将ID映射到人类可读名称。

### 数据目录

continuous-learning-v2 将观察者数据存储在 `~/.claude` 之外，这样 Claude Code 的敏感路径防护就不会阻止后台本能写入：

1. `CLV2_HOMUNCULUS_DIR`（当设置为绝对路径时）
2. `$XDG_DATA_HOME/ecc-homunculus`
3. `$HOME/.local/share/ecc-homunculus`

现有用户在 `~/.claude/homunculus` 中有数据可一次性迁移：

```bash
bash skills/continuous-learning-v2/scripts/migrate-homunculus.sh
```

## 快速开始

### 1. 启用 Observation Hooks

**如果作为 plugin 安装**（推荐）：

不需要额外的 `settings.json` hook block。Claude Code v2.1+ 会自动加载 plugin 的 `hooks/hooks.json`，`observe.sh` 已在其中注册。

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
# Global directories
mkdir -p "${XDG_DATA_HOME:-$HOME/.local/share}/ecc-homunculus"/{instincts/{personal,inherited},evolved/{agents,skills,commands},projects}

# Project directories are auto-created when the hook first runs in a git repo
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
|-----|---------|------|
| `observer.enabled` | `false` | 启用后台观察者 agent |
| `observer.run_interval_minutes` | `5` | 观察者分析观察数据的频率 |
| `observer.min_observations_to_analyze` | `20` | 运行分析前的最少观察数 |

其他行为（观察捕获、本能阈值、项目作用域划分、提升标准）通过 `instinct-cli.py` 和 `observe.sh` 中的代码默认值配置。

## 文件结构

```
${XDG_DATA_HOME:-~/.local/share}/ecc-homunculus/
+-- identity.json           # 你的个人资料、技术水平
+-- projects.json           # 注册文件：项目哈希 -> 名称/路径/远程
+-- observations.jsonl      # 全局观察数据（回退）
+-- instincts/
|   +-- personal/           # 全局自动学习的本能
|   +-- inherited/          # 全局导入的本能
+-- evolved/
|   +-- agents/             # 全局生成的代理
|   +-- skills/             # 全局生成的技能
|   +-- commands/           # 全局生成的命令
+-- projects/
    +-- a1b2c3d4e5f6/       # 项目哈希（来自 git remote URL）
    |   +-- project.json    # 每个项目的元数据镜像（id/name/root/remote）
    |   +-- observations.jsonl
    |   +-- observations.archive/
    |   +-- instincts/
    |   |   +-- personal/   # 项目特定自动学习的
    |   |   +-- inherited/  # 项目特定导入的
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
| 语言/框架约定 | **项目** | "使用 React hooks"、"遵循 Django REST 模式" |
| 文件结构偏好 | **项目** | "测试放在 `__tests__`/"、"组件放在 src/components/" |
| 代码风格 | **项目** | "使用函数式风格"、"优先使用 dataclasses" |
| 错误处理策略 | **项目** | "错误使用 Result type" |
| 安全实践 | **全局** | "验证用户输入"、"Sanitize SQL" |
| 通用最佳实践 | **全局** | "先写测试"、"始终处理错误" |
| 工具工作流偏好 | **全局** | "Edit 前 Grep"、"Write 前先 Read" |
| Git 实践 | **全局** | "Conventional commits"、"小而专注的 commits" |

## Instinct 提升（Project -> Global）

当同一个 instinct 出现在多个项目中并且置信度较高时，它就有资格提升到全局作用域。

**自动提升标准：**
- 相同 instinct ID 出现在2个以上项目中
- 平均置信度 >= 0.8

**如何提升：**

```bash
# 提升特定的 instinct
python3 instinct-cli.py promote prefer-explicit-errors

# 自动提升所有符合条件的 instincts
python3 instinct-cli.py promote

# 预览而不做更改
python3 instinct-cli.py promote --dry-run
```

`/evolve` 命令也会建议提升候选对象。

## 置信度评分

置信度 随时间演化：

| 分数 | 含义 | 行为 |
|-------|---------|----------|
| 0.3 | 试探性 | 建议但不强制 |
| 0.5 | 中等 | 相关时应用 |
| 0.7 | 强 | 自动批准应用 |
| 0.9 | 接近确定 | 核心行为 |

**置信度增加**的条件：
- 模式被反复观察到
- 用户没有纠正建议的行为
- 来自其他来源的类似 instincts 一致

**置信度减少**的条件：
- 用户明确纠正该行为
- 长时间没有观察到该模式
- 出现矛盾的 evidence

## 隐私

- Observations 保留在你的**本地**机器上
- Project-scoped instincts 按项目隔离
- 只有 **instincts**（模式）可以被导出——不包括原始 observations
- 不会共享实际的代码或对话内容
- 你可以控制什么被导出和提升

---

*基于 instinct 的学习：一次一个项目地把你的模式教给 Claude。*
