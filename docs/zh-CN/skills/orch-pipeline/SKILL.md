---
name: orch-pipeline
description: orch-* skill 家族的共享 orchestration 引擎。定义了带 gate 的 Research-Plan-TDD-Review-Commit pipeline、size 分类器、agent 映射表，以及 orch-* 操作 skill 所委托的两道人工 gate。通常不会被直接调用。
metadata:
  origin: ECC
---

# Orchestrator Pipeline（共享引擎）

`orch-*` skill 都是薄包装。它们不重新实现任何工作——而是对请求进行分类，选择 *本* pipeline 的哪些阶段运行，并将每个阶段委托给既有的 ECC agent 或 command。本文件就是那条 pipeline。

> 请调用某个操作 skill（`orch-add-feature`、`orch-fix-defect`、…），而不是直接调用本引擎。本文件是它们所指向的参考。

## 何时使用

- 每当某个 `orch-*` 操作 skill 运行时，会被间接加载。
- 仅当向家族中新增操作，或调整共享的阶段、gate 或 agent 映射表时，才直接阅读本文件。

## 操作家族

| Skill | Operation | Trigger | 首步动作 |
|-------|-----------|---------|------------|
| `orch-add-feature` | feature | 能力尚不存在 | research + 规划一个新 slice |
| `orch-change-feature` | tweak | 已可工作，但期望行为不同 | 修改既有行为 *及其测试* |
| `orch-fix-defect` | fix | 已损坏；行为错误 | 先以失败测试复现，再修复 |
| `orch-refine-code` | refactor | 行为不变，结构改善 | 在保持测试通过的前提下重构 |
| `orch-build-mvp` | mvp | 从 design/spec 文档 bootstrap | 消化文档 → 垂直 slice |

> 这些包装 **组合** 既有的 ECC command，而非取代它们：`/feature-dev`、`/plan`、`/code-review`、`/build-fix`、`/refactor-clean` 和 `/gan-build`，再加上 `tdd-workflow` skill。orch-* 家族在此之上添加了共享的 size 分类器和两道 gate，从而用一套统一框架一致地覆盖全部五种操作。

## Step 0 — 分类 size（right-sizing）

Ceremony 随 blast radius 而缩放。按三个信号给请求打分，取任一信号所达到的 **最高** tier，并用一行陈述结果，以便用户覆盖：

| Tier | 涉及文件 | 新 dependency / contract | 设计歧义 | 运行阶段 |
|------|---------------|---------------------------|------------------|-----------------|
| trivial | 1 个，几行 | 无 | 无——改动显而易见 | 4 → 5 → 6 |
| small | 1 个文件 / 1 个函数 | 无 | 读代码后即清晰 | (1 轻量) → 4 → 5 → 6 |
| standard | 2–5 个文件 | 可能有新的内部 module | 需做一个真实抉择 | 1 → 2 → 4 → 5 → 6 |
| large | 多个 / 横切 | 新的 external dep、public API 或 spec 文档 | 多个未决问题 | 1 → 2 → (3) → 4 → 5 → 6 |

Phase 0（Intake）始终运行，未显示在上面的运行阶段列中。裁定规则：凡是触及 security trigger（见下文）或 public API / contract 的，无论文件数量多少，都 **至少** 为 standard。

## 阶段

每个阶段都进行委托——而非内联地完成工作。

- **0. Intake** — 复述请求。对于 `orch-build-mvp`，阅读 spec/design 文档并提取范围、已锁定决策和 feature 列表。
- **1. Research & Reuse** — 按 `rules/common/development-workflow.md`：`gh search repos` / `gh search code`，然后 Context7 / 厂商文档，然后 package registry，然后 Exa。优先采用已验证的实现，而非全新代码。
- **2. Plan** — 委托给 `planner` agent（结构决策则用 `architect` / `code-architect`）。输出一个按 thin vertical slice 排序的 `task_list`。→ **GATE 1.**
- **3. Scaffold** — 仅限 `orch-build-mvp`：搭建起第一个 end-to-end slice。
- **4. Implement (TDD)** — 通过 `tdd-guide` agent（或 `tdd-workflow` skill）驱动每个 task：red → green → refactor。遵守操作的首步动作规则。
- **5. Review** — `code-reviewer` agent / `/code-review`。每当 diff 触及 security trigger（见下文）时，追加 `security-reviewer`。
- **6. Commit** — conventional commits（`feat:` / `fix:` / `refactor:` / …），每个逻辑块一个 commit。→ **GATE 2.**

## 两道 gate

本家族为 **gated 而非 autonomous**：

1. **GATE 1 —— Plan 之后。** 呈现 `task_list`；在用户批准之前，不要编写实现代码。
2. **GATE 2 —— Commit 之前。** 呈现 diff 摘要和拟定的 commit message；在用户确认之前，不要 commit。

两道 gate 之间的所有步骤不停顿地流转。

## Agent / command 映射表

| 阶段 | 首选 | 回退 / 升级 |
|-------|---------|----------------------|
| Intake / 理解 | `code-explorer` | 在 tweak、fix 或 refactor 之前追踪既有路径 |
| Plan | `planner` | 结构性决策时用 `architect`、`code-architect` |
| Implement | `tdd-guide`（或 `tdd-workflow` skill） | build 中断时用 `build-error-resolver` / `/build-fix` |
| Review | `code-reviewer` / `/code-review` | 语言 reviewer（`python-reviewer`、`typescript-reviewer`、…） |
| Security | `security-reviewer` | — |
| MVP 内部循环 | `/gan-build "<brief>" --skip-planner` | 驱动 `gan-generator` → `gan-evaluator`；调优 `--max-iterations` / `--pass-threshold` |

根据 repo 匹配对应的语言 reviewer（参见 repo 自身的 `CLAUDE.md`）。

## Security-review trigger

当 diff 触及以下任一项时，引入 `security-reviewer`：authentication 或 authorization、用户输入处理、数据库查询、文件系统路径、external API 调用、密码学、或 secrets / credentials。（依据 `rules/common/security.md`。）

## Handoff artifact

本 pipeline 不携带任何隐藏状态——规划文档 *就是* handoff：

- `task_list`（来自 Plan）驱动 Implement 循环。
- 较大的工作可能还会按 `rules/common/development-workflow.md` 在 repo 的 `docs/` 下产出 PRD / architecture / system_design。
- Review 的发现（CRITICAL / HIGH）必须在 Gate 2 之前解决。

## Verification

- 已陈述 size tier 并与工作相匹配
- Gate 1（plan）与 Gate 2（commit）均被遵守
- 当且仅当触及 security trigger 时，`security-reviewer` 才运行
- commit 为 conventional 且范围限定于单一逻辑变更
- 新增 / 变更的行为有测试；coverage ≥ 80%（依据 `rules/common/testing.md`）
