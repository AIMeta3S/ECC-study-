---
name: agent-architecture-audit
description: 面向 agent 与 LLM 应用的全栈诊断。审计 12 层 agent 栈，排查 wrapper 回归、memory 污染、tool discipline 失效、隐藏的 repair loop 与 rendering 损坏。产出按 severity 排序的发现，并提供 code-first 的修复方案。对于构建 agent 应用、autonomous loop 或任何 LLM 驱动功能的开发者不可或缺。
metadata:
  origin: oh-my-agent-check
tools: Read, Write, Edit, Bash, Grep, Glob
---

# Agent 架构审计

一套诊断 workflow，针对那些将失败隐藏在 wrapper 层、陈旧 memory、retry loop 或 transport/rendering 变形背后的 agent 系统。

## 何时启用

**必须启用：**
- 将任何 agent 或 LLM 驱动的应用发布到生产环境
- 交付带有 tool calling、memory 或多步骤 workflow 的功能
- 添加 wrapper 层之后 agent 行为出现退化
- 用户反馈"agent 变差了"或"tools 不稳定"
- 同一 model 在 playground 中正常，但在你的 wrapper 中失效
- 调试 agent 行为超过 15 分钟仍未找到根因

**尤其关键的场景：**
- 你新增了 prompt 层、tool 定义或 memory 系统
- 系统中不同 agent 的行为不一致
- model 昨天还正常，今天却出现幻觉
- 你怀疑存在隐蔽的 repair/retry loop 在悄悄篡改响应

**不要用于：**
- 通用代码调试——使用 `agent-introspection-debugging`
- code review——使用特定语言的 reviewer agent
- 安全扫描——使用 `security-review` 或 `security-review/scan`
- agent 性能基准测试——使用 `agent-eval`
- 编写新功能——使用相应的 workflow skill

## 12 层栈

每个 agent 系统都包含这些层。任何一层都可能损坏最终答案：

| # | 层 | 出错的表现 |
|---|-------|----------------|
| 1 | System prompt | 指令冲突、指令膨胀 |
| 2 | Session history | 来自历史轮次的陈旧 context 注入 |
| 3 | Long-term memory | 跨 session 的污染，旧话题出现在新对话中 |
| 4 | Distillation | 压缩后的产物作为伪事实重新进入 |
| 5 | Active recall | 冗余的再总结层浪费 context |
| 6 | Tool selection | tool 路由错误，model 跳过必需的 tool |
| 7 | Tool execution | 幻觉式执行——声称调用了实际却没有 |
| 8 | Tool interpretation | 误读或忽略 tool 输出 |
| 9 | Answer shaping | 最终响应中出现格式损坏 |
| 10 | Platform rendering | Transport 层变形（UI、API、CLI 篡改了原本正确的答案） |
| 11 | Hidden repair loops | 静默的 fallback/retry agent 运行第二次 LLM pass |
| 12 | Persistence | 过期 state 或缓存的产物被当作有效证据复用 |

## 常见失败模式

### 1. Wrapper 回归

base model 本可产出正确答案，但 wrapper 层使其变差。

**症状：**
- model 在 playground 或直接 API 调用中正常，在你的 agent 中却失效
- 新增了一层 prompt 之后，既有行为退化
- agent 听起来很自信，却自信地给出错误答案
- "上次更新前还能正常工作"

### 2. Memory 污染

旧话题通过 history、memory 检索或 distillation 泄漏到新对话中。

**症状：**
- agent 提起无关的旧话题
- 用户的纠正不生效（旧 memory 覆盖了新 memory）
- 同一 session 的产物作为伪事实重新进入
- memory 无限增长，随时间推移降低响应质量

### 3. Tool Discipline 失效

tool 在 prompt 中声明，却未在代码中强制执行。model 要么跳过它们，要么产生幻觉式执行。

**症状：**
- prompt 里写着"必须使用 tool X"，但 model 不调用它就直接作答
- tool 结果看上去正确，实际从未执行
- 不同 tool 争夺同一职责
- model 在不该用 tool 时使用，在必须使用时却跳过

### 4. Rendering/Transport 损坏

agent 的内部答案本正确，但 platform 层在交付过程中将其篡改。

**症状：**
- log 显示正确答案，用户看到的却是损坏的输出
- Markdown 渲染、JSON 解析或 streaming 分片损坏了有效响应
- 隐蔽的 fallback agent 在交付前悄悄替换了答案
- 终端与 UI 上的输出不一致

### 5. 隐藏的 Agent 层

静默的 repair、retry、summarization 或 recall agent 在没有明确契约的情况下运行。

**症状：**
- 输出在内部生成与交付用户之间发生变化
- "auto-fix" loop 运行了用户不知道的第二次 LLM pass
- 多个 agent 在无协调情况下修改同一输出
- 答案被不可见的层"平滑化"或"纠正"

## 审计 Workflow

### Phase 1：确定范围

明确你要审计的对象：

- **目标系统**——哪个 agent 应用？
- **入口**——用户如何与之交互？
- **Model stack**——使用哪些 LLM 和 provider？
- **症状**——用户反馈了什么？
- **时间窗口**——从何时开始？
- **待审计层**——12 层中哪些适用？

### Phase 2：证据收集

从代码库收集证据：

- **源代码**——agent loop、tool router、memory admission、prompt assembly
- **Log**——历史 session trace、tool call 记录
- **配置**——prompt 模板、tool schema、provider 设置
- **Memory 文件**——SOP、知识库、session 归档

使用 `rg` 搜索 anti-pattern：

```bash
# 仅在 prompt 文本中（而非代码中）表达的 tool 要求
rg "must.*tool|必须.*工具|required.*call" --type md

# 没有校验的 tool 执行
rg "tool_call|toolCall|tool_use" --type py --type ts

# 主 agent loop 之外的隐蔽 LLM 调用
rg "completion|chat\.create|messages\.create|llm\.invoke"

# 没有用户纠正优先级的 memory admission
rg "memory.*admit|long.*term.*update|persist.*memory" --type py --type ts

# 触发额外 LLM 调用的 fallback loop
rg "fallback|retry.*llm|repair.*prompt|re-?prompt" --type py --type ts

# 静默的输出篡改
rg "mutate|rewrite.*response|transform.*output|shap" --type py --type ts
```

### Phase 3：失败映射

对每个发现，记录以下内容：

- **症状**——用户看到的现象
- **机制**——wrapper 如何导致该现象
- **来源层**——属于 12 层中的哪一层
- **根因**——最深层的成因
- **证据**——file:line 或 log:row 引用
- **置信度**——0.0 到 1.0

### Phase 4：修复策略

默认修复顺序（code-first，而非 prompt-first）：

1. **在代码层对 tool 要求设卡**——在代码中强制执行，而非仅写在 prompt 文本里
2. **移除或收窄隐蔽的 repair agent**——通过契约让 fallback 显式化
3. **减少 context 重复**——同一信息不要同时穿过 prompt + history + memory + distillation
4. **收紧 memory admission**——用户纠正优先于 agent 断言
5. **收紧 distillation 触发条件**——不该压缩的内容不要压缩
6. **减少 rendering 变形**——直通传递，不要变换
7. **改用 typed JSON envelope**——结构化的内部流转，而非自由散文

## Severity 模型

| Level | 含义 | 行动 |
|-------|---------|--------|
| `critical` | agent 可能自信地产生错误的运行时行为 | 下次发布前修复 |
| `high` | agent 频繁损害正确性或稳定性 | 本 sprint 内修复 |
| `medium` | 正确性通常还在，但输出脆弱或浪费 | 计划于下一周期处理 |
| `low` | 多为外观或可维护性问题 | 放入 backlog |

## 输出格式

按以下顺序向用户呈现发现：

1. **按 severity 排序的发现**（最严重的在前）
2. **架构诊断**（哪一层损坏了什么，以及为什么）
3. **有序的修复计划**（code-first，而非 prompt-first）

不要以恭维或概括开头。如果系统是坏的，直接说明。

## 快速诊断问题

审计 agent 系统时，回答以下问题：

| # | 问题 | 若为"是"则 → |
|---|----------|----------|
| 1 | model 能否跳过必需的 tool 仍然作答？ | 该 tool 未在代码层卡控 |
| 2 | 旧的对话内容是否出现在新轮次中？ | Memory 污染 |
| 3 | 同一信息是否同时存在于 system prompt、memory 与 history 中？ | Context 重复 |
| 4 | platform 是否在交付前运行了第二次 LLM pass？ | Hidden repair loop |
| 5 | 输出在内部生成与交付用户之间是否不同？ | Rendering 损坏 |
| 6 | "必须使用 tool X"规则是否只出现在 prompt 文本中？ | Tool discipline 失效 |
| 7 | agent 自身的独白能否成为持久化的 memory？ | Memory 中毒 |

## 应避免的 Anti-Pattern

- 在证伪 wrapper 层回归之前，不要先归咎于 model。
- 在展示污染路径之前，不要先归咎于 memory。
- 不要让当前干净的状态抹去历史上的脏事件。
- 不要把 markdown 散文当作可信赖的内部 protocol。
- 当代码从不强制执行时，不要接受 prompt 文本里的"必须使用 tool"。
- 发现要直接、有证据支撑、并按 severity 排序。

## Report Schema

审计应按以下结构产出结构化报告：

```json
{
  "schema_version": "ecc.agent-architecture-audit.report.v1",
  "executive_verdict": {
    "overall_health": "high_risk",
    "primary_failure_mode": "string",
    "most_urgent_fix": "string"
  },
  "scope": {
    "target_name": "string",
    "model_stack": ["string"],
    "layers_to_audit": ["string"]
  },
  "findings": [
    {
      "severity": "critical|high|medium|low",
      "title": "string",
      "mechanism": "string",
      "source_layer": "string",
      "root_cause": "string",
      "evidence_refs": ["file:line"],
      "confidence": 0.0,
      "recommended_fix": "string"
    }
  ],
  "ordered_fix_plan": [
    { "order": 1, "goal": "string", "why_now": "string", "expected_effect": "string" }
  ]
}
```

## 相关 Skill

- `agent-introspection-debugging`——调试 agent 运行时失败（loop、超时、state 错误）
- `agent-eval`——对 agent 性能做正面对比基准测试
- `security-review`——针对代码与配置的安全审计
- `autonomous-agent-harness`——搭建 autonomous agent 运营
- `agent-harness-construction`——从零构建 agent harness
