---
name: intent-driven-development
description: 将模糊或高影响力的产品与工程变更转化为有范围界定、可验证的验收标准，在实现之前或与之同步进行。当用户要求澄清某个功能、定义验收标准、降低某项安全/数据/迁移/集成变更的风险、为另一个 agent 准备实现需求，或让复杂请求变得可测试时使用。对于琐碎的编辑、简单的修复、正在进行的 debug、code review，或验收条件已经清晰的实现请求，不要触发本 skill，除非用户显式调用。
---

# Intent-Driven Development

产出有用的验收标准，而非把规范变成繁文缛节。先检查可用上下文，暴露真正的模糊点，并选择与工作本身及其风险相匹配的验证方法。

## 何时激活

- 用户要求澄清某个功能、定义验收标准，或在实现之前降低某项变更的风险
- 请求涉及安全、认证、持久化数据、migration、外部 API 或合规
- 用户希望为另一个 agent 或团队准备交接产物
- 请求足够模糊，以至于期望结果尚不可观测或不可测试
- 用户通过 `/intent-driven-development` 显式调用本 skill

对于琐碎的编辑、简单的单行修复、正在进行的 debug 会话、code review 请求，或验收条件已经清晰的实现请求，不要激活本 skill。

## 工作原理

1. **先检查上下文** —— 在提出任何问题之前，先读取仓库、文档、schema 和测试基础设施以获取技术事实，同时将产品/业务约束视为只能由用户或产品产物提供的内容
2. **选择深度** —— 根据风险特征选择 Quick Capture（3-7 条标准，低/中等风险）或 Full Acceptance Brief（安全、数据、migration、跨系统变更）
3. **最少提问** —— 只提出那些答案无法被推断且会实质性改变范围或行为的问题
4. **编写可观测的标准** —— 每条 AC-NNN 描述一个起始条件、触发条件、期望结果、禁止的副作用、验证方法和优先级；不得使用没有证据支撑的 "correctly" 或 "securely" 等模糊措辞
5. **继续推进或交接** —— 对于没有阻塞风险的清晰请求，记录标准并继续；对于有风险的变更，呈现阻塞项并等待确认
6. **处理修订** —— 如果某条 AC 在实现过程中因架构约束而失败，将其标记为 `[revised]`，更新范围或验证方法，递增修订编号，并仅重新呈现已变更的标准

## 示例

**Quick Capture —— "为 dashboard 添加 CSV 导出"**

```
Goal: Authenticated users can download dashboard data as a CSV file.
In scope: Export of currently filtered rows; filename includes date.
Out of scope: Scheduled exports, email delivery, Excel format.
Assumptions: Max row count is under 10k; no PII in exported fields.

AC-001: Export generates file with correct headers
- Scenario: authenticated user, at least one data row visible
- Action: click "Export CSV"
- Expected: browser downloads file with columns [id, name, created_at]
- Must not: expose internal fields or rows belonging to other users
- Verification: automated integration test + manual schema spot-check
- Priority: Required
```

**Full Acceptance Brief 触发条件 —— "将用户认证迁移到 OAuth"**

认证变更 + 外部依赖 + 现有 session 数据 → Full Brief，包含 Risk Review 表格、关于 session 失效策略的阻塞决策，以及显式的回滚 AC。

**已有 spec 评审 —— 用户粘贴一份 PRD**

本 skill 会检查其是否缺失范围边界、是否存在不可验证的需求（"the system shall be fast"）以及隐含假设，然后返回修正后的或补充性的标准，而无需重新启动发现流程。

## 操作规则

1. 在提出可以在本地发现的技术事实之前，先检查可用的仓库、文档、issue、设计和测试上下文。
2. 不要从代码中推断产品或业务约束。业务规则、合规与监管义务、合同 SLA、定价、数据保留策略、优先级排序以及目标用户无法从仓库中读取。在用户提供它们之前，或由权威的产品产物（PRD、合同、策略文档）明确陈述之前，应将其视为未知。将其记录为待确认的假设，绝不要当作已发现的事实。仓库告诉你系统今天是如何运作的，而不是业务要求它做什么。
3. 只提出那些答案必需且无法安全推断的问题。当能节省不必要的来回时，将简短的相关问题分组提出。
4. 默认不要阻塞实现。当用户要求实现一个足够清晰的变更时，简要记录关键假设和验收标准，然后继续推进或将其交给实现 workflow。
5. 仅当未解决的决策可能造成实质性的安全暴露、数据丢失、不可逆的 migration、合同/API 破坏、重大成本或破坏性的外部操作时，才要求在继续之前获得用户的显式确认。
6. 除非用户要求，或当前仓库 workflow 明确需要，否则不要将验收文档写入仓库、不要修改项目文件、不要创建 branch、不要 commit、不要调用其他 skill。
7. 将自动化测试视为证据，而非真理。在可靠且相称时优先使用自动化；在自动化无法确立结果时，允许人工的 UX、无障碍、安全、法律或运维验证。
8. 永远不要在验收标准、fixture、示例或保存的产物中包含真实的 secret、credential、token、私钥、个人数据或敏感的生产 payload。使用脱敏或合成的取值。
9. 没有显式授权和已识别的安全环境时，不要运行破坏性测试、migration、安全探针、负载测试、付费外部调用，或针对生产/实时数据的操作。
10. 当某条验收标准由于实现过程中发现的架构、平台或外部约束而无法满足时，不要静默地丢弃或绕过它。更新受影响的标准（将其标记为 `[revised]`、说明约束、并调整范围或验证方法），递增修订编号，并在继续之前仅向用户重新呈现已变更的标准。仅当修订改变了某个阻塞决策或实质性地降低了安全或正确性保证时，才要求显式确认。

## 选择深度

使用最小可用的输出。

### Quick Capture

用于清晰但非琐碎、风险为低或中等的变更。产出：

- Goal
- In scope / out of scope
- Assumptions
- 3-7 条带有验证方法的验收标准
- Blocking questions，如有

除非存在来自操作规则的阻塞风险，或用户明确要求先产出规范，否则不要为获批而延迟实现。

### Full Acceptance Brief

用于模糊的、跨系统的、安全敏感的、改动数据的、migration 类的、合规类的或高成本的变更，或当用户请求交接产物时。产出下面的完整模板，并在风险实现之前就未解决的阻塞决策请求确认。

### 已有规范评审

当用户已经提供了一份 PRD、issue、计划或验收标准时：

1. 评审它，而不是重新启动发现流程。
2. 识别缺失的范围边界、不安全的假设、矛盾以及不可验证的需求。
3. 返回修正后的或补充性的标准。

## Workflow

### 1. 确立目标与风险

提取或询问：

- 用户或系统的可观测结果。
- 受影响的参与者。
- 主要的失败后果。
- 实际适用的风险维度：安全/隐私、持久化数据、兼容性/API、migration、外部依赖、成本、并发、性能、可用性/无障碍。

避免就不相关的风险提出泛泛的问题。

### 2. 发现上下文

当本地或相连的产物可用时，仅检查所需的内容：

- 现有行为以及直接相关的文件或接口。
- 仓库约定、产品文档、API 契约、数据 schema 或 migration 历史。
- 现有的验证基础设施和切实可用的命令。
- 外部依赖，以及它们是否可以独立测试。

将发现的事实与用户提供的假设分开记录。如果上下文无法检查，说明哪些是未知的，并提出有针对性的问题。

仓库揭示技术事实——系统今天如何运作、其约定和契约。它并不揭示产品或业务约束：业务规则、合规与监管义务、合同 SLA、定价、数据保留策略、优先级排序以及目标用户。永远不要从代码或命名中重建这些内容。只能从用户或权威的产品产物中获取它们，在此之前将其列为待确认的假设。

### 3. 定义范围

陈述：

- Goal：一句话描述预期结果。
- In scope：本变更必须交付的行为。
- Out of scope：明确排除的、有诱惑力的相邻工作。
- Assumptions：尚未证实的声明。
- Blocking decisions：实质性影响安全性或行为的未解决选择。

### 4. 编写验收标准

使用 `AC-001`、`AC-002` 等。每条标准必须描述可观测的行为和适当的验证方法；标准与测试不要求一一对应。

为每条适用的标准包含：

- 场景或起始条件。
- 动作或触发条件。
- 期望的可观测行为。
- 在有意义时，说明禁止的副作用。
- 验证方法：自动化测试、集成检查、人工 UX 评审、无障碍检查、安全评审、运维检查或干系人验收。
- 当验证可能影响数据、服务、成本或 secret 时，说明环境/安全约束。
- 优先级：required、important 或 optional。

不要使用诸如 "correctly"、"securely"、"fast"、"intuitive" 或 "robust" 等措辞，除非定义了可观测的证据或将其记录为人工评审判断。

### 5. 仅覆盖相关的边界

考虑以下类别，但仅包含适用的类别：

| 类别 | 何时包含 | 典型证据 |
| --- | --- | --- |
| Happy path | 新增或变更用户可见的行为 | 成功的 workflow 或状态转换 |
| Validation | 本变更接受输入 | 拒绝格式错误或边界值且不对其修改 |
| Authorization/隐私 | 数据或动作存在访问边界 | 拒绝访问且无敏感信息泄露 |
| 持久化/migration | 存储的数据或 schema 发生变更 | 向后读取、migration、回滚或备份行为 |
| 兼容性 | 公共 API、文件、事件或客户端可能破坏 | 现有契约或 fixture 仍然有效 |
| 失败恢复 | 存在网络、服务或异步失败 | 无部分状态，或清晰的 retry/降级行为 |
| Idempotency/并发 | 重复或同时写入是可能的 | 无重复副作用，或最终状态有效 |
| 性能 | 某个用户或服务阈值重要 | 已定义的测量条件和阈值 |
| UX/无障碍 | 有人与结果交互 | 键盘、反馈、错误恢复、视觉/人工评审 |

### 6. 呈现并继续

- 对于澄清/规范请求，呈现 brief 并仅就列出的阻塞项请求决策。
- 对于没有阻塞项的实现请求，作为工作的一部分呈现一份简明的标准摘要，并继续实现。
- 对于向另一个 agent 或团队交接，包含足够的上下文和验证细节，使他们能够行动而无需凭空发明需求。
- 仅在被请求时将 brief 保存到文件。当存在仓库认可的路径时使用该路径；否则在写入之前询问或说明所选的目标位置。

## 输出模板

对 Full Acceptance Brief 使用此模板。对 Quick Capture 省略不相关的章节。

```markdown
# Acceptance Brief: <Change Name>

**Status:** Draft | Approved | Implemented | Verified
**Revision:** <number>
**Prepared for:** <user/team/agent, when known>
**Approval required before risky work:** Yes | No - <reason>

## Revision Log

| Rev | Date | Changed criteria | Reason |
| --- | --- | --- | --- |
| 1 | <date> | — | Initial draft |

## Goal

<One observable outcome sentence.>

## Scope

**In scope**
- <behavior included>

**Out of scope**
- <adjacent work excluded>

## Context

**Discovered facts** (technical, verified from repository or artifact)
- <how the system behaves today, conventions, contracts>

**Product/business constraints** (supplied by user or product artifact, never inferred from code)
- <business rule, compliance/SLA obligation, retention policy, priority, target user — or "none supplied yet">

**Assumptions**
- <unverified claim to confirm or validate>

**Dependencies and constraints**
- <external service, local convention, compatibility obligation, environment limit>

## Risk Review

| Risk area | Applies? | Required handling |
| --- | --- | --- |
| Security/privacy | Yes/No | <redaction, authorization, review, etc.> |
| Persistent data/migration | Yes/No | <compatibility, backup, rollback, etc.> |
| External effects/cost | Yes/No | <sandbox/test environment/authorization> |
| Compatibility/API | Yes/No | <contract to preserve or version> |
| UX/accessibility | Yes/No | <manual or automated evidence> |

## Acceptance Criteria

### AC-001: <observable behavior>
- **Scenario:** <starting condition>
- **Action:** <single trigger>
- **Expected:** <observable result>
- **Must not:** <prohibited side effect, if applicable>
- **Verification:** <method and intended evidence>
- **Environment/safety:** <constraints, if applicable>
- **Priority:** Required | Important | Optional

## Blocking Decisions

- [ ] <only decisions that prevent safe or correct progress>

## Verification Plan

| Criterion | Verification evidence | Status |
| --- | --- | --- |
| AC-001 | <test/check/review command or evidence type> | Pending |
```

## 通过/失败示例

用这些来判断本 skill 是否真的产出了可验证的 brief，而不是规划性的文字。

**一条失败的验收标准**

```
AC-001: The export works correctly and is secure.
```

失败 —— "works correctly" 和 "secure" 不是可观测的，没有场景、触发条件、期望结果或验证方法，也没有说明什么不可以发生。读者无法判断实现是否满足了它。

**一条通过的验收标准**

```
AC-001: Export generates file with correct headers
- Scenario: authenticated user, at least one data row visible
- Action: click "Export CSV"
- Expected: browser downloads file with columns [id, name, created_at]
- Must not: expose internal fields or rows belonging to other users
- Verification: automated integration test + manual schema spot-check
- Priority: Required
```

通过 —— 一个具体的可观测结果、一个禁止的副作用，以及一个具名的验证方法。两个人对它是否被满足会达成一致。

**一条失败的上下文条目**

```
Discovered facts: Users on the free tier are limited to 100 exports per month.
```

失败 —— 按层级设定上限是一条业务规则。它不得出现在从代码推断的 Discovered facts 下；它属于 Product/business constraints，由用户提供，或被列为待确认的假设。

### 通过/失败评分标准

一份 brief 只有在每个答案都为 "是" 时才算通过。任何一个 "否" 都意味着在返回之前要修订。

- [ ] 每条必需的标准是否都有场景、可观测的期望结果和具名的验证方法？
- [ ] 所有模糊措辞（"correctly"、"secure"、"fast"、"robust"）是否都被替换为可观测的证据，或标记为人工判断？
- [ ] 产品/业务约束是否被列为已提供/假设的，没有从代码中静默推断？
- [ ] 范围是否明确，范围外项是否被具名？
- [ ] 阻塞决策是否仅限于实际上影响安全性或正确性的选择，而非偏好？

## 质量检查

在返回 brief 之前，检查：

- 目标描述的是一个结果，而非一个实现选择。
- 范围边界和假设是明确的。
- 每条必需的标准都是可观测的，或清晰地标记为人工判断。
- 安全、隐私、数据、兼容性、外部影响和 UX 风险仅在相关处被考虑，而非被静默忽略。
- 验证方法为有风险的操作识别安全环境。
- 没有 secret 或生产敏感信息被复制到输出中。
- 没有在没有理由或请求的情况下强加仓库修改或实现阻塞。

## 交接

当另一个规划或实现的 workflow 可用时，将验收 brief 或标准 ID 交给它。当没有专门的 workflow 时，直接提供 brief 作为实现参考。不要假设任何具名的 skill 或 tool 已安装。
