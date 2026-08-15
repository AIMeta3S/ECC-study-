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
- **应遵循的模式** — 需遵循的代码约定
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

1. **阅读 参照模式 引用** — 打开任务 参照模式 字段引用的模式文件。编写代码前先理解约定。

2. **实现** — 严格按照模式编写代码。应用 GOTCHA 警告。使用指定的 IMPORTS。

3. **立即验证** — 在**每一次**文件变更后：
   ```bash
   # 运行 type-check（根据项目调整命令）
   [阶段 0 中的 type-check 命令]
   ```
   如果 type-check 失败 → 在进入下一个文件前先修复错误。

4. **跟踪进度** — 记录：`[done] 任务 N: [任务名称] — 完成`

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

为每个新函数编写测试（按计划中 测试策略 的规定）。

```bash
[project test command for affected area]
```

- 每个函数至少需要一个测试
- 覆盖计划中列出的 edge cases
- 如果测试失败 → 修复实现（而不是测试，除非测试本身有误）

### Level 3：构建检查

```bash
[project build command]
```

构建过程必须成功，且无任何错误。

### Level 4：集成测试（如适用）

```bash
# Start server, run tests, stop server
[project dev server command] &
SERVER_PID=$!

# Wait for server to be ready (adjust port as needed)
SERVER_READY=0
for i in $(seq 1 30); do
  if curl -sf http://localhost:PORT/health >/dev/null 2>&1; then
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

[integration test command]
TEST_EXIT=$?

kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true

exit "$TEST_EXIT"
```

### Level 5：Edge Case 测试

遍历计划中 测试策略 检查清单上的 edge cases

**检查点**：全部 5 个验证级别通过。零错误。

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
| 单元测试 | [done] 通过 | 编写了 N 个测试 |
| 构建 | [done] 通过 | |
| 集成 | [done] 通过 | 或 N/A |
| Edge Case | [done] 通过 | |

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
- [ ] 通过 `/code-review` 审查本 phase 变更
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
| 测试 | [done]（编写了 N 个） |
| 构建 | [done] |
| 集成 | [done] 或 N/A |

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

> 下一步：运行 `/code-review` 审查本 phase 变更，再运行 `/prp-commit` 提交。如果 PRD 还有「待开始」phase，运行 `/prp-plan .claude/PRPs/prds/{name}.prd.md` 进入下一 phase；如果所有 phase 完成后，运行 `/prp-pr` 创建 pull request。
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

---

## 成功标准

- **TASKS_COMPLETE**：计划中的所有任务已执行
- **TYPES_PASS**：零类型错误
- **LINT_PASS**：零 lint 错误
- **TESTS_PASS**：所有测试通过（green），新测试已编写
- **BUILD_PASS**：构建成功
- **REPORT_CREATED**：实现报告已保存
- **PLAN_ARCHIVED**：计划已移至 `completed/`

---

## 后续步骤

- 运行 `/code-review` 审查本 phase 变更
- 运行 `/prp-commit` 用描述性信息提交本 phase 变更
- 如果 PRD 还有「待开始」phase，运行 `/prp-plan .claude/PRPs/prds/{name}.prd.md`（会自动定位下一个待开始 phase）进入下一 phase
- 所有 phase 完成后，运行 `/prp-pr` 创建 pull request
