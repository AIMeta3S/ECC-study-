---
name: token-budget-advisor
<<<<<<< HEAD
description: >-
  在回答之前，就响应深度消耗向用户提供知情选择。当用户明确想要控制响应长度、深度或 token budget 时，使用此 skill。
  TRIGGER when: "token budget", "token count", "token usage", "token limit",
  "response length", "answer depth", "short version", "brief answer",
  "detailed answer", "exhaustive answer", "respuesta corta vs larga",
  "cuántos tokens", "ahorrar tokens", "responde al 50%", "dame la versión
  corta", "quiero controlar cuánto usas"，或用户明确要求控制答案大小或深度的清晰变体。
  DO NOT TRIGGER when: 用户已在当前 session 中指定了级别（维持该级别），请求显然只需一个词的回答，或"token"指的是 auth/session/payment token 而非响应大小。
metadata:
  origin: community
=======
description: 在回答前，为用户提供关于消耗多少响应深度的知情选择。当用户明确希望控制响应长度、深度或令牌预算时使用此技能。触发条件："token budget", "token count", "token usage", "token limit", "response length", "answer depth", "short version", "brief answer", "detailed answer", "exhaustive answer", "respuesta corta vs larga", "cuántos tokens", "ahorrar tokens", "responde al 50%", "dame la versión corta", "quiero controlar cuánto usas"，或用户明确要求控制答案大小或深度的清晰变体。不触发条件：用户已在当前会话中指定了级别（保持该级别），请求明显是单字答案，或"token"指代认证/会话/支付令牌而非响应大小。
origin: community
>>>>>>> upstream/main
---

# Token Budget Advisor (TBA)

在 Claude 回答**之前**拦截响应流程，就响应深度向用户提供选择。

## 何时使用

- 用户想要控制响应的长度或详细程度
- 用户提到 tokens、预算、深度或响应长度
- 用户说 "short version"、"tldr"、"brief"、"al 25%"、"exhaustive" 等
- 任何用户想要预先选择深度/详细级别的情况

**不要触发**的情况：用户在本 session 已设置过级别（静默维持该级别），或答案显然只有一行。

## 工作原理

### 步骤 1 — 估算 input tokens

使用仓库标准的 context-budget 启发式方法，在心中估算 prompt 的 token 数量。

使用与 [context-budget](../context-budget/SKILL.md) 相同的校准指南：

- 普通文本：`words × 1.3`
- 代码密集或混合/代码块：`chars / 4`

对于混合内容，使用占主导的内容类型，并保持估算为启发式。

### 步骤 2 — 按复杂度估算响应大小

对 prompt 进行分类，然后应用倍数范围得到完整的响应窗口：

| 复杂度       | 倍数范围          | 示例 prompts                                         |
|--------------|------------------|------------------------------------------------------|
| 简单         | 3× – 8×          | "What is X?"、是/否、单一事实                        |
| 中等         | 8× – 20×         | "How does X work?"                                   |
| 中高         | 10× – 25×        | 带上下文的代码请求                                   |
| 复杂         | 15× – 40×        | 多部分分析、对比、架构                               |
| 创意         | 10× – 30×        | 故事、文章、叙事写作                                 |

响应窗口 = `input_tokens × mult_min` 到 `input_tokens × mult_max`（但不要超过模型配置的 output-token 限制）。

### 步骤 3 — 呈现深度选项

在回答**之前**呈现此代码块，使用实际估算的数字：

```
Analyzing your prompt...

Input: ~[N] tokens  |  Type: [type]  |  Complexity: [level]  |  Language: [lang]

Choose your depth level:

[1] Essential   (25%)  ->  ~[tokens]   Direct answer only, no preamble
[2] Moderate    (50%)  ->  ~[tokens]   Answer + context + 1 example
[3] Detailed    (75%)  ->  ~[tokens]   Full answer with alternatives
[4] Exhaustive (100%)  ->  ~[tokens]   Everything, no limits

Which level? (1-4 or say "25% depth", "50% depth", "75% depth", "100% depth")

Precision: heuristic estimate ~85-90% accuracy (±15%).
```

各级别 token 估算（在响应窗口内）：
- 25%  → `min + (max - min) × 0.25`
- 50%  → `min + (max - min) × 0.50`
- 75%  → `min + (max - min) × 0.75`
- 100% → `max`

### 步骤 4 — 按所选级别响应

| 级别             | 目标长度            | 包含                                                | 省略                                              |
|------------------|---------------------|-----------------------------------------------------|---------------------------------------------------|
| 25% Essential    | 最多 2-4 句         | 直接答案、关键结论                                  | 上下文、示例、细微差别、替代方案                  |
| 50% Moderate     | 1-3 段              | 答案 + 必要上下文 + 1 个示例                        | 深度分析、边缘情况、参考                          |
| 75% Detailed     | 结构化响应          | 多个示例、优缺点、替代方案                          | 极端边缘情况、详尽的参考                          |
| 100% Exhaustive  | 无限制              | 一切 —— 完整分析、所有代码、所有视角                | 无                                                |

## 快捷方式 —— 跳过提问

如果用户已经表明了级别，直接按该级别响应，无需提问：

| 用户所说                                            | 级别  |
|----------------------------------------------------|-------|
| "1" / "25% depth" / "short version" / "brief answer" / "tldr"  | 25%   |
| "2" / "50% depth" / "moderate depth" / "balanced answer"        | 50%   |
| "3" / "75% depth" / "detailed answer" / "thorough answer"       | 75%   |
| "4" / "100% depth" / "exhaustive answer" / "full deep dive"     | 100%  |

如果用户在 session 较早时设置过级别，在后续响应中**静默维持**该级别，除非用户更改。

## 精度说明

本 skill 使用启发式估算 —— 没有真实的 tokenizer。准确度约 85-90%，偏差 ±15%。始终显示免责声明。

## 示例

### 触发情况

- "Give me the short version first."
- "How many tokens will your answer use?"
- "Respond at 50% depth."
- "I want the exhaustive answer, not the summary."
- "Dame la version corta y luego la detallada."

### 不触发的情况

- "What is a JWT token?"
- "The checkout flow uses a payment token."
- "Is this normal?"
- "Complete the refactor."
- 用户已为 session 选择深度后的后续问题

## 来源

独立 skill，来自 [TBA — Token Budget Advisor for Claude Code](https://github.com/Xabilimon1/Token-Budget-Advisor-Claude-Code-)。
原项目还附带一个 Python 估算器脚本，但本仓库保持该 skill 自包含且仅使用启发式。
