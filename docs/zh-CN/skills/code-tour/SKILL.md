---
name: code-tour
description: 创建 CodeTour `.tour` 文件——面向特定角色、带真实文件与行号锚点的分步讲解。用于新人上手导览、架构讲解、PR 导览、RCA 导览，以及结构化的“解释其工作原理”请求。
metadata:
  origin: ECC
---

# Code Tour

为代码库导览创建 **CodeTour** `.tour` 文件，可直接打开到真实文件与行范围。tour 存放在 `.tours/` 目录下，采用 CodeTour 格式，而非临时拼凑的 Markdown 笔记。

一次好的 tour 是为特定读者讲述的叙事：
- 他们在看什么
- 为什么重要
- 他们接下来应该沿哪条路径走

只创建 `.tour` JSON 文件。不要在此 skill 中修改源代码。

## 何时使用

在以下情况使用此 skill：
- 用户要求 code tour、onboarding tour、architecture walkthrough 或 PR tour
- 用户说“解释 X 是如何工作的”，并希望得到一个可复用的引导式产物
- 用户希望为新工程师或审查者提供一条上手路径
- 任务更适合用引导式序列而非扁平摘要来呈现

示例：
- 为新维护者提供 onboarding
- 针对某个服务或 package 的架构导览
- 以变更文件为锚点的 PR 审查讲解
- 展示失败路径的 RCA 导览
- 关于信任边界与关键检查的安全审查导览

## 何时不应使用

| 与其使用 code-tour | 不如使用 |
| --- | --- |
| 一次性的聊天解释就够了 | 直接回答 |
| 用户想要散文式文档，而不是 `.tour` 产物 | `documentation-lookup` 或编辑仓库文档 |
| 任务是实现或重构 | 直接做实现工作 |
| 任务是广泛的代码库 onboarding，且不需要 tour 产物 | `codebase-onboarding` |

## 工作流

### 1. 探索

在编写任何内容之前先探索仓库：
- README 与 package/app 入口点
- 文件夹结构
- 相关配置文件
- 如果 tour 聚焦于 PR，查看变更的文件

在理解代码的形态之前不要开始编写步骤。

### 2. 推断读者

根据请求确定角色与深度。

| 请求形态 | 角色 | 建议深度 |
| --- | --- | --- |
| “onboarding”、“新人入职” | `new-joiner` | 9-13 步 |
| “快速 tour”、“vibe check” | `vibecoder` | 5-8 步 |
| “架构” | `architect` | 14-18 步 |
| “导览这个 PR” | `pr-reviewer` | 7-11 步 |
| “为什么会出问题” | `rca-investigator` | 7-11 步 |
| “安全审查” | `security-reviewer` | 7-11 步 |
| “解释这个功能如何工作” | `feature-explainer` | 7-11 步 |
| “调试这条路径” | `bug-fixer` | 7-11 步 |

### 3. 读取并验证锚点

每个文件路径与行号锚点都必须真实存在：
- 确认文件存在
- 确认行号在范围内
- 如果使用 selection，验证确切的代码块
- 如果文件容易变动，优先使用基于 pattern 的锚点

绝不要猜测行号。

### 4. 编写 `.tour`

写入到：

```text
.tours/<persona>-<focus>.tour
```

保持路径确定且可读。

### 5. 验证

在完成之前确认：
- 每个被引用的路径都存在
- 每一行或每个 selection 都有效
- 第一步锚定到一个真实的文件或目录
- `ref` 指向一个实际包含 tour 所引用全部文件的 branch 或 commit（见下文）
- tour 讲述了一个连贯的故事，而不是罗列文件

## `ref` 字段

`ref` 将 tour 绑定到一个 git branch 或 commit。它比看起来更重要：当 `ref` 不是读者当前 checkout 的 branch 时，CodeTour 会从该版本对应的 git 内容中打开每一步的文件，而不是从磁盘上的文件打开。如果某个文件不在该版本中，该步骤将无法打开——读者会看到 *“The editor could not be opened because the file was not found”*，尽管文件就在那里。tour 及其注释仍然会显示，所以真正的原因很容易被忽略。

按 tour 类型选择 `ref`：

| tour 类型 | 将 `ref` 设为 |
| --- | --- |
| PR tour | PR branch——绝不能是 base branch |
| onboarding / architecture | 读者将所在的 branch（通常是 `main`），或留空 |
| 不确定 | 留空 `ref`，让 CodeTour 直接从磁盘读取文件 |

PR 场景是最常见的陷阱：PR 通常会新增文件，而新文件在 base branch 上尚不存在。把 `ref` 指向 base（例如 `develop`）会导致每个位于新文件上的步骤都打不开。

在完成之前，确认每一步的文件在你所选 `ref` 上确实存在。

## 步骤类型

### 内容

谨慎使用，通常仅用于收尾步骤：

```json
{ "title": "Next Steps", "description": "You can now trace the request path end to end." }
```

不要让第一步只有内容。

### 目录

用于将读者引导到某个模块：

```json
{ "directory": "src/services", "title": "Service Layer", "description": "The core orchestration logic lives here." }
```

### 文件 + 行号

这是默认的步骤类型：

```json
{ "file": "src/auth/middleware.ts", "line": 42, "title": "Auth Gate", "description": "Every protected request passes here first." }
```

### 选区

当某个代码块比整个文件更重要时使用：

```json
{
  "file": "src/core/pipeline.ts",
  "selection": {
    "start": { "line": 15, "character": 0 },
    "end": { "line": 34, "character": 0 }
  },
  "title": "Request Pipeline",
  "description": "This block wires validation, auth, and downstream execution."
}
```

### 模式

当确切行号可能漂移时使用：

```json
{ "file": "src/app.ts", "pattern": "export default class App", "title": "Application Entry" }
```

### URI

在有帮助时用于 PR、issue 或文档：

```json
{ "uri": "https://github.com/org/repo/pull/456", "title": "The PR" }
```

## 编写规则：SMIG

每段 description 都应回答：
- **Situation**：读者在看什么
- **Mechanism**：它如何工作
- **Implication**：为什么它对该角色重要
- **Gotcha**：聪明的读者可能会错过什么

保持 description 紧凑、具体，并扎根于实际代码。

## 叙事形态

除非任务明显需要不同的形态，否则使用这条主线：
1. 定位
2. 模块地图
3. 核心执行路径
4. 边缘情况或陷阱
5. 收尾 / 下一步动作

tour 应该感觉像一条路径，而不是一份清单。

## 示例

```json
{
  "$schema": "https://aka.ms/codetour-schema",
  "title": "API Service Tour",
  "description": "Walkthrough of the request path for the payments service.",
  "ref": "main",
  "steps": [
    {
      "directory": "src",
      "title": "Source Root",
      "description": "All runtime code for the service starts here."
    },
    {
      "file": "src/server.ts",
      "line": 12,
      "title": "Entry Point",
      "description": "The server boots here and wires middleware before any route is reached."
    },
    {
      "file": "src/routes/payments.ts",
      "line": 8,
      "title": "Payment Routes",
      "description": "Every payments request enters through this router before hitting service logic."
    },
    {
      "title": "Next Steps",
      "description": "You can now follow any payment request end to end with the main anchors in place."
    }
  ]
}
```

## 反模式

| 反模式 | 修复方式 |
| --- | --- |
| 扁平的文件清单 | 讲述一个步骤之间有依赖关系的故事 |
| 泛泛的描述 | 点明具体的代码路径或模式 |
| 猜测的锚点 | 先验证每个文件和每一行 |
| quick tour 步骤过多 | 大幅删减 |
| 第一步只有内容 | 将第一步锚定到真实的文件或目录 |
| 角色错配 | 为真实读者编写，而不是泛泛的工程师 |

## 最佳实践

- 步骤数量应与仓库规模和角色深度成比例
- 用 directory 步骤做定位，用 file 步骤承载实质内容
- 对于 PR tour，优先覆盖变更文件
- 对于 monorepo，限定在相关 package 范围内，而不是导览所有内容
- 以读者现在能做什么来收尾，而不是回顾

## 相关 Skills

- `codebase-onboarding`
- `coding-standards`
- `council`
- 官方上游格式：`microsoft/codetour`
