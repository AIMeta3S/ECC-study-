---
description: "快速提交，支持自然语言指定文件——用中文描述要提交的内容"
argument-hint: "[目标描述] (留空 = 全部变更)"
---

# 智能提交

> 属于 PRP 工作流系列的一部分。

**输入**: $ARGUMENTS

---

## 阶段 1 — 评估

```bash
git status --short
```

如果输出为空 → 停止："没有需要提交的内容。"

向用户显示更改内容的摘要 (added, modified, deleted, untracked)。

---

## 阶段 2 — 解读与暂存

解读 `$ARGUMENTS` 以确定要暂存的内容：

| 输入 | 解读 | Git 命令 |
|---|---|---|
| 无内容/空白字符 | 暂存全部 | `git add -A` |
| `已暂存` | 使用已暂存的内容 | *(无 git add)* |
| `*.ts` 或 `*.py` 等 | 暂存匹配的 glob | `git add '*.ts'` |
| `除了测试之外` | 暂存全部，然后取消暂存测试文件 | `git add -A && git reset -- '**/*.test.*' '**/*.spec.*' '**/test_*' 2>/dev/null \|\| true` |
| `仅新文件` | 仅暂存未跟踪文件 | `git ls-files --others --exclude-standard \| grep . && git ls-files --others --exclude-standard \| xargs git add` |
| `与认证相关的文件` | 从 status/diff 解读——查找 auth 相关文件 | `git add <matched files>` |
| 指定文件名 | 暂存这些文件 | `git add <files>` |

对于自然语言输入（如 "与认证相关的文件"），交叉对照 `git status` 输出和 `git diff` 来识别相关文件。向用户展示你要暂存哪些文件以及原因。

```bash
git add <determined files>
```

暂存后，请验证：
```bash
git diff --cached --stat
```

如果没有已暂存内容，停止："没有匹配的文件。"

---

## 阶段 3 — 提交

用祈使语气拟定单行提交信息：

```
{type}: {description}
```

type 可选值：
- `feat` — 新功能或能力
- `fix` — bug 修复
- `refactor` — 代码重构，不改变行为
- `docs` — 文档变更
- `test` — 新增或更新测试
- `chore` — 构建、配置、依赖
- `perf` — 逻辑或性能改进
- `ci` — CI/CD 变更

规则：
- 祈使语气（如“添加功能”而非“添加了功能”）
- 类型前缀后使用小写
- 结尾不加句号
- 不超过 72 个字符
- 描述改了什么（WHAT），而非怎么改的（HOW）

```bash
git commit -m "{type}: {description}"
```

---

## 阶段 4 — 输出

向用户报告：

```
已提交: {hash_short}
消息:   {type}: {description}
文件数:     {count} 文件已变更

后续步骤:
  - /prp-plan <PRD路径> → 如果 PRD 还有「待开始」的 phase 时，进入下一 phase
  - /prp-pr            → 如果所有 phase 完成后，创建 PR（自动 push）
```

---

## 示例

| 你的输入 | 执行的操作 |
|---|---|
| `/prp-commit` | 暂存全部，自动生成提交信息 |
| `/prp-commit 已暂存` | 仅提交已暂存的内容 |
| `/prp-commit *.ts` | 暂存所有 TypeScript 文件并提交 |
| `/prp-commit 除了测试之外` | 暂存除测试文件外的所有内容，然后提交 |
| `/prp-commit 仅新文件` | 从 status 中查找数据库迁移文件并暂存，然后提交 |
| `/prp-commit 与认证相关的文件` | 仅暂存未跟踪文件，然后提交 |
