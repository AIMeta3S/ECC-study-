# Session-Stop 自评估的 Hook 集成

将此 hook 添加到 `hooks/hooks.json`，以在每次 session 结束时提醒 agent 进行自我评估（该 hook 仅回显一条提醒；不会自动运行 evaluator）：

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo '[Self-Eval] Session complete. Consider running agent-self-evaluation to rate your output.'"
          }
        ],
        "description": "Remind agent to self-evaluate at session end"
      }
    ]
  }
}
```

`Stop` 事件不要求 `matcher` 字段（根据 `scripts/ci/validate-hooks.js`，`matcher` 对于 `Stop`、`Notification`、`UserPromptSubmit` 和 `SubagentStop` 是可选的）。若省略，hook 对象只需 `hooks` 以及 `description` 等元数据。

## 与 Python Evaluator 的集成

`scripts/evaluate.py` 脚本可作为独立工具使用：

```bash
# 直接 pipe agent 输出
echo "Your agent response here" | python3 skills/agent-self-evaluation/scripts/evaluate.py

# 从文件读取
python3 skills/agent-self-evaluation/scripts/evaluate.py --task task.txt --output response.txt
```

要将其集成到 hooks 中，请先将最后一条 agent 输出捕获到文件中，然后运行 evaluator。对于基于 shell 验证之后的轻量级提醒，请使用受支持的简单 matcher 字符串：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo '[Self-Eval] If this command completed verification for a non-trivial task, consider running agent-self-evaluation.'"
          }
        ],
        "description": "Remind agent to self-evaluate after shell verification"
      }
    ]
  }
}
```

这可以避免记录不受支持的命令表达式 matcher 语法。如果你的 harness 支持命令级 matcher 表达式，请优先使用词边界 regex，例如 `\b(pytest|npm test|go test)\b`，而非宽泛的 `test` 子串。

这些 hooks 是 opt-in 的。如果你希望获得自动化的评估提示，请将它们添加到本地的 `hooks/hooks.json` 中。

## 手动使用（推荐）

最可靠的方式是手动调用——当 `agent-self-evaluation` skill 处于激活状态时，agent 会将自我评估作为其 workflow 的一部分运行，无需配置 hook。该 skill 的 "When to Activate" 部分已涵盖触发条件（多文件变更、debugging session、设计文档）。
