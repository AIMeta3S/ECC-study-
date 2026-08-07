---
name: recursive-decision-ledger
description: 当用户要求 repeated rollouts、带 mark 的决策过程、高维 search、stochastic optimization、local-optima exploration、ensemble comparison，或需要可见 evidence trail 的 recursive reasoning 时使用。
metadata:
  origin: ECC
tools: Read, Write, Edit, Bash, Grep, Glob
---

# Recursive Decision Ledger

当用户试图通过 repeated rollouts 或 "Prime Gauss" 风格的 recursive prompting 强制更深入的计算时，使用此 skill。保留有用的部分：repeated trials、prior memory、fresh information 和 explicit marks。移除不安全的部部分：假装 loop 能证明确定性。

## Ledger Contract

每个 rollout 应记录：

- rollout id 和 timestamp；
- 前一次的 accepted winner 和前一次的 watchlist；
- 摄入的 fresh information；
- search space 大小；
- 使用的 model families 或 heuristics；
- trial count 和 effective trial count；
- top candidates；
- decision marks；
- 针对前一次 ledger 的 coherence marks；
- promotion gate result。

对于 append-only ledger 优先使用 JSONL，对于人类可读的 summary 优先使用 Markdown。

## Rollout Loop

1. 加载前一次的 ledger。
2. 在 time-step zero 捕获新信息。
3. 运行 bounded search。
4. 为每个 candidate 打 mark：accept、watch、reject、decay watch 或 needs replay。
5. 将 winners 与先前的 winners 以及最近一次 marked rollout 进行比较。
6. 当 drift、tail risk、stale data 或 failed replay 使前一个 mark 失效时，对 candidates 进行降级。
7. 在 summarize 之前先 append artifacts。

## Coherence Mark

包含一个紧凑的 coherence mark：

```text
Ensemble matches prior winner: true
Recursive matches prior winner: false
Latest rollout match: true
Live promotion allowed: false
Reason: replay and freshness gates not satisfied
```

## Promotion Rules

对于 trading、capital allocation、production deploys、migrations 或 destructive ops，recursive confidence 不等于 approval。

除非用户明确批准 live action 且 repo/service gate 支持，否则默认使用 paper、dry-run、read-only、preview 或 staged mode。

仅在满足以下条件时才 promote：

- 该 candidate 在所选 metric 上胜过前一次的 accepted winner；
- correctness 和 replay checks 通过；
- risk limits 是明确的；
- evidence 是 durable 的；
- 必要时用户已批准该 live step。

## Summary Shape

以决策为先，而非渲染过程：

```text
Rollout 15 complete. The prior winner still holds, but edge deteriorated 17%.
Status: watch, not live. Next gate: 20 replay fills with fresh orderbook age
below threshold.
```
