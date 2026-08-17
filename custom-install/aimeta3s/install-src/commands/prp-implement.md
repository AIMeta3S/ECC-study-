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

从计划中提取以下章节：
- **摘要** — 要构建什么
- **Patterns to Mirror** — 需遵循的 Code conventions
- **要更改的文件** — 要创建或修改的哪些内容
- **分步任务** — 要执行哪些任务，及执行顺序
- **验证命令** — 如何验证正确性
- **验收标准** — 完成的定义

如果文件不存在或不是有效的计划：
```
错误：计划文件未找到或无效。
先运行 /prp-plan <feature-description> 创建计划。
```

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

2. **先行测试（条件执行）** — 若计划「测试策略」中与本任务关联的测试标注了 **先行验证**，先编写该测试并运行，确认其**失败**（记录失败输出作为 red 证明），然后才进入实现。实现完成后同一测试必须通过。未标注的任务跳过此步。

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

1. **豁免判定** — 计划「验证命令 → 集成测试」声明**豁免**（含类别与理由）→ 跳过本级别，报告标 N/A，并核对该集成验证已写入计划「手动验证」清单。小节缺失 → 回补计划的集成测试小节后再执行。
2. **编写用例** — 读取计划「测试策略 → 集成测试用例」。有新增用例 → 先编写这些测试（放入计划的集成测试命令可运行的测试文件中）；注明“无新增” → 跳过编写。
3. **按运行形态执行**（计划勾选多种形态时，各形态的命令分别执行）：

**HTTP 服务形态** — 用计划中的值替换占位符，走服务器脚手架：

```bash
# Start server, run tests, stop server
[计划「验证命令 → 集成测试」中的 dev server 命令] &
SERVER_PID=$!

# Wait for server to be ready
SERVER_READY=0
for i in $(seq 1 30); do
  if curl -sf http://localhost:[计划中的端口][计划中的健康检查路径] >/dev/null 2>&1; then
    SERVER_READY=1
    break
  fi
  sleep 1
done

if [ "$SERVER_READY" -ne 1 ]; then
  kill "$SERVER_PID" 2>/dev/null || true
  echo "ERROR: Server failed to start within 30s" >&2
  exit 1
fi

[计划「验证命令 → 集成测试」中的测试命令]
TEST_EXIT=$?

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true

exit "$TEST_EXIT"
```

计划健康检查路径为“无”时，用端口探测替代 curl 健康检查（如 `nc -z localhost [计划中的端口]`）。

**进程内 / CLI / 编译装配形态** — 直接运行 `[计划「验证命令 → 集成测试」中的测试命令]`，无需服务器管理。

### Level 5：Edge Case 测试

遍历计划中 测试策略 检查清单上的 edge cases

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
| 集成测试 | [done] 通过 | 或 N/A |
| Edge Case 测试 | [done] 通过 | |
| 全量回归 | [done] 通过 | 零回归 |

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
| 集成测试 | [done] 或 N/A |
| Edge Case 测试 | [done] |
| 全量回归 | [done] 零回归 |

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
1. 检查服务器是否正确启动
2. 验证 endpoint/route 是否存在
3. 检查请求格式是否符合预期
4. 修复并重新运行

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
