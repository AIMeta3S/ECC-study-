---
name: hermes-imports
description: 将本地 Hermes operator 工作流转换为经过脱敏处理的 ECC skill 与 release-pack artifact。在准备将 Hermes 工作流用于公开 ECC 复用、且需要避免泄露私有 workspace 状态、credentials 或本地专属路径时使用。
metadata:
  origin: ECC
---

# Hermes Imports

当需要将一个反复使用的 Hermes 工作流转变为可安全交付到 ECC 的内容时，使用此 skill。

Hermes 是 operator shell。ECC 是可复用的工作流层。Import 应当将稳定的模式从 Hermes 迁移到 ECC，但不迁移私有状态。

## 何时使用

- 一个 Hermes 工作流已重复足够多次，足以成为可复用的工作流。
- 一个本地 operator prompt 应当成为一个公开的 ECC skill。
- 一个 launch、内容、研究或工程工作流需要经过脱敏处理的交接文档。
- 一个工作流提到了本地路径、credentials、个人数据集或私有账户名，且这些必须在发布前移除。

## Import 规则

- 将本地路径转换为 repo-relative 路径或占位符。
- 用角色标签（如 `operator`、`default profile` 或 `workspace owner`）替换真实的账户名。
- 仅按 provider 名称描述 credential 需求。
- 保持示例聚焦且具备可操作性。
- 不要交付原始的 workspace 导出、token、OAuth 文件、health data、CRM data 或 finance data。
- 如果该工作流必须依赖私有状态才能讲清楚，就让它留在本地。

## 脱敏检查清单

在 commit 一个被 import 的工作流之前，扫描以下内容：

- 绝对路径，例如 `/Users/...`
- `~/.hermes` 路径（除非文档明确在解释本地 setup）
- API key、token、cookie、OAuth 文件或 bearer string
- 电话号码、私人邮箱地址以及个人联系关系图
- 客户名、家族名或尚未公开的账户名
- 营收、健康或 CRM 细节
- 包含来自私有系统的 tool 输出的原始 log

## 转换模式

1. 识别可重复的 operator loop。
2. 剥离私有的输入与输出。
3. 将本地路径改写为 repo-relative 示例。
4. 将一次性指令转化为 `When To Use` 章节和一段简短流程。
5. 加入具体的输出要求。
6. 在开启 PR 之前运行一次 secret 与本地路径扫描。

## 示例：Launch 交接

本地 Hermes prompt：

```text
Read my local workspace files and finalize launch copy.
```

ECC-safe 版本：

```text
Use the public release pack under docs/releases/<version>/.
Return one X thread, one LinkedIn post, one recording checklist, and the missing assets list.
```

## 示例：静默时段 Operator 任务

本地 Hermes job：

```text
Run my private inbox, finance, and content checks overnight.
```

ECC-safe 版本：

```text
Describe the scheduler policy, the quiet-hours window, the escalation rules, and the categories of checks. Do not include private data sources or credentials.
```

## 输出契约

返回：

- 候选的 ECC skill 名称
- 经过脱敏处理的工作流摘要
- 所需的公开输入
- 已移除的私有输入
- 剩余风险
- 应被创建或更新的文件
