---
description: 将当前 session 的状态保存到 ~/.claude/session-data/ 下带日期的文件中，以便在未来的 session 中能带着完整 context 恢复工作。
---

# Save Session 命令

捕获本次 session 中发生的所有事情——构建了什么、什么可行、什么失败、还剩什么——并将其写入一个带日期的文件，以便下一个 session 能准确地从本次中断的地方继续。

## 何时使用

- 在关闭 Claude Code 之前的一个工作 session 结束时
- 在触及 context 限制之前（先运行此命令，再开启新的 session）
- 在解决了一个你想记住的复杂问题之后
- 任何时候你需要将 context 交接给未来的 session 时

## 流程

### Step 1：收集 context

在写入文件之前，收集以下信息：

- 读取本次 session 期间修改过的所有文件（使用 git diff 或从对话中回忆）
- 回顾讨论过、尝试过以及决定了什么
- 记录遇到的任何错误及其是如何被解决的（或未被解决）
- 如相关，检查当前的 test/build 状态

### Step 2：如果 sessions 文件夹不存在则创建它

在用户的 Claude 主目录下创建规范的 sessions 文件夹：

```bash
mkdir -p ~/.claude/session-data
```

### Step 3：写入 session 文件

创建 `~/.claude/session-data/YYYY-MM-DD-<short-id>-session.tmp`，使用今天的实际日期和一个满足 `session-manager.js` 中 `SESSION_FILENAME_REGEX` 所强制规则的 short-id：

- 兼容字符：字母 `a-z` / `A-Z`，数字 `0-9`，连字符 `-`，下划线 `_`
- 兼容最小长度：1 个字符
- 新文件推荐风格：小写字母、数字和连字符，长度 8+ 个字符以避免冲突

有效示例：`abc123de`、`a1b2c3d4`、`frontend-worktree-1`、`ChezMoi_2`
新文件应避免：`A`、`test_id1`、`ABC123de`

完整有效文件名示例：`2024-01-15-abc123de-session.tmp`

遗留文件名 `YYYY-MM-DD-session.tmp` 仍然有效，但新的 session 文件应优先使用 short-id 形式以避免同日冲突。

### Step 4：用以下所有章节填充文件

诚实地写入每个章节。不要跳过任何章节——如果某个章节确实没有内容，就写 "Nothing yet" 或 "N/A"。一个不完整的文件比一个诚实的空章节更糟糕。

### Step 5：向用户展示文件

写入完成后，展示全部内容并询问：

```
Session saved to [actual resolved path to the session file]

Does this look accurate? Anything to correct or add before we close?
```

等待确认。如用户要求则进行修改。

---

## Session 文件格式

```markdown
# Session: YYYY-MM-DD

**Started:** [approximate time if known]
**Last Updated:** [current time]
**Project:** [project name or path]
**Topic:** [one-line summary of what this session was about]

---

## What We Are Building

[1-3 paragraphs describing the feature, bug fix, or task. Include enough
context that someone with zero memory of this session can understand the goal.
Include: what it does, why it's needed, how it fits into the larger system.]

---

## What WORKED (with evidence)

[List only things that are confirmed working. For each item include WHY you
know it works — test passed, ran in browser, Postman returned 200, etc.
Without evidence, move it to "Not Tried Yet" instead.]

- **[thing that works]** — confirmed by: [specific evidence]
- **[thing that works]** — confirmed by: [specific evidence]

If nothing is confirmed working yet: "Nothing confirmed working yet — all approaches still in progress or untested."

---

## What Did NOT Work (and why)

[This is the most important section. List every approach tried that failed.
For each failure write the EXACT reason so the next session doesn't retry it.
Be specific: "threw X error because Y" is useful. "didn't work" is not.]

- **[approach tried]** — failed because: [exact reason / error message]
- **[approach tried]** — failed because: [exact reason / error message]

If nothing failed: "No failed approaches yet."

---

## What Has NOT Been Tried Yet

[Approaches that seem promising but haven't been attempted. Ideas from the
conversation. Alternative solutions worth exploring. Be specific enough that
the next session knows exactly what to try.]

- [approach / idea]
- [approach / idea]

If nothing is queued: "No specific untried approaches identified."

---

## Current State of Files

[Every file touched this session. Be precise about what state each file is in.]

| File              | Status         | Notes                      |
| ----------------- | -------------- | -------------------------- |
| `path/to/file.ts` | PASS: Complete    | [what it does]             |
| `path/to/file.ts` |  In Progress | [what's done, what's left] |
| `path/to/file.ts` | FAIL: Broken      | [what's wrong]             |
| `path/to/file.ts` |  Not Started | [planned but not touched]  |

If no files were touched: "No files modified this session."

---

## Decisions Made

[Architecture choices, tradeoffs accepted, approaches chosen and why.
These prevent the next session from relitigating settled decisions.]

- **[decision]** — reason: [why this was chosen over alternatives]

If no significant decisions: "No major decisions made this session."

---

## Blockers & Open Questions

[Anything unresolved that the next session needs to address or investigate.
Questions that came up but weren't answered. External dependencies waiting on.]

- [blocker / open question]

If none: "No active blockers."

---

## Exact Next Step

[If known: The single most important thing to do when resuming. Be precise
enough that resuming requires zero thinking about where to start.]

[If not known: "Next step not determined — review 'What Has NOT Been Tried Yet'
and 'Blockers' sections to decide on direction before starting."]

---

## Environment & Setup Notes

[Only fill this if relevant — commands needed to run the project, env vars
required, services that need to be running, etc. Skip if standard setup.]

[If none: omit this section entirely.]
```

---

## 示例输出

```markdown
# Session: 2024-01-15

**Started:** ~2pm
**Last Updated:** 5:30pm
**Project:** my-app
**Topic:** Building JWT authentication with httpOnly cookies

---

## What We Are Building

User authentication system for the Next.js app. Users register with email/password,
receive a JWT stored in an httpOnly cookie (not localStorage), and protected routes
check for a valid token via middleware. The goal is session persistence across browser
refreshes without exposing the token to JavaScript.

---

## What WORKED (with evidence)

- **`/api/auth/register` endpoint** — confirmed by: Postman POST returns 200 with user
  object, row visible in Supabase dashboard, bcrypt hash stored correctly
- **JWT generation in `lib/auth.ts`** — confirmed by: unit test passes
  (`npm test -- auth.test.ts`), decoded token at jwt.io shows correct payload
- **Password hashing** — confirmed by: `bcrypt.compare()` returns true in test

---

## What Did NOT Work (and why)

- **Next-Auth library** — failed because: conflicts with our custom Prisma adapter,
  threw "Cannot use adapter with credentials provider in this configuration" on every
  request. Not worth debugging — too opinionated for our setup.
- **Storing JWT in localStorage** — failed because: SSR renders happen before
  localStorage is available, caused React hydration mismatch error on every page load.
  This approach is fundamentally incompatible with Next.js SSR.

---

## What Has NOT Been Tried Yet

- Store JWT as httpOnly cookie in the login route response (most likely solution)
- Use `cookies()` from `next/headers` to read token in server components
- Write middleware.ts to protect routes by checking cookie existence

---

## Current State of Files

| File                             | Status         | Notes                                           |
| -------------------------------- | -------------- | ----------------------------------------------- |
| `app/api/auth/register/route.ts` | PASS: Complete    | Works, tested                                   |
| `app/api/auth/login/route.ts`    |  In Progress | Token generates but not setting cookie yet      |
| `lib/auth.ts`                    | PASS: Complete    | JWT helpers, all tested                         |
| `middleware.ts`                  |  Not Started | Route protection, needs cookie read logic first |
| `app/login/page.tsx`             |  Not Started | UI not started                                  |

---

## Decisions Made

- **httpOnly cookie over localStorage** — reason: prevents XSS token theft, works with SSR
- **Custom auth over Next-Auth** — reason: Next-Auth conflicts with our Prisma setup, not worth the fight

---

## Blockers & Open Questions

- Does `cookies().set()` work inside a Route Handler or only in Server Actions? Need to verify.

---

## Exact Next Step

In `app/api/auth/login/route.ts`, after generating the JWT, set it as an httpOnly
cookie using `cookies().set('token', jwt, { httpOnly: true, secure: true, sameSite: 'strict' })`.
Then test with Postman — the response should include a `Set-Cookie` header.
```

---

## 注意事项

- 每个 session 都有自己的文件——绝不要追加到之前 session 的文件
- "What Did NOT Work" 一节最关键——没有它，未来的 session 会盲目重试失败的方案
- 如果用户要求在 session 中途保存（不仅是结束时），保存目前已知的内容并清楚标明进行中的事项
- 该文件旨在供 Claude 在下一个 session 开始时通过 `/resume-session` 读取
- 使用规范的全局 session 存储：`~/.claude/session-data/`
- 对任何新的 session 文件，优先使用 short-id 文件名形式（`YYYY-MM-DD-<short-id>-session.tmp`）
