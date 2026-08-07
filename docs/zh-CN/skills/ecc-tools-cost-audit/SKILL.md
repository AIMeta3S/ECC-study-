---
name: ecc-tools-cost-audit
description: 证据优先的 ECC Tools burn 与 billing 审计工作流。当需要调查 ECC Tools 仓库中失控的 PR 创建、quota 绕过、premium-model 泄漏、重复 job 或 GitHub App 成本飙升时使用。
metadata:
  origin: ECC
---

# ECC Tools Cost Audit

当用户怀疑 ECC Tools GitHub App 正在产生成本消耗、过度创建 PR、绕过 usage limit，或将免费用户路由到 premium 分析路径时，使用此 skill。

这是针对同级 [ECC-Tools](../../ECC-Tools) 仓库的专注运维工作流。它不是通用的 billing skill，也不是全仓库范围的 code review。

## Skill Stack

在相关时将以下 ECC 原生 skill 拉入工作流：

- `autonomous-loops` 用于跨越 webhook、queue、billing 与 retry 的有界多步骤审计
- `agentic-engineering` 用于将请求路径追踪为离散、可证明的单元
- `customer-billing-ops` 当仓库行为与客户影响计算必须清晰分离时使用
- `search-first` 在自行发明 helper 或重新实现仓库本地工具之前使用
- `security-review` 当涉及 auth、usage gate、entitlement 或 secret 时使用
- `verification-loop` 用于证明重跑安全性与修复后的确切状态
- `tdd-workflow` 当修复需要在 worker、router 或 billing 路径中获得回归覆盖时使用

## When To Use

- 用户提到 ECC Tools burn rate、PR 递归、过度创建的 PR、usage-limit 绕过或 premium-model 泄漏
- 任务位于同级 `ECC-Tools` 仓库，且依赖 webhook handler、queue worker、usage 预留、PR 创建逻辑或 paid-gate 强制执行
- 客户报告称 app 创建了过多 PR、错误计费，或分析了代码却未产生可用结果

## Scope Guardrails

- 在同级 `ECC-Tools` 仓库中工作，而不是在 `everything-claude-code` 中
- 除非用户明确要求修复，否则以只读方式开始
- 在追踪分析 burn 时，不要修改无关的 billing、checkout 或 UI 流程
- 将 app 生成的 branch 和 app 生成的 PR 视为危险信号的递归路径，直到证明并非如此
- 明确区分三件事：
  - 仓库侧 burn 根因
  - 面向客户的 billing 影响
  - 需要 backlog 跟进的产品或 entitlement 缺口

## Workflow

### 1. 冻结仓库范围

- 切换到同级 `ECC-Tools` 仓库
- 先检查 branch 与本地 diff
- 明确审计的具体范围：
  - webhook router
  - queue producer
  - queue consumer
  - PR 创建路径
  - usage 预留 / billing 路径
  - 模型路由路径

### 2. 先追踪入口，再做推测

- 先检查 `src/index.*` 或主 entrypoint
- 在提出修复建议之前映射每条 enqueue 路径
- 确认哪些 GitHub 事件共享同一 queue 类型
- 确认 push、pull_request、synchronize、comment 或手动重跑事件是否会汇聚到同一条昂贵路径

### 3. 追踪 worker 与副作用

- 检查处理分析的 queue consumer 或定时 worker
- 确认排队分析是否总是以以下方式结束：
  - 创建 PR
  - 创建 branch
  - 文件更新
  - premium model 调用
  - usage 递增
- 如果分析可能先消耗 token 然后在输出持久化之前失败，将其归类为 burn-with-broken-output

### 4. 审计高信号 burn 路径

#### PR 倍增

- 检查 PR helper 与 branch 命名
- 检查去重、synchronize 事件处理以及现有 PR 复用
- 如果 app 生成的 branch 可以重新进入分析，将其视为 priority-0 递归风险

#### Quota 绕过

- 检查 quota 检查位置与 usage 预留或递增位置
- 如果在 enqueue 之前检查 quota，但仅在 worker 内部扣费，则将并发的入口通过视为真实竞态

#### Premium-model 泄漏

- 检查模型选择、tier 分支与 provider 路由
- 验证当存在 premium key 时，免费或达上限的用户是否仍能命中 premium analyzer

#### Retry burn

- 检查 retry 循环、重复 queue job 与确定性失败重跑
- 如果同一个非瞬时错误会反复消耗分析，请在质量改进之前先修复它

### 5. 按 burn 顺序修复

如果用户要求代码变更，请按以下顺序优先修复：

1. 停止自动 PR 倍增
2. 停止 quota 绕过
3. 停止 premium 泄漏
4. 停止重复 job 扇出与无意义 retry
5. 关闭重跑/更新安全缺口

将本轮修复限制在一到三处直接修改，除非同一根因明确跨越多个文件。

### 6. 用最小的证明步骤验证

- 仅重跑覆盖已变更路径的目标 test 或 integration 切片
- 验证 burn 路径当前是否：
  - 已阻止
  - 已去重
  - 已降级为更便宜的分析
  - 或已提前拒绝
- 准确陈述最终状态：
  - 已本地变更
  - 已本地验证
  - 已 push
  - 已 deploy
  - 仍受阻

## 高信号失败模式

### 1. 所有触发器共用一种 queue 类型

如果 push、PR sync 与手动审计都 enqueue 同一 job，而 worker 总是创建 PR，则分析等同于 PR 垃圾轰炸。

### 2. enqueue 之后的 usage 预留

如果在入口检查 usage，但仅在 worker 中递增，则并发请求可能全部通过 gate 并超出 quota。

### 3. 免费层命中 premium 路径

如果免费的排队 job 在 key 存在时仍能路由到 Anthropic 或其他 premium provider，这就是真实的支出泄漏——即使用户从未看到 premium 结果。

### 4. app 生成的 branch 重新进入 webhook

如果 `pull_request.synchronize`、branch push 或 comment 触发的运行在 app 拥有的 branch 上触发，app 可能递归地分析自身输出。

### 5. 在持久化安全之前执行昂贵工作

如果系统可能先消耗 token 然后在 PR 创建、文件更新或 branch 冲突时失败，它就是在不交付价值的情况下消耗成本。

## Pitfalls

- 不要以宽泛的仓库漫游开始；先理清 webhook -> queue -> worker
- 不要将客户 billing 推断与有代码支撑的产品事实混为一谈
- 在最高 burn 路径得到控制之前，不要修复低价值质量问题
- 在狭窄的证明步骤被重跑之前，不要声称 burn 已修复
- 除非用户要求，否则不要 push 或 deploy
- 不要触碰正在进行中的无关仓库本地变更

## Verification

- 根因引用确切的文件路径与代码区域
- 修复按 burn 影响排序，而非代码整洁度
- 证明命令已命名
- 最终状态区分本地变更、验证、push 与 deployment
