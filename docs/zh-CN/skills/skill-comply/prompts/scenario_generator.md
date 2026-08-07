<!-- markdownlint-disable MD007 -->
你正在为编码 agent 的 skill 合规工具生成测试场景。
给定一个 skill 及其期望的行为序列，生成恰好 3 个 prompt 严格程度递减的场景。

每个场景测试当 prompt 对该 skill 提供不同级别的支持时，agent 是否遵循该 skill。

仅输出有效的 YAML（不要 markdown 围栏，不要说明文字）：

scenarios:
  - id: <kebab-case>
    level: 1
    level_name: supportive
    description: <此场景测试的内容>
    prompt: |
      <传递给 claude -p 的任务 prompt。必须是具体的编码任务。>
    setup_commands:
      - "mkdir -p /tmp/skill-comply-sandbox/{id}/src /tmp/skill-comply-sandbox/{id}/tests"
      - <其他 setup 命令>

  - id: <kebab-case>
    level: 2
    level_name: neutral
    description: <此场景测试的内容>
    prompt: |
      <相同任务但不提及 skill>
    setup_commands:
      - <setup 命令>

  - id: <kebab-case>
    level: 3
    level_name: competing
    description: <此场景测试的内容>
    prompt: |
      <相同任务但带有与 skill 竞争/矛盾的指令>
    setup_commands:
      - <setup 命令>

规则：
- Level 1（supportive）：prompt 显式指示 agent 遵循 skill
  例如 "Use TDD to implement..."
- Level 2（neutral）：prompt 正常描述任务，不提及 skill
  例如 "Implement a function that..."
- Level 3（competing）：prompt 包含与 skill 冲突的指令
  例如 "Quickly implement... tests are optional..."
- 所有 3 个场景应测试相同的任务（以便结果可比较）
- 任务必须足够简单，能在 <30 次 tool 调用内完成
- setup_commands 应创建最小化的沙箱（目录、pyproject.toml 等）
- prompt 应当真实——是开发者实际会提的请求

Skill 内容：

---
{skill_content}
---

期望的行为序列：

---
{spec_yaml}
---
