---
description: 编排修复 bug 的流程——以失败的 regression test 复现、修复至 green、审查、gated commit。是 orch-fix-defect skill 的包装器。
---

# /orch-fix-defect

手动启动 **orch-fix-defect** orchestrator：用一个 red test 证明 bug，然后修复至 green。

## 用法

```
/orch-fix-defect <what is broken>
```

示例：

```
/orch-fix-defect poller crashes on empty NWS response
/orch-fix-defect login returns 500 when email has a plus sign
```

## 它做什么

以 `$ARGUMENTS` 作为请求调用 `orch-fix-defect` skill。该 skill（通过共享的 `orch-pipeline` 引擎）将：

1. 分类规模（默认下限：small，通常为 trivial）；若根本原因不明确，用 `code-explorer` 排查。
2. **编写一个新的失败的 regression test** 来复现 bug，然后修复直至它变 green。（先证明 bug 存在，这才让它成为修复，而非微调。）
3. `code-reviewer`（若缺陷位于敏感路径，加上 `security-reviewer`）。
4. 以 conventional `fix:` commit 形式提交。→ **GATE 2**（提交前确认）。

仅当行为**已损坏/错误**时才使用此命令——不适用于有意变更（`/orch-change-feature`）或新增能力（`/orch-add-feature`）。

若 `$ARGUMENTS` 为空，请要求用户描述该缺陷。
