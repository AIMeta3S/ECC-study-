---
description: 为实现任务运行 generator/evaluator 构建 loop，具有有界迭代和评分机制。
---

从 $ARGUMENTS 中解析以下内容：
1. `brief` — 用户对要构建内容的一行描述
2. `--max-iterations N` —（可选，默认 15）generator-evaluator 循环的最大次数
3. `--pass-threshold N` —（可选，默认 7.0）达标所需的加权分数
4. `--skip-planner` —（可选）跳过 planner，假定 spec.md 已存在
5. `--eval-mode MODE` —（可选，默认 "playwright"）取值之一：playwright、screenshot、code-only

## GAN-Style Harness 构建

此命令编排一个受 Anthropic 2026 年 3 月 harness 设计论文启发的三 agent 构建 loop。

### 阶段 0：初始化
1. 在项目根目录创建 `gan-harness/` 目录
2. 创建子目录：`gan-harness/feedback/`、`gan-harness/screenshots/`
3. 若 git 尚未初始化，则初始化 git
4. 记录开始时间和配置

### 阶段 1：规划（Planner Agent）
除非设置了 `--skip-planner`：
1. 通过 Task tool 启动 `gan-planner` agent，并传入用户的 brief
2. 等待其生成 `gan-harness/spec.md` 和 `gan-harness/eval-rubric.md`
3. 向用户展示 spec 概要
4. 进入阶段 2

### 阶段 2：Generator-Evaluator Loop
```
iteration = 1
while iteration <= max_iterations:

    # 生成
    Launch gan-generator agent via Task tool:
    - Read spec.md
    - If iteration > 1: read feedback/feedback-{iteration-1}.md
    - Build/improve the application
    - Ensure dev server is running
    - Commit changes

    # 等待 generator 完成

    # 评估
    Launch gan-evaluator agent via Task tool:
    - Read eval-rubric.md and spec.md
    - Test the live application (mode: playwright/screenshot/code-only)
    - Score against rubric
    - Write feedback to feedback/feedback-{iteration}.md

    # 等待 evaluator 完成

    # 检查分数
    Read feedback/feedback-{iteration}.md
    Extract weighted total score

    if score >= pass_threshold:
        Log "PASSED at iteration {iteration} with score {score}"
        Break

    if iteration >= 3 and score has not improved in last 2 iterations:
        Log "PLATEAU detected — stopping early"
        Break

    iteration += 1
```

### 阶段 3：总结
1. 读取所有 feedback 文件
2. 展示最终分数和迭代历史
3. 显示分数变化轨迹：`iteration 1: 4.2 → iteration 2: 5.8 → ... → iteration N: 7.5`
4. 列出最终评估中遗留的任何 issue
5. 报告总耗时和预估成本

### 输出

```markdown
## GAN Harness Build Report

**Brief:** [original prompt]
**Result:** PASS/FAIL
**Iterations:** N / max
**Final Score:** X.X / 10

### Score Progression
| Iter | Design | Originality | Craft | Functionality | Total |
|------|--------|-------------|-------|---------------|-------|
| 1 | ... | ... | ... | ... | X.X |
| 2 | ... | ... | ... | ... | X.X |
| N | ... | ... | ... | ... | X.X |

### Remaining Issues
- [Any issues from final evaluation]

### Files Created
- gan-harness/spec.md
- gan-harness/eval-rubric.md
- gan-harness/feedback/feedback-001.md through feedback-NNN.md
- gan-harness/generator-state.md
- gan-harness/build-report.md
```

将完整报告写入 `gan-harness/build-report.md`。
