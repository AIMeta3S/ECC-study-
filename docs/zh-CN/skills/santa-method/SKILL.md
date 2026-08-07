---
name: santa-method
description: "带收敛循环的多 agent 对抗式验证。两个独立的 review agent 都必须通过后，输出才能发布。"
metadata:
  origin: "Ronald Skelton - Founder, RapportScore.ai"
---

# Santa Method

多 agent 对抗式验证框架。列一个清单，检查两次。若有问题，就修复直到通过。

核心洞察：单个 agent 审查自己的输出时，会共享产生该输出时同样的偏见、知识盲区和系统性错误。两个无共享上下文的独立 reviewer 能打破这种失败模式。

## 何时启用

在以下情况调用此 skill：
- 输出将被发布、部署或被最终用户使用
- 必须强制执行合规、监管或品牌约束
- 代码未经人工审查即发布到生产环境
- 内容准确性至关重要（技术文档、教育材料、面向客户的文案）
- 大规模批量生成，抽查会遗漏系统性模式
- 幻觉风险升高（声明、统计数据、API 引用、法律用语）

不要用于内部草稿、探索性研究或具有确定性验证的任务（这些应使用 build/test/lint pipeline）。

## 架构

```
┌─────────────┐
│  GENERATOR   │  Phase 1: Make a List
│  (Agent A)   │  Produce the deliverable
└──────┬───────┘
       │ output
       ▼
┌──────────────────────────────┐
│     DUAL INDEPENDENT REVIEW   │  Phase 2: Check It Twice
│                                │
│  ┌───────────┐ ┌───────────┐  │  Two agents, same rubric,
│  │ Reviewer B │ │ Reviewer C │  │  no shared context
│  └─────┬─────┘ └─────┬─────┘  │
│        │              │        │
└────────┼──────────────┼────────┘
         │              │
         ▼              ▼
┌──────────────────────────────┐
│        VERDICT GATE           │  Phase 3: Naughty or Nice
│                                │
│  B passes AND C passes → NICE  │  Both must pass.
│  Otherwise → NAUGHTY           │  No exceptions.
└──────┬──────────────┬─────────┘
       │              │
    NICE           NAUGHTY
       │              │
       ▼              ▼
   [ SHIP ]    ┌─────────────┐
               │  FIX CYCLE   │  Phase 4: Fix Until Nice
               │              │
               │ iteration++  │  Collect all flags.
               │ if i > MAX:  │  Fix all issues.
               │   escalate   │  Re-run both reviewers.
               │ else:        │  Loop until convergence.
               │   goto Ph.2  │
               └──────────────┘
```

## 阶段详情

### Phase 1: Make a List（生成）

执行主要任务。不改变你正常的生成工作流。Santa Method 是生成后的验证层，而非生成策略。

```python
# generator 照常运行
output = generate(task_spec)
```

### Phase 2: Check It Twice（独立双重审查）

并行 spawn 两个 review agent。关键不变量：

1. **上下文隔离** — 两个 reviewer 都看不到对方的评估
2. **相同的 rubric** — 两者接收相同的评估标准
3. **相同的输入** — 两者都接收原始 spec 和生成的输出
4. **结构化输出** — 每个返回类型化裁定，而非散文式叙述

```python
REVIEWER_PROMPT = """
You are an independent quality reviewer. You have NOT seen any other review of this output.

## Task Specification
{task_spec}

## Output Under Review
{output}

## Evaluation Rubric
{rubric}

## Instructions
Evaluate the output against EACH rubric criterion. For each:
- PASS: criterion fully met, no issues
- FAIL: specific issue found (cite the exact problem)

Return your assessment as structured JSON:
{
  "verdict": "PASS" | "FAIL",
  "checks": [
    {"criterion": "...", "result": "PASS|FAIL", "detail": "..."}
  ],
  "critical_issues": ["..."],   // blockers that must be fixed
  "suggestions": ["..."]         // non-blocking improvements
}

Be rigorous. Your job is to find problems, not to approve.
"""
```

```python
# 并行 spawn reviewer（Claude Code subagent）
review_b = Agent(prompt=REVIEWER_PROMPT.format(...), description="Santa Reviewer B")
review_c = Agent(prompt=REVIEWER_PROMPT.format(...), description="Santa Reviewer C")

# 两者并发运行——互不可见
```

### Rubric 设计

rubric 是最重要的输入。模糊的 rubric 产生模糊的审查。每条标准都必须有客观的 pass/fail 条件。

| 标准 | Pass 条件 | 失败信号 |
|-----------|---------------|----------------|
| 事实准确性 | 所有声明可对照原始资料或常识验证 | 编造的统计数据、错误的版本号、不存在的 API |
| 无幻觉 | 没有捏造的实体、引述、URL 或参考 | 指向不存在页面的链接、无来源的引述 |
| 完整性 | spec 中的每个需求都被覆盖 | 缺失章节、跳过的 edge case、覆盖不完整 |
| 合规性 | 通过所有项目特定的约束 | 使用了禁用词、语气违规、监管不合规 |
| 内部一致性 | 输出内部无矛盾 | A 节说 X，B 节说非 X |
| 技术正确性 | 代码可编译/运行，算法合理 | 语法错误、逻辑 bug、错误的复杂度声明 |

#### 特定领域的 rubric 扩展

**内容/营销：**
- 品牌调性遵循
- 满足 SEO 需求（关键词密度、meta tag、结构）
- 无竞争对手商标误用
- CTA 存在且链接正确

**代码：**
- 类型安全（无 `any` 泄露，正确的 null 处理）
- 错误处理覆盖
- 安全性（代码中无密钥、输入验证、防止 injection）
- 新路径的测试覆盖

**合规敏感（监管、法律、金融）：**
- 无结果保证或无根据的声明
- 存在必要的免责声明
- 仅使用批准的术语
- 适用于相应司法管辖区的语言

### Phase 3: Naughty or Nice（判定门）

```python
def santa_verdict(review_b, review_c):
    """两位 reviewer 必须都通过。没有部分得分。"""
    if review_b.verdict == "PASS" and review_c.verdict == "PASS":
        return "NICE"  # 发布

    # 合并两位 reviewer 的 flag，去重
    all_issues = dedupe(review_b.critical_issues + review_c.critical_issues)
    all_suggestions = dedupe(review_b.suggestions + review_c.suggestions)

    return "NAUGHTY", all_issues, all_suggestions
```

为什么两者都必须通过：如果只有一个 reviewer 发现了问题，这个问题就是真实的。另一个 reviewer 的盲点正是 Santa Method 要消除的失败模式。

### Phase 4: Fix Until Nice（收敛循环）

```python
MAX_ITERATIONS = 3

for iteration in range(MAX_ITERATIONS):
    verdict, issues, suggestions = santa_verdict(review_b, review_c)

    if verdict == "NICE":
        log_santa_result(output, iteration, "passed")
        return ship(output)

    # 修复所有关键问题（suggestion 是可选的）
    output = fix_agent.execute(
        output=output,
        issues=issues,
        instruction="Fix ONLY the flagged issues. Do not refactor or add unrequested changes."
    )

    # 对修复后的输出重新运行两位 reviewer（全新 agent，对上一轮无记忆）
    review_b = Agent(prompt=REVIEWER_PROMPT.format(output=output, ...))
    review_c = Agent(prompt=REVIEWER_PROMPT.format(output=output, ...))

# 迭代次数耗尽——升级处理
log_santa_result(output, MAX_ITERATIONS, "escalated")
escalate_to_human(output, issues)
```

关键：每一轮审查都使用**全新的 agent**。reviewer 不得携带前一轮的记忆，因为先前的上下文会产生锚定偏见。

## 实现模式

### 模式 A：Claude Code Subagent（推荐）

subagent 提供真正的上下文隔离。每个 reviewer 是一个独立的进程，没有共享状态。

```bash
# 在 Claude Code 会话中，使用 Agent tool 来 spawn reviewer
# 两个 agent 并行运行以提升速度
```

```python
# Agent tool 调用的伪代码
reviewer_b = Agent(
    description="Santa Review B",
    prompt=f"Review this output for quality...\n\nRUBRIC:\n{rubric}\n\nOUTPUT:\n{output}"
)
reviewer_c = Agent(
    description="Santa Review C",
    prompt=f"Review this output for quality...\n\nRUBRIC:\n{rubric}\n\nOUTPUT:\n{output}"
)
```

### 模式 B：顺序内联（后备方案）

当 subagent 不可用时，通过显式的上下文重置来模拟隔离：

1. 生成输出
2. 新上下文："你是 Reviewer 1。仅根据此 rubric 进行评估。找出问题。"
3. 逐字记录发现
4. 完全清除上下文
5. 新上下文："你是 Reviewer 2。仅根据此 rubric 进行评估。找出问题。"
6. 比较两次审查，修复，重复

subagent 模式严格优于内联模拟——内联模拟存在 reviewer 之间上下文渗透的风险。

### 模式 C：批量抽样

对于大批量（100+ 项），对每一项都运行完整 Santa 成本过高。使用分层抽样：

1. 对随机抽样（批次的 10-15%，最少 5 项）运行 Santa
2. 按类型对失败进行分类（幻觉、合规、完整性等）
3. 如果出现系统性模式，对整个批次应用针对性修复
4. 对修复后的批次重新抽样并重新验证
5. 继续直到抽样通过

```python
import random

def santa_batch(items, rubric, sample_rate=0.15):
    sample = random.sample(items, max(5, int(len(items) * sample_rate)))

    for item in sample:
        result = santa_full(item, rubric)
        if result.verdict == "NAUGHTY":
            pattern = classify_failure(result.issues)
            items = batch_fix(items, pattern)  # 修复匹配该模式的所有项
            return santa_batch(items, rubric)   # 重新抽样

    return items  # 干净的抽样 → 发布批次
```

## 失败模式与缓解措施

| 失败模式 | 症状 | 缓解措施 |
|-------------|---------|------------|
| 无限循环 | 修复后 reviewer 不断发现新问题 | 最大迭代上限（3）。升级处理。 |
| 橡皮图章 | 两个 reviewer 对一切都放行 | 对抗式 prompt："你的任务是找问题，不是批准。" |
| 主观漂移 | reviewer 标记的是风格偏好而非错误 | 严格的 rubric，仅包含客观的 pass/fail 标准 |
| 修复回归 | 修复问题 A 引入了问题 B | 每轮全新的 reviewer 能捕获回归 |
| reviewer 一致性偏差 | 两个 reviewer 都遗漏了同一问题 | 由独立性缓解，未消除。对于关键输出，增加第三个 reviewer 或人工抽查。 |
| 成本爆炸 | 大型输出上迭代次数过多 | 批量抽样模式。每个验证周期的预算上限。 |

## 与其他 skill 的集成

| Skill | 关系 |
|-------|-------------|
| Verification Loop | 用于确定性检查（build、lint、test）。Santa 用于语义检查（准确性、幻觉）。先运行 verification-loop，再运行 Santa。 |
| Eval Harness | Santa Method 的结果汇入 eval 指标。跨 Santa 运行跟踪 pass@k 以衡量 generator 质量随时间的变化。 |
| Continuous Learning v2 | Santa 的发现转化为 instinct。同一标准的反复失败 → 习得行为以避免该模式。 |
| Strategic Compact | 在 compact 前运行 Santa。不要在验证过程中丢失审查上下文。 |

## 指标

跟踪以下指标以衡量 Santa Method 的有效性：

- **首次通过率**：在第 1 轮通过 Santa 的输出百分比（目标：>70%）
- **收敛的平均迭代次数**：达到 NICE 的平均轮数（目标：<1.5）
- **问题分类法**：失败类型的分布（幻觉 vs. 完整性 vs. 合规）
- **reviewer 一致性**：两个 reviewer 都 flag 的问题占比 vs. 仅有一个 flag 的问题占比（低一致性 = rubric 需收紧）
- **逃逸率**：发布后发现但 Santa 本应捕获的问题（目标：0）

## 成本分析

Santa Method 每个验证周期的 token 成本约为单纯生成成本的 2-3 倍。对于大多数高风险输出，这是划算的：

```
Cost of Santa = (generation tokens) + 2×(review tokens per round) × (avg rounds)
Cost of NOT Santa = (reputation damage) + (correction effort) + (trust erosion)
```

对于批量操作，抽样模式将成本降低至完整验证的约 15-20%，同时能捕获 >90% 的系统性问题。
