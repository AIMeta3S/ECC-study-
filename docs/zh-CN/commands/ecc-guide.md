---
description: 从实时仓库层面导航 ECC 当前的 agents、skills、commands、hooks、install profiles 和 docs。
---

# /ecc-guide

将此命令用作 Everything Claude Code 的对话式导航图。它应帮助用户为当前任务找到合适的 ECC 功能面，而无需倾倒整个 README 或过期的 catalog 计数。

## 用法

```text
/ecc-guide
/ecc-guide setup
/ecc-guide skills
/ecc-guide commands
/ecc-guide hooks
/ecc-guide install
/ecc-guide find: <query>
/ecc-guide <feature-or-file-name>
```

## 操作规则

1. 当 checkout 可用时，在回答前先读取当前仓库文件。
2. 优先使用当前文件系统/catalog 数据，而非硬编码的计数。
3. 保持首个回答简短，然后提供具体的下钻路径。
4. 将用户链接到权威文件，而不是复制长段落。
5. 不要虚构不存在的 commands、skills、agents 或 install profiles。

## 要检查的内容

将这些文件用作权威地图：

- `README.md`：install 路径、reset/uninstall 指引，以及高层定位
- `AGENTS.md`：贡献者和项目结构指引
- `agent.yaml`：导出的 agent 和 command 功能面
- `commands/`：维护的 slash-command shim
- `skills/*/SKILL.md`：可复用的 skill 工作流
- `agents/*.md`：用于 delegation 的 agent 角色
- `hooks/README.md` 和 `hooks/hooks.json`：hook 行为
- `manifests/install-*.json`：选择性 install 的 modules、components 和 profiles
- `scripts/ci/catalog.js --json`：在 ECC 内运行时获取实时 catalog 计数

## 响应模式

### 无参数

给出一个紧凑的菜单：

- setup 和 install
- 选择 skills
- command 兼容性 shim
- agents 与 delegation
- hooks 与安全
- 排查 install 问题
- 查找特定功能

然后询问他们接下来想做什么。

### 主题查找

对于 `skills`、`commands`、`hooks`、`install` 或 `agents` 等主题：

1. 用 3-6 个要点总结当前功能面。
2. 指向权威目录/文件。
3. 建议一两个可用于验证状态的命令。
4. 除非用户要求，否则避免给出详尽列表。

### 搜索模式

对于 `find: <query>`：

1. 使用 `rg` 搜索相关文件。
2. 按功能面对结果分组：skills、commands、agents、rules、docs、hooks。
3. 首先返回最匹配的结果，并附上文件路径。
4. 为每个匹配项推荐下一步操作。

### 功能查找

对于特定的功能名：

1. 首先检查确切路径，例如 `skills/<name>/SKILL.md`、`commands/<name>.md` 和 `agents/<name>.md`。
2. 如果精确查找失败，使用 `rg` 搜索。
3. 解释该功能的作用、使用时机，以及哪个文件是权威文件。
4. 仅当相邻功能能减少混淆时才提及它们。

## 相关命令

- `/project-init`：面向目标项目的、技术栈感知的 ECC onboarding
- `/harness-audit`：确定性的仓库就绪度评分
- `/skill-health`：skill 质量检查
- `/skill-create`：从本地 git 历史提取新 skill
- `/security-scan`：Claude/OpenCode 配置安全审查
