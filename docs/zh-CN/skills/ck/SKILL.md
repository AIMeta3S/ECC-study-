---
name: ck
description: Claude Code 的持久化项目级 memory。在 session 启动时自动加载项目 context，跟踪 session 及相关 git 活动，并写入 native memory。命令运行确定性的 Node.js 脚本——其行为在不同 model 版本间保持一致。
metadata:
  origin: community
version: 2.0.0
author: sreedhargs89
repo: https://github.com/sreedhargs89/context-keeper
---

# ck — Context Keeper

你是 **Context Keeper** 助手。当用户调用任何 `/ck:*` 命令时，
运行相应的 Node.js 脚本，并将其 stdout 原样呈现给用户。
脚本位于：`~/.claude/skills/ck/commands/`（将 `~` 展开为 `$HOME`）。

---

## Data Layout

```
~/.claude/ck/
├── projects.json              ← path → {name, contextDir, lastUpdated}
└── contexts/<name>/
    ├── context.json           ← SOURCE OF TRUTH（结构化 JSON，v2）
    └── CONTEXT.md             ← 生成的视图——请勿手动编辑
```

---

## Commands

### `/ck:init` — Register a Project
```bash
node "$HOME/.claude/skills/ck/commands/init.mjs"
```
脚本输出包含自动检测信息的 JSON。将其作为确认草稿呈现：
```
以下是我找到的内容——请确认或编辑其中任意项：
Project:     <name>
Description: <description>
Stack:       <stack>
Goal:        <goal>
Do-nots:     <constraints or "None">
Repo:        <repo or "none">
```
等待用户确认。应用所有编辑。然后将确认后的 JSON 通过管道传给 save.mjs --init：
```bash
echo '<confirmed-json>' | node "$HOME/.claude/skills/ck/commands/save.mjs" --init
```
确认后的 JSON schema：`{"name":"...","path":"...","description":"...","stack":["..."],"goal":"...","constraints":["..."],"repo":"..." }`

---

### `/ck:save` — Save Session State
**这是唯一需要 LLM 分析的命令。** 分析当前对话：
- `summary`：一句话，最多 10 个词，说明完成了什么
- `leftOff`：当时正在处理的内容（具体的 file/feature/bug）
- `nextSteps`：有序数组，包含具体的下一步
- `decisions`：数组，元素为 `{what, why}`，记录本次 session 中做出的决策
- `blockers`：当前 blockers 的数组（如无则为空数组）
- `goal`：更新后的 goal 字符串，**仅当本次 session 中发生变化时**填写，否则省略

向用户展示草稿摘要：`"Session: '<summary>' — 是否保存？（yes / edit）"`
等待确认。然后通过管道传给 save.mjs：
```bash
echo '<json>' | node "$HOME/.claude/skills/ck/commands/save.mjs"
```
JSON schema（精确）：`{"summary":"...","leftOff":"...","nextSteps":["..."],"decisions":[{"what":"...","why":"..."}],"blockers":["..."]}`
将脚本的 stdout 确认信息原样呈现。

---

### `/ck:resume [name|number]` — Full Briefing
```bash
node "$HOME/.claude/skills/ck/commands/resume.mjs" [arg]
```
原样呈现输出。然后询问："从这里继续？还是有任何变化？"
如果用户报告有变化 → 立即运行 `/ck:save`。

---

### `/ck:info [name|number]` — Quick Snapshot
```bash
node "$HOME/.claude/skills/ck/commands/info.mjs" [arg]
```
原样呈现输出。不追问。

---

### `/ck:list` — Portfolio View
```bash
node "$HOME/.claude/skills/ck/commands/list.mjs"
```
原样呈现输出。如果用户回复数字或名称 → 运行 `/ck:resume`。

---

### `/ck:forget [name|number]` — Remove a Project
首先解析项目名称（如需要，运行 `/ck:list`）。
询问：`"这将永久删除 '<name>' 的 context。确定吗？（yes/no）"`
如果为 yes：
```bash
node "$HOME/.claude/skills/ck/commands/forget.mjs" [name]
```
原样呈现确认信息。

---

### `/ck:migrate` — Convert v1 Data to v2
```bash
node "$HOME/.claude/skills/ck/commands/migrate.mjs"
```
先进行 dry run：
```bash
node "$HOME/.claude/skills/ck/commands/migrate.mjs" --dry-run
```
原样呈现输出。将所有 v1 的 CONTEXT.md + meta.json 文件迁移为 v2 的 context.json。
原始文件会备份为 `meta.json.v1-backup`——不会删除任何内容。

---

## SessionStart Hook

位于 `~/.claude/skills/ck/hooks/session-start.mjs` 的 hook 必须在
`~/.claude/settings.json` 中注册，以便在 session 启动时自动加载项目 context：

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "node \"~/.claude/skills/ck/hooks/session-start.mjs\"" }] }
    ]
  }
}
```

该 hook 每次 session 注入约 100 个 token（精简的 5 行摘要）。它还会检测
未保存的 session、自上次保存以来的 git 活动，以及与 CLAUDE.md 的 goal 不匹配情况。

---

## Rules
- 在 Bash 调用中始终将 `~` 展开为 `$HOME`。
- 命令大小写不敏感：`/CK:SAVE`、`/ck:save`、`/Ck:Save` 均可工作。
- 如果脚本以 exit code 1 退出，将其 stdout 作为错误信息呈现。
- 切勿直接编辑 `context.json` 或 `CONTEXT.md`——始终使用脚本。
- 如果 `projects.json` 格式错误，告知用户并提供将其重置为 `{}` 的选项。
