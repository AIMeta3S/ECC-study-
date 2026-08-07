---
description: 根据复杂度、风险和预算，为当前任务推荐最佳的 model tier。
---

# Model Route 命令

根据复杂度和预算，为当前任务推荐最佳的 model tier。

## 用法

`/model-route [task-description] [--budget low|med|high]`

## 路由 Heuristic

- `haiku`：deterministic、低风险的机械性改动
- `sonnet`：实现和 refactor 的默认选择
- `opus`：架构、深度 review、不明确的需求

## 要求的输出

- 推荐的 model
- 置信度
- 为何该 model 适用
- 首次尝试失败时的 fallback model

## 参数

$ARGUMENTS:
- `[task-description]` 可选自由文本
- `--budget low|med|high` 可选
