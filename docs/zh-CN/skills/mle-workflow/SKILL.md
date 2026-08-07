---
name: mle-workflow
description: 生产级机器学习工程 workflow，涵盖 data contract、可复现训练、模型评估、部署、monitoring 和 rollback。当构建、审查或加固超越一次性 notebook 的 ML 系统时使用。
metadata:
  origin: ECC
---

# 机器学习工程 Workflow

使用本 skill 将模型工作转化为生产级 ML 系统，具备清晰的 data contract、可重复的训练、可衡量的 quality gate、可部署的 artifact 以及运维 monitoring。

## 何时启用

- 规划或审查生产级 ML feature、model refresh、ranking system、recommender、classifier、embedding workflow 或 forecasting pipeline
- 将 notebook 代码转换为可复用的训练、评估、batch inference 或 online inference pipeline
- 设计模型 promotion criteria、offline/online eval、experiment tracking 或 rollback 路径
- 调试由 data drift、label leakage、stale feature、artifact mismatch 或训练与 serving 逻辑不一致导致的失败
- 添加 model monitoring、canary rollout、shadow traffic 或部署后的质量检查

## 范围校准

仅使用适合当前系统的轨道。本 skill 对 ranking、search、recommendations、classifiers、forecasting、embeddings、LLM workflow、anomaly detection 和 batch analytics 都有用，但不应将一种架构强加于所有场景。

- 不要假设每个模型都有 supervised label、online serving、feature store、PyTorch、GPU、人工审查、A/B test 或实时反馈。
- 当 data contract、baseline、eval 脚本和 rollback note 即可使变更可审查时，不要添加重量级的 MLOps 机制。
- 当项目缺少 label、延迟结果、slice 定义、production 流量或 monitoring 归属时，务必将假设显式说明。
- 将示例视为可替换的脚手架。用项目原生的对应物替换 metric、serving 模式、数据存储和 rollout 机制。

## 相关 Skill

- `python-patterns` 和 `python-testing` 用于 Python 实现和 pytest 覆盖
- `pytorch-patterns` 用于深度学习模型、data loader、设备处理和训练循环
- `eval-harness` 和 `ai-regression-testing` 用于 promotion gate 和 agent 辅助的 regression 检查
- `database-migrations`、`postgres-patterns` 和 `clickhouse-io` 用于数据存储和分析面
- `deployment-patterns`、`docker-patterns` 和 `security-review` 用于 serving、secret、container 和生产加固

## 复用 SWE Surface

不要将 MLE 视为独立于软件工程的领域。多数 ECC SWE workflow 都可直接应用于 ML 系统，且往往具有更严格的失败模式：

推荐的 `minimal --with capability:machine-learning` 安装方式会保留核心 agent surface 与本 skill 并存。对于仅 skill 或 agent 受限的 harness，在目标支持 agent 的地方将 `skill:mle-workflow` 与 `agent:mle-reviewer` 配对使用。

| SWE surface | MLE 用途 |
|-------------|---------|
| `product-capability` / `architecture-decision-records` | 将模型工作转化为显式的 product contract，并记录不可逆的 data、model 和 rollout 选择 |
| `repo-scan` / `codebase-onboarding` / `code-tour` | 在引入并行的 ML stack 之前，先找到现有的训练、feature、serving、eval 和 monitoring 路径 |
| `plan` / `feature-dev` | 将模型变更按 product capability 划分范围，包含 data、eval、serving 和 rollback 阶段 |
| `tdd-workflow` / `python-testing` | 在实现之前测试 feature transform、split 逻辑、metric 计算、artifact 加载和 inference schema |
| `code-reviewer` / `mle-reviewer` | 审查代码质量以及 ML 特有的 leakage、可复现性、promotion 和 monitoring 风险 |
| `build-fix` / `pr-test-analyzer` | 诊断损坏的 CI、flaky eval、缺失的 fixture 以及环境特定的模型或依赖失败 |
| `quality-gate` / `test-coverage` | 要求为 transform、metric、inference contract、promotion gate 和 rollback 行为提供自动化证据 |
| `eval-harness` / `verification-loop` | 将 offline metric、slice 检查、latency 预算和 rollback 演习转化为可重复的 gate |
| `ai-regression-testing` | 将每个 production bug 保留为 regression：缺失 feature、stale label、损坏的 artifact、schema drift 或 serving mismatch |
| `api-design` / `backend-patterns` | 设计 prediction API、batch job、幂等的 retraining endpoint 和 response envelope |
| `database-migrations` / `postgres-patterns` / `clickhouse-io` | 版本化 label、feature snapshot、prediction log、experiment metric 和 drift analytics |
| `deployment-patterns` / `docker-patterns` | 打包可复现的训练与 serving 镜像，附带 health check、资源限制和 rollback |
| `canary-watch` / `dashboard-builder` | 通过 model-version、slice、drift、latency、成本和 delayed-label dashboard 让 rollout 健康状况可见 |
| `security-review` / `security-scan` | 检查 model artifact、notebook、prompt、dataset 和 log 中是否存在 secret、PII、不安全的反序列化和供应链风险 |
| `e2e-testing` / `browser-qa` / `accessibility` | 测试消费 prediction 的关键 product flow，包括 explainability 和 fallback UI 状态 |
| `benchmark` / `performance-optimizer` | 测量吞吐量、p95 latency、内存、GPU 利用率以及每次 prediction 或 retrain 的成本 |
| `cost-aware-llm-pipeline` / `token-budget-advisor` | 按 quality、latency 和 budget 路由 LLM/embedding 工作负载，而不是默认使用最大的模型 |
| `documentation-lookup` / `search-first` | 在编码之前核实当前 library 在 model serving、feature store、vector DB 和 eval 工具上的行为 |
| `git-workflow` / `github-ops` / `opensource-pipeline` | 将 MLE 变更打包供审查，附上明确的范围、排除生成的 artifact，并提供可复现的测试证据 |
| `strategic-compact` / `dmux-workflows` | 将长周期的 ML 工作拆分为并行轨道：data contract、eval harness、serving 路径、monitoring 和文档 |

## 十个 MLE 任务仿真

在规划或审查 MLE 工作时，将这些仿真用作覆盖检查。一个强大的 MLE workflow 应将每项任务简化为显式的 contract、可复用的 SWE surface、自动化证据和可审查的 artifact。

| ID | 常见 MLE 任务 | 简化的 ECC 路径 | 必需产出 | 覆盖的 Pipeline 轨道 |
|----|-----------------|----------------------|-----------------|------------------------|
| MLE-01 | 为模糊的 prediction、ranking、recommender、classifier、embedding 或 forecast capability 构建框架 | `product-capability`, `plan`, `architecture-decision-records`, `mle-workflow` | Iteration Compact，命名谁在意、decision owner、success metric、不可接受的错误、假设、约束和首个实验 | product contract、stakeholder loss、risk、rollout |
| MLE-02 | 定义 metric 目标、label、数据源和 mistake budget | `repo-scan`, `database-reviewer`, `database-migrations`, `postgres-patterns`, `clickhouse-io` | 包含 entity grain、label 时序、label confidence、feature 时序、point-in-time join、split 策略和 dataset snapshot 的 data 与 metric contract | data contract、metric design、leakage、可复现性 |
| MLE-03 | 在增加复杂性之前构建 baseline 模型和 scoring 路径 | `tdd-workflow`, `python-testing`, `python-patterns`, `code-reviewer` | 包含 confusion matrix、calibration 说明、latency/成本估算、已知弱点的 baseline scorer，以及针对 score 形状和确定性的测试 | baseline、scoring、testing、serving parity |
| MLE-04 | 从关于哪些因素区分结果的假设中生成 feature | `python-patterns`, `pytorch-patterns`, `docker-patterns`, `deployment-patterns` | 涵盖 signal source、缺失值、outlier、相关性、leakage 检查和 train/serve 等价性的 feature 计划和 transform 模块 | feature pipeline、leakage、training、artifact |
| MLE-05 | 在 tradeoff 下调整 threshold、config 和模型复杂度 | `eval-harness`, `ai-regression-testing`, `quality-gate`, `test-coverage` | 比较 precision、recall、F1、AUC、calibration、group slice、latency、成本、复杂度和可接受错误类别的 threshold/config 报告 | evaluation、threshold、promotion、regression |
| MLE-06 | 运行 error analysis 并将错误转化为下一个实验 | `eval-harness`, `ai-regression-testing`, `mle-reviewer`, `silent-failure-hunter` | 针对 false positive、false negative、模糊 label、stale feature、缺失 signal 和 bug trace 的 error cluster 报告，并捕获经验教训 | error analysis、bug trace、iteration、regression |
| MLE-07 | 为 batch 或 online inference 打包 model artifact | `api-design`, `backend-patterns`, `security-review`, `security-scan` | 包含 preprocessing、config、依赖约束、schema validation、安全加载和 PII 安全 log 的版本化 artifact bundle | artifact、security、inference contract |
| MLE-08 | 上线 online serving 或 batch scoring 并捕获反馈 | `api-design`, `backend-patterns`, `e2e-testing`, `browser-qa`, `accessibility` | 包含 response envelope、timeout、batching、fallback、model version、confidence、feedback log 和 product-flow 测试的 prediction endpoint 或 batch job | serving、batch inference、fallback、用户 workflow |
| MLE-09 | 通过 shadow traffic、canary、A/B test 或 rollback rollout 模型 | `canary-watch`, `dashboard-builder`, `verification-loop`, `performance-optimizer` | 命名 traffic split、dashboard、p95 latency、成本、质量 guardrail、rollback artifact 和 rollback trigger 的 rollout 计划 | deployment、canary、rollback |
| MLE-10 | 上线后运维、调试和刷新 production 模型 | `silent-failure-hunter`, `dashboard-builder`, `mle-reviewer`, `doc-updater`, `github-ops` | 包含 drift check、delayed-label 健康、alert owner、runbook 更新、retrain 标准和 PR 证据的 observation ledger 和 refresh 计划 | monitoring、incident response、retraining |

## Iteration Compact

在动模型代码之前，将工作压缩为一个可审查的 artifact。它应当足够简短以放入 PR 描述，又足够精确以便另一位工程师可以质疑其中的 tradeoff。

```text
Goal:
Who cares:
Decision owner:
User or system action changed by the model:
Success metric:
Guardrail metrics:
Mistake budget:
Unacceptable mistakes:
Acceptable mistakes:
Assumptions:
Constraints:
Labels and data snapshot:
Baseline:
Candidate signals:
Threshold or config plan:
Eval slices:
Known risks:
Next experiment:
Rollback or fallback:
```

本 compact 等同于强大的 SWE 设计说明的 MLE 版本。它避免团队优化无人信任的 metric、添加不能解决真实 error mode 的 feature，或在缺少 rollback 的情况下发布复杂性。

## Decision Brain

每当任务模糊、影响重大或 metric 密集时，使用此循环：

1. 从决策出发，而不是从模型出发。命名改变下游行为的动作。
2. 命名谁在意以及为什么。不同的 stakeholder 对 false positive、false negative、latency、计算花费、不透明性或错失机会会付出不同的代价。
3. 将模糊性转化为假设。问什么样的 signal 能够区分结果，什么样的证据能否定它，以及什么样的简单 baseline 应当难以被超越。
4. 在发明定制系统之前，研究既有方案或邻近的已知问题。
5. 用 `(probability, confidence) x (cost, severity, importance, impact)` 为选项打分。
6. 考虑 adversarial 行为、激励、选择性披露、distribution shift 和 feedback loop。
7. 优先选择能减少最重要错误的最简单变更。简洁不是偷懒；它是在保持 iteration 速度的同时最小化失误的方法。
8. 捕获决策、证据、反方观点和下一个可逆步骤。

## Metric 与 Mistake 经济学

从失败成本而不是习惯中选择 metric：

- 尽早使用 confusion matrix，让团队能讨论具体的 false positive 和 false negative，而不是抽象的 accuracy。
- 当错误的正面决策成本占主导时，倾向于 precision。
- 当漏掉正面案例的成本占主导时，倾向于 recall。
- 仅当 precision/recall 的 tradeoff 真正平衡且可解释时才使用 F1。
- 当排序质量比单一 threshold 更重要时，使用 AUC 或 ranking metric。
- 将 latency、吞吐量、内存和成本作为一等 metric 跟踪，因为它们决定了可行的模型复杂度。
- 在为 offline 提升欢呼之前，先与 baseline 和当前 production 模型比较。
- 将真实世界的 feedback signal 视为带有 bias、lag 和覆盖缺口的 delayed label；不要在未分析之前将其视为 ground truth。

每个 metric 选择都应说明：它使哪种错误变得更廉价，使哪种错误更可能发生，以及由谁承担该成本。

## Data 与 Feature 假设

Feature 应源于一种关于区分性的理论：

- 文本、categorical 字段、numeric 历史、graph 关系、recency、frequency 和 aggregate 是候选 signal 族，而非自动的 feature。
- 对于每个 feature 族，说明它为何应该区分结果，以及它可能如何泄露未来信息。
- 对于有噪声的 label，考虑裁定、label confidence、soft target 或 confidence 加权。
- 对于 class imbalance，比较 weighted loss、resampling、threshold 移动和 calibrated decision rule。
- 对于缺失值，判断缺失是否携带信息、是否可插补，或是否应作为弃权的理由。
- 对于 outlier，判断是 clip、bucket、调查，还是将其保留为稀有但重要的 signal。
- 对于相关 feature，检查它们是冗余的、不稳定的，还是不可用未来状态的代理。

除非 error analysis 表明 baseline 失败的原因可以通过额外的 signal 或容量合理修复，否则不要增加模型复杂度。

## Error Analysis 循环

在每个 baseline、训练运行、threshold 变更或 config 变更之后：

1. 将错误拆分为 false positive、false negative、abstention、低 confidence 案例和系统失败。
2. 按共同特征对 error 聚类：语言、entity 类型、来源、时间、地理、设备、稀疏度、recency、feature 时效性、label 来源或 model version。
3. 将模型错误与 data bug、label 模糊、product 模糊、instrumentation 缺口和 serving mismatch 分开。
4. 将每个主要 cluster 追溯到四种动作之一：更好的 label、更好的 feature、更好的 threshold/config 或更好的 product fallback。
5. 将每个重要错误保留为 regression test、eval slice、dashboard 面板或 runbook 条目。
6. 将下一次 iteration 写成可证伪的实验，而不是模糊的"改进模型"任务。

最强的 MLE 循环不是 train -> metric -> ship。而是 mistake -> cluster -> hypothesis -> experiment -> evidence -> simpler system。

## Observation Ledger

在代码、PR、experiment 报告或 runbook 旁边保留一份紧凑的决策和证据记录：

```text
Iteration:
Change:
Why this mattered:
Metric movement:
Slice movement:
False positives:
False negatives:
Unexpected errors:
Decision:
Tradeoff accepted:
Lesson captured:
Regression added:
Debt created:
Next iteration:
```

使用 ledger 让模型工作可累积。目标是让每一次 iteration 使下一个决策更容易，而不仅仅是产出另一个 artifact。

## 核心 Workflow

### 1. 定义 Prediction Contract

在编写模型代码之前，先捕获 product 层面的 contract：

- Prediction 目标和 decision owner
- Input entity、output schema、confidence/calibration 字段以及允许的 latency
- Batch、online、streaming 或混合 serving 模式
- 当模型、feature store 或依赖不可用时的 fallback 行为
- 对高影响决策的人工审查或 override 路径
- 对输入、prediction 和 label 的隐私、保留和审计要求

不要接受"改进模型"作为需求。将模型绑定到一个可观察的 product 行为和一个可衡量的 acceptance gate。

### 2. 锁定 Data Contract

每个 ML 任务都需要一个显式的 data contract：

- Entity grain 和 primary key
- Label 定义、label 时间戳和 label 可用性延迟
- Feature 时间戳、freshness SLA 和 point-in-time join 规则
- Train、validation、test 和 backtest 的 split 策略
- 必需的列、允许的 null、范围、类别和单位
- 不得进入训练 artifact 或 log 的 PII 或敏感字段
- 用于可复现性的 dataset version 或 snapshot ID

首先防范 leakage。如果某个 feature 在 prediction 时不可用，或使用了未来信息进行 join，则将其移除或迁移到仅用于分析的路径。

### 3. 构建可复现的 Pipeline

训练代码应当能由另一位工程师运行，而无需依赖隐藏的 notebook 状态：

- 为所有 hyperparameter 和路径使用带类型的 config 文件或 dataclass
- 锁定 package 和模型依赖
- 设置 random seed 并记录任何非确定性的 GPU 行为
- 记录 dataset version、code SHA、config hash、metric 和 artifact URI
- 将 preprocessing 逻辑与 model artifact 一起保存，而不是单独放在 notebook 中
- 让 train、eval 和 inference 的 transformation 共享或从同一来源生成
- 让每一步都是 idempotent 的，以便 retry 不会损坏 artifact 或 metric

优先使用 immutable 值和纯 transformation 函数。避免在 feature 生成期间修改共享的 data frame 或 global config。

```python
import hashlib
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class TrainingConfig:
    dataset_uri: str
    model_dir: Path
    seed: int
    learning_rate: float
    batch_size: int


def artifact_name(config: TrainingConfig, code_sha: str) -> str:
    config_key = f"{config.dataset_uri}:{config.seed}:{config.learning_rate}:{config.batch_size}"
    config_hash = hashlib.sha256(config_key.encode("utf-8")).hexdigest()[:12]
    return f"{code_sha[:12]}-{config_hash}"
```

### 4. 在 Promotion 之前评估

Promotion 标准应在训练完成之前就声明：

- Baseline 模型与当前 production 模型的比较
- 与 product 行为对齐的 primary metric
- 针对 latency、calibration、fairness slice、成本和 error 集中度的 guardrail metric
- 针对重要 cohort、地理、设备、语言或数据源的 slice metric
- 当 metric 有噪声时的 confidence interval 或多次运行的方差
- 对高影响模型由人工审查的失败样本
- 显式的"不发布" threshold

```python
PROMOTION_GATES = {
    "auc": ("min", 0.82),
    "calibration_error": ("max", 0.04),
    "p95_latency_ms": ("max", 80),
}


def assert_promotion_ready(metrics: dict[str, float]) -> None:
    missing = sorted(name for name in PROMOTION_GATES if name not in metrics)
    if missing:
        raise ValueError(f"Model promotion metrics missing required gates: {missing}")

    failures = {
        name: value
        for name, (direction, threshold) in PROMOTION_GATES.items()
        for value in [metrics[name]]
        if (direction == "min" and value < threshold)
        or (direction == "max" and value > threshold)
    }
    if failures:
        raise ValueError(f"Model failed promotion gates: {failures}")
```

将 offline metric 用作 gate，而不是保证。当模型改变了 product 行为时，在全量 rollout 之前规划 shadow evaluation、canary rollout 或 A/B testing。

### 5. 为 Serving 打包

只有当 serving contract 可测试时，ML artifact 才算得上 production-ready：

- Model artifact 包含 version、training data 引用、config 和 preprocessing
- Input schema 拒绝无效、stale 或超出范围的 feature
- Output schema 在有用时包含 model version 和 confidence 或 explanation 字段
- Serving 路径具有 timeout、batching、资源限制和 fallback 行为
- CPU/GPU 需求是显式且经过测试的
- Prediction log 避免 PII，并包含足够的标识符以便调试和 label join
- Integration test 覆盖缺失 feature、stale feature、错误类型、空 batch 和 fallback 路径

绝不能让仅用于训练的 feature 代码与 serving feature 代码发生偏离，除非有测试证明二者等价。

### 6. 运维模型

Model monitoring 同时需要系统和质量 signal：

- Availability、error rate、timeout rate、queue depth 和 p50/p95/p99 latency
- Feature null rate、range drift、categorical drift 和 freshness drift
- Prediction 分布 drift 和 confidence 分布 drift
- Label 到达健康状况和 delayed 质量 metric
- Business KPI guardrail 和 rollback trigger
- 面向 canary 和 rollback 的按 version 的 dashboard

每次 deployment 都应有一份 rollback 计划，命名前一个 artifact、config、data 依赖和流量切换机制。

## Review 检查清单

- [ ] Prediction contract 是显式且可测试的
- [ ] Data contract 定义了 entity grain、label 时序、feature 时序和 snapshot/version
- [ ] 已针对 prediction 时可用性检查 leakage 风险
- [ ] 训练可从 code、config、data version 和 seed 复现
- [ ] Metric 与 baseline 和当前 production 模型进行了比较
- [ ] 为高风险 cohort 包含了 slice metric 和 guardrail
- [ ] Promotion gate 是自动化的，并且 fail closed
- [ ] Training 和 serving 的 transformation 是共享的或经过等价性测试
- [ ] Model artifact 携带 version、config、dataset 引用和 preprocessing
- [ ] Serving 路径验证输入并具有 timeout、fallback 和 rollback 行为
- [ ] Monitoring 覆盖系统健康、feature drift、prediction drift 和 delayed label
- [ ] 敏感数据被排除在 artifact、log、prompt 和示例之外

## Anti-Pattern

- 复现模型需要 notebook 状态
- 随机 split 将未来数据泄露到 validation 或 test 集合
- Feature join 忽略事件时间和 label 可用性
- Offline metric 提升的同时重要的 slice 却在退化
- Threshold 在 test 集合上反复调优
- Training preprocessing 被手工复制到 serving 代码中
- Prediction log 中缺少 model version
- Monitoring 只检查服务 uptime，而不检查 data 或 prediction 质量
- Rollback 需要重新训练，而不是切换到已知的良好 artifact

## 输出预期

使用本 skill 时，返回具体的 artifact：data contract、promotion gate、pipeline 步骤、测试计划、deployment 计划或 review 发现。指出阻碍 production 就绪的未知项，而不是用假设填补它们。
