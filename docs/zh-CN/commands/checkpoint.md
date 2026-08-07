---
description: 在运行验证检查后创建、验证或列出工作流检查点。
---

# 检查点命令

在你的工作流中创建或验证检查点。

## 用法

`/checkpoint [create|verify|list] [name]`

## 创建检查点

创建检查点时：

1. 运行 `/verify quick` 确保当前状态干净
2. 用检查点名称创建一个 git stash 或 commit
3. 将检查点记录到 `.claude/checkpoints.log`：

```bash
echo "$(date +%Y-%m-%d-%H:%M) | $CHECKPOINT_NAME | $(git rev-parse --short HEAD)" >> .claude/checkpoints.log
```

4. 报告检查点已创建

## 验证检查点

对照检查点验证时：

1. 从日志中读取检查点
2. 将当前状态与检查点比较：
   - 自检查点以来新增的文件
   - 自检查点以来修改的文件
   - 当前与当时的测试通过率
   - 当前与当时的覆盖率

3. 报告：
```
CHECKPOINT COMPARISON: $NAME
============================
Files changed: X
Tests: +Y passed / -Z failed
Coverage: +X% / -Y%
Build: [PASS/FAIL]
```

## 列出检查点

显示所有检查点及其：
- 名称
- 时间戳
- Git SHA
- 状态（current、behind、ahead）

## 工作流

典型的检查点流程：

```
[Start] --> /checkpoint create "feature-start"
   |
[Implement] --> /checkpoint create "core-done"
   |
[Test] --> /checkpoint verify "core-done"
   |
[Refactor] --> /checkpoint create "refactor-done"
   |
[PR] --> /checkpoint verify "feature-start"
```

## 参数

$ARGUMENTS:
- `create <name>` - 创建命名检查点
- `verify <name>` - 对照命名检查点验证
- `list` - 显示所有检查点
- `clear` - 删除旧检查点（保留最近 5 个）
