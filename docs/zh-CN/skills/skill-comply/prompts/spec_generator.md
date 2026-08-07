<!-- markdownlint-disable MD007 -->
你正在分析一个供编码 agent (Claude Code) 使用的 skill/rule 文件。
你的任务：提取当此 skill 处于激活状态时 agent 应遵循的**可观察行为序列**。

每个步骤应当用自然语言描述。不要使用 regex patterns。

仅以下面的确切格式输出有效的 YAML（不要 markdown fences，不要说明）：

id: <kebab-case-id>
name: <人类可读的名称>
source_rule: <提供的 file path>
version: "1.0"

steps:
  - id: <snake_case>
    description: <agent 应当做什么>
    required: true|false
    detector:
      description: <用自然语言描述应当寻找什么样的 tool call>
      after_step: <该步骤必须在哪个 step_id 之后，可选——若不需要则省略>
      before_step: <该步骤必须在哪个 step_id 之前，可选——若不需要则省略>

scoring:
  threshold_promote_to_hook: 0.6

规则：
- detector.description 应当描述 tool call 的含义，而非模式
  好："Write 或 Edit 一个 test 文件（而非 implementation 文件）"
  差："Write|Edit，input 匹配 test.*\.py"
- 对于顺序重要的 skill（如 TDD：先 test 后 impl），使用 before_step/after_step
- 对于只关注步骤是否存在的 skill，省略顺序约束
- 仅当 skill 写明 "optionally" 或 "if applicable" 时，才将步骤标记为 required: false
- 3-7 个步骤为佳。不要过度拆分
- 重要：所有包含冒号的 YAML 字符串值必须用双引号包裹
  好：description: "使用 conventional commit 格式（type: description）"
  差：description: 使用 conventional commit 格式（type: description）

待分析的 skill 文件：

---
{skill_content}
---
