---
description: 从当前 session 中提取可复用模式，并将其保存为候选 skill 或 guidance。
---

# /learn - 提取可复用模式

分析当前 session，提取任何值得保存为 skill 的模式。

## 触发条件

在 session 期间，当你解决了一个有一定难度的问题时，可在任意时刻运行 `/learn`。

## 要提取的内容

寻找：

1. **错误的解决模式**
   - 发生了什么错误？
   - 根本原因是什么？
   - 如何修复的？
   - 这对类似错误可复用吗？

2. **调试技巧**
   - 非常规调试步骤
   - 有效的工具组合
   - 诊断模式

3. **Workarounds**
   - Library quirks
   - API limitations 
   - Version-specific fixes

4. **项目专属模式**
   - 发现的代码库约定
   - 做出的架构决策
   - 集成模式

## 输出格式

在 `~/.claude/skills/learned/[pattern-name].md` 创建一个 skill 文件：

```markdown
# [描述性模式名称]

**提取时间：** [日期]
**上下文：** [简要描述适用的场景]

## 问题
[待解决的问题 - 请具体说明]

## 解决方案
[模式/技巧/workaround]

## 示例
[如有代码示例，请提供]

## 何时使用
[触发条件 - 什么情况应激活此 skill]
```

## 流程

1. 回顾 session，寻找可提取的模式
2. 识别最有价值/最可复用的洞察
3. 起草 skill 文件
4. 保存前请用户确认
5. 保存到 `~/.claude/skills/learned/`

## 注意事项

- 不要提取简单的修复（拼写错误、简单的语法错误）
- 不要提取一次性的 issue（特定的 API 中断等）
- 关注能在未来 session 中节省时间的模式
- 保持 skill 聚焦——一个 skill 对应一个模式
