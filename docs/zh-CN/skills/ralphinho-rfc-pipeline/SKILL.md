---
name: ralphinho-rfc-pipeline
description: RFC 驱动的多 agent DAG 执行模式，配备 quality gates、merge queues 和 work unit orchestration。
metadata:
  origin: ECC
---

# Ralphinho RFC Pipeline

受 [humanplane](https://github.com/humanplane) 风格的 RFC 分解模式与 multi-unit orchestration 工作流启发。

当一个特性过大、无法在一次 agent 处理中完成，且必须拆分为可独立验证的 work unit 时，请使用此 skill。

## Pipeline 阶段

1. RFC 接入
2. DAG 分解
3. Unit 分配
4. Unit 实现
5. Unit 验证
6. Merge queue 与集成
7. 最终系统验证

## Unit Spec 模板

每个 work unit 应包含：
- `id`
- `depends_on`
- `scope`
- `acceptance_tests`
- `risk_level`
- `rollback_plan`

## 复杂度分级

- Tier 1：独立的文件编辑，deterministic 测试
- Tier 2：多文件行为变更，中等集成风险
- Tier 3：schema/auth/perf/security 变更

## 每个 Unit 的 Quality Pipeline

1. 调研
2. 实现计划
3. 实现
4. 测试
5. 评审
6. merge 就绪报告

## Merge Queue 规则

- 绝不 merge 带有未解决依赖失败的 unit。
- 始终将 unit 分支 rebase 到最新的集成分支上。
- 每次排队 merge 后，重新运行 integration test。

## 恢复

如果某个 unit 停滞：
- 从 active 队列中移出
- snapshot 发现
- 重新生成收窄后的 unit scope
- 使用更新后的约束重试

## 输出

- RFC 执行 log
- unit 评分卡
- 依赖图 snapshot
- 集成风险摘要
