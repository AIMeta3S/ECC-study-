---
name: agent-self-evaluation
description: 在完成任何非平凡任务后使用。Agent 从 5 个维度对自己的输出进行评分——准确性、完整性、清晰度、可操作性、简洁度——每项标准均附具体证据。生成结构化的 1-5 分评分卡，并提供具体的改进建议。
origin: ECC
---

# Agent 自我评估

在完成复杂任务后，agent 会暂停，对照结构化的 5 维度 rubric 对自己的输出进行评分。这**不是**通过/失败的 gate——而是一个刻意的反思步骤，用于在用户发现之前捕捉遗漏、标记过度自信、并暴露需要改进的地方。

## 何时启用

- 编写跨 3 个以上文件或 50 行以上的代码后
- 完成多步骤 workflow 后（实现 → 测试 → review）
- 经历 3 次以上尝试的 debug 会话后
- 产出设计文档、架构决策或书面分析后
- 当用户询问"这个做得怎么样？"或"给自己打分"时
- 在任何 session 结束时的 Stop hook（若已配置——见 `references/hook-integration.md`）

## 核心概念

### 5 个评估维度

| 维度 | 问题 | 能捕捉的问题 |
|---|---|---|
| **准确性** | 事实、论断和输出是否正确？ | 幻觉、错误的 API 名称、语法错误、虚假陈述 |
| **完整性** | 是否覆盖了用户要求的所有内容？ | 遗漏的 edge case、未处理的错误路径、被忘记的需求、跳过的子任务 |
| **清晰度** | 解释是否易于理解且结构良好？ | 令人困惑的解释、未加定义的术语、缺失上下文、啰嗦冗长 |
| **可操作性** | 用户能否立即基于输出采取行动？ | 模糊的建议、缺失步骤、"你应该 X"却不展示方法、无验证路径 |
| **简洁度** | 是否使用了所需的最少字数/token？ | 冗余、过度解释、逐字重复用户的问题、填充性内容 |

### 评分等级

```
5 — Exceptional: no reasonable improvement possible
4 — Good: minor nits only, no substantive gaps
3 — Adequate: meets the request but has a notable weakness on at least one axis
2 — Weak: has a clear gap that affects usability or correctness
1 — Poor: fundamentally misses the request or contains significant errors
```

### 证据规则

每一个低于 5 的评分都必须引用具体证据。评分为 3 时不能只说"还可以更好"——必须明确指出缺失或错误的具体内容。信条是：**"展示差距所在，而不是仅仅给它命名。"**

## Workflow

### 步骤 1：收集原始素材

收集你要评估的内容：

```
- The original user request (read back from conversation)
- Your final response/output (the deliverable)
- Any tool outputs that verify correctness (test results, exit codes, lint output)
- Any user feedback received during the task (corrections, "try again", "that's not right")
```

### 步骤 2：独立为每个维度评分

逐一处理这 5 个维度。对每个维度：

1. 阅读该维度的问题
2. 在输出中查找证据（或证据的缺失）
3. 给出 1-5 的评分
4. 若评分 < 5，写一句改进说明，指出差距所在

不要先在脑中平均各项分数再倒推分值。每个维度都要重新独立评分。

### 步骤 3：生成评估报告

使用 `templates/evaluation-report.md` 中的模板。报告必须包含：

```
- One-line summary
- 5-axis scorecard (score + evidence per axis)
- Overall score (simple average, rounded to 1 decimal)
- 1-3 specific improvements ranked by impact
- Self-check: "Would the user agree with this assessment?"
```

### 步骤 4：应用改进

若任一维度评分为 3 或更低：

1. 说明你会做出哪些不同的处理
2. 如果差距可在 30 秒内修复（缺失链接、措辞不清），立即修复
3. 如果差距需要返工，明确标记："该维度因 [原因] 得此评分，证据为 [证据]。以 [具体修复方式] 重新运行可能会将评分提升至 [分数]。"

## 代码示例

### 示例：良好的评估（评分 4+）

```
Task: Add retry logic to HTTP client

Scorecard:
  Accuracy:    5 — All API calls correct. Verified: retries use
                  exponential backoff. No hallucinated methods.
  Completeness: 4 — Covered happy path + 3 error cases. Missing:
                  timeout handling for hung connections.
  Clarity:      5 — Code comments explain backoff formula.
                  PR description links to incident that motivated this.
  Actionability:5 — Single merge. No follow-up tasks. Tests pass.
  Conciseness:  4 — 47 lines total. The retry loop could be extracted
                  into a helper to drop ~8 lines.

Overall: 4.6 — One gap (timeout handling). Fix before merging.
```

### 示例：较弱的评估（评分 2-3）

```
Task: Add retry logic to HTTP client

Scorecard:
  Accuracy:    2 — Used urllib3 which doesn't match our
                  httpx-based codebase. Wrong library.
  Completeness: 3 — Works for GET. POST/PUT not handled (user
                  said "all HTTP requests").
  Clarity:      4 — Code is readable. Good variable names.
  Actionability:2 — "Add tests" mentioned but no test file created.
                  User has to write tests before merging.
  Conciseness:  3 — 120 lines. The retry config is duplicated in
                  3 places instead of one shared RetryConfig object.

Overall: 2.8 — Wrong library used. Needs httpx rewrite.
  Fix accuracy first (switch to httpx), then extend to all
  HTTP methods, then consolidate config.
```

## 反模式

### "Everything is a 5"

```
FAIL: Accuracy:    5 — All good.
   Completeness: 5 — Everything covered.
   Clarity:      5 — Clear.
```

没有引用证据。这是自我恭维，而非评估。真正的 5 分需要证明没有可改进之处。

### 对范围蔓延过度扣分

```
FAIL: Completeness: 2 — Didn't handle WebSocket connections or
   gRPC streaming (user didn't ask for these)
```

只根据用户实际要求的内容来评估，而不是根据你本可以额外构建的内容。

### 借评估翻旧账

```
FAIL: "As I said earlier, this approach is wrong. Score: 1"
```

评估针对的是已交付的输出，而不是重新争论已经做出的设计决策。如果方法有误，那应该在交付之前就被发现。

### 将个人偏好与客观差距混为一谈

```
FAIL: "Score: 3. I don't like Python decorators."
```

"不喜欢"不是证据。请引用具体的可读性、可测试性或正确性方面的关注点，否则将评分保留在 4+。

## 最佳实践

- **评估输出，而非过程。** 用户关心的是你交付了什么，而不是你经历了多少次迭代。
- **每个弱势维度一条改进。** 不要为一个维度列出 5 件事——挑选影响最大的差距。
- **将改进与用户影响挂钩。** "缺失错误处理意味着用户的 API 调用会静默 crash"胜过"添加错误处理。"
- **明确"已修复"的具体样子。** "以配置了重试的 httpx transport 重新运行"胜过"修复 library 问题。"
- **使用 tool 输出作为证据。** 如果测试通过了，就引用它们。如果 lint 干净，就引用它。不要猜测——用 grep 找证据。
- **如果找不到任何差距，再努力找找。** 5 个维度全部满分很罕见。问问自己："如果我是用户，这个输出会哪里让我恼火？"

## 相关 skills

- `agent-eval` —— 在 benchmark 任务上对不同编程 agent 进行直接对比
- `verification-loop` —— 将输出与预期结果进行系统性验证
- `security-review` —— 聚焦安全的 code review 清单
