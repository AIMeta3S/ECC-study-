---
description: "从会话中提取可复用的 pattern，在保存前自评质量，并确定正确的保存位置（Global 还是 Project）。"
---

# /learn-eval - 提取、评估，然后保存

在写入任何 skill 文件之前，增加 quality gate、保存位置决策和知识放置意识，以此扩展 `/learn`。

## 提取什么

寻找：

1. **错误解决 pattern** — 根因 + 修复 + 可复用性
2. **调试技巧** — 非显而易见的步骤、工具组合
3. **workaround** — 库的怪癖、API 限制、特定版本的修复
4. **项目专有 pattern** — 约定、架构决策、集成 pattern

## 流程

1. 回顾会话，查找可提取的 pattern
2. 识别最有价值、最可复用的洞察

3. **确定保存位置：**
   - 自问："这个 pattern 在其他项目中是否也有用？"
   - **Global**（`~/.claude/skills/learned/`）：可跨 2+ 项目使用的通用 pattern（bash 兼容性、LLM API 行为、调试技巧等）
   - **Project**（当前项目中的 `.claude/skills/learned/`）：项目专有知识（特定配置文件的怪癖、项目专有的架构决策等）
   - 不确定时，选择 Global（从 Global 迁移到 Project 比反向操作更容易）

4. 使用以下格式起草 skill 文件：

```markdown
---
name: pattern-name
description: "Under 130 characters"
user-invocable: false
origin: auto-extracted
---

# [Descriptive Pattern Name]

**Extracted:** [Date]
**Context:** [Brief description of when this applies]

## Problem
[What problem this solves - be specific]

## Solution
[The pattern/technique/workaround - with code examples]

## When to Use
[Trigger conditions]
```

5. **quality gate — 检查清单 + 整体裁定**

   ### 5a. 必需的检查清单（通过实际读取文件来验证）

   在评估草稿之前，执行以下**全部**检查：

   - [ ] 按关键字 grep `~/.claude/skills/` 和相关项目的 `.claude/skills/` 文件，检查内容是否有重叠
   - [ ] 检查 MEMORY.md（项目级和全局级）是否有重叠
   - [ ] 考虑追加到现有 skill 是否就足够了
   - [ ] 确认这是一个可复用的 pattern，而非一次性的修复

   ### 5b. 整体裁定

   综合检查清单的结果和草稿质量，然后选择以下**一项**（第 6 步定义了每项裁定所触发的动作）：

   | 裁定 | 含义 |
   |---------|---------|
   | **Save** | 独特、具体、范围明确 |
   | **Improve then Save** | 有价值但需要打磨 |
   | **Absorb into [X]** | 应追加到现有 skill 中 |
   | **Drop** | 琐碎、冗余或过于抽象 |

**指导维度**（为裁定提供依据，不打分）：

- **具体性与可操作性**：包含立即可用的代码示例或命令
- **范围契合度**：名称、触发条件和内容相互对齐，聚焦于单一 pattern
- **独特性**：提供现有 skill 未覆盖的价值（依据检查清单的结果）
- **可复用性**：在未来会话中存在现实的触发场景

6. **各裁定对应的确认流程**

- **Improve then Save**：展示所需的改进 + 修订后的草稿 + 一次重新评估后更新的检查清单/裁定；如果修订后的裁定为 **Save**，则在用户确认后保存，否则遵循新的裁定
- **Save**：展示保存路径 + 检查清单结果 + 一行裁定理由 + 完整草稿 → 在用户确认后保存
- **Absorb into [X]**：展示目标路径 + 新增内容（diff 格式）+ 检查清单结果 + 裁定理由 → 在用户确认后追加
- **Drop**：仅展示检查清单结果 + 推理（无需确认）

7. 保存 / 追加到确定的位置

## 第 5 步的输出格式

```
### Checklist
- [x] skills/ grep: no overlap (or: overlap found → details)
- [x] MEMORY.md: no overlap (or: overlap found → details)
- [x] Existing skill append: new file appropriate (or: should append to [X])
- [x] Reusability: confirmed (or: one-off → Drop)

### Verdict: Save / Improve then Save / Absorb into [X] / Drop

**Rationale:** (1-2 sentences explaining the verdict)
```

## 设计理由

本版本用基于检查清单的整体裁定系统替换了之前的 5 维度数值评分标准（具体性、可操作性、范围契合度、非冗余性、覆盖度，各按 1-5 打分）。现代前沿模型（Opus 4.6+）具备强大的上下文判断力——将丰富的定性信号强塞进数值分数会丢失细微差别，并可能产生误导性的总分。整体方法让模型自然地权衡所有因素，产生更准确的 save/drop 决策，同时显式的检查清单确保不会跳过任何关键检查。

## 注意事项

- 不要提取琐碎的修复（拼写错误、简单的语法错误）
- 不要提取一次性的问题（特定的 API 故障等）
- 聚焦于能在未来会话中节省时间的 pattern
- 保持 skill 聚焦——每个 skill 一个 pattern
- 当裁定为 Absorb 时，追加到现有 skill，而不是创建新文件
