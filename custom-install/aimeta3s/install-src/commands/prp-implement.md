---
description: 执行实现计划，并进行严格的循环验证
argument-hint: <path/to/plan.md>
---

> 属于 PRP 工作流系列的一部分。

# PRP Implement

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

读取计划文件：

```bash
cat "$ARGUMENTS"
```

**计划校验**——先校验，全部通过后才提取章节：

1. **文件存在性**：计划文件不存在 → 停止，向用户提示：

```
错误：计划文件未找到：<路径>。
请确认路径是否正确；若尚未创建计划，可先运行 /prp-plan <feature-description> 创建。
```

2. **章节完整性**：以下内容是后续步骤的必要输入，任一缺失、为空或仍为未填写的占位符，都会导致对应步骤无法执行，逐项核对：

| 必需内容 | 缺失时无法执行的步骤 |
|---|---|
| 摘要、Patterns to Mirror、要更改的文件、验收标准 | Phase 1 章节提取 |
| 分步任务（每项含 ACTION / IMPLEMENT / MIRROR / IMPORTS / GOTCHA / 验证 字段） | Phase 3 逐任务执行 |
| 测试策略（含 单元测试 / 集成测试 / Edge Cases 检查清单 小节） | Phase 3 先行测试判定、Phase 4 Level 2 / 4 / 5 |
| 验证命令（含 静态分析 / 单元测试 / 集成测试 / 完整测试套件 小节） | Phase 4 Level 1–4、Level 6 |

「测试策略 → 集成测试」声明豁免（含类别与理由）时不视为缺失，其下游「验证命令 → 集成测试」因此标 N/A 同样不视为缺失，但需核对计划「手动验证」清单已包含该集成验证——核对不通过时视同计划缺少必需内容，并入下方的停止路径。未豁免时，「验证命令 → 集成测试」内的 **运行形态** 与 **与完整测试套件的关系** 为必填勾选项，任一未勾选视同该小节未填写；且命令块须与勾选形态严格双向对应——每个已勾选形态至少有一条以该形态标注的命令行（HTTP 服务形态须同时含 dev server 行与测试命令行），命令块中不得残留未勾选形态的命令行，任一不满足同样视同该小节未填写。「数据库验证」「浏览器验证」为可选小节，不列入校验。

校验不通过 → 停止，向用户列出缺失或未填写的内容清单：

```
错误：计划缺少或未填写以下必需内容：<清单>。
计划可能由旧版 /prp-plan 模板生成或存在未填写项。
请运行 /prp-plan 重新生成，或手动补齐后再执行 /prp-implement。
```

**校验失败仅向用户提示并停止**——不要自动调用 /prp-plan 或替用户修改计划，由用户决定如何补齐。

校验通过后，从计划中提取以下章节：
- **摘要** — 要构建什么
- **Patterns to Mirror** — 需遵循的 Code conventions
- **要更改的文件** — 要创建或修改的哪些内容
- **分步任务** — 要执行哪些任务，及执行顺序
- **验证命令** — 如何验证正确性
- **验收标准** — 完成的定义

**检查点**：计划已加载。所有章节已识别。任务已提取。

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
| 在 feature branch 上 | 使用当前分支 |
| 在 main 上，工作区干净 | 创建 feature branch：`git checkout -b feat/{plan-name}` |
| 在 main 上，工作区有改动 | **STOP** — 先让用户 stash 或 commit |
| 在用于此功能的 git worktree 中 | 使用该 worktree |

### 同步远程仓库

```bash
git pull --rebase origin $(git branch --show-current) 2>/dev/null || true
```

**检查点**：在正确的分支上。工作区就绪。远程已同步。

---

## Phase 3 — 执行

按顺序处理计划中的每个任务。

### 逐任务循环

对于 **分步任务** 中的每个任务：

1. **阅读 参照模式 引用** — 打开并阅读任务 MIRROR 字段中的参考的模式文件。编写代码前先理解 convention。

2. **先行测试（条件执行）** — 若计划「测试策略」中与本任务关联的测试标注了 **先行验证**，先编写该测试并运行，确认其**失败**（记录失败输出作为 red 证明），然后才进入实现。实现完成后同一测试必须通过。未标注的任务跳过此步。该判定仅适用于「单元测试」表的用例；集成测试表无先行验证列，一律在 Level 4 实现后编写。

3. **实现** — 严格按照模式编写代码。应用 GOTCHA 警告。使用指定的 IMPORTS。

4. **立即验证** — 在**每一次**文件变更后：
   ```bash
   # 运行 type-check（根据项目调整命令）
   [阶段 0 中的 type-check 命令]
   ```
   如果 type-check 失败 → 在进入下一个文件前先修复错误。

5. **跟踪进度** — 记录：`[done] 任务 N: [任务名称] — 完成`

### 处理偏差

如果实施过程中必须偏离计划：
- 记录改变了 **什么（WHAT）**
- 记录 **为什么（WHY）** 改变
- 继续采用修正后的方法
- 这些偏差将被记录在报告中

**检查点**：所有任务已执行。偏差已记录。

---

## Phase 4 — 验证

运行计划中的所有验证级别。每个级别的问题都必须修复后才能继续下一步。

### Level 1：静态分析

```bash
# 类型检查 — 必须零错误
[项目的 type-check 命令]

# Linting — 尽可能自动修复
[项目的 lint 命令]
[项目的 lint-fix 命令]
```

如果 auto-fix 后仍有 lint 错误，手动修复。

### Level 2：单元测试

按计划中 测试策略 的规定编写行为级测试。

```bash
[受影响区域的测试命令]
```

- 每个标注 **先行验证** 的行为至少有一个测试，且该测试在 Phase 3 已见证过失败（red 证明在案）
- 其余测试覆盖计划 测试策略 表与 Edge Cases 检查清单所列的行为
- 断言**可观察行为**（输入 → 输出、状态变化），不断言实现细节
- 如果测试失败 → 修复实现（而不是测试，除非测试本身有误）

### Level 3：构建检查

```bash
[project build command]
```

构建过程必须成功，且无任何错误。

### Level 4：集成测试

本级别默认必须执行。判定与执行：

1. **豁免判定** — 计划「测试策略 → 集成测试」声明**豁免**（含类别与理由）→ 跳过本级别，报告标 N/A（注明豁免类别，供 /code-review --prp 核验），并核对该集成验证已写入计划「手动验证」清单——核对不通过则停止并提示用户补齐计划的手动验证清单（与 Phase 1 一致，不代为修改）。
2. **编写用例** — 读取计划「测试策略 → 集成测试」。按表执行：新增 → 将测试写入「测试文件」列的路径；调整/删除 → 更新或移除该文件中的对应既有测试；注明“无变化” → 跳过编写，仍须运行既有集成测试防回归。执行后核对新用例已被命令实际运行——以用例名过滤器运行集成测试命令，确认输出中出现新增用例的标识；若输出显示 0 个匹配，视为测试文件不在命令收集范围，修正文件路径或命令后重跑（防止被静默跳过）。测试命令不支持用例名过滤器（如自定义脚本）时，降级为按测试文件路径运行该命令，并核对输出中的用例数/用例名与新增一致。
3. **按运行形态执行** — 每个已勾选形态，执行计划命令块中以该形态标注的命令行（勾选多种形态时，各形态的命令分别执行）：

**HTTP 服务形态** — 用计划中的值替换占位符，走服务器脚手架。以下脚本须**整段一次执行**，禁止逐行拆跑（`TEST_EXIT=$?` 依赖测试命令紧邻）：

```bash
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

计划健康检查路径为“无”时，用端口探测替代 curl 健康检查（如 `nc -z localhost [计划中的端口]`）。注意端口探测仅证明有进程监听、不证明应用就绪——若测试批量出现连接拒绝/路由 404 类失败，优先怀疑就绪判定过早（可调大「启动等待」），并建议项目补健康端点后改回健康检查。

**进程内 / CLI / 编译装配形态** — 直接运行计划命令块中以对应形态标注的命令行，无需服务器管理。

### Level 5：Edge Case 测试

遍历计划中 测试策略 检查清单上的 edge cases

判定某 edge case 是否为集成级用例的标准：其验证需跨越本次变更涉及的接缝（模块边界 / 进程边界 / 外部资源）即属集成级（如 并发访问、网络故障）。本级别若新增了此类用例且计划勾选了「独立命令」，须以用例名过滤器（或按测试文件路径）重跑 Level 4 的集成测试命令、仅覆盖这些新增用例——完整套件（Level 6）不包含独立命令，不会覆盖它们；无需全量重跑 Level 4。

### Level 6：全量回归

所有新测试（含 Level 5 的 edge case 测试）编写完毕后，运行计划「验证命令 → 完整测试套件」中的命令：

```bash
[计划中的完整测试套件命令]
```

要求零回归——任何既有测试失败都必须修复后重跑本级别。

若计划的集成测试已包含于完整测试套件，本级别会再次运行它——这是预期行为：最终闸门必须在完整套件上得出零回归结论，不引用其他级别的结果跳过。

**检查点**：全部 6 个验证级别通过。零错误。

---

## Phase 5 — 报告

### 创建实现报告

```bash
mkdir -p .claude/PRPs/reports
```

将报告写入 `.claude/PRPs/reports/{plan-name}-report.md`：

```markdown
# 实现报告：[功能名称]

## 摘要
[实施了哪些内容]

## 评估 vs 实际

| 指标 | 预期（计划） | 实际 |
|---|---|---|
| 复杂度 | [来自计划] | [实际] |
| 置信度 | [来自计划] | [实际] |
| 变更文件数 | [来自计划] | [实际数量] |

## 已完成任务

| # | 任务 | 状态 | 备注 |
|---|---|---|---|
| 1 | [任务名称] | [done] 已完成 | |
| 2 | [任务名称] | [done] 已完成 | 偏离 — [原因] |

## 验证结果

| 级别 | 状态 | 备注 |
|---|---|---|
| 静态分析 | [done] 通过 | |
| 单元测试 | [done] 通过 | 编写了 N 个测试（M 个 red-proven） |
| 构建 | [done] 通过 | |
| 集成测试 | [done] 通过 | 或 N/A（豁免：<类别>）——豁免时须注明计划声明的类别 |
| Edge Case 测试 | [done] 通过 | |
| 全量回归 | [done] 通过 | 零回归 |
| 手动验证 | [done] 已由用户确认 / 待人工执行 / N/A | 计划「手动验证」清单非空时必填：带出清单摘要（无论集成测试是否豁免）；清单为空填 N/A。手动验证由用户执行，AI 不得代替勾选 |

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
- [ ] 通过 `/code-review --prp {plan-name}` 审查本 phase 变更
- [ ] 通过 `/prp-commit` 提交
- [ ] 如果 PRD 还有「待开始」的 phase 时，运行 `/prp-plan <PRD路径>` 进入下一 phase
- [ ] 如果所有 phase 完成后，通过 `/prp-pr` 创建 PR
```

### 更新 PRD（如适用）

如果本次实现针对 PRD 的某个 phase：
1. 将该 phase 的状态从 `进行中` 更新为 `已完成`
2. 添加报告路径作为引用

### 归档计划

```bash
mkdir -p .claude/PRPs/plans/completed
mv "$ARGUMENTS" .claude/PRPs/plans/completed/
```

**检查点**：报告已创建。PRD 已更新。计划已归档。

---

## Phase 6 — 输出

向用户报告：

```
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
| 集成测试 | [done] 或 N/A（豁免：<类别>） |
| Edge Case 测试 | [done] |
| 全量回归 | [done] 零回归 |
| 手动验证 | 待人工执行：<清单摘要> / 已由用户确认 / N/A（计划无手动验证项） |

### 变更文件
- 创建了 [N] 个文件，更新了 [M] 个文件

### 偏差
[摘要，或填 "None — 完全按计划实现"]

### 产物
- 报告：`.claude/PRPs/reports/{name}-report.md`
- 已归档计划：`.claude/PRPs/plans/completed/{name}.plan.md`

### PRD 进度（如适用）
| Phase | 状态 |
|---|---|
| Phase 1 | [done] Complete |
| Phase 2 | [next] |
| ... | ... |

> 下一步：运行 `/code-review --prp {plan-name}` 审查本 phase 变更，再运行 `/prp-commit` 提交。如果 PRD 还有「待开始」phase，运行 `/prp-plan .claude/PRPs/prds/{name}.prd.md` 进入下一 phase；如果所有 phase 完成后，运行 `/prp-pr` 创建 pull request。
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

### 全量回归失败
1. 确认失败的是既有测试（回归）还是新测试遗漏
2. 若是回归 → 定位本次变更引入的破坏并修复实现
3. 重跑完整测试套件
4. 仅在零回归后继续

---

## 成功标准

- **TASKS_COMPLETE**：计划中的所有任务已执行
- **TYPES_PASS**：零类型错误
- **LINT_PASS**：零 lint 错误
- **TESTS_PASS**：所有测试通过（green），新测试已编写，标注先行验证的测试均有 red 证明
- **MANUAL_VERIFICATION_ESCALATED**：计划「手动验证」清单非空时（含集成豁免降级写入的项），清单摘要已在报告与输出中带出提醒（集成豁免时并注明豁免类别）
- **REGRESSION_PASS**：完整测试套件零回归
- **BUILD_PASS**：构建成功
- **REPORT_CREATED**：实现报告已保存
- **PLAN_ARCHIVED**：计划已移至 `completed/`

---

## 后续步骤

- 运行 `/code-review` 审查本 phase 变更
- 运行 `/prp-commit` 用描述性信息提交本 phase 变更
- 如果 PRD 还有「待开始」phase，运行 `/prp-plan .claude/PRPs/prds/{name}.prd.md`（会自动定位下一个待开始 phase）进入下一 phase
- 所有 phase 完成后，运行 `/prp-pr` 创建 pull request
