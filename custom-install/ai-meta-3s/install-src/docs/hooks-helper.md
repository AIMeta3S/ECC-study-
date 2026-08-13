<!-- aimeta3s-doc: hooks-helper | version: 1 | updated: 2026-08-12 | source: scripts/hooks/*.js + scripts/lib/*.js（精确路径见 manifest.json） -->

# aimeta3s Hooks 使用建议

> 本文是对 `custom-install/aimeta3s/install-src/hooks/hooks.json` 的深度逆向分析结果。
> 每个 hook 都已追踪到最终执行的脚本（位于 `install-src/scripts/hooks/` 与 `install-src/scripts/lib/`），
> 并与源码逐项核对。文末附使用建议与全部环境变量速查表。

---

## 1. 概览

### 1.1 规模

| 维度 | 数量 |
|---|---|
| 生命周期事件 | **7** 个：PreToolUse / PreCompact / SessionStart / PostToolUse / PostToolUseFailure / Stop / SessionEnd |
| Hook 注册项 | **28** 条（hooks.json 中的条目） |
| 唯一执行脚本 | **25** 个（`observe-runner.js`、`governance-capture.js`、`mcp-health-check.js` 被 Pre/Post 共享） |
| 基础设施脚本 | `plugin-hook-bootstrap.js`、`run-with-flags.js`、`lib/hook-flags.js`、`lib/utils.js` |

### 1.2 两条执行路径

每个 hook 的 `command` 字段都是一段 `node -e` 内联引导代码，它先解析「插件根目录」（plugin root），再走以下两条路径之一：

```
                        ┌─ pre:bash:dispatcher ─→ pre-bash-dispatcher.js ─→ bash-hook-dispatcher.js
                        │     （内部按子 hook 逐个 isHookEnabled，短路传播 exitCode）
node -e 引导 ─→ bootstrap ┤
   解析 root          │   其余所有 hook ─→ run-with-flags.js <id> <script> <profiles>
                        │     （stdin 截断保护 / profile 门控 / dry-run / 路径穿越防护 /
                        └     in-process require() 优化 / 原子 stdout flush）
```

- **Dispatcher 路径**：`pre/post:bash:dispatcher` 不经过 `run-with-flags.js`，而是由 `bash-hook-dispatcher.js` 内部对每个子 hook 单独调用 `isHookEnabled`，逐个调度。
- **run-with-flags 路径**：其余所有 hook 都经统一包装器，门控、stdin 解析、错误兜底全部集中处理。

### 1.3 基础设施职责

| 脚本 | 职责 |
|---|---|
| `plugin-hook-bootstrap.js` | 入口引导：解析 plugin root → 按 node/shell 模式 spawn 目标脚本，做路径穿越防护；任何异常都 `exit 0`（绝不影响工具调用）。关键守护：`require.main === module \|\| require.main === undefined` 双重判断，否则 Node 21+ 下所有插件 hook 变 no-op。 |
| `run-with-flags.js` | 带 profile/disabled 门控的包装器：读 stdin（上限 1MB，超过则 `truncated=true` 且**不回显**被截断的内容，#2222）→ `isHookEnabled` → `ECC_DRY_RUN` → 解析脚本绝对路径（拒绝插件根目录外的穿越）→ 若脚本 `exports.run` 则 `require()` 直调（省一次 spawn），否则 spawnSync 子进程 → 原子 flush stdout 后再 exit。 |
| `lib/hook-flags.js` | `ECC_HOOK_PROFILE`（默认 `standard`，无效值回落 standard）/ `ECC_DISABLED_HOOKS`（逗号分隔黑名单，优先级最高）/ `parseProfiles`（空值默认回退 `['standard','strict']`）。 |
| `lib/utils.js` | `readStdinJson`（带超时，失败 resolve `{}`）、`runCommand`（**安全闸门**：只允许 `git/node/npx/which/where` 前缀，拒绝 `$`/反引号/未引用的 `;\|&`）、`sanitizeSessionId`（避开 Windows 保留名）、`getClaudeDir`（实际走 `resolveAgentDataHome()`）。 |

---

## 2. 全局机制（先读这一节）

### 2.1 阻塞语义三态

这是使用这套 hook 系统**最需要理解**的概念。同一个 PreToolUse 事件下，不同 hook 的"阻止工具执行"能力完全不同：

| 机制 | 含义 | 对模型可见 | 代表 hook |
|---|---|---|---|
| **`exit 2` 硬阻塞** | 直接阻止该次工具调用 | stderr（对人可见） | `pre:bash:block-no-verify`、`pre:bash:commit-quality`(error>0)、`pre:config-protection`、`pre:mcp-health-check`(fail-closed) |
| **`exit 0` + `permissionDecision:deny` 软阻塞** | harness 顶层拒绝，把 `permissionDecisionReason` 展示给模型 | reason 注入模型 | `pre:edit-write:gateguard-fact-force`、`pre:bash:gateguard-fact-force` |
| **`exit 0` + `additionalContext`** | **不阻塞**，仅向下一轮注入上下文/提示 | additionalContext 注入模型 | `pre:bash:tmux-reminder`、`pre:bash:git-push-reminder`、`pre:write:doc-file-warning`、`pre:edit-write:suggest-compact`、`pre:bash:auto-tmux-dev`（改写命令） |

> **关键结论**：PostToolUse / PreCompact / SessionStart / Stop / SessionEnd 全部 `exit 0`，**无一会阻塞工具执行**。唯一例外是 `stop:format-typecheck` 会**同步占用最多 300s**（拖慢回应）但也不 exit 2。

### 2.2 Profile 三档对照矩阵

`ECC_HOOK_PROFILE`（默认 `standard`）决定哪些 hook 真正运行。`✓` = 启用，`✗` = 在该 profile 下被跳过。

| Hook ID | minimal | standard | strict |
|---|:---:|:---:|:---:|
| **PreToolUse** | | | |
| `pre:bash:block-no-verify` | ✓ | ✓ | ✓ |
| `pre:bash:auto-tmux-dev` | ✗ | ✓ | ✓ |
| `pre:bash:tmux-reminder` | ✗ | ✗ | ✓ |
| `pre:bash:git-push-reminder` | ✗ | ✗ | ✓ |
| `pre:bash:commit-quality` | ✗ | ✗ | ✓ |
| `pre:bash:gateguard-fact-force` | ✗ | ✓ | ✓ |
| `pre:write:doc-file-warning` | ✗ | ✓ | ✓ |
| `pre:edit-write:suggest-compact` | ✗ | ✓ | ✓ |
| `pre:observe:continuous-learning` | ✗ | ✓ | ✓ |
| `pre:governance-capture` | ✗ | ✓＊ | ✓＊ |
| `pre:config-protection` | ✗ | ✓ | ✓ |
| `pre:mcp-health-check` | ✗ | ✓ | ✓ |
| `pre:edit-write:gateguard-fact-force` | ✗ | ✓ | ✓ |
| **PreCompact** | | | |
| `pre:compact` | ✓ | ✓ | ✓ |
| **SessionStart** | | | |
| `session:start` | ✓ | ✓ | ✓ |
| **PostToolUse** | | | |
| `post:bash:command-log-audit` | ✗ | ✓ | ✓ |
| `post:bash:command-log-cost` | ✗ | ✓ | ✓ |
| `post:bash:pr-created` | ✗ | ✓ | ✓ |
| `post:bash:build-complete` | ✗ | ✓ | ✓ |
| `post:quality-gate` | ✗ | ✓ | ✓ |
| `post:edit:design-quality-check` | ✗ | ✓ | ✓ |
| `post:edit:accumulator` | ✗ | ✓ | ✓ |
| `post:edit:console-warn` | ✗ | ✓ | ✓ |
| `post:governance-capture` | ✗ | ✓＊ | ✓＊ |
| `post:session-activity-tracker` | ✗ | ✓ | ✓ |
| `post:observe:continuous-learning` | ✗ | ✓ | ✓ |
| `post:ecc-metrics-bridge` | ✓ | ✓ | ✓ |
| `post:ecc-context-monitor` | ✗ | ✓ | ✓ |
| **PostToolUseFailure** | | | |
| `post:mcp-health-check` | ✗ | ✓ | ✓ |
| **Stop** | | | |
| `stop:format-typecheck` | ✗ | ✓ | ✓ |
| `stop:check-console-log` | ✗ | ✓ | ✓ |
| `stop:session-end` | ✓ | ✓ | ✓ |
| `stop:evaluate-session` | ✓ | ✓ | ✓ |
| `stop:cost-tracker` | ✓ | ✓ | ✓ |
| `stop:desktop-notify` | ✗ | ✓ | ✓ |
| **SessionEnd** | | | |
| `session:end:marker` | ✓ | ✓ | ✓ |

> `＊` = 还需 `ECC_GOVERNANCE_CAPTURE=1` 才真正生效，否则完全 no-op。
>
> **minimal 模式只保留 7 个"基础设施"类 hook**：`block-no-verify`、`session:start`、`post:ecc-metrics-bridge`、`stop:session-end`、`stop:evaluate-session`、`stop:cost-tracker`、`session:end:marker`——砍掉所有质量干预与提示注入。

### 2.3 全局开关

| 环境变量 | 作用 | 取值 |
|---|---|---|
| `ECC_HOOK_PROFILE` | 选择 profile 档位 | `minimal` / `standard`（默认）/ `strict`；无效值回落 `standard` |
| `ECC_DISABLED_HOOKS` | 单 hook id 黑名单（**优先级最高**，逗号分隔、小写） | 如 `pre:config-protection,stop:desktop-notify` |
| `ECC_DRY_RUN` | 干跑预览，不实际执行 | `1` 启用；只向 stderr 输出 `[DryRun] ...`，stdout 透传 |
| `ECC_HOOK_INPUT_MAX_BYTES` | stdin 截断阈值 | 默认 1MB |

> **注意**：`pre:bash:dispatcher` 自身**无法**用 `ECC_DISABLED_HOOKS=pre:bash:dispatcher` 禁用（它不经过 run-with-flags，内部也不检查自身 id）。要关 Bash 侧某个检查，须禁用具体子 hook id（如 `pre:bash:block-no-verify`）。

### 2.4 状态/日志文件落盘位置一览

| 路径 | 写入者 | 用途 |
|---|---|---|
| `~/.gateguard/state-<sessionKey>.json` | GateGuard | 记录每文件是否已"陈述事实"、破坏性命令放行记录 |
| `$TMPDIR/ecc-edited-<sessionId>.txt` | `post:edit:accumulator` → `stop:format-typecheck`（读后删） | 本轮编辑的 JS/TS 文件清单 |
| `$TMPDIR/claude-tool-count-<sessionId>` / `claude-context-bucket-<sessionId>` | `pre:edit-write:suggest-compact` | tool 调用计数 + context bucket |
| `$TMPDIR/ecc-metrics-<sessionId>.json` | `post:ecc-metrics-bridge` | 会话运行中聚合（statusline / context-monitor 读） |
| `$TMPDIR/ecc-ctx-warn-<sessionId>.json` | `post:ecc-context-monitor` | 告警去重缓存 |
| `$TMPDIR/harness-cost-<sessionId>.json` | 外部 statusline → `stop:cost-tracker`（读） | harness 权威成本缓存（≤300s） |
| `~/.claude/mcp-health-cache.json` | MCP 健康检查 | server 健康/退避状态（跨压缩持久） |
| `~/.claude/metrics/costs.jsonl` | `stop:cost-tracker` | 每回应一行的累计成本账本 |
| `~/.claude/metrics/tool-usage.jsonl` | `post:session-activity-tracker` | 逐工具调用明细 |
| `~/.claude/bash-commands.log` / `cost-tracker.log` | `post:bash:command-log-*` | Bash 命令审计/成本日志 |
| `~/.claude/session-data/*-session.tmp` | `stop:session-end` / `pre:compact` 写；`session:start` 读 | 跨会话上下文摘要 |
| `~/.claude/session-data/compaction-log.txt` | `pre:compact` | 压缩事件日志 |
| `<projectDir>/.observer-sessions/<sessionId>.json` | `session:start` 写；`session:end:marker` 删 | observer 引用计数 lease |

> **Cursor 用户注意**：`getClaudeDir()` 实际走 `resolveAgentDataHome()`，在 Cursor 下数据落在 `~/.cursor/ecc` 而非 `~/.claude`。上表中所有 `~/.claude/...` 路径需相应替换。

---

## 3. 逐 Hook 深度卡片

每张卡片字段：**触发条件 / 处理流程 / 阻塞语义 / 输出与副作用 / 运行时开关 / 关联**。

### 3.1 PreToolUse

---

#### 3.1.1 `pre:bash:dispatcher`（matcher: Bash）

**聚合调度器**，不经过 run-with-flags。`pre-bash-dispatcher.js` → `bash-hook-dispatcher.js` 的 `runPreBash()`，按 `PRE_BASH_HOOKS` 顺序逐个调度子 hook，**任一子 hook 返回非 0 exitCode 立即短路**。子 hook 抛异常被捕获后**继续下一个**（不阻塞）。

它分发到以下 6 个子 hook（每个子 hook 独立受 profile 控制）：

##### (a) `pre:bash:block-no-verify` → `block-no-verify.js` 〔minimal,standard,strict〕
- **触发**：命令含 `git` 子命令（commit/push/merge/cherry-pick/rebase/am）。
- **流程**：完整 shell 词法分析器（处理引号/转义/subshell/注释），定位 git 关键字后的真正子命令（跳过 `-c key=value`/`-C path`），在子命令作用域内检查 `--no-verify`（commit 还识别 `-n`）与 `-c core.hooksPath=`（大小写不敏感）。
- **阻塞**：⚠️ **`exit 2` 硬阻塞**，stderr 写明被禁的绕过方式。
- **作用**：防止 agent 用 `--no-verify` / `core.hooksPath=` 绕过项目 git 钩子。

##### (b) `pre:bash:auto-tmux-dev` → `auto-tmux-dev.js` 〔standard,strict〕
- **触发**：命令匹配 `npm run dev` / `pnpm dev` / `yarn dev` / `bun run dev`。
- **流程**：**改写命令**——Unix 下有 tmux 则转为 `tmux new-session -d -s <project> '<cmd>'`，Windows 转为 `start cmd /k`。session 名由 `path.basename(cwd)` 派生并消毒。
- **阻塞**：不阻塞（`exit 0`），仅替换 `tool_input.command`。
- **作用**：让 dev server 在 detach 会话里跑，避免阻塞 Claude Code。

##### (c) `pre:bash:tmux-reminder` → `pre-bash-tmux-reminder.js` 〔strict〕
- **触发**：非 Windows、未设 `TMUX`，且命令是 `npm/pnpm/yarn/bun (install|test)`、`cargo build`、`make`、`docker`、`pytest`、`vitest`、`playwright`。
- **流程**：返回 `additionalContext` 两行提示（建议长任务放 tmux）。
- **阻塞**：不阻塞，注入下一轮上下文。

##### (d) `pre:bash:git-push-reminder` → `pre-bash-git-push-reminder.js` 〔strict〕
- **触发**：命令匹配 `git push`。
- **流程**：返回 `additionalContext`，提示 push 前应 review。
- **阻塞**：不阻塞。

##### (e) `pre:bash:commit-quality` → `pre-bash-commit-quality.js` 〔strict〕
- **触发**：命令含 `git commit`（`--amend` 直接放行）。
- **流程**：`git diff --cached` 取暂存文件 → 对 `.js/.ts/.py/.go/.rs` 逐行扫 `console.log`(warning)/`debugger`(error)/无 issue 的 `TODO`(info)/硬编码密钥(error) → 校验 Conventional Commit 格式（首行 ≤72、小写首字母、无句尾句号）→ 跑 eslint/pylint/golangci-lint → 汇总。
- **阻塞**：⚠️ **error>0 时 `exit 2`**；仅 warning/info 时 `exit 0`。
- **作用**：commit 前的代码质量与提交信息闸门。
- **⚠️ 已知坑**：仅 warning 时脚本提示用 `--no-verify` 跳过，但 `--no-verify` 会被子 hook (a) 阻塞——**引导冲突**，详见 §5.5。

##### (f) `pre:bash:gateguard-fact-force` → `gateguard-fact-force.js`（Bash 分支）〔standard,strict〕
- **触发**：先排除只读 git 内省（`status/diff/log/show/branch/rev-parse`），再判破坏性。
- **流程**：`isDestructiveBash()` 识别 `rm -rf`、`git reset --hard`、`git checkout --`、`git clean -f`、`git push --force`/`+refspec`、`git commit --amend`、`git rm -r`、SQL `drop/delete/truncate`、`dd if=`、`find ... -exec rm` 等（支持 `GATEGUARD_BASH_EXTRA_DESTRUCTIVE` 自定义正则；处理 subshell/`$(...)`/`sh -c` 嵌套）。命中破坏性 → 首次要求陈述事实后放行（state 记录），否则放行。
- **阻塞**：**软阻塞**（`permissionDecision:deny` + `exit 0`）。
- **作用**：破坏性 Bash 前强制建立操作意识。

---

#### 3.1.2 `pre:write:doc-file-warning`（matcher: Write）→ `doc-file-warning.js` 〔standard,strict〕
- **触发**：仅 `.md/.txt`，文件名严格匹配 `^(NOTES|TODO|SCRATCH|TEMP|DRAFT|BRAINSTORM|SPIKE|DEBUG|WIP)\.(md|txt)$`（大小写敏感，仅大写），且**不在**结构化目录（`docs/`、`.claude/`、`.github/`、`commands/`、`skills/`、`benchmarks/`、`templates/`、`.history/`、`memory/`）。
- **流程**：命中 → 返回 3 行警告 `additionalContext`。
- **阻塞**：**永不阻塞**（脚本顶部明确 "Exit code 0 always"）。
- **作用**：用 denylist 引导 agent 用结构化目录而非随手 `NOTES.md`。

#### 3.1.3 `pre:edit-write:suggest-compact`（matcher: Edit|Write）→ `suggest-compact.js` 〔standard,strict〕
- **触发**：无内部过滤，每次 Edit/Write 都执行（计数器递增）。
- **流程**：fd-based 原子计数 → **主信号**：读 transcript 真实 token 用量，按 bucket（默认每 60k token 一档）触发；**次信号**：tool 调用数达 50 后每 25 次触发 → 输出提示 `/compact`。
- **阻塞**：永不阻塞（catch-all `exit 0`）。
- **作用**：在逻辑阶段边界建议手动 `/compact`（保留上下文连续性）。
- **开关**：`COMPACT_THRESHOLD`、`COMPACT_CONTEXT_THRESHOLD`（`=0` 关主信号）、`COMPACT_CONTEXT_INTERVAL`、`COMPACT_STATE_TTL_DAYS`。

#### 3.1.4 `pre:observe:continuous-learning`（matcher: `*`，async，timeout 10）→ `observe-runner.js` 〔standard,strict〕
- **触发**：所有工具；从 hookId 前缀取 `pre`。
- **流程**：解析 `<pluginRoot>/skills/continuous-learning-v2/hooks/observe.sh` → 探测 shell（`BASH`→`bash`→`sh`）→ `spawnSync(shell, [observePath, phase], {timeout: ECC_OBSERVE_RUNNER_TIMEOUT_MS||9000})`，透传结果。
- **阻塞**：永不阻塞（fire-and-forget + async）。
- **作用**：为 continuous-learning-v2 skill 采集观察数据；runner 只做安全调度（路径消毒 + shell 探测 + 超时兜底）。

#### 3.1.5 `pre:governance-capture`（matcher: Bash|Write|Edit|MultiEdit，timeout 10）→ `governance-capture.js` 〔standard,strict，需 `ECC_GOVERNANCE_CAPTURE=1`〕
- **触发**：⚠️ **强门控**，`ECC_GOVERNANCE_CAPTURE` 必须严格等于 `1`，否则直接透传 stdin 不分析。**默认关闭**。
- **流程**（`analyzeForGovernanceEvents`）：检测 `secret_detected`（AWS key/generic secret/PEM/JWT/GitHub token）、`approval_requested`（仅 Bash：`git push --force`/`reset --hard`/`rm -rf`/`DROP`/`DELETE`）、`policy_violation`（路径命中 `.env`/`credentials`/`secrets.`/`.pem`/`.key`/`id_rsa`）。每事件写 stderr 一行 `[governance] {json}`。
- **阻塞**：永不阻塞（`return rawInput`）。
- **作用**：采集治理事件供外部审计/SIEM 管线消费，不参与放行决策。

#### 3.1.6 `pre:config-protection`（matcher: Write|Edit|MultiEdit，timeout 5）→ `config-protection.js` 〔standard,strict〕
- **触发**：`file_path` basename 在保护清单（约 30 个 linter/formatter 配置：`.eslintrc.*`/`eslint.config.*`/`.prettierrc.*`/`biome.json[c]`/`.ruff.toml`/`.shellcheckrc`/`.stylelintrc.*`/`.markdownlint*`）。`pyproject.toml` **刻意排除**（含项目元数据）。
- **流程**：stdin 截断→fail-closed 阻塞；命中保护清单→`lstatSync` 判存在（首次创建 ENOENT 放行，EACCES/EPERM/ELOOP 视为存在）。
- **阻塞**：⚠️ **`exit 2` 硬阻塞**——修改**现存**配置文件时阻塞；首次创建放行；stdin 截断时阻塞。
- **作用**：阻止 agent 通过削弱 lint/format 配置让检查通过，引导修源码。
- **开关**：合法配置变更时临时 `ECC_DISABLED_HOOKS=pre:config-protection`。

#### 3.1.7 `pre:mcp-health-check`（matcher: `*`）→ `mcp-health-check.js` 〔standard,strict〕
- **触发**：仅当工具是 MCP 工具时才探测（`tool_name` 以 `mcp__` 开头或显式 `server` 字段）。
- **流程**：读 `~/.claude/mcp-health-cache.json` → 健康缓存命中（TTL 默认 2 分钟）直接放行 → 否则探测：HTTP/SSE server 走 GET（200/3xx/400/401/403/405/406 都算"可达"）；command server 实际 spawn（timeout 内未退出=健康）→ 不健康时指数退避（默认 30s 起，最大 10 分钟）。
- **阻塞**：⚠️ **条件阻塞**——探测不健康且未配 fail-open → `exit 2`（让 Claude 回退非 MCP 工具）。
- **作用**：MCP 调用前健康探测，避免请求发给死服务器；状态持久化抵抗压缩。
- **开关**：`ECC_MCP_HEALTH_FAIL_OPEN=1`（默认 fail-closed）、`ECC_MCP_HEALTH_TTL_MS`、`ECC_MCP_HEALTH_TIMEOUT_MS`、`ECC_MCP_RECONNECT_<SERVER>`/`ECC_MCP_RECONNECT_COMMAND`。

#### 3.1.8 `pre:edit-write:gateguard-fact-force`（matcher: Edit|Write|MultiEdit，timeout 5）→ `gateguard-fact-force.js` 〔standard,strict〕
- **触发**：`.claude/settings*.json` 与子代理调用直接放行；其余文件首次编辑/创建触发。
- **流程**：读 `~/.gateguard/state-<sessionKey>.json` 的 `checked` 数组 → 未 checked 过则 `markCheckedAndCountDenial` + 计数 → 拒绝并要求陈述四项事实（edit：列 importers/受影响 public API/数据 schema/引用用户原话；write：列调用点/确认无同类文件/schema/原话）→ 重试同一文件（已 checked）总放行（"present facts then retry"）。denial 计数 > 3（`GATEGUARD_FACT_FORCE_FULL_DENIALS`）后改精简单行提示，防退化循环。
- **阻塞**：**软阻塞**（`permissionDecision:deny` + `exit 0`）。状态写失败时 `allowWithStateWarning()`（stderr 警告 + 放行，防 retry 死循环）。
- **作用**：第一次动每个文件前强制调查事实——"investigation creates awareness"。
- **开关**：`ECC_GATEGUARD=off`（或 `GATEGUARD_DISABLED=1`）全局禁用；`GATEGUARD_STATE_DIR`；`GATEGUARD_FACT_FORCE_FULL_DENIALS`（默认 3）。

---

### 3.2 PreCompact

#### 3.2.1 `pre:compact`（matcher: `*`）→ `pre-compact.js` 〔全 profile，无门控〕
- **触发**：PreCompact 事件（context 即将被压缩前）。
- **流程**：找 active session 文件 → 若有 `transcript_path`，调 `lib/llm-summary.js` 的 `generateSessionSummary`（抽最近 25 轮、user 400/assistant 600 字符、整体 7000 字符，构造 prompt 调 `claude --model <ECC_LLM_SUMMARY_MODEL|haiku> -p`，90s timeout，子进程 env 设 `ECC_SKIP_LLM_SUMMARY=1` 防递归）→ 用 `<!-- ECC:SUMMARY:START/END -->` marker 替换或追加摘要到 session 文件。
- **阻塞**：对 compaction 不阻塞（`exit 0`）；但脚本内部 spawnSync 90s 同步等待 LLM。
- **作用**：压缩前快照保存，让下次 session-start 拿到压缩前的 LLM 摘要。
- **开关**：`ECC_SKIP_LLM_SUMMARY=1` 跳过 LLM；`ECC_LLM_SUMMARY_MODEL`（默认 haiku）。
- **关联**：与 `suggest-compact`（建议压缩）形成对偶；写入的 `.tmp` 文件被下次 `session:start` 读取。

---

### 3.3 SessionStart

#### 3.3.1 `session:start`（matcher: `*`）→ `session-start-bootstrap.js` → `session-start.js` 〔全 profile〕
- **触发**：新会话启动 / `--resume` / `/clear` / compact 后。bootstrap 仅解析 plugin root，业务全在 `session-start.js`。
- **流程**：
  1. 解析 `source` 字段映射为 `startup`/`resume`/`clear`/`compact`；**仅 `startup` 模式注入上次会话摘要**。
  2. `pruneExpiredSessions`：删 mtime 超 `ECC_SESSION_RETENTION_DAYS`（默认 30 天）的 `*-session.tmp`。
  3. `writeSessionLease`：写 `<projectDir>/.observer-sessions/<sessionId>.json`。
  4. 组装 `additionalContext`：`summarizeActiveInstincts`（confidence ≥ 0.7，最多 6 条）+ 上次会话摘要（按 `**Worktree:**` 头精确匹配 cwd，包 `HISTORICAL REFERENCE ONLY` 块防 stale replay）+ `summarizeLearnedSkills`（最多 6 条）+ 项目类型。
  5. 截断到 `ECC_SESSION_START_MAX_CHARS`（默认 8000）。
  6. **始终运行** `getPackageManager()`（env → `.claude/package-manager.json` → `packageManager` 字段 → lock 文件 → 默认 npm）。
- **阻塞**：同步阻塞 SessionStart（bootstrap 内 spawnSync timeout 30s）；错误不阻塞（`exit 0`）。
- **输出**：JSON `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":...}}`。
- **开关**：`ECC_SESSION_START_CONTEXT=off` 关注入；`ECC_SESSION_START_MAX_CHARS`；`ECC_SESSION_RETENTION_DAYS`；`CLAUDE_PACKAGE_MANAGER`；`ECC_INSTINCT_CONFIDENCE_THRESHOLD`；`ECC_MAX_INJECTED_INSTINCTS`。
- **关联**：读 `stop:session-end`/`pre:compact` 写的 `.tmp`；写 observer lease 给 `session:end:marker` 删。
- **⚠️ 部署注意**：`session-start.js` 在 `install-src/scripts/hooks/` 中**不存在**，存在于仓库根 `scripts/hooks/session-start.js`。定制安装须确保该文件随包部署到 plugin root 解析得到的位置。

---

### 3.4 PostToolUse

---

#### 3.4.1 `post:bash:dispatcher`（matcher: Bash，async，timeout 30）→ `post-bash-dispatcher.js` + `bash-hook-dispatcher.js`

**聚合调度器**，按 `POST_BASH_HOOKS` 顺序逐个 `isHookEnabled`。分发到 4 个子 hook：

##### (a) `post:bash:command-log-audit` → `post-bash-command-log.js`（mode=`audit`）〔standard,strict〕
- **流程**：`sanitizeCommand` 脱敏（`--token=`/`Authorization:`/`AKIA*`/`password=`/GitHub token/换行）→ 追加 `[<ISO>] <命令>` 到 `~/.claude/bash-commands.log`。
- **阻塞**：永不阻塞（pass-through）。

##### (b) `post:bash:command-log-cost` → `post-bash-command-log.js`（mode=`cost`）〔standard,strict〕
- **流程**：同上脱敏 → 追加 `[<ISO>] tool=Bash command=<命令>` 到 `~/.claude/cost-tracker.log`。
- **注意**：此 `cost-tracker.log` ≠ `metrics/costs.jsonl`（后者由 `stop:cost-tracker` 写），勿混淆。

##### (c) `post:bash:pr-created` → `post-bash-pr-created.js` 〔standard,strict〕
- **触发**：命令匹配 `gh pr create`，且 `tool_output` 中能正则匹配 PR URL。
- **流程**：stderr 输出 `[Hook] PR created: <url>` + `To review: gh pr review <num> --repo <owner/repo>`。
- **阻塞**：永不阻塞。

##### (d) `post:bash:build-complete` → `post-bash-build-complete.js` 〔standard,strict〕
- **触发**：命令匹配 `npm run build`/`pnpm build`/`yarn build`。
- **流程**：stderr 打印 `[Hook] Build completed - async analysis running in background`。⚠️ **实际未启动任何后台分析**（注释是历史遗留，代码没 spawn 子进程）。
- **作用**：给"构建完成"的语义信号。

---

#### 3.4.2 `post:quality-gate`（matcher: Edit|Write|MultiEdit，async，timeout 30）→ `quality-gate.js` 〔standard,strict〕
- **触发**：按扩展名分支；路径不存在直接 return。
- **流程**：`lib/resolve-formatter.js` 探测 formatter——Biome（JS/TS 文件 skip，注释说已由 `post-edit-format.js` 处理；仅 `.json/.md` 跑 `biome check [--write]`）/ Prettier（`prettier --check|--write`）/ 都无则 return。`.go` 跑 `gofmt -w|-l`，`.py` 跑 `ruff format [--check]`。内部 spawnSync timeout 15s。
- **阻塞**：永不阻塞；仅 `ECC_QUALITY_GATE_STRICT=true` 且 check 非零时写 stderr。
- **开关**：`ECC_QUALITY_GATE_FIX=true`（自动修复 `--write`）；`ECC_QUALITY_GATE_STRICT=true`（失败打 stderr）。

#### 3.4.3 `post:edit:design-quality-check`（matcher: Edit|Write|MultiEdit，timeout 10）→ `design-quality-check.js` 〔standard,strict〕
- **触发**：扩展名 `.astro/.css/.html/.jsx/.scss/.svelte/.tsx/.vue`。
- **流程**：6 个 `GENERIC_SIGNALS` 正则扫（"Get Started"/"Learn more" CTA、`grid-cols-(3|4)`、`bg-gradient-to-*`、`text-center`、`font-(sans|inter)`）→ 命中则 stderr 输出前端文件清单 + 设计 checklist + 命中信号。
- **阻塞**：永不阻塞（提示性）。
- **作用**：对前端编辑施加"反 AI 通用模板味"提醒，不调远程模型。

#### 3.4.4 `post:edit:accumulator`（matcher: Edit|Write|MultiEdit）→ `post-edit-accumulator.js` 〔standard,strict〕
- **触发**：仅扩展名 `.ts/.tsx/.js/.jsx`。
- **流程**：`getAccumFile()` = `os.tmpdir()/ecc-edited-<sessionId>.txt`（sessionId 取 `CLAUDE_SESSION_ID`，缺失用 `sha1(cwd).slice(0,12)`）→ `appendFileSync` 每行一个绝对路径，**不去重**（dedup 推迟到 Stop）。
- **阻塞**：永不阻塞。
- **关联**：⚠️ **关键数据流**——累积的文件被 `stop:format-typecheck` 读取后批量 format+tsc 并删除该 tmp 文件。

#### 3.4.5 `post:edit:console-warn`（matcher: Edit）→ `post-edit-console-warn.js` 〔standard,strict〕
- **触发**：仅 Edit（不覆盖 Write/MultiEdit）；扩展名 `.ts/.tsx/.js/.jsx`。
- **流程**：读文件全文按行扫 `console.log`，命中记录 `<行号>: <行>`（最多 5 条）。
- **阻塞**：永不阻塞；stderr 提醒 commit 前移除。
- **实现**：无 `module.exports.run`，走 spawnSync 子进程路径（不享受 require 优化）。

#### 3.4.6 `post:governance-capture`（matcher: Bash|Write|Edit|MultiEdit，timeout 10）→ `governance-capture.js` 〔standard,strict，需 `ECC_GOVERNANCE_CAPTURE=1`〕
- 与 §3.1.5 共享同一脚本，`CLAUDE_HOOK_EVENT_NAME` 区分阶段。Post 视角额外触发 `security_finding`（仅 post 阶段 + Bash + `sudo`/`chmod`/`chown`）。默认关闭，永不阻塞。

#### 3.4.7 `post:session-activity-tracker`（matcher: `*`，timeout 10）→ `session-activity-tracker.js` 〔standard,strict〕
- **触发**：`CLAUDE_HOOK_EVENT_NAME === 'PostToolUse'` + `tool_name` 非空 + `ECC_SESSION_ID`/`CLAUDE_SESSION_ID` 非空，三者缺一不写。
- **流程**：递归抽 `FILE_PATH_KEYS` 的文件事件 → 构造 diff/patch 预览（`git diff --unified=1`，最多 6 行）→ `redactSecrets` 脱敏 + `truncateSummary(220)` → append 一行 JSON 到 `~/.claude/metrics/tool-usage.jsonl`。
- **阻塞**：永不阻塞。
- **关联**：与 `ecc-metrics-bridge` 互补——本 hook 写**逐调用明细 JSONL**，bridge 写**会话聚合 JSON**。

#### 3.4.8 `post:observe:continuous-learning`（matcher: `*`，async，timeout 10）→ `observe-runner.js` 〔standard,strict〕
- 与 §3.1.4 共享 `observe-runner.js`，hookId 前缀取 `post`。永不阻塞。

#### 3.4.9 `post:ecc-metrics-bridge`（matcher: `*`，timeout 10）→ `ecc-metrics-bridge.js` 〔**minimal,standard,strict**〕
- **触发**：必须能解析 sessionId，否则 pass-through no-op。**所有 profile 都启用**（少数之一）。
- **流程**（每次工具调用都跑）：`readBridge(sessionId)` 读 `/tmp/ecc-metrics-<sessionId>.json` → `tool_count++`、`recent_tools` 环形缓冲（容量 5，`hashToolCall`：Bash 哈希命令前 160 字符，Edit/Write 哈希整个 payload 防误判）、`files_modified`（≤200）→ `readSessionCost` 全量扫 `costs.jsonl` 取最后一条匹配 → `writeBridgeAtomic`（tmp + rename，Windows 下 `renameWithRetry` 对 EPERM/EACCES/EBUSY 重试 5 次）。
- **阻塞**：永不阻塞。
- **关联**：⚠️ **核心数据流**——本 hook 是 `/tmp/ecc-metrics-<sessionId>.json` 的唯一写入者；`ecc-context-monitor` 和外部 statusline 读它。`context_remaining_pct` 字段本 hook 只初始化为 null，实际值依赖外部 statusline 写入。

#### 3.4.10 `post:ecc-context-monitor`（matcher: `*`，timeout 10）→ `ecc-context-monitor.js` 〔standard,strict〕
- **触发**：sessionId 必须存在；`readBridge` 读不到则 pass-through。
- **流程**：`bridge.last_timestamp` 超 60s 则 `context_remaining_pct` 临时置 null；`evaluateConditions` 按严重度评估——**context**（≤25% sev3 `CONTEXT CRITICAL` 含强指令"告知用户 context 不足、不要自主保存状态"；≤35% sev2）、**cost**（>$50 sev3 />$10 sev2 />$5 sev1，**均标注 "Informational only — not an instruction to stop"**）、**scope**（files_modified >20 sev2）、**loop**（`recent_tools` 同一 `tool:hash` ≥3 次 sev2）→ 去重（`/tmp/ecc-ctx-warn-<sid>.json`，文本变化才发）→ 取 top 2 合并输出 `{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":...}}`。
- **阻塞**：永不阻塞（纯 advisory）。
- **关键设计**：告警 ≠ 指令；唯一带强指令性的是 context critical。这是 PostToolUse 中**唯一真正注入模型上下文**的 hook。
- **开关**：`ECC_CONTEXT_MONITOR_COST_WARNINGS`（默认 true）。

---

### 3.5 PostToolUseFailure

#### 3.5.1 `post:mcp-health-check`（matcher: `*`）→ `mcp-health-check.js`（失败分支）〔standard,strict〕
- **触发**：PostToolUseFailure 事件 + 能解析出 MCP target。
- **流程**：`failureSummary` 拼错误文本 → `detectFailureCode` 匹配 401/403/429/503/transport → 一个都没匹配则 pass-through → 否则 `markUnhealthy`（`failureCount++` + 指数退避 `nextRetryAt`）写 `mcp-health-cache.json` → `attemptReconnect`（读 `ECC_MCP_RECONNECT_<SERVER>`/`ECC_MCP_RECONNECT_COMMAND`，支持 `{server}` 占位符；未配置则跳过）→ 重连成功后 re-probe，成功则 `markHealthy` 标 `restoredBy: 'post-failure-reconnect'`。
- **阻塞**：**PostToolUseFailure 分支永不阻塞**（工具调用已失败，hook 只负责记录+重连）。对照：PreToolUse 分支会 `exit 2` 阻断。
- **关联**：与 `pre:mcp-health-check` 共享 `mcp-health-cache.json`。

---

### 3.6 Stop（每次 Claude 回应结束触发）

#### 3.6.1 `stop:format-typecheck`（matcher: `*`，timeout 300）→ `stop-format-typecheck.js` 〔standard,strict〕
- **触发**：每次 Stop；profile standard/strict（minimal 排除以省延迟）。
- **流程**：`getAccumFile()` 读 accumulator → **读完立即 unlink**（防重复 Stop 双跑）→ 去重 → `.ts/.tsx/.js/.jsx` 按 project root 分组（`findProjectRoot` 找 package.json/biome.json/.prettierrc），`.ts/.tsx` 额外按 tsconfig dir 分组 → 预算分配 `TOTAL_BUDGET_MS=270000`（给 300s harness timeout 留余量）→ 每组一次 `biome check --write`/`prettier --write`（优先 `node_modules/.bin/<bin>`）→ 每组一次 `npx tsc --noEmit --pretty false`，失败按文件过滤输出（每文件最多 10 行）。
- **阻塞**：⚠️ **唯一同步阻塞的 Stop hook**（未设 async），最多占用 300s。但因按 project root/tsconfig 分组，monorepo 多项目不串行累加。
- **作用**：每轮回应结束一次性批量 format+tsc，把 tsc 错误反馈给 Claude 下轮修正；accumulator 使一轮内多次 Edit 只跑一次。
- **关联**：上游 `post:edit:accumulator`（接口契约：两边用完全相同的 `getAccumFile()`）。

#### 3.6.2 `stop:check-console-log`（matcher: `*`）→ `check-console-log.js` 〔standard,strict〕
- **流程**：`git diff --name-only HEAD` 过滤 JS/TS → 排除 `.test./.spec./.config./scripts//__tests__/__mocks__` → 读文件含 `console.log` 则 stderr 提醒。
- **阻塞**：永不阻塞（fail-open）。无 `module.exports.run`，走 spawnSync。

#### 3.6.3 `stop:session-end`（matcher: `*`，async，timeout 10）→ `session-end.js` 〔全 profile〕
- **触发**：每次 Stop（虽叫 session-end，但每次回应都触发）。
- **流程**：解析 `transcript_path` → `shortId`（从 transcript UUID 取最后 8 字符，保证父子会话不撞文件名 #1494）→ `extractSessionSummary`（最后 10 条用户消息各 200 字符 + 工具名 ≤20 + 改过文件 ≤30）→ LLM summary 触发判定（context remaining <20% 或 用户消息数 %50==0）→ 调 `generateSessionSummary`（90s timeout）→ 幂等合并到 `~/.claude/session-data/<date>-<shortId>-session.tmp`（marker regex 替换或新建，含 `**Project:**`/`**Branch:**`/`**Worktree:**` 头字段）。
- **阻塞**：`async:true`，harness 不等待；绝不阻塞。
- **关联**：⚠️ **会话连续性核心**——下次 `session:start` 按 `**Worktree:**` 头匹配注入。

#### 3.6.4 `stop:evaluate-session`（matcher: `*`，async，timeout 10）→ `evaluate-session.js` 〔全 profile〕
- **流程**：读 `skills/continuous-learning/config.json`（`min_session_length` 默认 10）→ 数用户消息数 → 足够长则 stderr 信号 `[ContinuousLearning] Session has N messages - evaluate for extractable patterns` + 保存路径。**不写任何文件**。
- **作用**：给 Claude 信号，让其主动调 continuous-learning skill 提取可复用模式到 `~/.claude/skills/learned/`。
- **关联**：产出的 learned skills 被 `session:start` 的 `summarizeLearnedSkills` 读取。

#### 3.6.5 `stop:cost-tracker`（matcher: `*`，async，timeout 10）→ `cost-tracker.js` 〔全 profile〕
- **流程**：`sumUsageFromTranscript` 扫 JSONL 累加 `usage.{input,output,cache_creation,cache_read}_tokens` → `getRates(model)` 查硬编码费率（haiku/sonnet/opus）算 `transcriptCostUsd` → **harness cost 优先**：读 `<tmpdir>/harness-cost-<sessionId>.json`（≤300s）用其 `cost_usd` 替代估算（能正确反映 Opus >200K 2x tier、避免 --resume 重复累加）→ append 一行到 `~/.claude/metrics/costs.jsonl`。
- **阻塞**：`async:true`；绝不阻塞。
- **关联**：statusline 渲染时把 `{ts, cost_usd}` 写到 harness-cost cache，本 hook 优先采用（harness-cost contract），让两者数值一致。同一 session 的多行是**累计快照**，取每 session_id 最后一行得总会话成本。

#### 3.6.6 `stop:desktop-notify`（matcher: `*`，async，timeout 10）→ `desktop-notify.js` 〔standard,strict〕
- **流程**：`extractSummary`（取 `last_assistant_message` 首个非空行截断 100 字符）→ macOS：iTerm2/Ghostty 且非 tmux 下用 OSC 9 转义序列写到进程树上游的 tty（通知归属该终端 tab，点击聚焦），否则 fallback `osascript display notification`；WSL 调 `New-BurntToastNotification`；Linux no-op。
- **阻塞**：`async:true`；osascript/PowerShell 各 5s timeout；fail-open。
- **⚠️ 注意**：用户常以为的 `ECC_DESKTOP_NOTIFY` 在源码中**不存在**；关闭只能靠 profile=minimal 或 `ECC_DISABLED_HOOKS=stop:desktop-notify`。

---

### 3.7 SessionEnd

#### 3.7.1 `session:end:marker`（matcher: `*`，async，timeout 10）→ `session-end-marker.js` 〔全 profile〕
- **触发**：SessionEnd（会话真正结束，**不是每次回应**）。
- **流程**：`resolveProjectContext`（git remote URL sha256 前 12 字符作 projectId）→ `removeSessionLease` 删当前会话的 lease → `listSessionLeases` 看剩余 → 若 0 则 `stopObserverForContext`（读 `.observer.pid`，校验 pid 存活，SIGTERM，删 pid/signal-counter 文件）；还有 lease 则保留 observer。
- **阻塞**：`async:true`；require 路径无 spawnSync timeout；绝不阻塞。
- **作用**：会话结束清理 observer 引用计数，最后退出才停后台 observer，避免僵尸进程。
- **关联**：与 `session:start`（写 lease）配对。
- **开关**：`CLAUDE_PROJECT_DIR`、`CLV2_HOMUNCULUS_DIR`/`XDG_DATA_HOME`。

---

## 4. 跨 Hook 数据流图

### 4.1 批量格式化链
```
PostToolUse(Edit|Write|MultiEdit)
  └─ post:edit:accumulator append 到 $TMPDIR/ecc-edited-<sid>.txt（每行一个 .ts/.tsx/.js/.jsx 绝对路径）
       │ (本轮回应结束)
       ▼
Stop
  └─ stop:format-typecheck 读 + unlink accumulator
       └─ 按 project root 分组 → 每组一次 formatter --write
       └─ 按 tsconfig dir 分组 → 每组一次 tsc --noEmit
```
**接口契约**：两边用完全相同的 `getAccumFile()`（基于 `CLAUDE_SESSION_ID` 或 `sha1(cwd).slice(0,12)`）。

### 4.2 会话连续性
```
stop:session-end (每次回应)                    pre:compact (压缩前)
  └─ 写 session-data/<date>-<shortId>-session.tmp   └─ 补 LLM 摘要到同一文件
     头字段: **Worktree:** = normalizePath(cwd)
     内容: <!-- ECC:SUMMARY:START --> ... <!-- END -->
       │ (下次启动同 worktree)
       ▼
session:start (会话启动)
  └─ dedupeRecentSessions 扫描（7 天窗口）→ selectMatchingSession 按 **Worktree:** 头匹配
     └─ 命中 → 包入 HISTORICAL REFERENCE ONLY 块 → additionalContext → 注入新会话
```
**约束**：7 天匹配窗口；30 天清理周期；`HISTORICAL REFERENCE ONLY` 包装防 compact 后回放旧 ARGUMENTS（#1534）。

### 4.3 成本与指标
```
Claude Code harness
  ├── Stop → stop:cost-tracker
  │     ├─ 读 transcript JSONL 累加 usage → 硬编码费率估算
  │     ├─ 读 $TMPDIR/harness-cost-<sid>.json (≤300s) ← statusline 写入（权威值）
  │     └─ append ~/.claude/metrics/costs.jsonl（每回应一行累计快照）
  │
  ├── PostToolUse(*) → post:ecc-metrics-bridge
  │     └─ 维护 $TMPDIR/ecc-metrics-<sid>.json（运行中聚合，原子写）
  │           ↑ 读 costs.jsonl 取最后一条匹配（成本同步）
  │
  └── PostToolUse(*) → post:ecc-context-monitor
        └─ 读 ecc-metrics-<sid>.json → 评估 context/cost/scope/loop → 注入告警
```
**区分**：`costs.jsonl`（历史账本，append-only）vs `ecc-metrics-<sid>.json`（当前会话实时聚合）vs `harness-cost-<sid>.json`（statusline→cost-tracker 反向通道）。

### 4.4 Observer 引用计数
```
session:start → writeSessionLease → <projectDir>/.observer-sessions/<sid>.json
       │ (会话期间 observer 进程通过 .observer.pid 持续运行)
       ▼
session:end:marker → removeSessionLease → 若空 → SIGTERM observer
```
多会话并发：每个会话有自己的 lease，**最后一个退出**才停 observer。

### 4.5 MCP 健康
```
pre:mcp-health-check (调用前探测) ──┐
   写/读 ~/.claude/mcp-health-cache.json（TTL 缓存 + 退避）
                                    │ 共享状态
post:mcp-health-check (失败后) ─────┘
   标记 unhealthy + attemptReconnect → 成功后 re-probe + markHealthy
```

---

## 5. 使用建议（核心）

### 5.1 按场景选 Profile

| 场景 | 推荐 profile | 理由 |
|---|---|---|
| **个人快速开发 / 试用** | `minimal` | 砍掉所有质量干预与提示注入，只保留 `block-no-verify` + 会话连续性 + 成本记录。延迟最低，几乎无干扰。 |
| **日常团队协作**（默认） | `standard` | 平衡防护与效率：GateGuard、config-protection、format-typecheck、console-warn、metrics 全开；仅最严的 commit-quality/tmux-reminder/push-reminder 关闭。 |
| **CI / 受控环境 / 高安全** | `strict` | 全开，含 commit 前质量闸门（error 时硬阻塞 commit）与 push 前 review 提醒。 |
| **MCP 重度依赖** | `standard` + 配置 reconnect | `mcp-health-check` 在 standard 已开；务必配 `ECC_MCP_RECONNECT_<SERVER>` 实现失败自动重连。 |

设置方式：在 `~/.claude/settings.json` 的 `env` 中写 `"ECC_HOOK_PROFILE": "strict"`，或 shell 环境变量。

### 5.2 推荐开启的默认环境变量

```jsonc
// ~/.claude/settings.json → env
{
  "ECC_HOOK_PROFILE": "standard",        // 基线
  "ECC_QUALITY_GATE_FIX": "true",        // 让 quality-gate 自动 --write 修复（默认只 --check）
  "ECC_GOVERNANCE_CAPTURE": "1",         // 启用治理事件采集（默认关闭）——若有外部审计需求才开
  // MCP（按需，SERVER 名大写）：
  "ECC_MCP_RECONNECT_COMMAND": "claude mcp reconnect {server}"
}
```

> `ECC_GOVERNANCE_CAPTURE=1` 会让 Pre/Post governance-capture 扫描每次工具调用的密钥/破坏性命令/敏感路径，写 stderr `[governance]` 行。仅在**有下游消费者**（SIEM/审计管线）时开启，否则只是产生无人读的日志。

### 5.3 性能调优

| 关注点 | 建议 |
|---|---|
| **Stop 回应变慢**（最大元凶） | `stop:format-typecheck` 是唯一同步阻塞 Stop hook，最多占 300s。要降延迟：① 切 `ECC_HOOK_PROFILE=minimal`；② 或 `ECC_DISABLED_HOOKS=stop:format-typecheck`（但会失去批量 format+tsc，转由 `post:quality-gate` 单文件处理）。 |
| **observe runner 超时** | 默认 9000ms（给 10s 外层留 1s）。`ECC_OBSERVE_RUNNER_TIMEOUT_MS` 调整；观察数据不重要时关 `pre:observe`/`post:observe` 两个 hook。 |
| **`*` matcher hook 过多** | `pre:observe`/`post:observe`/`pre:mcp-health-check`/`post:session-activity-tracker`/`post:ecc-metrics-bridge`/`post:ecc-context-monitor` 对**每个**工具调用都触发。想减负载优先评估这几个。 |
| **压缩建议太频繁/太少** | `COMPACT_CONTEXT_INTERVAL`（默认 60k token 一档）、`COMPACT_THRESHOLD`（默认 50 次调用）、`COMPACT_CONTEXT_THRESHOLD`（`=0` 关 token 主信号）。 |
| **MCP 探测拖慢首次调用** | `ECC_MCP_HEALTH_TTL_MS`（默认 2 分钟缓存）调大；或 `ECC_MCP_HEALTH_FAIL_OPEN=1` 探测失败也放行（牺牲安全换速度）。 |

### 5.4 安全相关：哪些 hook 会真正阻塞（操作前须知）

执行以下操作前，预期会被阻塞（除非禁用对应 hook 或切 minimal）：

- `git commit -m "..." --no-verify` 或 `git -c core.hooksPath=/dev/null commit` → **`pre:bash:block-no-verify` exit 2**。
- 修改现存的 `.eslintrc.*`/`biome.json`/`.prettierrc.*` 等 → **`pre:config-protection` exit 2**（首次创建放行）。
- MCP server 不健康时调用其工具 → **`pre:mcp-health-check` exit 2**（fail-closed）。
- `git commit` 含 `debugger`/硬编码密钥/格式错误 → **`pre:bash:commit-quality` exit 2**（仅 strict）。
- 首次编辑某文件 / 首次破坏性 Bash → **GateGuard 软阻塞**（`permissionDecision:deny`），陈述事实后重试即放行。

### 5.5 已知坑与回避方法

1. **commit-quality ↔ block-no-verify 引导冲突**：`pre:bash:commit-quality` 在仅 warning 时提示"用 `--no-verify` 跳过"，但 `pre:bash:block-no-verify` 会阻塞 `--no-verify`。
   - **回避**：不要用 `--no-verify`。要么修 warning，要么临时 `ECC_DISABLED_HOOKS=pre:bash:commit-quality` 整个关掉质量闸门（而非试图绕过 git 钩子）。

2. **`session-start.js` 部署缺失**：`session-start-bootstrap.js` 调用的 `session-start.js` 不在 `install-src/scripts/hooks/` 中，在仓库根 `scripts/hooks/`。
   - **回避**：定制安装/分发时，确保 `session-start.js` 随包部署到 plugin root 能解析到的位置，否则 `session:start` 退化为 no-op（bootstrap 会 stderr 报告并透传）。

3. **桌面通知关不掉？** 不存在 `ECC_DESKTOP_NOTIFY`。
   - **回避**：`ECC_DISABLED_HOOKS=stop:desktop-notify` 或 `ECC_HOOK_PROFILE=minimal`。

4. **Cursor 下数据位置不同**：`getClaudeDir()` 走 `resolveAgentDataHome()`，数据落在 `~/.cursor/ecc` 而非 `~/.claude`。
   - **回避**：查状态文件时用 `ECC_AGENT_DATA_HOME` 或检查 `.cursor/ecc-agent-data.json`；`CLV2_HOMUNCULUS_DIR`/`XDG_DATA_HOME` 也可覆盖。

5. **`pre:bash:dispatcher` 无法整体禁用**：它不经 run-with-flags。
   - **回避**：禁用具体子 hook id（如 `pre:bash:block-no-verify,pre:bash:commit-quality`）。

6. **GateGuard 在长会话中变"精简提示"**：denial 计数 > 3（`GATEGUARD_FACT_FORCE_FULL_DENIALS`）后改单行提示，是防退化循环的设计，非 bug。

7. **harness-cost 数值与 costs.jsonl 不一致**：cost-tracker 优先用 statusline 写的 harness-cost 缓存（≤300s）。若未配 statusline，则回退到 transcript 估算（可能偏高，不含 tier 折扣）。

### 5.6 精简/裁剪清单（降低延迟时优先关这些）

按"收益高、副作用小"排序：

1. `stop:format-typecheck`（300s 同步占用——最大单点延迟）→ 改由 `post:quality-gate` 单文件异步处理。
2. `pre:observe:continuous-learning` + `post:observe:continuous-learning`（每次工具调用都 spawn observe.sh）→ 不用 continuous-learning skill 时关。
3. `post:session-activity-tracker`（每次调用都 append + 可能 spawn git diff）→ 不看 tool-usage 明细时关。
4. `pre:edit-write:suggest-compact`（每次 Edit/Write 都读写计数文件）→ 自觉管理 context 时关。
5. `post:edit:design-quality-check`、`post:edit:console-warn`、`stop:check-console-log`（提示性，非必需）。

**不要关**的（基础设施）：`session:start`、`stop:session-end`、`session:end:marker`、`post:ecc-metrics-bridge`、`stop:cost-tracker`——它们支撑会话连续性与成本可见性，且开销很小。

---

## 6. 附录：环境变量速查表

### 6.1 全局调度

| 变量 | 默认 | 作用 |
|---|---|---|
| `ECC_HOOK_PROFILE` | `standard` | profile 档位 minimal/standard/strict |
| `ECC_DISABLED_HOOKS` | — | hook id 黑名单（逗号分隔，优先级最高） |
| `ECC_DRY_RUN` | — | `1` 干跑预览 |
| `ECC_HOOK_INPUT_MAX_BYTES` | 1MB | stdin 截断阈值 |
| `ECC_AGENT_DATA_HOME` | — | 覆盖数据根目录（替代 `~/.claude`） |

### 6.2 GateGuard（`gateguard-fact-force.js`）

| 变量 | 默认 | 作用 |
|---|---|---|
| `ECC_GATEGUARD` | — | `off/0/false/disabled` 全局禁用 |
| `GATEGUARD_DISABLED` | — | `1` 全局禁用 |
| `GATEGUARD_STATE_DIR` | `~/.gateguard` | 状态目录 |
| `GATEGUARD_FACT_FORCE_FULL_DENIALS` | 3 | 改精简提示的阈值 |
| `GATEGUARD_BASH_EXTRA_DESTRUCTIVE` | — | 追加破坏性命令正则（仅 Bash 分支） |
| `GATEGUARD_BASH_ROUTINE_DISABLED` | — | `1` 关闭 routine-bash gate（仅 Bash 分支） |

### 6.3 MCP 健康（`mcp-health-check.js`）

| 变量 | 默认 | 作用 |
|---|---|---|
| `ECC_MCP_HEALTH_FAIL_OPEN` | — | `1` 探测失败也放行（默认 fail-closed） |
| `ECC_MCP_HEALTH_TTL_MS` | 120000 | 健康缓存 TTL |
| `ECC_MCP_HEALTH_TIMEOUT_MS` | 5000 | 单次探测超时 |
| `ECC_MCP_HEALTH_BACKOFF_MS` | 30000 | 退避基数（最大 10 分钟） |
| `ECC_MCP_HEALTH_STATE_PATH` | `~/.claude/mcp-health-cache.json` | 状态文件 |
| `ECC_MCP_CONFIG_PATH` | — | MCP 配置搜索路径（delimiter 分隔） |
| `ECC_MCP_RECONNECT_COMMAND` | — | 重连命令模板（`{server}` 占位） |
| `ECC_MCP_RECONNECT_<SERVER>` | — | 特定 server 重连命令 |
| `ECC_MCP_RECONNECT_TIMEOUT_MS` | 5000 | 重连命令超时 |

### 6.4 压缩建议（`suggest-compact.js`）

| 变量 | 默认 | 作用 |
|---|---|---|
| `COMPACT_THRESHOLD` | 50 | tool 调用次信号首次触发 |
| `COMPACT_CONTEXT_THRESHOLD` | 160k@200k / 250k@1M | token 主信号阈值；`=0` 关主信号 |
| `COMPACT_CONTEXT_INTERVAL` | 60000 | bucket 步长 |
| `COMPACT_STATE_TTL_DAYS` | 14 | 计数文件保留天数 |

### 6.5 会话 / 摘要（`session-start.js` / `session-end.js` / `pre-compact.js`）

| 变量 | 默认 | 作用 |
|---|---|---|
| `ECC_SESSION_START_CONTEXT` | — | `off/0/false/none/disabled` 关 context 注入 |
| `ECC_SESSION_START_MAX_CHARS` | 8000 | 注入截断（`0` 也关） |
| `ECC_SESSION_RETENTION_DAYS` | 30 | session 文件清理周期（`0/off/...` 关清理） |
| `ECC_INSTINCT_CONFIDENCE_THRESHOLD` | 0.7 | instincts 注入置信度门槛 |
| `ECC_MAX_INJECTED_INSTINCTS` | 6 | 注入条数上限 |
| `CLAUDE_PACKAGE_MANAGER` | — | npm/pnpm/yarn/bun |
| `ECC_SKIP_LLM_SUMMARY` | — | `1` 跳过 LLM 摘要（含子进程递归防护） |
| `ECC_LLM_SUMMARY_MODEL` | haiku | 摘要模型 |
| `ECC_LLM_SUMMARY_INTERVAL` | 50 | session-end 的 LLM 摘要触发间隔 |
| `ECC_LLM_SUMMARY_CONTEXT_THRESHOLD` | 20 | session-end 的 context 触发阈值（%） |
| `CLAUDE_TRANSCRIPT_PATH` | — | transcript 路径 fallback |

### 6.6 质量门 / 观测 / 指标

| 变量 | 默认 | 作用 |
|---|---|---|
| `ECC_QUALITY_GATE_FIX` | — | `true` 自动 `--write` |
| `ECC_QUALITY_GATE_STRICT` | — | `true` 失败打 stderr |
| `ECC_GOVERNANCE_CAPTURE` | — | `1` 启用治理采集 |
| `ECC_CONTEXT_MONITOR_COST_WARNINGS` | true | context-monitor 的 cost 告警开关 |
| `ECC_OBSERVE_RUNNER_TIMEOUT_MS` | 9000 | observe runner 超时 |
| `ECC_OBSERVE_SKIP_PATHS` | `observer-sessions,.claude-mem` | observe.sh 跳过路径 |
| `ECC_OBSERVER_SIGNAL_EVERY_N` | 20 | observer 信号频率 |

### 6.7 Observer / 项目解析

| 变量 | 默认 | 作用 |
|---|---|---|
| `CLAUDE_PROJECT_DIR` | — | 覆盖 project root |
| `CLAUDE_SESSION_ID` / `ECC_SESSION_ID` | — | 会话 id（影响 tmp 文件名、lease、状态隔离） |
| `CLV2_HOMUNCULUS_DIR` / `XDG_DATA_HOME` | — | homunculus/observer 目录 |

---

> **校验说明**：本文所有断言均可回指到 `custom-install/aimeta3s/install-src/scripts/hooks/` 或 `scripts/lib/` 下的具体脚本。关键校验点：阻塞语义三态（§2.1）、profile 矩阵（§2.2）、五条数据流接口（§4）均与源码逐项核对；`session-start.js` 部署缺失（§5.5-2）已通过文件系统验证。

---

## 姊妹文档（aimeta3s 资料导航）

| 文档 | 主题 |
|---|---|
| `command-helper.md` | 命令总览、9 条流水线、选型决策树 |
| `skill-helper.md` | Skill 触发机制、相似抉择、34 张详解卡 |
| `agent-helper.md` | Agent 分工、协作关系、spawn 入口 |
| `rules-helper.md` | Rule 三种激活机制、跨语言矩阵、master checklist |
| `hooks-helper.md` | Hook 阻塞语义三态、profile 矩阵、数据流 |

> 这 5 份文档随 `docs/` 安装到 `~/.claude/aimeta3s/docs/`，供 `/aimeta3s-help` 命令按需读取；资源名→路径的精确映射见同目录 `manifest.json`。
