---
description: 从 ~/.claude/session-data/ 加载最新的 session 文件，并带着上次 session 结束时的完整上下文继续工作。
---

# Resume Session 命令

加载上次保存的 session 状态，并在开展任何工作之前先完整定位上下文。
此命令与 `/save-session` 配对使用。

## 适用场景

- 开始新 session 以继续前一天的工作
- 由于上下文限制而启动全新 session 之后
- 当从其他来源交接 session 文件时（只需提供文件路径）
- 任何时候你持有 session 文件、并希望 Claude 在继续之前完整吸收其内容

## 用法

```
/resume-session                                                      # 加载 ~/.claude/session-data/ 中最新的文件
/resume-session 2024-01-15                                           # 加载该日期最新的 session
/resume-session ~/.claude/session-data/2024-01-15-abc123de-session.tmp  # 加载当前 short-id 格式的 session 文件
/resume-session ~/.claude/sessions/2024-01-15-session.tmp               # 加载指定的 legacy 格式文件
```

## 流程

### 第 1 步：查找 session 文件

如果未提供参数：

1. 检查 `~/.claude/session-data/`
2. 选择最近修改的 `*-session.tmp` 文件
3. 如果文件夹不存在或没有匹配的文件，告知用户：
   ```
   No session files found in ~/.claude/session-data/
   Run /save-session at the end of a session to create one.
   ```
   然后停止。

如果提供了参数：

- 如果它看起来像日期（`YYYY-MM-DD`），先搜索 `~/.claude/session-data/`，再搜索 legacy
  目录 `~/.claude/sessions/`，查找匹配 `YYYY-MM-DD-session.tmp`（legacy 格式）或
  `YYYY-MM-DD-<shortid>-session.tmp`（当前格式）的文件，
  并加载该日期最近修改的版本
- 如果它看起来像文件路径，直接读取该文件
- 如果未找到，明确报告并停止

### 第 2 步：读取整个 session 文件

读取完整文件。此时先不要总结。

### 第 3 步：确认理解

按以下精确格式回复结构化简报：

```
SESSION LOADED: [actual resolved path to the file]
════════════════════════════════════════════════

PROJECT: [project name / topic from file]

WHAT WE'RE BUILDING:
[2-3 sentence summary in your own words]

CURRENT STATE:
PASS: Working: [count] items confirmed
 In Progress: [list files that are in progress]
 Not Started: [list planned but untouched]

WHAT NOT TO RETRY:
[list every failed approach with its reason — this is critical]

OPEN QUESTIONS / BLOCKERS:
[list any blockers or unanswered questions]

NEXT STEP:
[exact next step if defined in the file]
[if not defined: "No next step defined — recommend reviewing 'What Has NOT Been Tried Yet' together before starting"]

════════════════════════════════════════════════
Ready to continue. What would you like to do?
```

### 第 4 步：等待用户

不要自动开始工作。不要触碰任何文件。等待用户说明下一步做什么。

如果 session 文件中明确定义了下一步，且用户说"continue"或"yes"或类似表述——则执行该明确的下一步。

如果未定义下一步——询问用户从哪里开始，并可选择从"What Has NOT Been Tried Yet"部分推荐一种方案。

---

## 边界情况

**同一日期存在多个 session**（`2024-01-15-session.tmp`、`2024-01-15-abc123de-session.tmp`）：
加载该日期最近修改的匹配文件，无论它使用的是 legacy 的无 id 格式还是当前的 short-id 格式。

**Session 文件引用了已不存在的文件：**
在简报中指出这一点——"WARNING: `path/to/file.ts` referenced in session but not found on disk."

**Session 文件来自 7 天以前：**
提示这一间隔——"WARNING: This session is from N days ago (threshold: 7 days). Things may have changed."——然后正常继续。

**用户直接提供文件路径（例如由队友转发）：**
读取该文件并遵循相同的简报流程——无论来源如何，格式相同。

**Session 文件为空或格式错误：**
报告："Session file found but appears empty or unreadable. You may need to create a new one with /save-session."

---

## 示例输出

```
SESSION LOADED: /Users/you/.claude/session-data/2024-01-15-abc123de-session.tmp
════════════════════════════════════════════════

PROJECT: my-app — JWT Authentication

WHAT WE'RE BUILDING:
User authentication with JWT tokens stored in httpOnly cookies.
Register and login endpoints are partially done. Route protection
via middleware hasn't been started yet.

CURRENT STATE:
PASS: Working: 3 items (register endpoint, JWT generation, password hashing)
 In Progress: app/api/auth/login/route.ts (token works, cookie not set yet)
 Not Started: middleware.ts, app/login/page.tsx

WHAT NOT TO RETRY:
FAIL: Next-Auth — conflicts with custom Prisma adapter, threw adapter error on every request
FAIL: localStorage for JWT — causes SSR hydration mismatch, incompatible with Next.js

OPEN QUESTIONS / BLOCKERS:
- Does cookies().set() work inside a Route Handler or only Server Actions?

NEXT STEP:
In app/api/auth/login/route.ts — set the JWT as an httpOnly cookie using
cookies().set('token', jwt, { httpOnly: true, secure: true, sameSite: 'strict' })
then test with Postman for a Set-Cookie header in the response.

════════════════════════════════════════════════
Ready to continue. What would you like to do?
```

---

## 注意事项

- 加载 session 文件时永远不要修改它——它是只读的历史记录
- 简报格式是固定的——即使某些部分为空也不要跳过
- "What Not To Retry" 必须始终展示，即使内容只是"None"——它太重要了，绝不能遗漏
- 恢复 session 后，用户可能希望在新 session 结束时再次运行 `/save-session` 以创建新的带日期文件
