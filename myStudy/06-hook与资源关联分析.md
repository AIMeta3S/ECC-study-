# hooks.json ↔ custom-install/zh-cn 资源 关联关系分析（v2）

> **证据基线**：所有结论以 hook 业务脚本实际代码（`scripts/hooks/*.js`，附 `file:line`）和资源文件实际文本（`custom-install/zh-cn/**/*.md`，附 `file:line`）为准。每个强/中关联结论都给出**机制侧（hook 实际行为）× 意图侧（资源文本）**双向证据。本文是 [04-hook研究报告.md](04-hook研究报告.md) 的延伸——04 讲 hook 如何运行，本文讲 hook 与 agents/commands/rules/skills 资源之间**是否、以及如何**发生联系。

---

## 〇、版本修正说明（v1 → v2）

本报告v1版本的方法论错误，把"关联"窄化为**仅显式引用**（hook 脚本 require/spawn 资源，或资源 .md 点名 hook id/路径），并据此得出"6 个有真实关联 / 15 个无关联"。这一判定遗漏了所有**隐式关联**——即 hook 与资源虽不互相点名，但通过"Claude Code 机制 + 双方逻辑意图"形成真实协作关系。v2版本修正了这一错误，把"关联"定义为**显式引用 + 隐式（机制×意图双向证据）**。

| | v1（错误窄定义） | v2（修正） |
|---|---|---|
| 关联判据 | 仅代码 require/spawn/字符串引用 | 显式引用 **+** 隐式（机制×意图双向证据） |
| 表面内容 | "不根据原理/定义分析"（误读） | **结合**脚本代码逻辑 + CC 机制原理 + 插件逻辑意图 |
| 主题相近 | "一律不视为关联"（一刀切） | 主题相近本身不算，但若**机制耦合**则构成隐式关联 |
| 结论 | 6 有 / 15 无 | **11 强 / 6 中 / 8 弱 / 6 无** |

**关键转变**：v1 判"无关联"的 15 个 hook 中，`gateguard` / `governance-capture` / `console-warn` / `quality-gate` / `format-typecheck` / `check-console-log` / `design-quality-check` / `block-no-verify` / `commit-quality` / `pre-compact` / `session-end` / `post:bash:dispatcher` 这 12 个在 v2 升级为**强/中隐式关联**——它们正是"hook 是 rule 的运行时执行器 / 是 agent 的确定性分工搭档"的典型。

---

## 一、关键结论速览

### 1.1 一句话结论（v2）

`hooks/hooks.json` 的 21 个顶层 hook 与 `custom-install/zh-cn/` 资源**并非高度解耦**。其中关联关系的有：
**显式关联**： 围绕"持续学习"的显式工作流（observe / session:start / evaluate-session）
**隐式关联**：
  - 质量类 hook（console-warn / check-console-log / quality-gate / format-typecheck / design-quality-check）是各语言 `rules/*/hooks.md` 所描述自动化的**运行时执行器**；
  - gateguard / governance-capture 通过注入与拦截，把 Claude 推向 code-explorer / security-reviewer 等 agent 的能力域，并与它们形成"确定性拦截 + 主观审查"的治理分工；
  - session 系列与 sessions/restore 命令共享 session-data 数据流。

### 1.2 数字总览（v2 矩阵）

| 维度 | v1 | v2 | 说明 |
|---|---|---|---|
| 顶层 hook 总数 | 21 | 21 | 不变 |
| **强关联** | 6 | **11** | 显式 + 隐式强耦合（机制直接落在资源核心职能域且资源显式期望该自动化） |
| **中关联** | 0 | **6** | 隐式关联，机制耦合明确、有资源文本支撑，但未显式互指 |
| **弱关联** | 1 | **8** | 隐式关联，机制耦合松散（泛泛场景联想 / 单向数据） |
| **无关联** | 14 | **6** | 双向零证据且无 6 种隐式机制耦合 |
| 引用 ECC 具体 hook id 的资源 | 0 | 0 | 仍为 0（隐式关联不依赖 id 互指） |
| 引用 `ECC_*` 门控变量的资源 | 0 | 0 | 仍为 0 |
| 引用具体 hook 脚本路径的资源 | 1 | 1 | `commands/sessions.md:295` → `cost-tracker.js` |
| 被 `rules/*/hooks.md` 行为契约覆盖的 hook | 0（v1 判无关） | **5** | console-warn / check-console-log / quality-gate / format-typecheck + design-quality-check（design-quality.md） |

### 1.3 关联全貌图（v2）

```
hooks/hooks.json                                    custom-install/zh-cn 资源
─────────────────                                   ────────────────────────
【显式】
pre:observe / post:observe ──(spawn)─────────────► skills/continuous-learning-v2/hooks/observe.sh
session:start ──(读数据+注入)────────────────────► ~/.claude/skills/learned/  ← /learn、/learn-eval 生成
session:start ──(读数据+注入)────────────────────► ecc-homunculus/instincts/  ← continuous-learning-v2 生成
stop:evaluate-session ──(读 config)──────────────► skills/continuous-learning/config.json
stop:cost-tracker ◄──(文本引用)────────────────── commands/sessions.md:295

【隐式：行为契约/规约-执行】hook = rule 描述的自动化的执行器
post:edit:console-warn ──(执行)──────────────────► rules/{typescript,python}/hooks.md "console.log warning / print() 警告"
                                                     rules/typescript/coding-style.md "See hooks for automatic detection"
stop:check-console-log ──(执行, 1:1)──────────────► rules/typescript/hooks.md "Stop: console.log audit"
post:quality-gate ──(执行, 格式化)────────────────► rules/{typescript,python,web}/hooks.md "Auto-format after edit / Format on Save"
stop:format-typecheck ──(执行)────────────────────► rules/{typescript,web,common}/hooks.md "Stop: TypeScript check / Final Build Verification"
post:edit:design-quality-check ──(执行)───────────► rules/web/design-quality.md "Banned Patterns / Required Qualities"

【隐式：工作流推动】hook 注入 = agent 职能域
pre:edit-write:gateguard-fact-force ──(注入)─────► agents/code-explorer (Entry Point/Dependency) + planner + rules/common/development-workflow.md 第0步
post:bash:pr-created ──(注入 gh pr review)───────► commands/code-review.md (PR 审查) + agents/code-reviewer

【隐式：治理分工】hook 确定性拦截 + agent/rule 主观审查
pre/post:governance-capture ──(检测 secret/危险命令)► agents/security-reviewer + rules/common/security.md + rules/common/code-review.md
pre:bash:block-no-verify ──(防绕过)──────────────► rules/common/{code-review,security}.md (commit 前审查)
pre:bash:commit-quality ──(提交门)───────────────► rules/common/development-workflow.md 第5步 Pre-Review Checks

【隐式：数据流闭环】hook 写 → command/agent 读
pre:compact / stop:session-end ──(写 .tmp)───────► commands/{sessions,save-session,resume-session} 读 session-data/
post:bash:command-log(cost) ──(写 cost-tracker.log)► commands/sessions.md (成本监控)

【场景配对】hook 事件 ↔ resource 触发场景
post:bash:build-complete ──(build 完成)──────────► agents/build-error-resolver ("构建失败时主动使用")

【无关联】（6 个）
doc-file-warning / auto-tmux-dev / tmux-reminder / pre+post:mcp-health-check / desktop-notify
```

---

## 二、判定方法论（v2）

### 2.1 关联 = 显式 + 隐式

**显式关联**：hook 脚本 require/spawn/read 资源目录或脚本；资源 .md 引用 hook 脚本路径 / hook id / `ECC_*` 门控变量。

**隐式关联**：hook 与资源虽不互相点名，但通过"Claude Code 机制 + 双方逻辑意图"形成真实协作。共 **6 种类型**，每条都需"机制侧（hook 实际行为）× 意图侧（资源文本）"双向证据。

### 2.2 隐式关联 6 种类型（判定表）

| 类型 | 定义 | 判据（双向证据要求） |
|---|---|---|
| **1 规约-执行** | rule 写"应做什么/应自动做"，hook 是该规则的运行时执行器 | rule 出现 "Auto-format after edit" / "See hooks for automatic detection" / "强制性步骤" 等，且 hook 行为落在该规则职能域 |
| **2 行为契约** | resource（尤其 `rules/*/hooks.md`）描述某 hook 类型应执行的具体行为，ECC 内置 hook 恰是该行为的实现 | resource 描述的 hook 行为（如"Stop: console.log audit"）与 ECC hook 实际行为 1:1 对应 |
| **3 工作流推动** | hook 通过阻断/注入，把 Claude 推向使用某 agent/command 的能力域 | hook 注入文本要求的具体动作（如"列 importers、Glob 搜索"）正是某 agent 的核心职能 |
| **4 治理分工** | hook 做确定性运行时拦截，agent/skill/rule 做主观审查，同一目标分工 | hook 确定性检测 X（如 secret），agent/rule 也针对 X 审查，但互不引用 |
| **5 数据流闭环** | hook 写数据到某位置，command/agent 从该位置读 | 共享同一数据目录/文件（session-data/、observations.jsonl 等） |
| **6 场景配对** | hook 在某事件触发，resource 恰是该事件的处理者 | hook 事件（如 build 完成/失败）与 resource 触发场景（如 build-error-resolver）配对 |

### 2.3 强度分级（判定表）

| 级别 | 判据 | 典型 |
|---|---|---|
| **强** | 显式关联；或隐式中机制深度耦合（hook 行为直接落在资源核心职能域 **且** 资源文本显式期望该自动化） | design-quality-check ↔ web/design-quality.md；console-warn ↔ typescript/hooks.md |
| **中** | 隐式关联，机制耦合明确（hook 行为落在资源职能域，有资源文本支撑，但未显式互指） | governance-capture ↔ security-reviewer；session-end ↔ sessions |
| **弱** | 隐式关联，机制耦合松散（泛泛场景联想 / 单向数据 / 注入措辞泛泛） | git-push-reminder ↔ code-review；session-activity-tracker ↔ sessions |
| **无** | 双向零证据 **且** 无 6 种隐式机制耦合 | auto-tmux-dev；desktop-notify |

### 2.4 双向交叉验证

两个方向都要查，互相印证：

| 方向 | 在哪里找 | 找什么 |
|---|---|---|
| **hook → 资源** | hook 业务脚本 `.js` | require/readFileSync 触及资源目录；stdout/additionalContext 注入的内容是否对应某资源职能；spawnSync 执行资源内脚本；检测/拦截的对象是否与某 agent 审查对象一致 |
| **资源 → hook** | 资源 `.md` | 写 hook 脚本路径；引用 hooks/hooks.json；描述"应配置某 hook 自动做 X"（行为契约）；定义 agent 审查对象 X（治理分工另一方） |

### 2.5 三类"伪关联"排除（保留 v1，仍有效）

主题相近 + 名字碰撞，但**无机制耦合**的，不算关联。已逐项甄别：

| 陷阱 | 出处 | 真实含义 | 判定 |
|---|---|---|---|
| `/compact` | `suggest-compact.js:189,241` | Claude Code **内置**命令，非 plugin 资源 | 不关联（指向内置 /compact，非 ECC skill） |
| `commands` | `governance-capture.js:36,177` | shell 命令（如 `git push --force`） | 不关联（但 governance-capture 与 security-reviewer 的治理分工仍成立，依据是 SECRET_PATTERNS 而非这个词） |
| `rules` | `config-protection.js:137` | linter/formatter 规则 | 不关联 |
| `refactor` | `pre-bash-commit-quality.js:186` | conventional-commit 类型正则 | 不关联（但 commit-quality 与 development-workflow 第5步的规约-执行仍成立，依据是提交门行为） |

---

## 三、证据基线

### 3.1 机制侧（hook 脚本，本报告亲验）

以下脚本经人工通读确认实际行为与行号（非仅依赖代理摘要）：

- `observe-runner.js`、`session-start.js`、`evaluate-session.js`、`plan-canvas-sessions.js`
- `design-quality-check.js`、`check-console-log.js`、`post-edit-console-warn.js`、`quality-gate.js`、`stop-format-typecheck.js`
- `gateguard-fact-force.js`（L1080-1170 注入段）、`governance-capture.js`（L25-94 检测段）、`block-no-verify.js`、`pre-bash-commit-quality.js`
- `pre-compact.js`、`session-end.js`、`session-activity-tracker.js`
- `bash-hook-dispatcher.js`、`post-bash-build-complete.js`、`post-bash-pr-created.js`、`post-bash-command-log.js`
- `doc-file-warning.js`、`suggest-compact.js`、`config-protection.js`

### 3.2 意图侧（资源文本，本报告亲验）

以下资源经人工通读提取逻辑意图与原文行号：

- **rules**：`common/{hooks,security,code-review,testing,development-workflow}.md`、`typescript/{hooks,coding-style}.md`、`web/{hooks,design-quality}.md`、`python/hooks.md`
- **agents**：`code-explorer.md`、`security-reviewer.md`、`build-error-resolver.md`、`code-reviewer.md`、`planner.md`
- **commands**：`sessions.md`、`code-review.md`、`save-session.md`
- **skills**：`continuous-learning-v2/`（SKILL.md / changelog.md / agents/observer.md）

---

## 四、逐 hook 分析

> 每个 hook 的业务脚本对应关系见 [04-hook研究报告.md §3.1](04-hook研究报告.md)。dispatcher 类 hook 的子项在父 hook 下展开。

### 4.1 强关联 hook（11 个，详写）

#### ① `pre:observe` / `post:observe`（observe-runner.js）— 显式 spawn

- **关联资源**：`skills/continuous-learning-v2/hooks/observe.sh`
- **类型**：显式
- **证据（亲验源码）**：
  - `observe-runner.js:8` — `const OBSERVE_RELATIVE_PATH = path.join('skills', 'continuous-learning-v2', 'hooks', 'observe.sh');`
  - `observe-runner.js:128-139` — `spawnSync(shell, [toShellPath(observePath), phase], { env: { …, CLAUDE_PLUGIN_ROOT, ECC_PLUGIN_ROOT } })` ——**直接执行 skill 自带 shell 脚本**
- **资源侧印证**：`continuous-learning-v2/changelog.md:25-32` 明确讨论"为什么用 PreToolUse/PostToolUse hook 而非 Skills/Stop hook 做 observation（hooks 100% 触发，确定性）"。
- **关联性质**：整个 hook 子系统里**最强的资源依赖**。hook 只做"解析 plugin root + 找 shell + spawn"，观察逻辑全在 skill 内，工作**完全委托**给 skill。
- **强度：强**

#### ② `session:start`（session-start.js）— 显式数据注入

- **关联资源（3 个）**：
  1. `/learn`、`/learn-eval`（共享 `~/.claude/skills/learned/`）
  2. `continuous-learning-v2`（读其 `ecc-homunculus/instincts/` 数据树）
  3. `/sessions`（log 提及，弱）
- **证据（亲验源码）**：
  - `session-start.js:538-548` — `collectLearnedSkillFiles`：`findFiles(learnedDir, '*.md')` 扫描 `~/.claude/skills/learned/`（`getLearnedSkillsDir` 定义于 `utils.js:77-78`）
  - `session-start.js:551-573` — `summarizeLearnedSkills` → `log('[SessionStart] Injecting N learned skill(s)')` + 注入文本 `Available learned skills:\n…`
  - `session-start.js:406-460` — `summarizeActiveInstincts`：扫描 4 个 instincts 目录，注入 `Active instincts:\n- [project|global <NN%>] <action>`
  - `session-start.js:735-767` — 经 `writeSessionStartPayload` 把上述内容作为 `additionalContext` 注入
- **关联性质**：**唯一把资源内容真正注入 Claude 上下文**的 hook，构成"学习 → 沉淀 → 下次会话自动召回"闭环的数据入口。
- **强度：强**

#### ③ `stop:evaluate-session`（evaluate-session.js）— 显式读 config

- **关联资源**：`continuous-learning` skill（**无 v2**）+ `/learn`
- **证据（亲验源码）**：
  - `evaluate-session.js:57` — `const configFile = path.join(scriptDir, '..', '..', 'skills', 'continuous-learning', 'config.json');`（注意路径无 v2）
  - `evaluate-session.js:64-77` — 读 config（`min_session_length`、`learned_skills_path`）
  - `evaluate-session.js:80` — `ensureDir(learnedSkillsPath)` 维护 `~/.claude/skills/learned/`
- **⚠️ zh-cn 缺失**：依赖的 `continuous-learning/config.json` 在 `custom-install/zh-cn/skills/` 下**缺失**（只有 v2），readFile 返回空 → 走默认值（见 §7.4）。
- **强度：强**

#### ④ `pre:edit-write:gateguard-fact-force`（gateguard-fact-force.js）— 隐式【3 工作流推动】

- **关联资源**：`agents/code-explorer` + `agents/planner` + `rules/common/development-workflow.md`
- **机制侧证据（亲验源码）**：`gateguard-fact-force.js:1080-1085` 注入要求——编辑前必须"列 importers/callers、用 Glob/Grep 搜索同类文件、展示 data schema、逐字引用用户指令"。
- **意图侧证据（亲验资源）**：
  - `agents/code-explorer.md:23-25` — "**1. Entry Point Discovery**：找到 entry points，从 user action/external trigger 顺 stack 进行 trace"
  - `agents/code-explorer.md:45-49` — "**5. Dependency Documentation**：映射内部 module dependencies、识别值得复用的 shared utilities"
  - `rules/common/development-workflow.md:9` — "**0. 研究及复用**（任何新实现前的强制性步骤）"
- **关联性质**：gateguard 注入要求的具体动作（列 importers、Glob 搜索、展示 schema）**正是 code-explorer 的核心职能**（Dependency Documentation / Entry Point Discovery），也是 development-workflow 第0步"强制性研究"的运行时强制。hook 通过注入把 Claude 推向这些 agent/rule 的能力域。
- **强度：强**

#### ⑤ `pre/post:governance-capture`（governance-capture.js）— 隐式【4 治理分工】

- **关联资源**：`agents/security-reviewer` + `rules/common/security.md` + `rules/common/code-review.md`
- **机制侧证据（亲验源码）**：`governance-capture.js:25-56` 确定性检测三类对象——
  - `SECRET_PATTERNS`（AWS key / JWT / private key / github token）
  - `APPROVAL_COMMANDS`（`git push --force` / `git reset --hard` / `rm -rf` / `DROP TABLE`）
  - `SENSITIVE_PATHS`（`.env` / `.pem` / `.key` / `id_rsa`）
- **意图侧证据（亲验资源）**：
  - `agents/security-reviewer.md:25` — "**2. Secrets 检测** — 查找硬编码的 API keys、密码、tokens"
  - `agents/security-reviewer.md:60` — "硬编码的 secrets | CRITICAL | 使用 process.env"
  - `rules/common/security.md:6` — "无硬编码密钥（API keys、passwords、tokens）"
  - `rules/common/security.md:20` — "轮换任何可能已暴露的 secrets"
  - `rules/common/code-review.md:34` — "没有硬编码的密钥或凭证"
- **关联性质**：hook 做确定性运行时拦截（检测到 secret/危险命令即阻断或告警），security-reviewer agent + security.md 做主观审查，**同一目标（防 secret 泄露/危险操作）分工**，互不引用。
- **强度：强**

#### ⑥ `post:edit:console-warn`（post-edit-console-warn.js）— 隐式【1 规约-执行 + 2 行为契约】

- **关联资源**：`rules/typescript/hooks.md` + `rules/typescript/coding-style.md` + `rules/python/hooks.md`
- **机制侧证据（亲验源码）**：
  - `post-edit-console-warn.js:21` — `/\\.(ts|tsx|js|jsx)$/.test(filePath)`（限定 JS/TS 文件）
  - `post-edit-console-warn.js:27` — `/console\\.log/.test(item.line)`（检测 console.log）
- **意图侧证据（亲验资源）**：
  - `rules/typescript/hooks.md:18` — "**console.log warning**：对已编辑文件中的 console.log 发出警告"（PostToolUse 行为描述）
  - `rules/typescript/coding-style.md:199` — "**See hooks for automatic detection**"（规约**显式期望 hook 自动检测**）
  - `rules/python/hooks.md:19` — "Warn about print() statements in edited files"
- **关联性质**：coding-style.md L199 的 "See hooks for automatic detection" 是规约-执行的铁证——rule 明确指向"由 hook 自动检测 console.log"，console-warn 正是该执行器；同时与 hooks.md L18 "console.log warning"（PostToolUse）构成 1:1 行为契约。
- **强度：强**

#### ⑦ `post:quality-gate`（quality-gate.js）— 隐式【1 规约-执行】

- **关联资源**：`rules/typescript/hooks.md` + `rules/python/hooks.md` + `rules/web/hooks.md`
- **机制侧证据（亲验源码）**：
  - `quality-gate.js:57-132` — `maybeRunQualityGate`：编辑后对单个文件跑**格式化**检查
  - `quality-gate.js:69` — `.ts/.tsx/.js/.jsx/.json/.md` → Biome/Prettier
  - `quality-gate.js:106` — `.go` → gofmt
  - `quality-gate.js:123` — `.py` → ruff format
- **意图侧证据（亲验资源）**：
  - `rules/typescript/hooks.md:16` — "**Prettier**：在编辑后自动格式化 JS/TS 文件"
  - `rules/python/hooks.md:14` — "**black/ruff**: Auto-format `.py` files after edit"
  - `rules/web/hooks.md:9-11` — "**Format on Save**：Use the project's existing formatter entrypoint after edits"
- **关联性质**：quality-gate 是**格式化 gate**（编辑后单文件 format），正是上述 rule 所描述"编辑后自动格式化"的运行时执行器。**注**：它是格式化门，非 test/lint/typecheck 门（与 tdd-workflow 的"test && lint"仅部分重叠）。
- **强度：强**

#### ⑧ `stop:format-typecheck`（stop-format-typecheck.js）— 隐式【2 行为契约】

- **关联资源**：`rules/typescript/hooks.md` + `rules/web/hooks.md` + `rules/common/hooks.md`
- **机制侧证据（亲验源码）**：
  - `stop-format-typecheck.js:2` — "Stop Hook: Batch format and typecheck all JS/TS files edited this response"
  - `stop-format-typecheck.js:71-100` — `formatBatch`（Biome/Prettier 批量格式化）
  - `stop-format-typecheck.js:114-157` — `typecheckBatch`（`npx tsc --noEmit`，L153 注入 "TypeScript errors in <file>"）
- **意图侧证据（亲验资源）**：
  - `rules/typescript/hooks.md:17` — "**TypeScript check**：在编辑 .ts/.tsx 文件后运行 tsc"
  - `rules/web/hooks.md:106-108` — "**Stop: Final Build Verification**：Verify the production build at session end"
  - `rules/common/hooks.md:7` — "**Stop**：session 结束时（最终验证）"
- **关联性质**：rules 多处描述"Stop hook 应在 session 结束做最终 typecheck/build 验证"，format-typecheck 正是这类 Stop hook 的实现，落在 hooks.md 描述的 Stop 行为契约内。
- **强度：强**

#### ⑨ `stop:check-console-log`（check-console-log.js）— 隐式【2 行为契约，1:1】

- **关联资源**：`rules/typescript/hooks.md`
- **机制侧证据（亲验源码）**：
  - `check-console-log.js:67` — `getGitModifiedFiles(['\\.tsx?', '\\.jsx?])`（取改动文件）
  - `check-console-log.js:75` — `content.includes('console.log')`（检测）
  - `check-console-log.js:82` — `log('Remove console.log statements before committing')`
- **意图侧证据（亲验资源）**：`rules/typescript/hooks.md:22` — "**console.log audit**：在 session 结束前检查所有已修改文件中的 console.log"（Stop）
- **关联性质**：hooks.md L22 描述的 Stop 行为与 check-console-log 实际行为**逐字 1:1**（session 结束前 + 检查已修改文件 + console.log）。是行为契约型关联最干净的样本。
- **强度：强**

#### ⑩ `post:edit:design-quality-check`（design-quality-check.js）— 隐式【1 规约-执行】

- **关联资源**：`rules/web/design-quality.md`
- **机制侧证据（亲验源码）**：
  - `design-quality-check.js:15` — `FRONTEND_EXTENSIONS = /\.(astro|css|html|jsx|scss|svelte|tsx|vue)$/i`（限定前端文件）
  - `design-quality-check.js:18-25` — `GENERIC_SIGNALS`（"Get Started" / "Learn more" / `grid-cols-3-4` / `bg-gradient` / `text-center` / `font-sans-inter`）——**检测模板化 UI 的具体信号**
  - `design-quality-check.js:27-33` — `CHECKLIST`（视觉层级 / 间距节奏 / 深度 / 悬停焦点 / 颜色排版）——**必备品质清单**
  - `design-quality-check.js:68-75` — `buildWarning` 注入 "[Hook] DESIGN CHECK: Frontend should have:" + CHECKLIST
- **意图侧证据（亲验资源）**：
  - `rules/web/design-quality.md:5-7` — "Anti-Template Policy：Do not ship generic template-looking UI"
  - `design-quality.md:11` — "Default card grids with uniform spacing" ↔ hook 的 `grid-cols-3-4` 信号
  - `design-quality.md:12` — "Stock hero section with … gradient blob" ↔ hook 的 `bg-gradient` 信号
  - `design-quality.md:17` — "Default font stacks used without a deliberate reason" ↔ hook 的 `font-sans-inter` 信号
  - `design-quality.md:20-33` — "Required Qualities"（hierarchy / rhythm / depth / hover-focus / color）↔ hook 的 `CHECKLIST`
- **关联性质**：hook 的 `GENERIC_SIGNALS` 是 design-quality.md "Banned Patterns" 的**具体可检测信号**，`CHECKLIST` 是 "Required Qualities" 的运行时提醒。两者名字几乎一致、职能对应，是规约-执行的强样本。
- **强度：强**

#### ⑪ `stop:cost-tracker`（cost-tracker.js）— 显式（资源→hook）

- **关联资源**：`commands/sessions.md`
- **证据**：`commands/sessions.md:295` — "对于类似控制中心风格的监控，请结合使用 `/sessions info`、`git diff --stat` 以及由 `scripts/hooks/cost-tracker.js` 输出的成本指标。"
- **关联性质**：cost-tracker hook 本身只把 token/成本追加到 `~/.claude/metrics/costs.jsonl`，不读资源；关联体现在资源侧明确指示用户把 hook 输出与 `/sessions info` 结合做监控。
- **强度：强**（被资源文本点名引用，是唯一被资源引用具体路径的 hook）

### 4.2 中关联 hook（5 个，详写）

#### ⑫ `pre:bash:block-no-verify`（block-no-verify.js）— 隐式【1 规约-执行 + 4 治理分工】

- **关联资源**：`rules/common/code-review.md` + `rules/common/security.md`
- **机制侧证据（亲验源码）**：`block-no-verify.js` 阻止 `--no-verify` / `core.hooksPath=` 等绕过 git hooks 的写法。
- **意图侧证据（亲验资源）**：
  - `rules/common/code-review.md:9-12` — "强制性审查触发条件：编写或修改代码后 / **向共享分支 commit 前**"
  - `rules/common/security.md:5` — "在**任何** commit 之前：[强制安全检查]"
- **关联性质**：block-no-verify 确定性防止用户绕过 commit 前的 hooks，保护 code-review.md / security.md 所定义的"commit 前强制审查"流程完整性。hook 防绕过，rule 定义流程，治理分工。
- **强度：中**

#### ⑬ `pre:bash:commit-quality`（pre-bash-commit-quality.js）— 隐式【1 规约-执行 + 4 治理分工】

- **关联资源**：`rules/common/development-workflow.md` + `agents/code-reviewer`
- **机制侧证据（亲验源码）**：`pre-bash-commit-quality.js` 在 git commit 时做提交质量检查（注：其 `refactor` L186 仅为 commit 类型正则，非 plugin 资源）。
- **意图侧证据（亲验资源）**：`rules/common/development-workflow.md:40-44` — "**5. Pre-Review Checks**：验证所有自动化检查 (CI/CD) 均已通过 / 解决合并冲突 / 分支同步 / **只有通过这些检查后，才请求人工 Review**"
- **关联性质**：commit-quality 是 development-workflow 第5步"Pre-Review Checks"的运行时门，与 code-reviewer agent 分工（hook 确定性门 + agent 主观审查）。
- **强度：中**

#### ⑭ `stop:session-end` / `session:end:marker`（session-end.js）— 隐式【5 数据流】

- **关联资源**：`commands/sessions.md` + `commands/save-session.md` + `commands/resume-session.md`
- **机制侧证据（亲验源码）**：
  - `session-end.js:184` — `getSessionsDir()`（→ `~/.claude/session-data/`，定义于 `utils.js:56-58`）
  - `session-end.js:207-208` — `sessionFile = ${today}-${shortId}-session.tmp` + `getSessionMetadata()` 写 project/branch/worktree
  - `session-end.js:245-296` — 写/更新 session `.tmp` 文件（含 metadata + Session Summary）
- **意图侧证据**：sessions.md 的 `load`/`info` 子命令读取 session-data/ 下的 `.tmp` 文件恢复会话上下文。
- **关联性质**：session-end 写 session-data/*.tmp，sessions/save-session/resume-session 读，构成数据流闭环。字段级对应（branch/worktree metadata）。
- **强度：中**

#### ⑮ `pre:compact`（pre-compact.js）— 隐式【5 数据流】

- **关联资源**：`commands/sessions.md` + `commands/save-session.md`
- **机制侧证据（亲验源码）**：
  - `pre-compact.js:2` — "PreCompact Hook - Save LLM-generated summary before context compaction"
  - `pre-compact.js:9` — "writes it to the active session .tmp file so that the next session start gets a high-quality summary"
  - `pre-compact.js:124-132` — `getSessionsDir()` + `findFiles(sessionsDir, '*-session.tmp')`
  - `pre-compact.js:156` — `generateSessionSummary(transcriptPath)`
  - `pre-compact.js:166-171` — 写入 session `.tmp` 文件
- **关联性质**：pre-compact 在压缩前把摘要写入 session-data/*.tmp，与 session-end 共享同一数据流出口，被 sessions 类命令读取。**注**：v1 曾误判无关联；v2 亲验后确认是 session-data 数据流（非 continuous-learning-v2）。
- **强度：中**

#### ⑯ `post:bash:dispatcher`（post-bash-dispatcher.js → bash-hook-dispatcher.js）— 隐式【3 工作流推动 + 5 数据流 + 6 场景配对】

含 4 个子项，强度不一：

**子项 a：`post-bash-pr-created.js`（中，工作流推动）**
- 机制侧：`post-bash-pr-created.js:12` — `/\bgh\s+pr\s+create\b/.test(cmd)`；`:22-23` — 注入 "[Hook] PR created: <url>" + "[Hook] To review: gh pr review <num> --repo <repo>"
- 意图侧：`commands/code-review.md:91` — `gh pr view <NUMBER>`；`:236-245` — `gh pr review <NUMBER>`
- 关联：检测 PR 创建事件，注入 `gh pr review` 提示，**明确推动** Claude 调用 /code-review command 及 code-reviewer/typescript-reviewer/vue-reviewer agent 做 PR 审查。

**子项 b：`post-bash-command-log.js`（中，数据流）**
- 机制侧：`post-bash-command-log.js:11-20` — `MODE_CONFIG`：cost 模式 → `cost-tracker.log`；`:48` — `appendLine` 写 `~/.claude/`
- 意图侧：`commands/sessions.md:295` 把 cost 指标纳入"控制中心监控"
- 关联：cost 模式写 `cost-tracker.log`，与 cost-tracker.js / sessions 成本监控同域。

**子项 c：`post-bash-build-complete.js`（弱，场景配对）**
- 机制侧：`post-bash-build-complete.js:11` — `/(npm run build|pnpm build|yarn build)/.test(cmd)`；`:14` — stderr "[Hook] Build completed - async analysis running in background"
- 意图侧：`agents/build-error-resolver.md:3` — "当构建失败或类型错误发生时**主动使用**该 agent"
- 关联：build 完成事件与 build-error-resolver 触发场景配对。但 hook 只打印"Build completed"，**不检测成败、不推动调用** agent，故仅弱场景配对。

**子项 d：command-log audit 模式（弱）** — 写 bash-commands.log 审计日志，无明确资源读取。

- **整体强度：中**（pr-created 工作流推动 + command-log-cost 数据流支撑）

### 4.3 弱关联 / 无关联 hook（表格汇总）

> 弱关联 = 有隐式机制耦合但松散；无关联 = 双向零证据且无 6 种隐式耦合。每条附甄别依据。

| hook | 强度 | 类型 | 甄别依据 |
|---|---|---|---|
| `session-start:plan-canvas-sessions` | 弱 | 提及 | `plan-canvas-sessions.js:46` 注入文本提及 plan-canvas skill，但 **zh-cn 缺该 skill**（§7.4） |
| `pre:bash:git-push-reminder` | 弱 | 【3 工作流推动】 | 注入"Review changes before push"（措辞泛泛）→ code-reviewer / /code-review，但不具体 |
| `pre:edit-write:suggest-compact` | 弱 | 【1 规约-执行】 | 指向**内置 /compact**（非 ECC 资源）；与 rules/common/performance.md Context Window 管理松散相关 |
| `pre:config-protection` | 弱 | 【4 治理分工】 | 保护配置文件 ↔ coding-standards / coding-style 工具链；但无 rule 明确写"禁止改配置"，规约支撑弱 |
| `post:edit:accumulator` | 弱 | 【5 数据流】 | 为 format-typecheck 积累编辑路径（`stop-format-typecheck.js:36-38` 读 accumulator），内部数据流 |
| `post:ecc-metrics-bridge` | 弱 | 【5 数据流】 | 输出 metrics → sessions"控制中心监控"，单向 |
| `post:ecc-context-monitor` | 弱 | 【1 规约-执行】 | 监控上下文 ↔ rules/common/performance.md，松散 |
| `post:session-activity-tracker` | 弱 | 【5 数据流】 | `session-activity-tracker.js:602-605` 写 `~/.claude/metrics/tool-usage.jsonl`（**非 session-data**）；sessions 读 session-data 不读 metrics，闭环弱。**注**：v1 计划曾定中，亲验后降为弱 |
| `post:bash:build-complete` | 弱 | 【6 场景配对】 | 见 ⑯ 子项 c |
| `post:bash:command-log`(audit) | 弱 | 审计日志 | 写 bash-commands.log，无明确资源读 |
| `pre:write:doc-file-warning` | 无 | — | `doc-file-warning.js:25` 正则含 `commands\|skills` 但是**通用路径白名单**；无 rule 提及文档应放何处 |
| `pre:bash:auto-tmux-dev` / `tmux-reminder` | 无 | — | tmux 与 ECC agent/command/rule/skill 无职能重叠 |
| `pre/post:mcp-health-check` | 无 | — | MCP 健康检查（`mcp-health-check.js:67-71` 读 .claude.json），与资源无职能重叠 |
| `stop:desktop-notify` | 无 | — | 桌面通知，无职能关联 |

---

## 五、逐资源反向索引

### 5.1 被强/中关联的资源（详写）

#### A. `skills/continuous-learning-v2`（被 3 个 hook 显式关联，最紧密）

- 被 `pre:observe`/`post:observe` spawn 其 `hooks/observe.sh`（①）
- 被 `session:start` 读其 `ecc-homunculus/instincts/` 注入上下文（②）
- 被 `stop:evaluate-session` 读其姊妹 skill `continuous-learning/config.json`（③，v1 非 v2）
- 资源自述：`SKILL.md:135-137`（observe.sh 已在 hooks.json 注册）、`changelog.md:25-32`（hook vs skill 观察对比）、`agents/observer.md`（消费 observe.sh 的 observations.jsonl）

#### B. `/learn`、`/learn-eval`（被 2 个 hook 数据共享）

- `session:start`（读 learned/）+ `stop:evaluate-session`（ensureDir learned/）共享 `~/.claude/skills/learned/`
- 闭环：`/learn` 生成 learned/*.md → `session:start` 下次会话注入 → `evaluate-session` 维护目录

#### C. `/sessions`（中-强双向）

- `sessions.md:295` 引用 `cost-tracker.js`（⑪，强）
- `session-start.js:698` log 提及 `/sessions`（②，弱）
- 数据流：session-end/pre-compact 写 session-data/*.tmp → sessions load/info 读（⑭⑮，中）

#### D. `rules/{typescript,python,web}/hooks.md` + `rules/typescript/coding-style.md`（v2 新增：行为契约/规约-执行文本）

> **这是 v1→v2 最大的修正**。v1 判这 5 个文件与 ECC hook"无 id 级关联，仅易混淆"；v2 确认它们是**质量类 hook 的行为契约文本/规约来源**：

| 资源文本 | 对应 hook | 类型 |
|---|---|---|
| `typescript/hooks.md:18` "console.log warning"（PostToolUse） | console-warn（⑥） | 行为契约 |
| `typescript/hooks.md:22` "console.log audit"（Stop） | check-console-log（⑨） | 行为契约 1:1 |
| `typescript/hooks.md:17` "TypeScript check：编辑后运行 tsc" | format-typecheck（⑧） | 行为契约 |
| `typescript/hooks.md:16` "Prettier：编辑后自动格式化" | quality-gate（⑦） | 规约-执行 |
| `typescript/coding-style.md:199` "See hooks for automatic detection" | console-warn（⑥） | 规约-执行（铁证） |
| `python/hooks.md:14` "black/ruff: Auto-format after edit" | quality-gate（⑦） | 规约-执行 |
| `python/hooks.md:19` "Warn about print() statements" | console-warn（⑥，多语言扩展） | 规约-执行 |
| `web/hooks.md:9` "Format on Save" / `:106` "Stop: Final Build Verification" | quality-gate（⑦）/ format-typecheck（⑧） | 规约-执行/行为契约 |
| `common/hooks.md:7` "Stop：session 结束时（最终验证）" | format-typecheck（⑧） | 行为契约 |

#### E. `rules/web/design-quality.md`（v2 新增）

- Banned Patterns（L9-18）/ Required Qualities（L20-33）↔ design-quality-check 的 GENERIC_SIGNALS / CHECKLIST（⑩，规约-执行）

#### F. `rules/common/{development-workflow,security,code-review}.md`（v2 新增）

- `development-workflow.md:9`（第0步强制性研究）↔ gateguard（④）
- `development-workflow.md:40-44`（第5步 Pre-Review Checks）↔ commit-quality（⑬）
- `security.md:6/17/20`（无硬编码密钥/轮换 secrets）↔ governance-capture（⑤）
- `code-review.md:9-12`（commit 前强制审查）/ `:34`（无硬编码凭证）↔ block-no-verify（⑫）/ governance-capture（⑤）

#### G. `agents/code-explorer` + `agents/planner`（v2 新增，工作流推动）

- code-explorer 的 Entry Point Discovery / Dependency Documentation（`code-explorer.md:23-25,45-49`）↔ gateguard 注入要求（④）

#### H. `agents/security-reviewer`（v2 新增，治理分工）

- Secrets 检测（`security-reviewer.md:25,40,60`）↔ governance-capture 的 SECRET_PATTERNS（⑤）

#### I. `agents/build-error-resolver`（v2 新增，场景配对）

- "构建失败时主动使用"（`build-error-resolver.md:3`）↔ post:bash:build-complete 事件（⑯c）

#### J. `commands/code-review.md`（v2 新增，工作流推动）

- PR 审查 `gh pr view/review`（`code-review.md:91,236-245`）↔ post:bash:pr-created 注入（⑯a）

### 5.2 边缘 / 概念性资源（不构成强关联）

#### `skills/security-scan/SKILL.md:156`（概念性泛指）

- 文本："缺失 PreToolUse security hook"
- 判定：泛指"应配置一个安全 PreToolUse hook"的概念，**不指向** ECC 的 `pre:governance-capture`。但 governance-capture 确实是 PreToolUse security hook（⑤），概念上吻合——之所以不计关联，是因为 security-scan 没有点名任何 ECC hook，而 governance-capture 与 security-reviewer/security.md 的治理分工关联已独立成立，无需借这条概念性文本。

### 5.3 无关联资源清单

> 这些资源在所有 hook 相关关键词下零命中，且无 6 种隐式机制耦合。

- **agents/**（约 12 个零命中）：architect、code-architect、database-reviewer、doc-updater、e2e-runner、fastapi-reviewer、gan-*（3 个）、python-reviewer、refactor-cleaner、tdd-guide、typescript-reviewer、vue-reviewer（后三者含 console.log/prettier 但属"审查清单示例"，非真关联）
- **commands/**（约 30 个）：build-fix、evolve、feature-dev、gan-*、instinct-*、orch-*、plan、pr、prp-*、promote、save-session、security-scan、skill-*、test-coverage、update-*、vue-review 等（注：sessions/code-review 已在 5.1 关联）
- **rules/**：common/{coding-style,git-workflow,patterns,performance}、python/{fastapi,patterns,security,testing}、typescript/{patterns,security,testing}、vue/*、web/{coding-style,patterns,security,testing}
- **skills/**（约 28 个）：accessibility、api-design、backend-patterns、bun-runtime、clickhouse-io、coding-standards、database-migrations、design-system、django-security、docker-patterns、e2e-testing、fastapi-patterns、frontend-patterns、liquid-glass-design、nextjs-turbopack、orch-*、postgres-patterns、python-*、pytorch-patterns、security-review、swift-*、swiftui-patterns、tdd-workflow、vite-patterns、vue-patterns

---

## 六、隐式关联典型案例深析（6 种类型各 1 例）

### 6.1 规约-执行：console-warn ↔ typescript/hooks.md + coding-style.md

```
规约（rule 侧）                          执行（hook 侧）
──────────────                          ──────────────
coding-style.md:199                     post-edit-console-warn.js:21,27
"See hooks for automatic detection"  ←→ /\.(ts|tsx|js|jsx)$/ + /console\.log/
                                        PostToolUse 触发，编辑 .ts/.tsx 后检测
hooks.md:18
"console.log warning（PostToolUse）"  ←→  命中即告警
```

**为何是强**：rule 文本 `coding-style.md:199` 明确写"See hooks for automatic detection"——这是 rule **显式声明把检测委托给 hook**。hook 的行为（编辑 JS/TS 后检测 console.log）精确落在该规约职能域。双向证据齐全，且 rule 主动指向 hook 机制。

### 6.2 行为契约：check-console-log ↔ typescript/hooks.md（1:1）

```
hooks.md:22（Stop 行为描述）             check-console-log.js（Stop hook 实现）
─────────────────────────              ─────────────────────────────
"console.log audit：                    L67 getGitModifiedFiles(['\\.tsx?','\\.jsx?])
 在 session 结束前                      → 取已修改文件
 检查所有已修改文件中的                  L75 content.includes('console.log')
 console.log"                           → 检查 console.log
                                       L82 'Remove console.log...before committing'
```

**逐字 1:1**：session 结束前（Stop）× 已修改文件 × console.log。这是行为契约型关联最干净的样本——资源描述"应有这样一个 Stop hook"，ECC 恰好实现了它。即便互不引用，行为完全重合。

### 6.3 工作流推动：gateguard ↔ code-explorer + development-workflow

```
gateguard-fact-force.js:1080-1085       code-explorer.md:23-25,45-49
（编辑前注入要求）                       （agent 核心职能）
──────────────────────                  ──────────────────────
"列 importers/callers"               ←→ 1. Entry Point Discovery（顺 stack trace）
"用 Glob/Grep 搜索同类文件"           ←→ 5. Dependency Documentation（内部 module dependencies）
"展示 data schema"                   ←→  映射 data transformations
                                       development-workflow.md:9
                                       "0. 研究及复用（强制性步骤）"
```

**机制**：gateguard 在 PreToolUse（编辑写操作前）**阻断并注入**这些要求，把 Claude 推向"先调研再写"的工作方式——这正是 code-explorer agent 的职能（探索 codebase）和 development-workflow 第0步（强制性研究）。hook 不点名 agent，但注入的动作集合 = agent 的能力域。

### 6.4 治理分工：governance-capture ↔ security-reviewer + security.md

```
governance-capture.js:25-56（确定性拦截） security-reviewer.md（主观审查）
────────────────────────────────────       ──────────────────────────
SECRET_PATTERNS                         ←→ L25 "Secrets 检测：硬编码 API keys/tokens"
(AWS/JWT/private key/github token)         L60 "硬编码 secrets | CRITICAL"
APPROVAL_COMMANDS                       ←→ （危险操作审查）
(git push --force/rm -rf/DROP TABLE)
SENSITIVE_PATHS                         ←→ security.md:6 "无硬编码密钥"
(.env/.pem/.key/id_rsa)                    security.md:20 "轮换已暴露的 secrets"
                                           code-review.md:34 "无硬编码凭证"
```

**分工**：hook 在运行时**确定性检测并阻断/告警**（快、可靠、无遗漏）；security-reviewer agent + security.md 在审查时**主观判断上下文**（区分 .env.example 误报、测试凭据等，见 security-reviewer.md:79-86 "常见误报"）。同一目标（防 secret 泄露/危险操作），两种机制互补，互不引用。

### 6.5 数据流闭环：observe 链 / session-* 链

```
【observe 链】
observe-runner.js(spawn) → observe.sh → observations.jsonl → observer agent → instinct-cli → instincts/
                                                                        ↓
                                              session:start.js:406-460 读取 instincts 注入上下文

【session 链】
pre-compact.js:166-171 ─┐
session-end.js:245-296  ├──→ ~/.claude/session-data/*-session.tmp ──→ sessions(load/info)/save-session/resume-session
                        └    （含 project/branch/worktree metadata）
```

**机制**：hook 写数据到固定位置（session-data/、observations.jsonl），command/agent 从该位置读。无需互指，通过共享数据目录形成闭环。

### 6.6 场景配对：post:bash:dispatcher ↔ build-error-resolver

```
post-bash-build-complete.js:11          build-error-resolver.md:3
（事件检测）                            （agent 触发场景）
───────────────────                     ──────────────────────
/(npm run build|pnpm build|yarn build)/ "当构建失败或类型错误发生时主动使用"
.test(cmd)
:14 "[Hook] Build completed"
```

**为何仅弱**：hook 检测 build 命令**执行完**（不检测成败），只打印"Build completed - async analysis running in background"，**不注入要求调用 build-error-resolver**。场景相邻（build 事件 ↔ build 错误处理 agent），但 hook 缺少"推动调用"的动作，故仅弱场景配对（对比 pr-created 子项注入 `gh pr review` = 中）。

---

## 七、特殊案例深析

### 7.1 observe 串联链：hooks.json → observe-runner.js → observe.sh（纠正 SKILL.md 措辞）

`continuous-learning-v2/SKILL.md:135` 写：

> "Claude Code v2.1+ 会自动加载 plugin 的 `hooks/hooks.json`，`observe.sh` 已在其中注册。"

**实际代码（亲验）**：`hooks/hooks.json` 里注册的 observe hook，业务脚本是 **`observe-runner.js`**，**不是** `observe.sh`。`observe.sh` 的注册是**两级串联**：

```
hooks.json (pre:observe / post:observe)
   └─► run-with-flags.js (门控)
        └─► observe-runner.js (解析 plugin root + 找 shell)
             └─► spawnSync(skills/continuous-learning-v2/hooks/observe.sh, phase)  ← 真正的观察逻辑
```

即 SKILL.md 措辞**不够精确**：`observe.sh` 并未直接列名在 `hooks/hooks.json`，而是经 `observe-runner.js` 中转调用。这是**一套串联实现**——hook 层只负责"找到 skill 并启动它"，观察逻辑封装在 skill 内。这正解释了为何 hook 与 skill 是**强关联**而非可替换。

### 7.2 持续学习数据流：learned/ 与 instincts/ 的双闭环

```
┌───────────── learned/ 闭环（基于 /learn）─────────────┐
│  /learn、/learn-eval command                           │
│     │ 生成 ~/.claude/skills/learned/*.md               │
│     ▼                                                   │
│  session:start hook 读取 ──► 注入 "Available learned   │
│     (session-start.js:538-573)      skills" 到上下文    │
│     ▲                                                   │
│     │ ensureDir                                         │
│  stop:evaluate-session hook                             │
│     (evaluate-session.js:80)                            │
└────────────────────────────────────────────────────────┘

┌───────────── instincts/ 闭环（基于 cl-v2）────────────┐
│  continuous-learning-v2 skill (observe.sh/instinct-cli)│
│     │ 生成 ~/.local/share/ecc-homunculus/instincts/    │
│     │   {personal,inherited}/ (项目+全局)              │
│     ▼                                                   │
│  session:start hook 读取 ──► 注入 "Active instincts"   │
│     (session-start.js:406-460)      到上下文            │
└────────────────────────────────────────────────────────┘
```

`stop:evaluate-session` 在两闭环间起桥梁作用：读 `continuous-learning/config.json` 决定阈值、`ensureDir` 维护 learned/，并经 stderr 信号提示 Claude 提取模式。注意 v1（`continuous-learning`）与 v2（`continuous-learning-v2`）的 config 是分开的（见 §7.4）。

### 7.3 rules/\*/hooks.md：从"易混淆元文档"修正为"行为契约文本"（v1→v2 关键修正）

**v1 判定**（§4.2/§5.3）：5 个 `hooks.md` 描述的是"用户应如何用 prettier/eslint/tsc 配 hook"，与 ECC 自有 hook"实现各自独立、无 id 级关联"，仅作易混淆点记录。

**v2 修正**：经逐行对照 hook 实际行为与 hooks.md 文本，确认二者构成**行为契约型隐式关联**：

- hooks.md 描述的 PostToolUse/Stop 行为（console.log warning / console.log audit / TypeScript check / Prettier 自动格式化），与 ECC 的 console-warn / check-console-log / format-typecheck / quality-gate **行为逐项对应**（见 §5.1 表 D）。
- 特别是 `coding-style.md:199` "See hooks for automatic detection" 是 rule **主动指向 hook 机制**的规约-执行铁证。

**为何仍强调"不点名 ECC id"**：这些 hooks.md 确实没写 `stop:format-typecheck` 等 ECC 具体 id——它们描述的是"应有这样行为的 hook"这一**契约**，而 ECC hook 是该契约的实现。关联类型是【2 行为契约】/【1 规约-执行】，而非显式 id 引用。v1 因只认显式引用而漏判。

### 7.4 zh-cn 缺失项对关联的影响

两个被 hook 依赖的资源在 `custom-install/zh-cn/` 下**缺失**：

| 资源 | 主仓位置 | 依赖它的 hook | zh-cn 状态 | 影响 |
|---|---|---|---|---|
| `continuous-learning`（无 v2） | `skills/continuous-learning/config.json` | `stop:evaluate-session`（`evaluate-session.js:57`） | **缺失**（zh-cn 只有 v2） | config 读不到 → 走默认值（`min_session_length=10`、`learned=~/.claude/skills/learned/`）。功能不中断，配置不可调 |
| `plan-canvas` | `skills/plan-canvas` + `scripts/plan-canvas*.js` | `session-start:plan-canvas-sessions`（注入文本点名） | **缺失** | hook 注入的 "plan-canvas skill" 指向不存在的资源；用户照提示执行 `node scripts/plan-canvas.js` 会失败 |

> 这与《资源依赖检查报告》记录的"漏拷贝"是同类问题。本文从 hook 视角补充印证：**hook 运行时对这些缺失资源有真实依赖（evaluate）/指向（plan-canvas-sessions）**。

---

## 八、与《资源依赖检查报告》交叉印证

| 关联事实 | 本报告结论（v2） | 《资源依赖检查报告》结论 | 一致性 |
|---|---|---|---|
| sessions.md → cost-tracker.js | §4.1⑪ 强关联，`sessions.md:295` | 第 14 项缺失记录 | ✓ 一致 |
| continuous-learning-v2 → hooks.json | §4.1① 强关联 | 第 15 项缺失记录（SKILL.md:135 observer 自动加载依赖） | ✓ 一致 |
| rules/\*/hooks.md ↔ ECC hook | §5.1-D **行为契约/规约-执行关联**（v2 修正） | 报告末尾"rules 没有任何 hooks.md 引用 scripts/hooks/\*.js" | ✓ 一致且互补（依赖报告视角是"无脚本路径引用"，本报告视角是"有行为契约型隐式关联"——两者不矛盾，因行为契约不需路径引用） |
| utils.js 哨兵 | 未计入关联 | 第 13 项（utils.js 作 ECC_ROOT 探测哨兵，非 require） | ✓ 一致 |

两份报告视角互补：资源依赖报告查"资源 → 资源/hook 脚本文件是否存在/是否被路径引用"，本报告查"hook ↔ 资源 是否有运行时关联（含隐式）"。两者在交叉点上结论一致。

---

## 附录：证据索引（关键 file:line 汇总）

### A. hook 侧（hook → 资源 / hook 实际行为）

**显式关联**
- `scripts/hooks/observe-runner.js:8,128-139` — spawn cl-v2 observe.sh
- `scripts/hooks/session-start.js:406-460,538-548,551-573,698,735-767` — 注入 instincts + learned skills；log 提及 /sessions
- `scripts/hooks/evaluate-session.js:57,64-77,80` — 读 cl config + ensureDir learned/
- `scripts/lib/utils.js:56-58,77-78` — getSessionsDir / getLearnedSkillsDir 定义

**隐式：规约-执行 / 行为契约**
- `scripts/hooks/post-edit-console-warn.js:21,27` — JS/TS 文件 console.log 检测（↔ typescript/hooks.md:18, coding-style.md:199）
- `scripts/hooks/check-console-log.js:67,75,82` — Stop console.log audit（↔ typescript/hooks.md:22）
- `scripts/hooks/quality-gate.js:57-132,69,106,123` — 编辑后格式化 gate（↔ typescript/hooks.md:16, python/hooks.md:14, web/hooks.md:9）
- `scripts/hooks/stop-format-typecheck.js:2,71-100,114-157` — Stop 批量 format + tsc（↔ typescript/hooks.md:17, web/hooks.md:106, common/hooks.md:7）
- `scripts/hooks/design-quality-check.js:15,18-25,27-33,68-75` — 前端模板检测 + 品质清单（↔ web/design-quality.md:9-33）

**隐式：工作流推动 / 治理分工**
- `scripts/hooks/gateguard-fact-force.js:1080-1085` — 注入研究要求（↔ code-explorer.md, development-workflow.md:9）
- `scripts/hooks/governance-capture.js:25-56` — SECRET_PATTERNS/APPROVAL_COMMANDS/SENSITIVE_PATHS（↔ security-reviewer.md, security.md）
- `scripts/hooks/block-no-verify.js` — 防 --no-verify 绕过（↔ code-review.md:9-12, security.md:5）
- `scripts/hooks/pre-bash-commit-quality.js` — 提交质量门（↔ development-workflow.md:40-44）
- `scripts/hooks/post-bash-pr-created.js:12,22-23` — 注入 gh pr review（↔ code-review.md:91,236）

**隐式：数据流 / 场景配对**
- `scripts/hooks/pre-compact.js:124-132,156,166-171` — 写 session.tmp（↔ sessions/save-session）
- `scripts/hooks/session-end.js:184,207-208,245-296` — 写 session-data/.tmp（↔ sessions/save-session/resume-session）
- `scripts/hooks/post-bash-command-log.js:11-20,48` — 写 cost-tracker.log（↔ sessions.md:295）
- `scripts/hooks/post-bash-build-complete.js:11,14` — build 完成事件（↔ build-error-resolver.md:3）

### B. 资源侧（资源 → hook / 资源意图）

**显式引用 hook**
- `custom-install/zh-cn/commands/sessions.md:295` — 引用 cost-tracker.js
- `custom-install/zh-cn/skills/continuous-learning-v2/SKILL.md:135-137,144-157` — 自述 observe.sh 与 hooks.json
- `custom-install/zh-cn/skills/continuous-learning-v2/changelog.md:18,25-32,39` — hook vs skill 观察对比

**行为契约 / 规约-执行文本（v2 新增）**
- `rules/typescript/hooks.md:16,17,18,22` — Prettier / TypeScript check / console.log warning / console.log audit
- `rules/typescript/coding-style.md:199` — "See hooks for automatic detection"
- `rules/python/hooks.md:14,19` — black/ruff Auto-format / print() 警告
- `rules/web/hooks.md:9,106-108` — Format on Save / Stop Final Build Verification
- `rules/common/hooks.md:7` — Stop 最终验证
- `rules/web/design-quality.md:9-18,20-33` — Banned Patterns / Required Qualities

**治理分工 / 工作流推动 / 场景配对（v2 新增）**
- `rules/common/development-workflow.md:9,40-44` — 第0步强制性研究 / 第5步 Pre-Review Checks
- `rules/common/security.md:5,6,17,20` — commit 前安全检查 / 无硬编码密钥 / 轮换 secrets
- `rules/common/code-review.md:9-12,34` — commit 前强制审查 / 无硬编码凭证
- `agents/code-explorer.md:23-25,45-49` — Entry Point Discovery / Dependency Documentation
- `agents/security-reviewer.md:25,40,60` — Secrets 检测
- `agents/build-error-resolver.md:3` — 构建失败时主动使用
- `commands/code-review.md:91,236-245` — gh pr view / gh pr review

---

> **方法论备注**：本报告所有结论由三路证据交叉得出——①hook 业务脚本人工通读（机制侧 file:line）、②hook→资源方向行为分析（注入/检测/数据流对象是否对应资源职能）、③资源→hook 方向文本分析（行为契约/规约/审查对象）。v1→v2 的核心修正：把"关联"从"仅显式引用"扩展为"显式 + 隐式（6 种类型）"，并对每个隐式关联给出"机制侧实际行为 × 意图侧资源原文"双向证据。所有强/中关联的 hook 侧与资源侧引文均经人工复读确认，非仅依赖代理摘要。
