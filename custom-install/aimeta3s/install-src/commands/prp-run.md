---
description: PRP 流水线调度器 —— 按 PRD 逐 phase 自动调度 prp-plan→prp-implement→code-review→prp-fix→prp-commit，全部完成后按 git remote 自适应 PR 出口：GitHub 派 prp-pr 创建 PR，Gogs 等自建服务派 prp-push-gogs 推送并指引网页手动创建（每步文件系统核验，仅人工介入点停）
argument-hint: [PRD路径] [--max-phases N] [--dry-run] [--no-pr]
---

# PRP 流水线调度器

> 属于 PRP workflow 系列之一。prp-prd 之后调用本命令接管全流程。

**输入**: $ARGUMENTS

---

## 核心理念

- **只调度，不干活**：本命令不实现、不审查、不自行修复——每一步派一个独立 subagent 执行对应现有命令（/prp-plan、/prp-implement、/code-review --prp、/prp-fix、/prp-commit、PR 出口 /prp-pr 或 /prp-push-gogs 按 git remote 平台二选一），命令文档本身是过程与产物的唯一权威。本命令不改变这些命令的任何行为。
- **无状态文件**：进度与断点全部从文件系统推导——PRD「实现阶段」表的状态列、`docs/PRPs/{plans,plans/completed,implement,reviews}/` 的产物存在性、review 文件名内嵌时间戳与决策行。任意时刻重跑 `/prp-run <同一 PRD>` 都从当前真实状态续跑。（运行日志只写不读、不参与推导，不影响无状态设计，见「运行日志」章节。）
- **先核验，再采信**：每个 subagent 返回后，必须用文件系统证据交叉核验其自述（产物存在、PRD 状态推进、决策行可解析）；证据与自述矛盾时以证据为准并停止。
- **串行执行**：PRD「并行」列标注被忽略，phase 严格按序号逐个执行——同一工作区不允许两个 implement 并发。

---

## 参数与模式

| 输入 | 含义 |
|---|---|
| `<PRD路径>`（以 `.prd.md` 结尾） | 必需。调度对象 PRD；文件不存在 → 停止 |
| 留空 | 若 `docs/PRPs/prds/` 下恰有 1 个 `.prd.md` 则使用之；0 个或多个 → 停止并要求显式给路径（PRD 文件名无时间戳，无法可靠自动取最新） |
| `--max-phases N` | 可选，默认无上限。最多调度 N 个 phase 后温和停止（规模/成本护栏） |
| `--dry-run` | 只做阶段 1 断点推导，打印「将从断点继续执行的完整动作序列」后结束，不派任何 subagent |
| `--no-pr` | 全部 phase 完成后不派 PR 出口命令（/prp-pr 或 /prp-push-gogs，止步于最后一个 commit） |

---

## 阶段 1 — 启动与断点推导

### 1.1 记号定义

- `闭环(F)` = phase F 的完整收尾，需同时满足：F.状态 = `已完成` **且** `reviews(F.plan-name)` 非空且最新决策 = PASS **且** `git status --porcelain` 为空（变更已提交）。
- `P` = PRD「实现阶段」表中第一个 `闭环` 未完成的 phase（全部闭环完成 → P 不存在）。P 有三种情形：待开始、进行中、或「已完成但审查/提交未收尾」——第三种正是「implement 已把状态写为已完成、后续 review/commit 前中断重跑」的正常断点，必须被接住而非跳过。
- `{plan-name}` = P 的「PRP 计划」列路径去掉目录与 `.plan.md` 后缀。
- `reviews(name)` = `docs/PRPs/reviews/` 下匹配 `{name}-*.review.md` 的报告，按文件名内嵌时间戳 `yyyymmdd-HHMM` 排序（与 /prp-fix Phase 1 同规，不依赖 mtime）。
- `newest_review(name)` = 其中最新一份；`decision(r)` = 从报告检索决策行 `**决策**: PASS | BLOCK COMMIT` 的结果（容忍冒号后空白差异）。
- `block_run(name)` = `reviews(name)` 从最新往前数，末尾连续 `BLOCK COMMIT` 的个数（遇到 PASS 或无法解析即停）。
- `fix_report(r)` = 与 r 同目录的 `<r 文件名去 .review.md>-fix.report.md`。

### 1.2 前置检查

1. **PRD 存在性 + 「实现阶段」表解析**：读不到表，或表内检索不到 `待开始|进行中|已完成` 任一状态 → 停止（格式漂移，提示对照 /prp-prd 模板表头 `| 序号 | 标识 | 名称 | 描述 | 状态 | 并行 | 依赖 | PRP 计划 |`）。
2. **git 仓库检查**：`git rev-parse --show-toplevel` 失败 → 停止。
3. **PR 出口预检**：未给 `--no-pr` 时解析 `git remote get-url origin` 的 host——`github.com` → 执行 `gh auth status`，失败 → 停止并提示 `gh auth login`（避免整条流水线白跑后才在 prp-pr 失败），并记 `pr_cmd = prp-pr`；其他 host（Gogs 等自建服务）→ 记 `pr_cmd = prp-push-gogs`，无需 gh（GHE host 非 github.com 时也会走该出口，按需再扩展）。
4. **创建运行日志**：非 `--dry-run` 时按「运行日志」章节创建 `docs/PRPs/runs/{prd-name}-<时间戳>.run.md` 并写入头部（best-effort，失败仅警告不停止）。

### 1.3 断点推导表

对当前 PRD 求值本表得到唯一下一步动作；`--dry-run` 即打印求值结果与完整动作序列。

| # | PRD 状态 | 文件系统证据 | 下一步动作 |
|---|---|---|---|
| 0 | 无「实现阶段」表 / 状态列不可解析 | — | 停止：PRD 表格格式漂移，人工修复后重跑 |
| 1 | P = 待开始 | — | 派 **prp-plan** `<PRD路径>` |
| 2 | P = 进行中 | 「PRP 计划」指向 `plans/{name}.plan.md`（未归档） | 派 **prp-implement** `<该 plan 路径>` |
| 2a | P = 进行中 | plan 在 `plans/` 与 `plans/completed/` 均不存在 | 停止：plan 丢失（或 PRD 状态先行），人工核对 |
| 2b | P = 进行中 | plan 已在 `plans/completed/` 且 `implement/{name}.report.md` 存在 | implement 实际已完成、PRD 未及更新 → 按 #3/#4 推导 |
| 2c | P = 进行中 | plan 已在 `plans/completed/` 但 `implement/{name}.report.md` 不存在 | 停止：产物不完整（implement 中断或产物被移动），人工核对 |
| 3 | P 的 plan 已归档（状态列进行中或已完成均可），`implement/{name}.report.md` 存在 | `reviews(name)` 为空 | 派 **code-review** `--prp <plans/completed/{name}.plan.md>` |
| 4 | 同上 | `newest_review` 决策 = PASS，`git status --porcelain` 非空 | 派 **prp-commit**（软门禁 PASS 直接放行） |
| 4a | 同上 | 决策 = PASS，工作区干净，P.状态 = 已完成 | 闭环完成 → 回外层循环取下一 P（自动跳过） |
| 4b | 同上 | 决策 = BLOCK，`fix_report` 不存在，`block_run < 2` | 派 **prp-fix** `<newest_review 路径>` |
| 4c | 同上 | 决策 = BLOCK，`fix_report` 存在，`block_run < 2` | 派 **code-review** `--prp ...`（复审盲审） |
| 4d | 同上 | `block_run >= 2` | 停止：连续 2 轮 BLOCK，人工介入 |
| 4e | 同上 | `newest_review` 无决策行 / 解析失败 | 停止：报告格式漂移，人工打开裁决 |
| 4f | 决策 = PASS，工作区干净，但 P.状态 = 进行中 | PRD 状态落后于产物（#2b 尾态） | 停止：提示人工将该 phase 状态改为已完成、计划路径补 `completed/` 前缀后重跑——**调度器不自行改写 PRD 状态列**（写入权属 prp-plan/prp-implement） |
| 5 | P 不存在（全部闭环完成） | 当前分支有领先提交且无 PR | 派 **prp-pr / prp-push-gogs**（按 1.2 预检的 pr_cmd） |
| 5a | 全部闭环完成 | PR 已存在（`gh pr list --head <branch>` 非空，仅 GitHub） | 输出 PR 链接，正常结束 |
| 5b | 全部闭环完成 | 无领先提交且工作区干净 | 结束并提示：变更可能已推送/已建 PR，人工确认 |

### 1.4 启动摘要

向用户输出：推导结果 + 将执行的 phase 清单（含进度 闭环完成 N/M）+ 本轮将执行的动作序列 + 停止条件预告。非 `--dry-run` 时打印后直接开始（全自动，无逐条确认点）。

---

## 阶段 2 — 调度状态机

```text
记号见阶段 1·1.1；dispatch(cmd, args) 按阶段 3 派发协议执行并返回结构化摘要 r；
STOP(原因) = 停止调度，向用户转述原因与断点，提示「重跑 /prp-run <PRD> 幂等续跑」。
# 每步 dispatch 前/返回后、每次核验、每次 STOP 与小结均按「运行日志」章节落盘（best-effort）。

phases_done = 0
while phases_done < max_phases:
    P = 第一个 闭环 未完成的 phase（记号见阶段 1·1.1）
    if P 不存在: break                                  # 全部闭环完成 → 收尾 E

    # —— A. 计划（断点推导 #1）——
    if P.状态 == 待开始:
        r = dispatch("prp-plan", PRD路径)
        if r.状态 == 需人工: STOP(r.需用户决策)          # 歧义门 STOP-and-ask
        if r.状态 == 失败:   STOP(r 摘要)
        核验A（见阶段 4）；失败 → STOP
    plan = P.「PRP 计划」路径
    if plan 不存在且 plans/completed/{name}.plan.md 也不存在: STOP(#2a)

    # —— B. 实现（断点推导 #2 / #2b）——
    if plan 未归档（在 plans/ 下）:
        r = dispatch("prp-implement", plan)
        if r.状态 == 需人工: STOP(r.需用户决策)          # 含 main 脏工作区 STOP
        if r.状态 == 失败:   STOP(r 摘要)
        核验B（见阶段 4）；失败 → STOP
    completed_plan = docs/PRPs/plans/completed/{name}.plan.md

    # —— C. 审查与修复循环（#3/#4x，上限由 block_run 守卫）——
    loop:
        if reviews(name) 为空:
            r = dispatch("code-review", "--prp " + completed_plan)
            核验C；失败 → STOP；若新决策 = BLOCK → 回 loop 头
        else:
            newest = newest_review(name)
            if decision(newest) 无法解析: STOP(#4e)
            if decision(newest) == PASS: break           # → D
            if block_run(name) >= 2: STOP(#4d 连续 2 轮 BLOCK)
            if fix_report(newest) 不存在:
                r = dispatch("prp-fix", newest 路径)      # MEDIUM 按建议，见阶段 3
                if r.状态 == 需人工: STOP(r.需用户决策)
                核验F（见阶段 4）；失败 → STOP
            r = dispatch("code-review", "--prp " + completed_plan)  # 复审盲审
            核验C；失败 → STOP；若新决策 = BLOCK → 回 loop 头

    # —— D. 提交（#4 / #4a）——
    if git status --porcelain 非空:
        r = dispatch("prp-commit", "")                    # 软门禁：上一步已 PASS，直接放行
        核验D（见阶段 4）；失败 → STOP
    phases_done += 1
    输出本 phase 小结（plan / report / review / commit 哈希一行表）

# —— E. 收尾（#5 / #5a / #5b）——
if --no-pr: 输出总结，结束
if pr_cmd == prp-pr and gh pr list --head $(git branch --show-current) 非空: 输出既有 PR 链接，结束   # 仅 GitHub
pr_args = prp-pr ? "" : "--plan " + 最后闭环 phase 的 plans/completed/{name}.plan.md 路径
r = dispatch(pr_cmd, pr_args)
if r.状态 == 需人工: STOP(r.需用户决策)                   # rebase 冲突 / gh 未认证等
核验E（见阶段 4）
输出总结（phase 完成表 + 全部产物路径 + PR URL 或 compare URL）
```

**两条守卫**：

- **无进展守卫**：外层每轮结束时，若 P 未变且该 phase 的全部文件系统证据与上一轮完全相同（无新 plan / report / review / commit）→ STOP（防 #4f 类矛盾造成死循环）。
- **核验失败不自动重试、不自行修补状态**：一次性重查文件系统（排除落盘时序）后仍矛盾即停。重试由用户重跑 `/prp-run` 完成——若该步骤实际已完成，推导表会自动跳过它，等价于安全重试。

---

## 阶段 3 — subagent 派发协议

### 3.1 派发方式

- 用 **Agent tool + `general-purpose` 类型**（tools 含 Skill/Bash/Read/Write/Edit/Grep/Glob），每命令一个全新 subagent，**串行阻塞**派发：一个 subagent 返回并核验通过后才派下一个。
- **不用**仓库专用 agent（planner / code-reviewer / tdd-guide 等）——它们是「亲自做该角色工作」的角色 prompt，会绕开 prp-* 命令文档规定的过程与产物契约，破坏无状态衔接。
- 每命令独立 subagent 天然满足 /prp-fix「建议 /clear 新会话复审」的盲审要求——复审者本就是无修复上下文的新会话，比人工流程更严格。
- model 不做区分：全部继承主会话默认，不显式指定。

### 3.2 通用 prompt 骨架

`{cmd}` / `{args}` 按下表填充：

```text
你是 PRP 流水线中的一个步骤执行者。严格按命令文档执行，不要发明步骤。

执行：调用 Skill tool，skill 名为「{cmd}」，args 为「{args}」。
命令文档加载后以其为唯一过程与产物依据。

交互策略（重要）：
- 命令中需要用户确认/决策的点位，一律采用命令文档写明的默认选项
  （例：prp-fix 的 MEDIUM「回车按建议执行」→ 按建议处置；LOW 仅记录）。
- 命令文档标记 STOP / 歧义门 / 升级用户的点位，禁止替用户作答：
  立即停止执行，把问题原文整理进返回摘要的「需用户决策」。

完成后（无论成败），只以下述固定格式返回，不输出其他内容：
状态: 完成 | 需人工 | 失败
产物: <本步骤实际落盘的文件路径，逐行列出；无则写 无>
关键结论: <1-3 句：做了什么、验证结果、决策/分支结果>
需用户决策: <触发 STOP 时的问题原文清单；无则写 无>
```

### 3.3 每命令参数表

| 步骤 | {cmd} | {args} | 返回摘要中额外要求 |
|---|---|---|---|
| A 计划 | `prp-plan` | `<PRD路径>` | 产物列必含 plan 文件路径；关键结论含所选 phase 标识与复杂度 |
| B 实现 | `prp-implement` | `<plan路径>`（plans/ 未归档路径） | 产物列必含 report + validation.log；关键结论含分支名与各级验证结果；分支决策 STOP → 状态: 需人工 |
| C 审查 | `code-review` | `--prp <plans/completed/{name}.plan.md>` | 产物列必含新落盘 review 报告路径；关键结论含决策与四级问题计数 |
| F 修复 | `prp-fix` | `<最新 review 报告路径>` | 产物列必含 fix.report；关键结论注明是否实际触碰代码（决定证据刷新核验） |
| D 提交 | `prp-commit` | （空 = 全部变更） | 产物列写 commit 哈希与消息；关键结论含软门禁走查结果 |
| E PR 出口 | `prp-pr` / `prp-push-gogs`（按 1.2 平台判定） | GitHub: 空（base 默认 main）；Gogs: `--plan <最后闭环 phase 的 completed plan 路径>` | 产物列必含 PR URL（GitHub）或 pr.md 落盘路径 + compare URL（Gogs）；各前置停止 → 状态: 需人工 + 原因 |

---

## 阶段 4 — 每步核验清单

核验由调度器**亲自执行**（Glob/Grep/Read/git 命令），不信 subagent 自述：

| 步骤后 | 期望证据 | 核验方法 |
|---|---|---|
| A | plan 落盘 + PRD 状态推进 | Read PRD 该行：状态 = 进行中、PRP 计划列非 `-`；Glob 该路径存在 |
| B | 三产物 + 归档 + PRD 已完成 | Glob `plans/completed/{name}.plan.md`、`implement/{name}.report.md`、`implement/{name}.validation.log`；Read PRD 该行状态 = 已完成 |
| C | 新报告且决策可解析 | 列目录取 `{name}-*.review.md` 中时间戳晚于派发时刻的最新一份；检索决策行 `**决策**: PASS \| BLOCK COMMIT` |
| F | fix.report + 证据刷新 | Glob `<源名去 .review.md>-fix.report.md`；subagent 自述改码时 Grep validation.log 尾部出现 `round: prp-fix` 新条目 |
| D | 提交发生且工作区干净 | `git log -1` HEAD 相较派发前已变化，且 `git status --porcelain` 为空 |
| E | PR 存在（GitHub）；pr.md 落盘 + 分支到达远端（Gogs） | GitHub: `gh pr view --json number,url`（按当前分支）命中；Gogs: Glob `docs/PRPs/prs/{最后闭环 plan-name}-*.pr.md` 存在 + `git ls-remote --heads origin <branch>` 命中 |

核验失败统一处理：重查一次文件系统 → 仍矛盾 → STOP，输出「subagent 自述 vs 文件系统证据」对照表。

---

## 停止条件（人工介入点）

| 触发 | 转述给用户的内容 |
|---|---|
| 连续 2 轮 BLOCK（block_run ≥ 2） | 两轮报告与 fix.report 路径；建议人工排查根因 |
| subagent 返回「需人工」 | 其「需用户决策」问题原文（prp-plan 歧义门、implement main 脏工作区 STOP、prp-fix 升级项等） |
| 任一核验失败 | 期望 vs 实际对照；不自行修补 |
| subagent 异常/超时/未按格式返回 | 失败摘要 + 「重跑 /prp-run <PRD> 幂等续跑；若该步骤实际已完成将自动跳过」 |
| PRD/报告格式漂移 | 具体缺失项与修复提示 |
| gh 未认证（启动预检，仅 GitHub 平台） | `gh auth login` 后重跑 |
| PR 出口命令前置停止（prp-pr / prp-push-gogs） | 按其返回转述；无领先提交且无 PR 时视为完成（#5b） |
| prp-push-gogs 推送失败 / rebase 冲突（Gogs） | 转述返回摘要；解决后重跑（幂等） |
| `--max-phases` 用尽 | 温和停止：进度 N/M，重跑继续 |

每次 STOP 均输出当前断点（PRD 路径 + 当前 phase + 已完成步骤），并写入运行日志 STOP 条目（触发条件 + 断点 + 转述内容，见「运行日志」章节），用户处理后重跑 `/prp-run <同一 PRD>` 从断点继续。

---

## Edge Cases

| 场景 | 检测点 | 处理 |
|---|---|---|
| prp-plan 歧义门触发 | subagent 返回 需人工 | STOP，转述问题原文；用户答复后重跑（plan 未落盘 → 重新从 A 开始） |
| 连续 BLOCK | block_run ≥ 2 | STOP 人工介入（与 /prp-fix 文档既有约定一致） |
| PRD 表格格式漂移 | 阶段 1 解析失败 | STOP + 修复提示（对照 /prp-prd 模板表头） |
| review 报告无决策行 | 核验C 检索无命中 | STOP，人工打开报告裁决 |
| subagent 中途死掉/超时/格式不符 | 派发返回异常 | STOP + 幂等重跑提示（不自动重派会改代码的命令） |
| implement STOP（main 脏工作区） | subagent 需人工 | STOP + 提示 stash/commit 后重跑 |
| prp-pr：已在 base 分支（仅 GitHub） | 返回需人工 | STOP（正常流程 implement 已切 feat 分支，此情况说明用户手切） |
| prp-pr：无领先提交（仅 GitHub） | 返回需人工 | 若全部 phase 已提交且远端同步 → 按 #5b 视为完成 |
| prp-pr：PR 已存在（仅 GitHub） | 派发前自查或返回 | #5a：输出链接，正常结束 |
| gh 未认证（仅 GitHub） | 启动预检 / E 步 | 启动预检失败即 STOP；漏网时按返回 STOP |
| remote 为 Gogs 等自建服务 | 1.2 平台判定 | 无 gh 依赖；E 步派 prp-push-gogs（推送 + 网页建 PR 指引），PR 由用户网页手动完成 |
| 多 phase 依赖列异常（依赖环/依赖未完成） | prp-plan 阶段 0 找不到合规 phase，但 PRD 仍有待开始 | subagent 自述与 PRD 矛盾 → 核验A 失败 → STOP |
| 全部 phase 状态已完成但调度器中途重启 | 按 `闭环` 判定（1.1） | 仍有已完成但未闭环的 phase（无终审 PASS / 变更未提交）→ 继续该 phase 的 review/commit 分支；全部闭环 → #5/#5a/#5b |
| 「PRP 计划」列指向的 plan 被人工移动/删除 | 推导 #2a | STOP 人工核对 |
| 多个 PRD 但未给路径 | 阶段 1 定位 | STOP 要求显式路径（文件名无时间戳，不猜） |
| 同一 plan-name 跨会话遗留多份 review | block_run 计算 | 只按时间戳数末尾连续 BLOCK，历史 PASS 截断计数 |
| MEDIUM 修复决策 | 派发协议默认 | 按建议处置（/prp-fix 文档默认），LOW 仅记录，不问用户 |
| PRD 标注「并行」的 phase | 外层循环 | 忽略并行标注，按序号串行 |

---

## 中断恢复与幂等

- 调度器自身无任何内存状态：被 /clear、会话中断、Ctrl-C 后，重跑 `/prp-run <同一 PRD>` 走阶段 1 推导表，从文件系统断点继续。
- 幂等性保证：所有「下一步动作」都是推导表的纯函数；已完成的步骤（plan 已建、implement 已归档、review 已 PASS、commit 已落）自动跳过。唯一外部副作用步骤 PR 出口命令重复派发安全：prp-pr 自带「PR 已存在」停止条件；prp-push-gogs 幂等（rebase 无操作或快进、重跑生成新 pr.md）。
- 用户中途手改 PRD/产物：下次推导以当时文件系统为准；若造成状态与证据矛盾，由 #2a/#4f/无进展守卫拦截而非静默继续。

---

## 运行日志（run log）

调度层信息（断点推导、dispatch 摘要、核验证据、STOP 原因）不会出现在任何命令产物中——为追溯与问题查找，每次运行落盘一份**纯旁路**日志。

### 路径与命名

`docs/PRPs/runs/{prd-name}-<yyyymmdd-HHMM>.run.md`（`{prd-name}` = PRD 文件名去 `.prd.md`）。时间戳与 reviews 同规、内嵌文件名；重跑产生新文件，旧文件保留（与 prs 草稿同惯例）。创建时 `mkdir -p docs/PRPs/runs`。

### 文件结构

头部 + 追加式条目 + 尾部固定锚点 `<!-- run-log:end -->`（Edit 追加锚，始终保持在文件末尾）：

```markdown
# Run: {prd-name} — {yyyymmdd-HHMM}
- PRD: <路径> ｜ 参数: <max-phases/no-pr 等> ｜ pr_cmd: <prp-pr | prp-push-gogs>
- 断点推导: P = phase <标识>；闭环进度 N/M；本轮动作序列: <逐条>

<!-- run-log:end -->
```

### 写入时机表

| 时机 | 条目 |
|---|---|
| 阶段 1 推导完成后（Write 创建） | 上述头部全部字段 |
| 每次 dispatch 前 | `## [step N] {cmd} {args}` + 时刻（`date +%Y%m%d-%H%M`） |
| 每次 dispatch 返回后 | subagent 返回摘要**四行原文**（引用块原样，不转述不截断） |
| 每次核验后 | 核验方法与证据关键行（Glob/Grep/git 输出） |
| 核验失败 STOP | 「自述 vs 证据」对照表 |
| 每次 STOP | `## [STOP]` 触发条件 + 断点 + 转述内容 |
| 每 phase 闭环 | 小结一行表（plan / report / review / commit 哈希） |
| 收尾 | `## [结束]` phase 完成总表 + PR URL 或 compare URL |

### 写入协议

- **追加用 Edit 工具**：old_string 锚定 `<!-- run-log:end -->`，新条目插在标记之前；**禁止 shell `>>` 落盘重定向**（会被环境 hook 拦截）。
- **best-effort**：日志写入失败 → 向用户输出一行警告（含原因）后继续调度；不作为 STOP 条件、不作为核验项、不重试。
- **只写不读**：断点推导、核验、任何决策均不读取 run 文件——它是给人读的旁路记录，不是事实源（维持无状态设计）。
- `--dry-run` 不落盘（零副作用模式）。
- run 文件位于 `docs/PRPs/**` 产物集内，随 prp-commit 一并提交、被后续 code-review 自动豁免；目标项目不想入库可自行 .gitignore。

---

## 成功标准

- 目标 phase 全部闭环完成，且每个 phase 五产物齐全（plan 归档件、implement report、validation.log、终审 PASS 的 review、commit）
- 每步核验通过，无「自述与证据矛盾」放行
- 连续 BLOCK 未超过 2 轮即收敛，或已在第 2 轮停机人工介入
- 最终输出：PR URL（GitHub）或 pr.md 落盘 + compare URL + 已推送分支（Gogs 等自建服务，PR 需网页手动创建）；--no-pr 下为末次 commit 哈希；以及 phase 完成总表

---

## 示例

| 你的输入 | 执行的操作 |
|---|---|
| `/prp-run docs/PRPs/prds/user-export.prd.md` | 断点推导后全自动跑到创建 PR |
| `/prp-run docs/PRPs/prds/user-export.prd.md --dry-run` | 只打印断点与将执行的动作序列 |
| `/prp-run`（prds/ 下仅一个 PRD） | 自动定位该 PRD 并继续 |
| `/prp-run <PRD> --max-phases 1` | 只推进 1 个 phase 即温和停止 |
| `/prp-run <PRD> --no-pr` | 跑完所有 phase 的 commit，不创建 PR |
