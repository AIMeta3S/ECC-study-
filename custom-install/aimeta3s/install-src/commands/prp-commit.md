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

### 审查门禁检查（软门禁）

探测 `docs/PRPs/reviews/`（`--prp` 档审查报告落盘处，唯一支持目录）下的 `*.review.md`（命名为 `{plan-name}-<yyyymmdd-HHMM>.review.md`），按文件名内嵌时间戳 `yyyymmdd-HHMM` 取最新，按其「决策」行与配对核销产物（`docs/PRPs/fixes/<文件名去 .review.md>.fix.md`，同主干时间戳一一配对，见 /code-review 命名契约）判断：

| 状态 | 动作 |
|---|---|
| 无任何审查报告 | 静默跳过（未跑过 /code-review --prp 档的仓库零感知） |
| 最新报告 PASS | 直接继续 |
| BLOCK COMMIT，无配对 fix.md | 警告并列出未核销的 CRITICAL/HIGH 计数，用户确认后才继续 |
| BLOCK COMMIT，有 fix.md 且 CRITICAL/HIGH 全部已修复 | 提示「修复已核销但决策仍为 BLOCK，建议先重跑 /code-review 复审」，确认后继续 |
| fix.md 中 CRITICAL/HIGH 存在不修复/误报/阻塞项 | 强警告并逐条列出，确认后继续 |

本门禁为**警告 + 用户确认**，不做硬阻止；PR 模式报告（`pr-*.md`）不参与本地提交门禁。

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
  - /prp-pr            → 如果所有 phase 完成后，创建 PR（GitHub，自动 push）
  - /prp-push-gogs     → Gogs 等自建服务：推送 + 网页建 PR 指引（PR 草稿落盘 docs/PRPs/prs/）
```

---

## 过程日志（exec log）

本命令零文件产物（只有 git commit），门禁走查与暂存解读过程无处追溯——边执行边追加一份**纯旁路**过程日志。

### 路径与命名

`docs/PRPs/logs/{plan-name}.exec.log`。`{plan-name}` 取自阶段 1 探测到的最新审查报告文件名 `{plan-name}-<yyyymmdd-HHMM>.review.md` 的前缀；**无任何审查报告时跳过 exec.log 写入**（无锚可依；流水线内提交前必有 PASS review，不受影响）。首次写入时 `mkdir -p docs/PRPs/logs`；文件已存在则直接追加，不重建头部——不存在则创建头部。

### 文件结构

头部 + 追加式条目 + 尾部固定锚点 `<!-- exec-log:end -->`（Edit 追加锚，始终保持在文件末尾）。条目格式（字段按需取用，不强制全填）：

```markdown
## [prp-commit <yyyymmdd-HHMM>] 阶段 N — <主题>
- 动作: <做了什么>
- 决策/依据: <解读与匹配理由>
- 结果: <暂存统计/commit>
- 指针: <review 路径 / commit 哈希>
```

### 写入时机表

| 时机 | 条目内容 |
|---|---|
| 阶段 1 门禁走查后 | 走查来源（最新 review 路径 + 决策 + fix.md 状态）或「静默跳过（无报告，本次不写 exec.log）」；变更摘要（added/modified/deleted/untracked 计数） |
| 阶段 2 暂存后 | 输入解读 → 匹配文件与理由、`git diff --cached --stat` 关键行 |
| 阶段 3 提交后 | commit 哈希、消息、文件数（指针） |

### 写入协议

- **追加用 Edit 工具**：old_string 锚定 `<!-- exec-log:end -->`，新条目插在标记之前；**禁止 shell `>>` 落盘重定向**（会被环境 hook 拦截）。
- **best-effort**：写入失败 → 向用户输出一行警告（含原因）后继续执行；不作为停止条件。
- **只写不读**：提交决策不读取 exec.log——它是给人读的旁路记录，不是事实源。
- **不记边界**：diff 内容不落盘（git 承载，只记统计与文件清单）。
- exec.log 位于 `docs/PRPs/**` 产物集内，随本命令提交入库、被 /code-review 自动豁免。

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
