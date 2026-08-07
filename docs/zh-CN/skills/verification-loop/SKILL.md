---
name: verification-loop
description: "面向 Claude Code 会话的综合验证系统。"
metadata:
  origin: ECC
---

# 验证循环 Skill

面向 Claude Code 会话的综合验证系统。

## 何时使用

在以下情况调用此 skill：
- 完成一个 feature 或重大代码变更后
- 创建 PR 之前
- 希望确保 quality gate 通过时
- refactor 之后

## 验证阶段

### 阶段 1：构建验证
```bash
# 检查项目是否能构建
npm run build 2>&1 | tail -20
# 或
pnpm build 2>&1 | tail -20
```

如果 build 失败，停止并在继续之前修复。

### 阶段 2：类型检查
```bash
# TypeScript 项目
npx tsc --noEmit 2>&1 | head -30

# Python 项目
pyright . 2>&1 | head -30
```

报告所有类型错误。在继续之前修复关键错误。

### 阶段 3：Lint 检查
```bash
# JavaScript/TypeScript
npm run lint 2>&1 | head -30

# Python
ruff check . 2>&1 | head -30
```

### 阶段 4：测试套件
```bash
# 运行测试并收集 coverage
npm run test -- --coverage 2>&1 | tail -50

# 检查 coverage threshold
# 目标：最低 80%
```

报告：
- 测试总数：X
- 通过：X
- 失败：X
- Coverage：X%

### 阶段 5：安全扫描
```bash
# 检查是否含有 secrets
grep -rn "sk-" --include="*.ts" --include="*.js" . 2>/dev/null | head -10
grep -rn "api_key" --include="*.ts" --include="*.js" . 2>/dev/null | head -10

# 检查是否含有 console.log
grep -rn "console.log" --include="*.ts" --include="*.tsx" src/ 2>/dev/null | head -10
```

### 阶段 6：Diff 审查
```bash
# 查看变更内容
git diff --stat
git diff HEAD~1 --name-only
```

审查每个变更文件，检查：
- 意外变更
- 缺失的错误处理
- 潜在的 edge case

## 输出格式

运行所有阶段后，生成一份验证报告：

```
验证报告
========

构建：    [PASS/FAIL]
类型：    [PASS/FAIL]（X 个错误）
Lint：     [PASS/FAIL]（X 个警告）
测试：    [PASS/FAIL]（X/Y 通过，Z% coverage）
安全：     [PASS/FAIL]（X 个 issue）
Diff：     [X 个文件变更]

总体：     [READY/NOT READY] 可提交 PR

待修复 issue：
1. ...
2. ...
```

## 持续模式

对于长会话，每 15 分钟或在重大变更后运行验证：

```markdown
设定一个心理检查点：
- 完成每个 function 后
- 完成一个组件后
- 进入下一个任务之前

运行：/verify
```

## 与 Hooks 集成

此 skill 补充了 PostToolUse hook，但提供更深入的验证。Hook 会立即捕获 issue；此 skill 提供综合审查。
