---
name: ecc-recipes
description: "将所描述的工作流映射到正确的 ECC command-group（含 run-order 与 stop condition），并浏览所有 command-group recipe 家族。在扁平的 command catalog 之上叠加 family-grouping + run-order + when-to-stop 这一层。仅供参考。当用户说“哪个 command 用于 X”、“哪个 command group 运行 X”、“显示 ECC recipes”、“列出 ECC pipelines”或“如何用 ECC 运行工作流”时触发。当用户希望直接执行任务、需要单个命令的深度文档（使用 ecc-guide）或希望重写草稿 prompt（使用 prompt-optimizer）时不触发。"
argument-hint: <工作流描述 | 空=列出全部>
origin: community
author: KyawZinLatt
version: "1.0.0"
---

# ECC Recipes

作为“哪一组 ECC slash-commands 运行我的工作流、按什么顺序、何时停止”的统一入口。同时浏览所有 command-group recipe 家族。

填补两个现有 skill 之间的空白：

- `ecc-guide` —— 列出命令及文档阅读位置，但是以扁平 catalog 形式呈现。
- `prompt-optimizer` —— 将任务匹配到组件，但输出的是单个 prompt，
  而非带 run-order 和 stop condition 的多命令组合。

本 skill 新增：**family grouping + run-order + stop condition。**

## 何时激活

- “哪个 command group 用于 <工作流>？”
- “构建 MVP / 修复 defect / refactor 的命令序列是什么？”
- “显示所有 ECC command-group recipes”（catalog 模式）
- “ECC 有多少条 workflow pipelines？”
- 用户带或不带描述调用 `/ecc-recipes`。

### 不要在以下情况使用

- 用户希望立即完成任务 —— 路由到实际命令，而不是描述它。
- 用户需要单个命令的深度文档 —— 使用 `ecc-guide`。
- 用户希望重写草稿 prompt —— 使用 `prompt-optimizer`。

## 核心原则

**从当前文件作答，而非凭记忆。** 命令集会变化；切勿硬编码数量或成员列表。每次运行都读取实时的 `commands/` 目录，然后分类为各个 family。

### 实时读取

解析 commands 目录（第一个存在的），然后列出名称：

```bash
for D in \
  "$HOME"/.claude/plugins/marketplaces/ecc/commands \
  "$HOME"/.claude/plugins/cache/ecc/ecc/*/commands \
  ./commands \
  ./.claude/commands \
  "$HOME"/.claude/commands; do
  [ -d "$D" ] && CMD_DIR="$D" && break
done
[ -z "${CMD_DIR:-}" ] && { echo "No ECC commands directory found."; return 1; }
find "$CMD_DIR" -maxdepth 1 -name '*.md' -exec basename {} .md \; | sort
```

如果存在 `manifests/install-*.json`，可选读取以获得更丰富的分组。使用所需的最小读取集合。

## Family 分类（按 prefix）

按 leading prefix 对命令名分组；已知的 singleton 手动映射。Family 实时派生 —— 下表是*分类规则*，而非冻结的列表。

| Family prefix | Recipe 含义 | 典型 run-order |
|---|---|---|
| `orch-*` | 按任务类型进行 gated Research、Plan、TDD、Review、Commit | 按任务类型选一个 orch-*；它运行自己的内部阶段 |
| `multi-*` | multi-model 工作流 | `multi-plan` 然后 `multi-execute` 然后审查（或 `multi-workflow` 端到端） |
| `prp-*` | 从 PRD 到 plan、到 implement、到 PR 的 pipeline | `prp-prd` 然后 `prp-plan` 然后 `prp-implement` 然后 `prp-commit` 然后 `prp-pr` |
| `epic-*` | 大型多单元 epic，并行 | `epic-decompose` 然后 `epic-claim` 然后 `epic-validate` 然后 `epic-review` 然后 `epic-unblock` 然后 `epic-sync` 然后 `epic-publish` |
| `loop-*` | 受管的 autonomous loop 与监控 | `loop-start <pattern>` 然后用 `loop-status` 观察 |
| `gan-*` | generator 与 evaluator 循环 | `gan-build`（代码）或 `gan-design`（UI）；自循环 |
| `*-build` / `*-review` / `*-test` | 按语言的 CI 三件套 | `<lang>-test`（TDD）然后 `<lang>-build`（修复）然后 `<lang>-review` |
| `hookify-*` | behavior-hook 管理 | `hookify` 然后 `hookify-list` 然后 `hookify-configure` |
| `learn` / `instinct-*` / `evolve` / `promote` / `prune` | continuous-learning | `learn` 然后 `instinct-status` 然后 `evolve` 然后 `promote` |
| singletons | `santa-loop`、`plan`、`plan-prd`、`pr`、`code-review`、`checkpoint` 等 | 独立使用或作为各组之间的粘合 |

任何不匹配 prefix 规则的命令 → 列在 **singletons** 下并附其一行描述。

## 工作原理

```
1. 从 CMD_DIR 实时读取命令名。
2. 按 prefix 和 singleton 映射分类为各个 family。
3. 如果给出了工作流描述 -> MATCH 模式。
   如果没有 -> CATALOG 模式。
4. 仅供参考：打印计划。绝不运行匹配到的命令。
```

### Catalog 模式（无描述）

输出 family 表格：每个 family、成员数量、成员、一行含义、典型 run-order。末尾给出命令总数，并提示用户描述一个工作流以获得匹配的 recipe。

### Match 模式（给出描述）

1. 用一句话复述该工作流。
2. 挑选最佳的 1-2 个 family；每个用一行说明原因。
3. **Run-order 块** —— 匹配 family 的确切命令序列。
4. **Stop condition** —— 始终明确（max-runs、completion-signal、review-passes 或 single-shot）。对于 autonomous loops，警告订阅/credits 消耗并建议加 backstop 限制。
5. **阅读位置** —— `commands/<name>.md` 路径加上 `/ecc-guide <name>`。

## 输出模板（match 模式）

```
工作流：<一句话复述>

最佳匹配：<family> —— <原因>
（备选：<family> —— <原因>）

Run-order:
  /<cmd1>   # 作业
  /<cmd2>   # 作业
  /<cmd3>   # 作业
  STOP when: <条件>
  警告（仅 autonomous loops）：无界 loop 会消耗订阅/credits ——
  在完成信号之外加上 max-iteration 或 max-cost 的 backstop 兜底。

完整文档：
  commands/<cmd1>.md   （或：/ecc-guide <cmd1>）
```

## 示例

**Catalog：** `/ecc-recipes` → 打印 family 表格和总数。

**Match：** `/ecc-recipes 先整体规划一个应用，然后带 adversarial 审查自动构建直到完成` → 最佳匹配：`loop-*`（autonomous）包裹 `gan-*` 或 `santa-loop`（adversarial）。Run-order：`plan-prd` 然后 `loop-start rfc-dag --mode safe` 然后监控 `loop-status`；当所有单元连续 N 次通过审查时 STOP（加上 max-iteration backstop 以限制消耗）。

**Match：** `/ecc-recipes 修复我的 Go 服务里的 bug` → 最佳匹配：`orch-fix-defect`（复现、修复、审查、提交）。备选：`go-test` 然后 `go-build` 然后 `go-review`。STOP：回归测试通过且审查通过。

## 非目标

- 不是执行器 —— 仅供参考。
- 不是单命令深度文档 —— 那是 `ecc-guide` 的职责。
- 不是 prompt 重写 —— 那是 `prompt-optimizer` 的职责。
- 切勿硬编码命令数量或成员列表 —— 始终实时读取。
