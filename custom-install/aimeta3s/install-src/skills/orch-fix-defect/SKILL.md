---
name: orch-fix-defect
description: 编排 bug 修复流程——包括重现缺陷（作为失败的回归测试）、修复缺陷使其通过测试、进行代码审查以、执行 gated commit——将每个阶段委托给匹配的 agent。当现有行为出现故障或错误时，可以使用此方法。
metadata:
  origin: ECC
---

# orch-fix-defect

Actor · action · target: **orch · fix · defect**。这是共享引擎（[`orch-pipeline`](../orch-pipeline/SKILL.md)）之上的 thin wrapper。

## 何时使用

- 某些东西**出错**了：输出错误、报错、crash、regression。
- 与同级技能区分：
  - 行为正确但预期行为有所不同 → `orch-change-feature`。
  - 能力尚不存在 → `orch-add-feature`。

## 操作设置

- **默认 size 下限：** small（通常为 trivial）。
- **Phase mask：** 0 →（仅当根因不明显或为 standard+ 时才执行 light 2）→ 4 → 5 → 6。Research（1）通常跳过。
- **First move（phase 4）：** 将 bug 复现为一个**新的失败**测试（回归测试），然后修复直到测试通过（green）。先证明 bug 存在，是区分 fix 与 tweak 的关键。

## 工作原理

1. 使用上述设置运行 `orch-pipeline` 引擎。
2. 如果根因不明确，在 red 测试之前用 `code-explorer` 界定范围；将构建中断并升级至 `build-error-resolver` / `/build-fix`。
3. 在 **Gate 1**（仅当产生了 plan 时）和 **Gate 2**（pre-commit）处停下。
4. 如果缺陷涉及 security trigger，则加入 `security-reviewer`。

## 示例

```
orch-fix-defect: poller crashes on empty NWS response
→ write failing test reproducing the crash 
→ fix to green
→ code-review 
→ commit  [GATE 2: confirm]   (commit: fix:)
```
