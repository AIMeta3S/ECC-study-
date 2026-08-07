---
description: 对仓库运行确定性的 harness audit，并返回按优先级排序的评分卡。
---

# Harness Audit 命令

对仓库运行确定性的 harness audit，并返回按优先级排序的评分卡。

## 用法

`/harness-audit [scope] [--format text|json] [--root path]`

- `scope`（可选）：`repo`（默认）、`hooks`、`skills`、`commands`、`agents`
- `--format`：输出格式（默认 `text`，`json` 用于自动化）
- `--root`：对指定路径（而非当前工作目录）执行 audit

## 确定性引擎

始终运行：

```bash
node scripts/harness-audit.js <scope> --format <text|json> [--root <path>]
```

该脚本是评分与检查的唯一事实来源。不要臆造额外的维度或临时性得分项。

Rubric 版本：`2026-05-19`。

该脚本最多计算 12 个固定类别（每个类别归一化到 `0-10`）。前七个类别始终适用；GitHub Integration 始终适用；deploy-target 类别仅在检测到匹配的标记时适用。

1. Tool Coverage
2. Context Efficiency
3. Quality Gates
4. Memory Persistence
5. Eval Coverage
6. Security Guardrails
7. Cost Efficiency
8. GitHub Integration
9. Vercel Integration *（当存在 `vercel.json` 或 `.vercel/` 时）*
10. Netlify Integration *（当存在 `netlify.toml` 或 `.netlify/` 时）*
11. Cloudflare Integration *（当存在 `wrangler.toml` 或 `wrangler.jsonc` 时）*
12. Fly Integration *（当存在 `fly.toml` 时）*

得分基于显式的文件/规则检查得出，对同一 commit 可复现。
该脚本默认对当前工作目录执行 audit，并自动检测目标是 ECC 仓库本身还是使用 ECC 的消费方项目。

## 输出契约

返回：

1. `overall_score`（满分 `max_score`）。`max_score` 取决于哪些类别适用于目标；绝不假设固定总分。
2. `applicable_categories[]` 和 `category_count`，描述哪些类别参与了计分。
3. 各类别得分及具体发现。
4. 失败的检查项及精确的文件路径。
5. 来自确定性输出的前 3 项动作（`top_actions`）。
6. 建议接下来应用的 ECC skill。

## 检查清单

- 直接使用脚本输出；不要手动重新评分。
- 如果请求 `--format json`，原样返回脚本的 JSON 输出。
- 如果请求 text 格式，汇总失败的检查项和 top actions。
- 包含来自 `checks[]` 和 `top_actions[]` 的精确文件路径。

## 示例结果

```text
Harness Audit (repo, repo): 71/80
- Tool Coverage: 10/10 (10/10 pts)
- Context Efficiency: 9/10 (9/10 pts)
- Quality Gates: 10/10 (10/10 pts)
- GitHub Integration: 2/10 (2/10 pts)

Top 3 Actions:
1) [GitHub Integration] Add at least one workflow under .github/workflows/. (.github/workflows/)
2) [Security Guardrails] Add prompt/tool preflight security guards in hooks/hooks.json. (hooks/hooks.json)
3) [Eval Coverage] Increase automated test coverage across scripts/hooks/lib. (tests/)
```

## 参数

$ARGUMENTS:
- `repo|hooks|skills|commands|agents`（可选 scope）
- `--format text|json`（可选输出格式）
