---
description: 执行实现计划，并进行严格的循环验证
argument-hint: <path/to/plan.md>
---

> 属于 PRP 工作流系列的一部分。

**输入**: $ARGUMENTS

# PRP 实现

逐步执行计划文件，并进行持续验证。每次更改都立即验证——绝不累积破损状态。

**核心理念**：验证循环可以及早发现错误。每次更改后都要运行检查。立即修复问题。

**黄金法则**：如果验证失败，务必先修复再继续。切勿积累错误状态。

---

## Phase 0 — 检测

### 包管理器检测

| 文件存在 | 包管理器 | 运行命令 |
|---|---|---|
| `bun.lockb` | bun | `bun run` |
| `pnpm-lock.yaml` | pnpm | `pnpm run` |
| `yarn.lock` | yarn | `yarn` |
| `package-lock.json` | npm | `npm run` |
| `pyproject.toml` 或 `requirements.txt` | uv / pip | `uv run` 或 `python -m` |
| `Cargo.toml` | cargo | `cargo` |
| `go.mod` | go | `go` |

### 验证脚本

检查 `package.json`（或等效文件）中可用的脚本：

```bash
# 对于 Node.js 项目
cat package.json | grep -A 20 '"scripts"'
```

记下可用于以下操作的命令：type-check, lint, test, build。

---

## Phase 1 — 加载

`$ARGUMENTS` 为计划文件的完整路径（<plan-path>）（例如：`docs/PRPs/plans/{plan-name}.plan.md`）。读取计划文件：

```bash
cat "$ARGUMENTS"
```

**计划校验**——先校验，全部通过后才提取章节：

1. **文件存在性**：计划文件不存在 → 停止，向用户提示：

```
错误：计划文件未找到：<plan-path>。
请确认路径是否正确；若尚未创建计划，可先运行 /prp-plan <feature-description> 创建。
```

2. **章节完整性**：任一必需内容校验不通过 → 停止，向用户提示

以下内容是后续步骤的必要输入，任一缺失、为空或仍为未填写的占位符，都会导致对应步骤无法执行，逐项核对：

| 必需内容 | 缺失时无法执行的步骤 |
|---|---|
| 摘要、用户故事、问题  → 解决方案、Patterns to Mirror、Files to Change、验收标准 | Phase 1 章节提取 |
| 分步任务（每项含 IDENTIFIER / ACTION / IMPLEMENT / MIRROR / VALIDATE 字段） | Phase 3 逐任务执行 |
| 测试策略（含 单元测试 / 集成测试 / Edge Cases 检查清单 小节） | Phase 3 先行测试判定、Phase 4 Level 2 / 4 |
| 验证命令（含 静态分析 / 单元测试 / 集成测试 小节） | Phase 4 Level 1/2/4（Level 3 构建与 Level 1 的 lint 命令由 Phase 0 检测提供，不依赖计划） |

「验证命令 → 集成测试」内的 **运行形态** 为必填勾选项，未勾选视同该小节未填写；
命令块须与勾选形态严格双向对应——每个已勾选形态至少有一条以该形态标注的命令行（HTTP 服务形态须同时含 dev server 行与测试命令行），命令块中不得残留未勾选形态的命令行，任一不满足同样视同该小节未填写。
勾选 HTTP 服务形态时，「端口」与「健康检查路径」为必填（「启动等待」可缺省，按 30 处理）——仍为占位符视同该小节未填写。
「数据库验证」「浏览器验证」为可选小节，不列入校验；已填写时由 Phase 4 Level 5/6 执行，缺失时跳过并在报告中记 N/A。

任意一项校验不通过 → 停止，向用户列出缺失或未填写的内容清单：

```
错误：计划缺少或未填写以下必需内容：

<清单>

计划可能由旧版 /prp-plan 模板生成或存在未填写项。
请运行 /prp-plan 重新生成，或手动补齐后再执行 /prp-implement。
```

**校验失败仅向用户提示并停止**——不要自动调用 /prp-plan 或替用户修改计划，由用户决定如何补齐。

校验通过后，从计划中提取以下章节：
- **摘要** — 正在建造什么
- **用户故事** — 为哪些用户提供什么功能达到什么目标
- **问题  → 解决方案** — 主要问题及解决方案
- **Patterns to Mirror** — 需遵循的 Code conventions
- **Files to Change** — 要创建或修改哪些文件
- **分步任务** — 实现顺序
- **验证命令** — 如何验证正确性
- **验收标准** — 完成的定义

**CHECKPOINT**：Plan loaded. All sections identified. Tasks extracted.

---

## Phase 2 — 准备

### Git 状态

```bash
git branch --show-current
git status --porcelain
```

### 分支决策

| 当前状态 | 操作 |
|---|---|
| 在 feature 分支上 | 使用当前分支 |
| 在 main 上，working tree 干净 | 创建 feature branch：`git checkout -b feat/{plan-name}` |
| 在 main 上，working tree 有改动 | **STOP** — 先让用户 stash 或 commit |
| 在此 feature 的 git worktree 中 | 使用该 worktree |

### 同步远程仓库

```bash
git pull --rebase origin $(git branch --show-current) 2>/dev/null || true
```

**CHECKPOINT**：在正确的分支上。Working tree 准备就绪。远程已同步。

---

## Phase 3 — 执行

按顺序处理计划中的每个任务。

### 逐任务循环

对于 **分步任务** 中的每个任务：

1. **Read MIRROR reference** — Open the pattern file referenced in the task's MIRROR field. Understand the convention before writing code.

2. **先行测试（条件执行）** — 若计划「测试策略」中与本任务关联的测试（按「单元测试」表「关联任务」列对应）标注了 **先行验证**为**否**或未标注的任务跳过此步。标注为**是**的先编写该测试并运行，确认其**失败**（记录失败输出作为 red 证明），然后才进入实现。red 证明的失败输出须包含该用例的标识（用例名/用例数）——「No tests found / 0 matched」不构成 red 证明，按测试文件不在命令收集范围处理（修正文件路径或命令后重跑），实现完成后同一测试必须通过。该判定仅适用于「单元测试」表的用例；集成测试表无先行验证列，一律在 Level 4 实现后编写。

3. **Implement** — Write the code following the pattern exactly. Apply GOTCHA warnings. Use specified IMPORTS.

4. **立即验证** — 在**每一次**文件变更后：
   ```bash
   # Run type-check (adjust command per project)
   [type-check command from Phase 0]
   ```
   如果 type-check 失败 → 在移动到下一个 file 之前修复该错误。

5. **跟踪进度** — 记录：`[done] 任务 N: [任务名称] — 完成`

### 处理偏差

如果实现必须偏离计划：
- Note 变更了 **什么（WHAT）**
- Note **为什么（WHY）** 变更
- 使用修正后的方法继续
- 这些偏差将被记录在报告中

**CHECKPOINT**：所有任务已执行。所有偏差已记录。

---

## Phase 4 — 验证

运行计划中的所有 validation levels。在继续之前修复每个 level 的 issues。

### 证据落盘

本阶段开始时创建验证证据日志：`docs/PRPs/implements/{plan-name}.validation.log`（`{plan-name}` 从计划文件名推导）。

- 每条验证命令的执行输出必须以**原始转储**追加落盘（`| tee -a`），禁止手工转述、摘要或省略替代——该日志是 /code-review `--prp` 档的核验依据。
- 每条命令一个条目，格式：

```text
## [round: implement] cmd: <命令原文>
## exit: <exit code>
<命令完整输出——超长时保留首尾各 200 行，中间以「……（截断 N 行）……」标注>
```

- 同一命令多次重跑（修复后复跑）时，每次执行各占一个条目，保留失败记录与最终通过的那次。
- Level 4 HTTP 形态的服务器脚手架须整段执行并整体 `| tee -a` 落盘（`set -o pipefail` 已保证 tee 场景下 exit code 保真）。
- 本日志只承载验证证据；Phase 0-3 的叙事性过程记录（决策/偏差/重试）另见「过程日志（exec log）」章节，两者不混写。

### Level 1：静态分析

```bash
# Type checking — zero errors required
[project type-check command]

# Linting — fix automatically where possible
[project lint command]
[project lint-fix command]
```

如果 auto-fix 后仍存在 lint 错误，手动修复。

### Level 2：单元测试

本级别默认必须执行。判定与执行：

1. **编写用例**：Write tests for every new function (as specified in the plan's Testing Strategy)
  - 读取计划「测试策略 → 单元测试」，按表执行。
  - 新增 → 将测试写入「测试文件」列的路径。
  - 调整/删除 → 更新或移除该文件中的对应既有测试。
  - 注明“无变化” → 跳过编写，仍须运行既有用例防回归。
  - 标注 **先行验证** 的用例已在 Phase 3 编写并留有 red 证明，无需重复编写。
  - 断言**可观察行为**（输入 → 输出、状态变化），不断言实现细节。
  - Every function needs at least one test。
  - 覆盖计划“Edge Cases 检查清单”中的单元级情况——判定：验证无需跨越本次变更涉及的接缝（模块边界/进程边界/外部资源），如 空输入、边界值。编写完成后逐项对照检查清单，确认全部单元级情况已落位。
3. **执行**：run project test command for affected area
  — 运行计划「验证命令 → 单元测试」中的命令。
  - 执行输出中须出现本次新增/调整用例的标识（用例名/用例数），无该标识或 0 匹配时，先以用例名过滤器重跑确认收集，仍为 0 匹配则视为测试文件不在命令收集范围，修正文件路径或命令后重跑（防止被静默跳过）。
  - 如果一个测试失败 → 修复实现（而不是测试，除非测试本身有误）。

### Level 3：构建检查

```bash
[project build command]
```

构建过程必须成功，且无任何错误。

### Level 4：集成测试

1. **编写用例**
  - 读取计划「测试策略 → 集成测试」，按表执行。
  - 新增 → 将测试写入「测试文件」列的路径。
  - 调整/删除 → 更新或移除该文件中的对应既有测试。
  - 注明“无变化” → 跳过编写，仍须运行既有集成测试防回归。
  - 覆盖计划“Edge Cases 检查清单”中的集成级情况——判定：验证需跨越本次变更涉及的接缝，如 并发访问、网络故障。编写完成后逐项对照检查清单，确认全部集成级情况已落位。
2. **按运行形态执行**
  - 每个已勾选形态，执行计划命令块中以该形态标注的命令行（勾选多种形态时，各形态的命令分别执行）：
  - 输出中须出现新增用例的标识（用例名/用例数），输出无该标识或显示 0 个匹配时，先以用例名过滤器重跑该形态命令确认收集（命令不支持过滤器——如自定义脚本——按测试文件路径运行），仍为 0 匹配则视为测试文件不在命令收集范围，修正文件路径或命令后重跑（防止被静默跳过）。

**HTTP 服务形态**：
  - 用计划中的值替换占位符，走服务器脚手架。
  - 以下脚本须**整段一次执行**，禁止逐行拆跑（`TEST_EXIT=$?` 依赖测试命令紧邻）。
  - 计划中**健康检查路径**为“无”时，用端口探测替代 curl 健康检查（如 `nc -z localhost [计划中的端口]`）。
  - 注意端口探测仅证明有进程监听、不证明应用就绪——若测试批量出现连接拒绝/路由 404 类失败，优先怀疑就绪判定过早（可调大「启动等待」），并建议项目补健康端点后改回健康检查。

```bash
# Fail the whole block if a test command pipes into tee/tail — without this,
# TEST_EXIT=$? would capture the LAST command's exit code (false green)
set -o pipefail

# Pre-flight: the port must be FREE. A leftover server from a previous run
# would answer the health check below while serving STALE code (false green)
if nc -z localhost [计划中的端口] 2>/dev/null; then
  echo "ERROR: Port [计划中的端口] already in use (leftover server from a previous run?). Clean it up and retry." >&2
  exit 1
fi

# Kill the wrapper, its children AND grandchildren — `npm run dev` & co. run
# npm → sh → node, and the real server is a grandchild that a plain
# `kill $SERVER_PID` (or single-level `pkill -P`) leaves behind.
# Deeper chains are caught by the pre-flight port check on the next run.
cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
  pkill -P "$SERVER_PID" 2>/dev/null || true
  for CHILD in $(pgrep -P "$SERVER_PID" 2>/dev/null); do
    pkill -P "$CHILD" 2>/dev/null || true
  done
  wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Start server, run tests, stop server
[计划「验证命令 → 集成测试」中的 dev server 命令] &
SERVER_PID=$!

# Wait for server to be ready (retry count from 计划「启动等待」, default 30)
SERVER_READY=0
for i in $(seq 1 [计划中的启动等待秒数，缺省 30]); do
  if curl -sf --max-time 2 http://localhost:[计划中的端口][计划中的健康检查路径] >/dev/null 2>&1; then
    SERVER_READY=1
    break
  fi
  sleep 1
done

if [ "$SERVER_READY" -ne 1 ]; then
  echo "ERROR: Server failed to become ready within [计划中的启动等待秒数，缺省 30]s" >&2
  exit 1
fi

[计划「验证命令 → 集成测试」命令块中 HTTP 服务形态的测试命令]
TEST_EXIT=$?

exit "$TEST_EXIT"
```

**进程内 / CLI / 编译装配形态**：
  - 直接运行计划命令块中以对应形态标注的命令行，无需服务器管理。
  
每个形态命令执行后，按第 2 步完成收集核对（HTTP 形态的核对在该次脚手架运行内完成，不另起服务器）。

### Level 5：数据库验证（如计划适用）

计划「验证命令 → 数据库验证」小节存在且已填写（非占位符）→ 执行其中的命令，输出按「证据落盘」约定 tee -a 落盘；小节不存在 → 跳过本级别，报告中记 N/A。

### Level 6：浏览器验证（如计划适用）

计划「验证命令 → 浏览器验证」小节存在且已填写（非占位符）→ 按下述流程执行；小节不存在 → 跳过本级别，报告中记 N/A。

复用 Level 4 HTTP 形态的服务器脚手架，端口与健康检查取自本小节的「端口」「健康检查路径」配置（健康检查路径为「无」时用 TCP 探活）：

1. 启动计划中的开发服务器命令，等待就绪。
2. `curl` 采集证据：关键页面（至少入口路由）的 HTTP 状态码与页面 `<title>`，全部 tee -a 落盘（round 标识同上）。
3. 按脚手架清理逻辑关停服务器。

本级别可自动化的部分到「服务可启动、关键页面可访问」为止；「Feature works as designed」的设计符合性判断无法自动化——报告中固定标注：自动化探活通过，设计符合性需人工确认。

**检查点**：全部验证级别通过（Level 5/6 视计划适用性）。零错误。

### 终态快照

全部级别通过后，向验证证据日志追加当前 git 状态快照——/code-review `--prp` 档据此判定证据是否仍然有效：

```bash
{
  echo "## snapshot HEAD: $(git rev-parse HEAD)"
  echo "## snapshot status:"
  git status --porcelain
} >> docs/PRPs/implements/{plan-name}.validation.log
```

---

## Phase 5 — 报告

### 创建实现报告

```bash
mkdir -p docs/PRPs/implements
```

将报告写入 `docs/PRPs/implements/{plan-name}.implement.md`：

```markdown
# 实现报告：[功能名称]

## 摘要
[实现了哪些内容]

## 评估 vs 实际

| 指标 | 预期（计划） | 实际 |
|---|---|---|
| 复杂度 | [from plan] | [actual] |
| 置信度 | [from plan] | [actual] |
| 变更文件数 | [from plan] | [actual count] |

## 完成的任务

| # | 任务 | 状态 | 备注 |
|---|---|---|---|
| 1 | [任务名称] | [done] 已完成 | |
| 2 | [任务名称] | [done] 已完成 | 偏离 — [原因] |

## 验证结果

**验证证据**：`docs/PRPs/implements/{plan-name}.validation.log`

| 级别 | 状态 | exit | 备注 |
|---|---|---|---|
| 静态分析 | [done] 通过 | 0 | |
| 单元测试 | [done] 通过 | 0 | 编写了 N 个测试（M 个 red-proven） |
| 构建 | [done] 通过或 N/A | 0 | |
| 集成测试 | [done] 通过 | 0 | 编写了 N 个测试 |
| 数据库验证 | [done] 通过或 N/A | 0 | 计划无此小节时 N/A |
| 浏览器验证 | [done] 探活通过或 N/A | 0 | 设计符合性需人工确认 |

## 变更文件

| 文件 | 操作 | 行数 |
|---|---|---|
| `path/to/file` | 新建 | +N |
| `path/to/file` | 更新 | +N / -M |

## 与计划的偏差
[列出所有偏差，并说明偏差内容和原因，或填写“无”]

## 遇到的问题
[列出所有问题及其解决方法，或填写“无”]

## 编写的测试

| 测试文件 | 测试数 | 覆盖范围 |
|---|---|---|
| `path/to/test` | N 个测试 | [覆盖范围] |

## 后续步骤
- 通过 `/code-review --prp docs/PRPs/plans/completed/{plan-name}.plan.md` 审查本 phase 变更
```

### 更新 PRD（如适用）

如果本次实现针对 PRD 的某个 phase：
1. 将该 phase 的状态从 `进行中` 更新为 `已完成`
2. 将该 phase 的`PRP 计划`从 `docs/PRPs/plans/{plan-name}.plan.md` 更新为 `docs/PRPs/plans/completed/{plan-name}.plan.md`
3. 添加报告路径作为引用

### 归档计划

```bash
mkdir -p docs/PRPs/plans/completed
mv "$ARGUMENTS" docs/PRPs/plans/completed/
```

**检查点**：报告已创建。PRD 已更新。计划已归档。

---

## Phase 6 — 输出

向用户报告：

```markdown
## 实现完成

- **计划**：[计划文件路径] → 已归档到 completed/
- **分支**：[当前分支名称]
- **状态**：[done] 所有任务完成

### 验证摘要

| 检查项 | 状态 |
|---|---|
| 类型检查 | [done] |
| Lint | [done] |
| 单元测试 | [done]（编写了 N 个，M 个 red-proven） |
| 构建 | [done] |
| 集成测试 | [done]（编写了 N 个） |
| 数据库验证 | [done] 或 N/A |
| 浏览器验证 | [done]（探活）或 N/A |
| Edge Case 测试 | [done] |

### 变更文件
- 创建了 [N] 个文件，更新了 [M] 个文件

### 偏差
[摘要，或填 "None — 完全按计划实现"]

### 产物
- 报告：`docs/PRPs/implements/{plan-name}.implement.md`
- 验证证据：`docs/PRPs/implements/{plan-name}.validation.log`
- 已归档计划：`docs/PRPs/plans/completed/{plan-name}.plan.md`

### PRD 进度（如适用）
| Phase | 状态 |
|---|---|
| Phase 1 | [done] Complete |
| Phase 2 | [next] |
| ... | ... |

## 下一步
运行 `/code-review --prp docs/PRPs/plans/completed/{plan-name}.plan.md` 审查本 phase 变更；

```

---

## 失败处理

### 类型检查失败
1. 仔细阅读错误信息
2. 在源文件中修复类型错误
3. 重新运行 type-check
4. 仅在 clean 后继续

### 测试失败
1. 判断 bug 是在实现部分还是在测试部分
2. 找出根本原因并修复（通常是实现方式的问题）。
3. 重新运行测试
4. 仅在全部通过（green）后继续

### Lint 失败
1. 先运行 auto-fix
2. 如果仍有错误，手动修复
3. 重新运行 lint
4. 仅在 clean 后继续

### Build 失败
1. 通常是类型或 import 问题 — 检查错误信息
2. 修复出问题的文件
3. 重新运行 build
4. 成功后再继续

### 集成测试失败
1. HTTP 服务形态：检查服务器是否正确启动、endpoint/route 是否存在、请求格式是否符合预期
2. 进程内形态：检查测试 harness 的应用装配与依赖注入是否与计划「涉及接缝」一致
3. CLI / 编译装配形态：核对命令参数与断言目标（stdout / exit code / 产物路径）
4. 修复并重新运行本级别

---

## 过程日志（exec log）

本命令 Phase 0-3 的执行过程（环境检测、分支决策、逐任务偏差、修复重试）零落盘——为中断诊断与质量回溯，边执行边追加一份**纯旁路**过程日志。与 Phase 4 的 validation.log 分工：validation.log 承载验证证据（原始输出、机器可核验格式），exec.log 承载过程叙事（人类可读），两者不混写。

### 路径与命名

`docs/PRPs/logs/{plan-name}.exec.log`。`{plan-name}` 从计划文件名推导（与 validation.log 同源）。首次写入时 `mkdir -p docs/PRPs/logs`；文件已存在（流水线中通常已由 /prp-plan 创建，或重跑/续跑）则直接追加，不重建头部——不存在则创建头部（PRD 字段从计划 Metadata 推导，取不到写 N/A）。

### 文件结构

头部 + 追加式条目 + 尾部固定锚点 `<!-- exec-log:end -->`（Edit 追加锚，始终保持在文件末尾）：

```markdown
# Exec: {plan-name}
- PRD: <路径或 N/A> | 创建: prp-implement <yyyymmdd-HHMM>

<!-- exec-log:end -->
```

条目格式（字段按需取用，不强制全填；无内容的行省略）：

```markdown
## [prp-implement <yyyymmdd-HHMM>] Phase N — <主题>
- 动作: <做了什么>
- 决策/依据: <选择与理由>
- 偏差: <与计划的差异 WHAT/WHY>
- 结果: <exit/产物/下一步>
- 指针: <validation.log 轮次 / report 路径 / 文件清单>
```

### 写入时机表

| 时机 | 条目内容 |
|---|---|
| Phase 0 完成后（创建/追加） | 语言栈、包管理器、验证命令映射、验证脚本可用性 |
| Phase 1 后 | plan 路径、任务数、先行验证标注数 |
| Phase 2 分支决策后 | 工作区检查结论、分支名与 base、同步远程结果；**main 脏工作区 STOP 前追加**检查输出摘要 |
| Phase 3 每任务 `[done]` 后 | 任务号/名称、改动文件、先行测试 red→green 结果、与 plan 偏差（WHAT/WHY）、中途错误与修复重试 |
| Phase 4 每轮结束后 | 指针条目：round 标识、命令数、通过/失败概览 +「详见 validation.log」 |
| Phase 5 后 | 归档动作、PRD 更新、implement 报告路径（指针） |

### 写入协议

- **追加用 Edit 工具**：old_string 锚定 `<!-- exec-log:end -->`，新条目插在标记之前；**禁止 shell `>>` 落盘重定向**（会被环境 hook 拦截）。
- **best-effort**：写入失败 → 向用户输出一行警告（含原因）后继续执行；不作为 STOP 条件、不进成功标准。
- **只写不读**：实现与报告生成不读取 exec.log——它是给人读的旁路记录，不是事实源。
- **不记边界**：验证命令原始输出不落盘（validation.log 职责，其机器可核验格式不容叙事混入）；代码 diff 不落盘（git 承载，只记文件清单）；最终结论不重述（implement.md 承载，只记指针）。
- exec.log 位于 `docs/PRPs/**` 产物集内，随 /prp-commit 一并提交、被 /code-review 自动豁免。

---

## 成功标准

- **TASKS_COMPLETE**：计划中的所有任务已执行
- **TYPES_PASS**：零类型错误
- **LINT_PASS**：零 lint 错误
- **TESTS_PASS**：所有测试通过（green），新测试已编写，标注先行验证的测试均有 red 证明
- **BUILD_PASS**：构建成功
- **REPORT_CREATED**：实现报告已保存
- **EVIDENCE_LOGGED**：验证证据日志已落盘（含全部命令条目与终态快照）
- **PLAN_ARCHIVED**：计划已移至 `completed/`

---

## 后续步骤

- 运行 `/code-review --prp docs/PRPs/plans/completed/{plan-name}.plan.md` 审查本 phase 变更；
