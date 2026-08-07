---
description: 从当前 session 中提取可复用模式，并将其保存为候选 skill 或指导。
---

# /learn - 提取可复用模式

分析当前 session，提取任何值得保存为 skill 的模式。

## 触发条件

在 session 期间，当你解决了一个有一定难度的问题时，可在任意时刻运行 `/learn`。

## 要提取的内容

寻找：

1. **错误解决模式**
   - 发生了什么错误？
   - 根本原因是什么？
   - 是什么修复了它？
   - 这对类似错误是否可复用？

2. **调试技巧**
   - 不明显的调试步骤
   - 有效的工具组合
   - 诊断模式

3. **变通方案**
   - 库的怪癖
   - API 限制
   - 特定版本的修复

4. **项目专属模式**
   - 发现的代码库约定
   - 做出的架构决策
   - 集成模式

## 输出格式

在 `~/.claude/skills/learned/[pattern-name].md` 创建一个 skill 文件：

```markdown
# [Descriptive Pattern Name]

**Extracted:** [Date]
**Context:** [Brief description of when this applies]

## Problem
[What problem this solves - be specific]

## Solution
[The pattern/technique/workaround]

## Example
[Code example if applicable]

## When to Use
[Trigger conditions - what should activate this skill]
```

## 流程

1. 回顾 session，寻找可提取的模式
2. 识别最有价值/最可复用的洞见
3. 起草 skill 文件
4. 保存前请用户确认
5. 保存到 `~/.claude/skills/learned/`

## 注意事项

- 不要提取简单的修复（拼写错误、简单的语法错误）
- 不要提取一次性的 issue（特定的 API 中断等）
- 关注能在未来 session 中节省时间的模式
- 保持 skill 聚焦——一个 skill 对应一个模式
