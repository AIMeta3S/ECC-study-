---
description: 运行一个 generator/evaluator 构建循环，用于实现任务，并具有有界迭代和评分机制。
---

从 $ARGUMENTS 解析以下内容：
1. `brief` — 用户对要构建内容的简短描述
2. `--max-iterations N` — （可选，默认 15）generator-evaluator 的最大循环次数
3. `--pass-threshold N` — （可选，默认 7.0）通过所需的加权分数
4. `--skip-planner` — （可选）跳过 planner，假设 spec.md 已经存在
5. `--eval-mode MODE` — （可选，默认 "playwright"）可选值：playwright、screenshot、code-only

## GAN-Style Harness Build

该命令编排一个由3个 agent 组成的构建循环。

### Phase 0：初始化
1. 在项目根目录创建 `gan-harness/` 目录
2. 创建子目录：`gan-harness/feedback/`、`gan-harness/screenshots/`
3. 若 git 尚未初始化，则初始化 git
4. 记录开始时间和配置

### Phase 1：规划（Planner Agent）
如果设置了 `--skip-planner`，跳过该 Phase 1，直接进入 Phase 2。
如果未设置，执行以下步骤：
1. 通过 Task tool 启动 `gan-planner` agent，并传入用户的 brief
2. 等待其生成 `gan-harness/spec.md` 和 `gan-harness/eval-rubric.md`
3. 向用户展示 spec 概要
4. 进入 Phase 2

### Phase 2：Generator-Evaluator Loop
```
iteration = 1
while iteration <= max_iterations:

    # 生成 (GENERATE)
    Launch gan-generator agent via Task tool:
    - Read spec.md
    - If iteration > 1: read feedback/feedback-{iteration-1}.md
    - Build/improve the application
    - Ensure dev server is running
    - Commit changes

    # 等待 generator 完成

    # 评估 (EVALUATE)
    Launch gan-evaluator agent via Task tool:
    - Read eval-rubric.md and spec.md
    - Test the live application (mode: playwright/screenshot/code-only)
    - Score against rubric
    - Write feedback to feedback/feedback-{iteration}.md

    # 等待 evaluator 完成

    # 检查分数 (CHECK SCORE)
    Read feedback/feedback-{iteration}.md
    Extract weighted total score

    if score >= pass_threshold:
        Log "迭代 {iteration} 通过，分数为 {score}"
        Break

    if iteration >= 3 and score has not improved in last 2 iterations:
        Log "迭代 {iteration} 改进约到瓶颈，提前结束"
        Break

    iteration += 1
```

### Phase 3：总结 (Summary)
1. 读取所有 feedback 文件
2. 展示最终分数和迭代历史
3. 显示分数变化轨迹：`iteration 1: 4.2 → iteration 2: 5.8 → ... → iteration N: 7.5`
4. 列出最终评估中仍存在的 issue
5. 报告总耗时和预估成本

### 输出 (Output)

```markdown
## GAN Harness Build Report

**Brief:** [original prompt]
**结果:** PASS/FAIL
**迭代次数:** N / max
**最终分数:** X.X / 10

### 分数变化轨迹 (Score Progression)
| 迭代 | 设计质量 (Design Quality) | 原创性 (Originality) | 工艺 (Craft) | 功能性 (Functionality) | 总分数 |
|------|--------|-------------|-------|---------------|-------|
| 1 | ... | ... | ... | ... | X.X |
| 2 | ... | ... | ... | ... | X.X |
| N | ... | ... | ... | ... | X.X |

### 仍存在的问题 (Remaining Issues)
- [Any issues from final evaluation]

### Files Created
- gan-harness/spec.md
- gan-harness/eval-rubric.md
- gan-harness/feedback/feedback-001.md through feedback-NNN.md
- gan-harness/generator-state.md
- gan-harness/build-report.md
```

将完整报告写入 `gan-harness/build-report.md`。
