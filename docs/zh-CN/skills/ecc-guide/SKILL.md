---
name: ecc-guide
description: 在回答前先阅读实时仓库 surface，引导用户了解 ECC 当前的 agents、skills、commands、hooks、rules、install profiles 以及项目上手流程。
metadata:
  origin: community
---

# ECC 指南

当用户需要帮助以理解、浏览、安装或选择 Everything Claude Code 的各个部分时，使用此 skill。

## 何时使用

当用户出现以下情况时使用此 skill：

- 询问 ECC 包含哪些内容
- 需要帮助查找 skill、command、agent、hook、rule 或 install profile
- 刚接触本仓库，需要引导路径
- 询问"如何用 ECC 做 X？"
- 询问哪些 ECC 组件适合某个项目
- 需要一份简明说明，了解 commands、skills、agents、hooks 和 rules 之间的关系
- 对 install 路径、重复安装、重置/卸载或选择性 install 选项感到困惑

## 核心原则

从当前文件作答，而非凭记忆。ECC 变化很快，硬编码的 catalog 计数、功能列表和 install 指南很快就会过时。

当 ECC 仓库可用时，在给出具体答案前先检查相关文件：

```bash
node scripts/ci/catalog.js --json
find skills -maxdepth 2 -name SKILL.md | sort
find commands -maxdepth 1 -name '*.md' | sort
find agents -maxdepth 1 -name '*.md' | sort
node scripts/install-plan.js --list-profiles
node scripts/install-plan.js --list-components --json
```

仅针对用户的问题使用最小必要的读取范围。

## 仓库地图

- `README.md`：install 路径、卸载/重置指南、公开定位、FAQ
- `AGENTS.md`：贡献者指南和项目结构
- `agent.yaml`：导出的 gitagent surface 和 command 列表
- `commands/`：受维护的 slash command 兼容 shim
- `skills/*/SKILL.md`：可复用的工作流和领域 playbook
- `agents/*.md`：委托的 subagent 角色 prompt
- `rules/`：语言和 harness rule
- `hooks/README.md`、`hooks/hooks.json`、`scripts/hooks/`：hook 行为和安全 gate
- `manifests/install-*.json`：选择性 install 模块、组件、profile 和目标支持
- `docs/`：harness 指南、架构说明、翻译文档、发布文档

## 回应风格

先给答案，再给下一步动作。大多数用户不需要完整的 catalog 输出。

良好的首次回应结构：

1. 使用什么
2. 为何合适
3. 要检查的确切文件或 command
4. 一个下一步的 command 或问题

避免：

- 默认列出每个 skill 或 command
- 重复大段 README 内容
- 当存在 skill 优先路径时，仍推荐已废弃的 command shim
- 未检查文件系统就声称某个组件存在
- 当托管 installer 支持该目标时，用手工 copy command 替代 install 指南

## 常见任务

### 新用户上手

给出一个简短菜单：

- 安装或重置 ECC
- 为项目挑选 skill
- 理解 command 与 skill 的区别
- 检查 hook 和安全行为
- 运行 harness audit
- 查找特定工作流

安装/重置指向 `README.md`，项目专属上手指向 `/project-init`。

### 功能发现

对于"X 该用什么？"：

1. 搜索 `skills/`、`commands/` 和 `agents/`。
2. 优先以 skill 作为主要的工作流 surface。
3. 仅当 command 是受维护的兼容 shim，或用户明确想要 slash command 行为时才使用。
4. 当委派有用时提及 agent。

有用的搜索：

```bash
rg -n "<query>" skills commands agents docs
find skills -maxdepth 2 -name SKILL.md | sort
```

### Install 指南

使用托管的 install 路径：

```bash
node scripts/install-plan.js --list-profiles
node scripts/install-plan.js --profile minimal --target claude --json
node scripts/install-apply.js --profile minimal --target claude --dry-run
```

对于特定 skill 的安装：

```bash
node scripts/install-plan.js --skills <skill-id> --target claude --json
node scripts/install-apply.js --skills <skill-id> --target claude --dry-run
```

警告用户不要叠加 plugin install 和完整的手工/profile install，除非他们刻意想要重复的 surface。

### 项目上手

当用户希望为目标仓库配置 ECC 时使用 `/project-init`。预期流程为：

1. 从项目文件检测技术栈
2. 解析 dry-run install plan
3. 检查现有的 `CLAUDE.md` 和 settings 文件
4. 在应用更改前先询问
5. 保持生成的指南最小化且针对该仓库

### 故障排查

先询问目标 harness 和 install 路径，然后检查：

- plugin install 元数据
- `.claude/`、`.cursor/`、`.codex/`、`.gemini/`、`.opencode/`、`.codebuddy/`、`.joycode/` 或 `.qwen/`
- `hooks/hooks.json`
- install-state 文件
- 相关的 command/skill 文件

对于仓库健康度，建议：

```bash
npm run harness:audit -- --format text
npm run observability:ready
npm test
```

## 输出模板

### 简短推荐

```text
使用 <skill-or-command>。它适合是因为 <原因>。

规范文件：<path>
验证方式：<command>
下一步：<一个具体动作>
```

### 搜索结果

```text
最佳匹配：
- <path>：<为何重要>
- <path>：<为何重要>

推荐：<先用哪个以及为什么>
```

### Install Plan 摘要

```text
检测到：<技术栈证据>
目标：<harness>
Plan：<profile/modules/skills>
Dry run：<command>
将更改：<paths>
应用前需要批准：<yes/no>
```

## 相关 surface

- `/project-init`：针对目标仓库的技术栈感知上手 plan
- `/harness-audit`：确定性的就绪度评分卡
- `/skill-health`：skill 质量审查
- `/skill-create`：从本地 git 历史生成新 skill
- `/security-scan`：检查 Claude/OpenCode 配置安全
