---
name: orch-fix-defect
description: 编排 bug 修复流程——将其复现为失败的 regression test，修复至 green，进行 review 并执行 gated commit——将每个阶段委托给匹配的 ECC agent。当现有行为出错或不正确时使用。
metadata:
  origin: ECC
---

# orch-fix-defect

执行者 · 动作 · 目标：**orch · fix · defect**。这是对
[`orch-pipeline`](../orch-pipeline/SKILL.md) 中共享引擎的轻量封装。

## 何时使用

- 某些东西**出错**了：输出错误、报错、crash、regression。
- 与同级技能区分：
  - 行为正确但你希望有所不同 → `orch-change-feature`。
  - 能力尚不存在 → `orch-add-feature`。

## 操作设置

- **默认 size 下限：** small（通常很 trivial）。
- **Phase mask：** 0 →（仅当根因不明显或为 standard+ 时才执行 light 2）→
  4 → 5 → 6。Research（1）通常跳过。
- **第一步（phase 4）：** 将 bug 复现为一个**新的失败**测试
  （regression test），然后修复直到测试变 green。先证明 bug 存在，是区分修复与微调的关键。

## 工作原理

1. 使用上述设置运行 `orch-pipeline` 引擎。
2. 如果根因不明确，在 red 测试之前用 `code-explorer` 界定范围；
   将 build 中断转交给 `build-error-resolver` / `/build-fix`。
3. 在 **Gate 1**（仅当产生了 plan 时）和 **Gate 2**（pre-commit）处停下。
4. 如果缺陷位于安全敏感路径，则加入 `security-reviewer`。

## 示例

```
orch-fix-defect: poller crashes on empty NWS response
→ write failing test reproducing the crash → fix to green
→ code-review → commit  [GATE 2: confirm]   (commit: fix:)
```
