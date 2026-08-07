---
description: 对抗式双重审查收敛循环——两名独立的模型审查者必须在代码发布前都批准通过。
---

# Santa Loop

使用 santa-method skill 的对抗式双重审查收敛循环。两名独立的审查者——不同的模型、不共享上下文——都必须返回 NICE，代码才能发布。

## 目的

对当前任务输出运行两名独立的审查者（Claude Opus + 一个外部模型）。在推送代码之前，两者都必须返回 PASS。如果任一方返回 NAUGHTY，修复所有被标记的问题，提交，并重新运行全新的审查者——最多 3 轮。

## 用法

```
/santa-loop [file-or-glob | description]
```

## 工作流

### 步骤 1：确定审查内容

从 `$ARGUMENTS` 确定审查范围，或回退到未提交的更改：

```bash
git diff --name-only HEAD
```

读取所有变更的文件，以构建完整的审查上下文。如果 `$ARGUMENTS` 指定了路径、文件或描述，则改用其作为审查范围。

### 步骤 2：构建 rubric

构建适合受审查文件类型的 rubric。每条标准都必须有客观的 PASS/FAIL 条件。至少包括：

| 标准 | 通过条件 |
|-----------|---------------|
| Correctness | 逻辑正确，无 bug，处理 edge case |
| Security | 无 secret、injection、XSS 或 OWASP Top 10 问题 |
| Error handling | 错误被显式处理，无静默吞没 |
| Completeness | 所有需求都已覆盖，无遗漏情况 |
| Internal consistency | 文件或章节之间无矛盾 |
| No regressions | 变更不会破坏现有行为 |

根据文件类型添加领域特定的标准（例如，TS 的 type safety、Rust 的 memory safety、SQL 的 migration safety）。

### 步骤 3：双重独立审查

使用 Agent tool **并行**启动两名审查者（在单条消息中同时启动以实现并发执行）。两者都必须完成，才能进入 verdict gate。

每名审查者对 rubric 的每条标准评估为 PASS 或 FAIL，然后返回结构化的 JSON：

```json
{
  "verdict": "PASS" | "FAIL",
  "checks": [
    {"criterion": "...", "result": "PASS|FAIL", "detail": "..."}
  ],
  "critical_issues": ["..."],
  "suggestions": ["..."]
}
```

verdict gate（步骤 4）将其映射为 NICE/NAUGHTY：两者都 PASS → NICE，任一 FAIL → NAUGHTY。

#### Reviewer A：Claude Agent（始终运行）

启动一个 Agent（subagent_type: `code-reviewer`、model: `opus`），附带完整的 rubric + 所有受审查的文件。prompt 必须包括：
- 完整的 rubric
- 所有受审查文件的完整内容
- "你是一名独立的质量审查者。你没有看到任何其他审查结果。你的职责是发现问题，而非批准。"
- 返回上面的结构化 JSON verdict

#### Reviewer B：外部模型（仅在没有安装外部 CLI 时回退到 Claude）

首先，检测可用的 CLI：
```bash
command -v codex >/dev/null 2>&1 && echo "codex" || true
command -v gemini >/dev/null 2>&1 && echo "gemini" || true
```

构建审查者 prompt（与 Reviewer A 相同的 rubric + 指令），并将其写入一个唯一的临时文件：
```bash
PROMPT_FILE=$(mktemp /tmp/santa-reviewer-b-XXXXXX.txt)
cat > "$PROMPT_FILE" << 'EOF'
... full rubric + file contents + reviewer instructions ...
EOF
```

使用第一个可用的 CLI：

**Codex CLI**（如果已安装）
```bash
codex exec --sandbox read-only -m gpt-5.4 -C "$(pwd)" - < "$PROMPT_FILE"
rm -f "$PROMPT_FILE"
```

**Gemini CLI**（如果已安装且 codex 未安装）
```bash
gemini -p "$(cat "$PROMPT_FILE")" -m gemini-2.5-pro
rm -f "$PROMPT_FILE"
```

**Claude Agent 回退**（仅当 `codex` 和 `gemini` 均未安装时）
启动第二个 Claude Agent（subagent_type: `code-reviewer`、model: `opus`）。记录一条警告：两名审查者共享同一模型系列——未实现真正的模型多样性，但仍保持了上下文隔离。

在所有情况下，审查者都必须返回与 Reviewer A 相同的结构化 JSON verdict。

### 步骤 4：Verdict Gate

- **两者都 PASS** → **NICE** — 进入步骤 6（推送）
- **任一 FAIL** → **NAUGHTY** — 合并两名审查者的所有 critical issue，去重，进入步骤 5

### 步骤 5：修复循环（NAUGHTY 路径）

1. 展示两名审查者的所有 critical issue
2. 修复每个被标记的问题——只修改被标记的内容，不做 drive-by refactor
3. 在一个 commit 中提交所有修复：
   ```
   fix: address santa-loop review findings (round N)
   ```
4. 使用**全新的审查者**重新运行步骤 3（不保留之前轮次的记忆）
5. 重复直到两者都返回 PASS

**最多 3 次迭代。** 如果 3 轮后仍为 NAUGHTY，则停止并展示剩余问题：

```
SANTA LOOP ESCALATION (exceeded 3 iterations)

Remaining issues after 3 rounds:
- [list all unresolved critical issues from both reviewers]

Manual review required before proceeding.
```

不要推送。

### 步骤 6：推送（NICE 路径）

当两名审查者都返回 PASS 时：

```bash
git push -u origin HEAD
```

### 步骤 7：最终报告

打印输出报告（见下方的输出章节）。

## Output

```
SANTA VERDICT: [NICE / NAUGHTY (escalated)]

Reviewer A (Claude Opus):   [PASS/FAIL]
Reviewer B ([model used]):  [PASS/FAIL]

Agreement:
  Both flagged:      [issues caught by both]
  Reviewer A only:   [issues only A caught]
  Reviewer B only:   [issues only B caught]

Iterations: [N]/3
Result:     [PUSHED / ESCALATED TO USER]
```

## 注意事项

- Reviewer A（Claude Opus）始终运行——无论工具情况如何，都保证至少有一名强审查者。
- Reviewer B 的目标是模型多样性。GPT-5.4 或 Gemini 2.5 Pro 提供真正的独立性——不同的训练数据、不同的偏差、不同的盲点。仅 Claude 的回退仍通过上下文隔离提供价值，但失去了模型多样性。
- 使用最强的可用模型：Reviewer A 使用 Opus，Reviewer B 使用 GPT-5.4 或 Gemini 2.5 Pro。
- 外部审查者以 `--sandbox read-only`（Codex）运行，以防止审查期间对仓库的修改。
- 每轮使用全新的审查者，可防止先前发现造成的锚定偏差。
- rubric 是最重要的输入。如果审查者机械批准或标记主观的风格问题，请收紧 rubric。
- 在 NAUGHTY 轮次进行 commit，这样即使循环被中断，修复也会被保留。
- 只有在 NICE 之后才推送——绝不在循环中途推送。
