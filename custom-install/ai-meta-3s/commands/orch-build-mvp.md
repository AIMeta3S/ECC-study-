---
description: 从设计/规格文档构建出可运行 MVP —— ingest、slice、scaffold、TDD（复用 GAN harness 驱动 generator→evaluator）、review、gated commit。这是一个启动 orch-build-mvp skill 的封装器。
---

# /orch-build-mvp

手动启动 **orch-build-mvp** 编排器：将 SDD/PRD/系统设计 文档转化为可运行的垂直切片。

## 用法

```
/orch-build-mvp <路径（SDD/PRD/系统设计文档）>
```

示例：

```
/orch-build-mvp civicpulse/docs/SDD-v0.6.md
```

## What It Does

使用 `$ARGUMENTS` 作为文档路径调用 **orch-build-mvp** skill。完整流程与约束（thin vertical slices 排序、scaffold 首个端到端切片、TDD 阶段复用 GAN harness 驱动 generator→evaluator 循环、GATE 1 / GATE 2、`feat:` 提交、security-trigger 切片追加 `security-reviewer`）见该 skill。

如果 `$ARGUMENTS` 为空，向用户询问设计/规格文档的路径。
