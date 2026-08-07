---
name: agentic-engineering
description: 以 agentic 工程师身份运作，采用 eval-first 执行、任务分解与 cost-aware model routing。
metadata:
  origin: ECC
---

# Agentic Engineering

本 skill 适用于由 AI agents 承担大部分实现工作、由人类落实质量与风险控制的工程工作流。

## 运行原则

1. 在执行前定义完成标准。
2. 将工作拆分为 agent 粒度的单元。
3. 根据任务复杂度路由 model tier。
4. 以 eval 与 regression 检查进行度量。

## Eval-First 循环

1. 定义 capability eval 与 regression eval。
2. 运行基线并捕获失败特征。
3. 执行实现。
4. 重新运行 eval 并比较差异。

## 任务分解

应用 15 分钟单元规则：
- 每个单元应可独立验证
- 每个单元应具备单一主要风险
- 每个单元应呈现清晰的完成条件

## Model Routing

- Haiku：分类、样板代码转换、小范围编辑
- Sonnet：实现与重构
- Opus：架构、根因分析、多文件不变式

## Session 策略

- 对紧耦合的单元，延续同一 session。
- 在主要阶段切换后，开启新 session。
- 在里程碑完成后 compact，而非在调试进行过程中。

## AI 生成代码的 Review 关注点

优先关注：
- 不变式与边界情况
- 错误边界
- 安全与认证授权假设
- 隐藏的耦合与发布风险

当自动化的 format/lint 已经强制规范代码风格时，不要在纯粹的风格分歧上浪费 review 周期。

## 成本纪律

按任务跟踪：
- model
- token 估算
- 重试次数
- 实际耗时
- 成功/失败

仅当下层 model tier 因明显的推理缺口而失败时，才升级 model tier。
