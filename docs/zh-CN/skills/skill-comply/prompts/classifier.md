你的任务是将来自一次 coding agent session 的 tool call，对照预期的行为步骤进行分类。

对于每个 tool call，判断它属于哪个步骤（如果有的话）。一个 tool call 最多只能匹配一个步骤。

步骤：
{steps_description}

Tool call（带编号）：
{tool_calls}

仅回复一个 JSON object，将 step_id 映射到匹配的 tool call 编号列表。
只包含至少有一个匹配的步骤。如果没有 tool call 匹配某个步骤，则省略该步骤。

示例回复：
{"write_test": [0, 1], "run_test_red": [2], "write_impl": [3, 4]}

规则：
- 匹配应基于 tool call 的语义（MEANING），而非仅凭关键词
- 对 "test_calculator.py" 的一次 Write 属于测试文件写入，即使其内容类似实现代码
- 对 "calculator.py" 的一次 Write 属于实现代码写入，即使其中包含测试辅助代码
- 运行 "pytest" 且输出 "FAILED" 的一次 Bash 属于 RED 阶段的测试执行
- 运行 "pytest" 且输出 "passed" 的一次 Bash 属于 GREEN 阶段的测试执行
- 每个 tool call 最多只能匹配一个步骤（选择最佳匹配）
- 如果某个 tool call 不匹配任何步骤，则不要包含它
