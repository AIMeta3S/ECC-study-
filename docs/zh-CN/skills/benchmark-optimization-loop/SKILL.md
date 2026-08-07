---
name: benchmark-optimization-loop
description: 当用户要求让某事物更快、尝试多种变体、运行递归优化、对 latency/throughput/cost 进行 benchmark，或通过反复的测量测试选择最佳实现时使用。
metadata:
  origin: ECC
tools: Read, Write, Edit, Bash, Grep, Glob
---

# Benchmark Optimization Loop

使用本 skill 将 "让它快 20 倍" 或 "尝试 50 次递归优化" 转换为一个有边界、可测量的循环，从而真正改进系统。

## 必需的 baseline

在以下条件具备之前，不要进行优化：

- 正在被优化的操作；
- 必须保持 green 的正确性 gate；
- 指标：wall time、p95 latency、rows/sec、cost/run、memory、error rate；
- 当前 baseline；
- 搜索预算：最大变体数、最大时间、最大花费、最大数据影响。

如果用户提出的目标不切实际，保留其雄心，但要使循环有边界且可测量。

## 循环

1. 测量 baseline。
2. 从证据中识别瓶颈。
3. 生成每个只测试一个假设的变体。
4. 使用相同的输入形状运行变体。
5. 拒绝未通过正确性、安全性或可复现性的变体。
6. 晋升最快的安全变体。
7. 将获胜路径固化到脚本、命令、测试、配置或文档中。
8. 重新运行 baseline 和获胜者以确认差值。

## 变体表

按如下方式跟踪变体：

```text
Variant | Hypothesis | Command | Time | Correct? | Notes
baseline | current path | npm run job | 120s | yes | stable
batch-500 | fewer round trips | npm run job -- --batch 500 | 42s | yes | winner
parallel-8 | more workers | npm run job -- --workers 8 | 31s | no | rate limited
```

## 递归搜索

对于递归或超参数的工作：

- 将每次运行持久化到 ledger 中；
- 与此前接受的获胜者比较，而不仅仅是与上一次运行比较；
- 保留一个 holdout 或 replay 检查；
- 当改进处于噪声范围内、正确性失败、成本超出预算，或搜索开始改变超出其能解释的变量时停止。

除非搜索空间确实是穷举的，否则使用诸如 "测量出的最佳安全变体" 这样的措辞，而不是 "全局最优"。

## 晋升 Gate

在以下条件满足之前，变体不能成为新的默认选项：

- 正确性测试通过；
- 性能差值可重复或已得到解释；
- rollback 显而易见；
- 该变更已被固化到版本控制或持久化的 runbook 中；
- 最终总结包含确切的命令和测量结果。
