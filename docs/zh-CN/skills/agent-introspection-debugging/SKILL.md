---
name: agent-introspection-debugging
description: 针对 AI agent 失败的结构化自调试工作流，使用捕获、诊断、受控恢复和内省报告。
metadata:
  origin: ECC
---

# Agent 内省调试

当 agent 运行反复失败、消耗 token 却无进展、在同一组 tools 上循环、或偏离预期任务时，使用此 skill。

这是一个工作流 skill，而非隐藏的 runtime。它教导 agent 在升级到人工介入之前系统地自我调试。

## 何时激活

- 达到 tool call / loop 上限的失败
- 反复重试却无前进进展
- context 膨胀或 prompt 漂移开始降低输出质量
- 文件系统或环境状态与预期不符
- 通过诊断和更小的纠正性动作有可能恢复的 tool 失败

## 范围边界

在此情况下激活此 skill：
- 在盲目重试之前捕获失败状态
- 诊断常见的 agent 特有失败模式
- 应用受控的恢复动作
- 生成结构化、人类可读的调试报告

不要将此 skill 作为以下场景的主要来源：
- 代码变更后的功能验证；请使用 `verification-loop`
- 当已存在更窄的 ECC skill 时，进行框架特定的调试
- 当前 harness 无法自动强制执行的 runtime 承诺

## 四阶段循环

### 阶段 1：失败捕获

在尝试恢复之前，精确记录失败。

捕获：
- error 类型、消息以及可用时的 stack trace
- 最后有意义的 tool call 序列
- agent 当时试图做什么
- 当前 context 压力：重复的 prompt、过大的粘贴 log、重复的 plan，或失控的笔记
- 当前环境假设：cwd、branch、相关服务状态、预期文件

最小捕获模板：

```markdown
## Failure Capture
- Session / task:
- Goal in progress:
- Error:
- Last successful step:
- Last failed tool / command:
- Repeated pattern seen:
- Environment assumptions to verify:
```

### 阶段 2：根因诊断

在更改任何内容之前，将失败与已知模式匹配。

| 模式 | 可能原因 | 检查方式 |
| --- | --- | --- |
| 达到 tool call 上限 / 重复同一命令 | loop 或无出口的观察者路径 | 检查最后 N 次 tool call 是否存在重复 |
| context 溢出 / 推理质量下降 | 无限制的笔记、重复的 plan、过大的 log | 检查近期 context 是否存在重复和低信号的大量内容 |
| `ECONNREFUSED` / 超时 | 服务不可用或端口错误 | 验证服务健康状态、URL 和端口假设 |
| `429` / 配额耗尽 | 重试风暴或缺失 backoff | 统计重复调用次数并检查重试间隔 |
| 写入后文件缺失 / 陈旧的 diff | 竞态、错误的 cwd 或 branch 漂移 | 重新检查路径、cwd、git status 以及文件实际存在性 |
| "修复"后测试仍然失败 | 错误的假设 | 隔离确切失败的测试并重新推导 bug |

诊断问题：
- 这是逻辑失败、状态失败、环境失败，还是策略失败？
- agent 是否丢失了真实目标并开始优化错误的子任务？
- 失败是确定性的还是瞬时的？
- 能够验证诊断的最小可逆动作是什么？

### 阶段 3：受控恢复

以最小的、能改变诊断观察面的动作进行恢复。

安全的恢复动作：
- 停止重复重试并重述假设
- 裁剪低信号 context，只保留活跃目标、阻塞项和证据
- 重新检查实际的文件系统 / branch / 进程状态
- 将任务收窄到一个失败的命令、一个文件或一个测试
- 从推测性推理切换到直接观察
- 当失败高风险或被外部阻塞时升级到人工介入

不要声称未获支持的自动修复动作，例如"重置 agent 状态"或"更新 harness 配置"，除非你确实通过当前环境中的真实 tool 执行了它们。

受控恢复检查清单：

```markdown
## Recovery Action
- Diagnosis chosen:
- Smallest action taken:
- Why this is safe:
- What evidence would prove the fix worked:
```

### 阶段 4：内省报告

以一份报告结束，让下一个 agent 或人类能够理解这次恢复。

```markdown
## Agent Self-Debug Report
- Session / task:
- Failure:
- Root cause:
- Recovery action:
- Result: success | partial | blocked
- Token / time burn risk:
- Follow-up needed:
- Preventive change to encode later:
```

## 恢复启发式方法

按以下顺序优先采用这些干预措施：

1. 用一句话重述真实目标。
2. 验证世界状态，而不是相信记忆。
3. 收窄失败范围。
4. 运行一次具有区分度的检查。
5. 仅在此时重试。

糟糕模式：
- 以略微不同的措辞重试同一动作三次

良好模式：
- 捕获失败
- 分类模式
- 运行一次直接检查
- 仅当检查支持时才更改 plan

## 与 ECC 的集成

- 如果更改了代码，在恢复之后使用 `verification-loop`。
- 当失败模式值得转化为 instinct 或后续 skill 时，使用 `continuous-learning-v2`。
- 当问题不是技术性失败而是决策歧义时，使用 `council`。
- 如果失败来自冲突的本地状态或 repo 漂移，使用 `workspace-surface-audit`。

## 输出标准

当此 skill 处于活跃状态时，不要以"我修好了"单独结束。

始终提供：
- 失败模式
- 根因假设
- 恢复动作
- 表明情况现已改善或仍被阻塞的证据
