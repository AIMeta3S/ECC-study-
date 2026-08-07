---
name: hipaa-compliance
description: HIPAA 专用入口，用于医疗隐私与安全相关工作。当任务明确围绕 HIPAA、PHI 处理、适用实体、BAA、泄露态势或美国医疗合规要求时使用。
metadata:
  origin: ECC direct-port 适配
version: "1.0.0"
---

# HIPAA Compliance

当任务明确涉及美国医疗合规时，将此 skill 作为 HIPAA 专用入口使用。本 skill 有意保持精简与权威：

- `healthcare-phi-compliance` 仍然是 PHI/PII 处理、数据分级、审计日志、加密与泄漏防护的主要实现 skill。
- `healthcare-reviewer` 仍然是专门的审查 agent，当代码、架构或产品行为需要从医疗视角进行二次审查时使用。
- `security-review` 仍适用于通用的认证、输入处理、密钥、API 与部署加固。

## When to Use

- 请求明确提及 HIPAA、PHI、适用实体、业务伙伴或 BAA
- 构建或审查存储、处理、导出或传输 PHI 的美国医疗软件
- 评估日志、分析、LLM prompt、存储或支持工作流是否会造成 HIPAA 风险敞口
- 设计患者端或临床端系统，且最小必要访问与可审计性至关重要

## How It Works

将 HIPAA 视为叠加在更广泛的医疗隐私 skill 之上的覆盖层：

1. 从 `healthcare-phi-compliance` 获取具体的实现规则。
2. 应用 HIPAA 专属的决策门控：
   - 这些数据是否属于 PHI？
   - 该参与方是适用实体还是业务伙伴？
   - 供应商或模型提供商在接触数据前是否需要签订 BAA？
   - 访问是否被限制在最小必要范围内？
   - 读/写/导出事件是否可审计？
3. 若任务影响患者安全、临床工作流或受监管的生产架构，则升级至 `healthcare-reviewer`。

## HIPAA-Specific Guardrails

- 永远不要将 PHI 放入日志、分析事件、崩溃报告、prompt 或客户端可见的错误字符串中。
- 永远不要在 URL、浏览器存储、截图或复制的示例 payload 中暴露 PHI。
- 对 PHI 的读写要求认证访问、限定范围的授权以及审计轨迹。
- 在 BAA 状态和数据边界明确之前，将第三方 SaaS、可观测性、支持工具和 LLM 提供商一律按默认阻断处理。
- 遵循最小必要访问原则：正确的用户只应看到完成任务所需的最小 PHI 切片。
- 优先使用不透明的内部 ID，而非姓名、MRN、电话号码、地址或其他标识符。

## Examples

### Example 1: 以 HIPAA 为框架的产品请求

用户请求：

> 在临床医生 dashboard 中添加 AI 生成的就诊摘要。我们服务于美国诊所，需要保持 HIPAA 合规。

响应模式：

- 激活 `hipaa-compliance`
- 使用 `healthcare-phi-compliance` 审查 PHI 流转、日志、存储与 prompt 边界
- 在发送任何 PHI 之前，核实摘要生成提供商是否已由 BAA 覆盖
- 若摘要会影响临床决策，则升级至 `healthcare-reviewer`

### Example 2: 供应商/工具决策

用户请求：

> 我们能否将支持工单记录和患者消息汇入分析栈？

响应模式：

- 假设这些消息可能包含 PHI
- 除非分析供应商已获准用于受 HIPAA 约束的工作负载且数据路径已最小化，否则阻断该设计
- 尽可能要求脱敏或采用非 PHI 的事件模型

## Related Skills

- `healthcare-phi-compliance`
- `healthcare-reviewer`
- `healthcare-emr-patterns`
- `healthcare-eval-harness`
- `security-review`
