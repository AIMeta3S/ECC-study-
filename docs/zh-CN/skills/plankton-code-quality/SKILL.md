---
name: plankton-code-quality
description: "使用 Plankton 实现写入时代码质量强制——通过 hook 在每次文件编辑时自动 format、lint，并由 Claude 驱动修复。"
metadata:
  origin: community
---

# Plankton Code Quality Skill

Plankton（鸣谢：@alxfazio）的集成参考——这是一套面向 Claude Code 的写入时（write-time）代码质量强制系统。Plankton 通过 PostToolUse hook 在每次文件编辑时运行 formatter 和 linter，随后启动 claude 子进程来修复 agent 未能捕获的违规项。

## 何时使用

- 你希望在每次文件编辑时自动 format 和 lint（而不仅仅在 commit 时）
- 你需要防御 agent 修改 linter 配置来蒙混过关，而不是真正修复代码
- 你希望对修复采用分层 model routing（Haiku 处理简单 style，Sonnet 处理逻辑，Opus 处理类型）
- 你需要处理多种语言（Python、TypeScript、Shell、YAML、JSON、TOML、Markdown、Dockerfile）

## 工作原理

### 三阶段架构

每当 Claude Code 编辑或写入文件时，Plankton 的 `multi_linter.sh` PostToolUse hook 就会运行：

```
Phase 1: Auto-Format (Silent)
├─ Runs formatters (ruff format, biome, shfmt, taplo, markdownlint)
├─ Fixes 40-50% of issues silently
└─ No output to main agent

Phase 2: Collect Violations (JSON)
├─ Runs linters and collects unfixable violations
├─ Returns structured JSON: {line, column, code, message, linter}
└─ Still no output to main agent

Phase 3: Delegate + Verify
├─ Spawns claude -p subprocess with violations JSON
├─ Routes to model tier based on violation complexity:
│   ├─ Haiku: formatting, imports, style (E/W/F codes) — 120s timeout
│   ├─ Sonnet: complexity, refactoring (C901, PLR codes) — 300s timeout
│   └─ Opus: type system, deep reasoning (unresolved-attribute) — 600s timeout
├─ Re-runs Phase 1+2 to verify fixes
└─ Exit 0 if clean, Exit 2 if violations remain (reported to main agent)
```

### Main Agent 看到的内容

| 场景 | Agent 看到的内容 | Hook exit code |
|----------|-----------|-----------|
| 无违规项 | 无 | 0 |
| 子进程修复了全部问题 | 无 | 0 |
| 子进程处理后仍有违规项 | `[hook] N violation(s) remain` | 2 |
| 建议性提示（重复项、旧工具） | `[hook:advisory] ...` | 0 |

Main agent 只能看到子进程无法修复的问题。大多数质量问题会被透明地解决。

### 配置保护（防御规则规避）

LLM 会修改 `.ruff.toml` 或 `biome.json` 来禁用规则，而不是修复代码。Plankton 通过三层机制来阻止这种行为：

1. **PreToolUse hook** —— `protect_linter_configs.sh` 在编辑发生之前阻止对所有 linter 配置的修改
2. **Stop hook** —— `stop_config_guardian.sh` 在 session 结束时通过 `git diff` 检测配置变更
3. **受保护文件清单** —— `.ruff.toml`、`biome.json`、`.shellcheckrc`、`.yamllint`、`.hadolint.yaml` 等

### Package Manager 强制策略

Bash 上的 PreToolUse hook 会阻止传统的 package manager：
- `pip`、`pip3`、`poetry`、`pipenv` → 被阻止（使用 `uv`）
- `npm`、`yarn`、`pnpm` → 被阻止（使用 `bun`）
- 允许的例外：`npm audit`、`npm view`、`npm publish`

## 安装设置

### 快速开始

> **注意：** Plankton 需要从其仓库手动安装。安装前请先审查代码。

```bash
# 安装核心依赖
brew install jaq ruff uv

# 安装 Python linter
uv sync --all-extras

# 启动 Claude Code — hook 会自动激活
claude
```

无需 install 命令，无需 plugin 配置。在 Plankton 目录下运行 Claude Code 时，`.claude/settings.json` 中的 hook 会被自动加载。

### 项目级集成

要在你自己的项目中使用 Plankton hook：

1. 将 `.claude/hooks/` 目录复制到你的项目
2. 复制 `.claude/settings.json` 的 hook 配置
3. 复制 linter 配置文件（`.ruff.toml`、`biome.json` 等）
4. 为你使用的语言安装相应的 linter

### 各语言依赖

| 语言 | 必需 | 可选 |
|----------|----------|----------|
| Python | `ruff`、`uv` | `ty`（类型）、`vulture`（死代码）、`bandit`（安全） |
| TypeScript/JS | `biome` | `oxlint`、`semgrep`、`knip`（无用 export） |
| Shell | `shellcheck`、`shfmt` | — |
| YAML | `yamllint` | — |
| Markdown | `markdownlint-cli2` | — |
| Dockerfile | `hadolint` (>= 2.12.0) | — |
| TOML | `taplo` | — |
| JSON | `jaq` | — |

## 与 ECC 配合使用

### 互补而非重叠

| 关注点 | ECC | Plankton |
|---------|-----|----------|
| 代码质量强制 | PostToolUse hooks（Prettier、tsc） | PostToolUse hooks（20+ linter + 子进程修复） |
| 安全扫描 | AgentShield、security-reviewer agent | Bandit（Python）、Semgrep（TypeScript） |
| 配置保护 | — | PreToolUse 拦截 + Stop hook 检测 |
| Package manager | 检测 + 设置 | 强制（阻止传统 PM） |
| CI 集成 | — | git 的 pre-commit hook |
| Model routing | 手动（`/model opus`） | 自动（违规复杂度 → 对应层级） |

### 推荐组合

1. 将 ECC 作为你的 plugin 安装（agents、skills、commands、rules）
2. 添加 Plankton hook 用于写入时质量强制
3. 使用 AgentShield 进行安全审计
4. 在 PR 前使用 ECC 的 verification-loop 作为最终关卡

### 避免 Hook 冲突

如果同时运行 ECC 和 Plankton hook：
- ECC 的 Prettier hook 和 Plankton 的 biome formatter 可能会在 JS/TS 文件上冲突
- 解决方法：使用 Plankton 时禁用 ECC 的 Prettier PostToolUse hook（Plankton 的 biome 更全面）
- 两者可以在不同文件类型上共存（ECC 处理 Plankton 未覆盖的部分）

## 配置参考

Plankton 的 `.claude/hooks/config.json` 控制全部行为：

```json
{
  "languages": {
    "python": true,
    "shell": true,
    "yaml": true,
    "json": true,
    "toml": true,
    "dockerfile": true,
    "markdown": true,
    "typescript": {
      "enabled": true,
      "js_runtime": "auto",
      "biome_nursery": "warn",
      "semgrep": true
    }
  },
  "phases": {
    "auto_format": true,
    "subprocess_delegation": true
  },
  "subprocess": {
    "tiers": {
      "haiku":  { "timeout": 120, "max_turns": 10 },
      "sonnet": { "timeout": 300, "max_turns": 10 },
      "opus":   { "timeout": 600, "max_turns": 15 }
    },
    "volume_threshold": 5
  }
}
```

**关键设置：**
- 禁用你不使用的语言以加速 hook
- `volume_threshold` —— 违规数 > 该计数时自动升级到更高的 model 层级
- `subprocess_delegation: false` —— 完全跳过 Phase 3（仅报告违规）

## 环境变量覆盖

| 变量 | 用途 |
|----------|---------|
| `HOOK_SKIP_SUBPROCESS=1` | 跳过 Phase 3，直接报告违规 |
| `HOOK_SUBPROCESS_TIMEOUT=N` | 覆盖层级 timeout |
| `HOOK_DEBUG_MODEL=1` | 记录 model 选择决策 |
| `HOOK_SKIP_PM=1` | 绕过 package manager 强制 |

## 参考

- Plankton（鸣谢：@alxfazio）
- Plankton REFERENCE.md —— 完整架构文档（鸣谢：@alxfazio）
- Plankton SETUP.md —— 详细安装指南（鸣谢：@alxfazio）

## ECC v1.8 新增内容

### 可复制的 Hook Profile

设置 strict 质量行为：

```bash
export ECC_HOOK_PROFILE=strict
export ECC_QUALITY_GATE_FIX=true
export ECC_QUALITY_GATE_STRICT=true
```

### 语言 Gate 表

- TypeScript/JavaScript：首选 Biome，Prettier 作为 fallback
- Python：Ruff format/check
- Go：gofmt

### 配置防篡改

在质量强制执行期间，标记同一迭代中对配置文件的变更：

- `biome.json`、`.eslintrc*`、`prettier.config*`、`tsconfig.json`、`pyproject.toml`

如果配置被修改以抑制违规项，则在 merge 前需要显式审查。

### CI 集成模式

在 CI 中使用与本地 hook 相同的命令：

1. 运行 formatter 检查
2. 运行 lint/类型检查
3. 在 strict 模式下快速失败
4. 发布修复摘要

### 健康指标

跟踪：
- 被 gate 标记的编辑数
- 平均修复时间
- 按类别统计的重复违规
- 因 gate 失败导致的 merge 阻塞
