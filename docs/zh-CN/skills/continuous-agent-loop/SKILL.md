---
name: continuous-agent-loop
description: 用于持续 autonomous agent loop 的模式，涵盖 quality gates、evals 与恢复控制。
metadata:
  origin: ECC
---

# Continuous Agent Loop

这是 v1.8+ 的规范 loop skill 名称。它取代了 `autonomous-loops`，同时在一个版本内保持兼容。

## Loop 选择流程

```text
Start
  |
  +-- 需要严格的 CI/PR 控制？ -- 是 --> continuous-pr
  |
  +-- 需要 RFC 分解？ -- 是 --> rfc-dag
  |
  +-- 需要探索式并行生成？ -- 是 --> infinite
  |
  +-- 默认 --> sequential
```

## 组合模式

推荐的生产技术栈：
1. RFC 分解（`ralphinho-rfc-pipeline`）
2. quality gates（`plankton-code-quality` + `/quality-gate`）
3. eval loop（`eval-harness`）
4. session 持久化（`nanoclaw-repl`）

## 失败模式

- loop 空转且没有可衡量的进展
- 在相同根因下反复重试
- merge queue 停滞
- 无限制的升级导致成本漂移

## 恢复

- 冻结 loop
- 运行 `/harness-audit`
- 将范围缩小到失败的单元
- 使用明确的验收标准重放
