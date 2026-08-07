---
name: project-flow-ops
description: 跨 GitHub 和 Linear 管理执行流程：通过对 issue 和 pull request 进行分流、关联进行中的工作，并让 GitHub 保持面向公众，而 Linear 作为内部执行层。当用户需要 backlog 控制、PR 分流或 GitHub 与 Linear 之间的协调时使用。
metadata:
  origin: ECC
---

# Project Flow Ops

本 skill 将互不关联的 GitHub issue、PR 和 Linear 任务整合为一条执行流程。

当问题在于协调而非编码时，请使用本 skill。

## 适用场景

- 对开放的 PR 或 issue backlog 进行分流
- 决定哪些事项应归入 Linear，哪些应仅保留在 GitHub
- 将进行中的 GitHub 工作关联到内部执行通道
- 将 PR 分类为 merge、port/rebuild、close 或 park
- 审查 review 评论、CI 失败或 stale issue 是否正在阻塞执行

## 运作模型

- **GitHub** 是面向公众和社区的事实来源
- **Linear** 是进行中已排期工作的内部执行事实来源
- 并非每个 GitHub issue 都需要对应的 Linear issue
- 仅当工作满足以下条件时才创建或更新 Linear：
  - 进行中
  - 已委派
  - 已排期
  - 跨职能
  - 足够重要，需要在内部跟踪

## 核心工作流程

### 1. 首先查看公开层面的信息

收集：

- GitHub issue 或 PR 的状态
- 作者与分支状态
- review 评论
- CI 状态
- 关联的 issue

### 2. 对工作进行分类

每个事项最终都应归入以下状态之一：

| 状态 | 含义 |
|-------|---------|
| Merge | 自包含、符合策略、可就绪 |
| Port/Rebuild | 想法有价值，但应在 ECC 内部手动重新落地 |
| Close | 方向错误、陈旧、不安全或重复 |
| Park | 可能有价值，但目前未排期 |

### 3. 决定是否有必要使用 Linear

仅在以下情况下才创建或更新 Linear：

- 执行已被主动规划
- 涉及多个 repo 或工作流
- 工作需要内部归属或排序
- 该 issue 是更大型 program 通道的一部分

不要机械地镜像所有内容。

### 4. 保持两个系统一致

当工作处于进行中时：

- GitHub issue/PR 应公开说明当前进展
- Linear 应在内部跟踪负责人、优先级和执行通道

当工作发布或被拒绝时：

- 将公开的处理结果发布回 GitHub
- 相应地标记 Linear 任务

## 审查规则

- 绝不要仅凭标题、摘要或信任就 merge；应查看完整 diff
- 来自外部源的功能在有价值但非自包含时，应在 ECC 内部重新构建
- CI 亮红意味着需要分类并修复或阻塞；不要假装它已 merge 就绪
- 如果真正的阻塞在于产品方向，应明确指出，而不是拿工具当挡箭牌

## 输出格式

返回：

```text
PUBLIC STATUS
- issue / PR state
- CI / review state

CLASSIFICATION
- merge / port-rebuild / close / park
- one-paragraph rationale

LINEAR ACTION
- create / update / no Linear item needed
- project / lane if applicable

NEXT OPERATOR ACTION
- exact next move
```

## 典型使用场景

- "审查开放的 PR backlog，告诉我要 merge 还是重新构建"
- "将 GitHub issue 映射到我们的 ECC 1.x 和 ECC 2.0 program 通道"
- "检查这个是否需要创建 Linear issue，还是应仅保留在 GitHub"
