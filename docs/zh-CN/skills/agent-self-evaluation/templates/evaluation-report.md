# Agent 自评报告模板

复制此模板并在完成任务后填写。该格式与 `scripts/evaluate.py` 输出一致。

```
============================================================
AGENT SELF-EVALUATION REPORT
============================================================
Summary: Overall score X.X/5 across 5 quality axes.

  Accuracy         █████ 5/5    or    ███░░ 3/5
    + [Evidence: passing tests, verified claims]
    - [Gaps: unverified claims, hedging language]
    → [Improvement if score < 5]

  Completeness      █████ 5/5
    + [What's covered: all requirements + edge cases]
    - [What's missing: explicitly acknowledge gaps]
    → [Improvement if score < 5]

  Clarity           █████ 5/5
    + [Structure: headings, code blocks, bullet points]
    - [Issues: undefined terms, wall of text, no summary]
    → [Improvement if score < 5]

  Actionability     █████ 5/5
    + [User can: merge PR, run command, review file]
    - [Blockers: missing steps, vague suggestions]
    → [Improvement if score < 5]

  Conciseness       █████ 5/5
    + [Tight: no repetition, high information density]
    - [Bloat: filler, meta-commentary, repeated points]
    → [Improvement if score < 5]

  OVERALL           X.X/5

CRITICAL ISSUES (axes ≤ 2):
  [Axis] Score N/5 — specific fix needed
  (or "None" if no axis ≤ 2)

Self-check: Would the user agree with this assessment? [Yes/No + brief justification]

TOP IMPROVEMENTS:
  1. [Highest impact fix]
  2. [Second highest]
  (Only list axes scoring < 4, ranked by user impact)

VERDICT: [Deliver as-is / Fix N issues then deliver / Redo from scratch]
```

## 快速参考：评分触发条件

| 若出现以下情况... | Accuracy | Completeness | Clarity | Actionability | Conciseness |
|---|---|---|---|---|---|
| "应该可以" / "大概没问题" | ≤4 | — | — | — | — |
| "我认为" / "我相信" | ≤4 | — | — | — | — |
| 未引用测试输出 | ≤4 | — | — | — | — |
| 遗留 "TODO" / "FIXME" | ≤3 | ≤3 | — | ≤3 | — |
| 缺少错误处理 | — | ≤3 | — | — | — |
| 仅覆盖 happy path | — | ≤3 | — | — | — |
| 大段文字（>200 字） | — | — | ≤3 | — | — |
| 无标题或结构 | — | — | ≤3 | — | — |
| "你应该……" 但无具体细节 | — | — | — | ≤3 | — |
| 未创建 PR 或文件 | — | — | — | ≤3 | — |
| 用户需要自行想出下一步 | — | — | — | ≤2 | — |
| 重复要点（3 次及以上） | — | — | — | — | ≤3 |
| "让我解释一下……" / "总结一下……" 出现 3 次及以上 | — | — | — | — | ≤3 |
| 输出长度超过任务的 15 倍 | — | — | — | — | ≤3 |

## 何时跳过

在以下情况下跳过评估：
- 任务为单次 tool 调用（例如"读取此文件"——无可评估内容）
- 用户明确表示"不要评估"或"直接做"
- 任务纯属对话（问候、闲聊）
- 你正处于工作流中，且用户将评判最终输出而非中间步骤

## 评估后的行动

| 总分 | 操作 |
|---|---|
| ≥4.5 | 原样交付。无需修改。 |
| 3.5–4.4 | 标注首要改进点但交付。若修复时间 <30 秒则修复。 |
| 2.5–3.4 | 说明你会如何修改。询问用户："是否要我重做 [axis]，还是原样交付？" |
| <2.5 | 不交付。说明："此评分得 [score] 分，因为 [evidence]。让我以 [specific fix] 重做。"然后重做。 |
