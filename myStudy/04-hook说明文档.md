# ECC hooks.json 完整解读

> 解读对象：[hooks/hooks.json](../hooks/hooks.json)（共 280 行）
> 范围：全部 7 个生命周期事件、22 个 hooks.json 注册条目（经 dispatcher 展开为 35 个业务检查单元）。
> 配套源码：[scripts/hooks/](../scripts/hooks/) 下的引导层与各业务脚本。

---

## 一、文件总览

`hooks.json` 顶层是 `{ "hooks": { <事件类型>: [...] } }`。Claude Code 在会话生命周期的 7 个节点上，按 `matcher` 命中并执行注册的命令。命中后可通过 **退出码 / stdout** 阻断、改写或放行工具调用。

| 事件类型 | 中文释义 | 注册条目数 | 能否阻断工具 |
|---|---|---|---|
| `PreToolUse` | 工具执行**前** | 8（其中 `pre:bash:dispatcher` 内含 6 子检查） | 是（exit≠0 或 stdout `permissionDecision:'deny'`） |
| `PreCompact` | 上下文压缩**前** | 1 | 否（仅保存状态） |
| `SessionStart` | 会话启动 | 2 | 否 |
| `PostToolUse` | 工具执行**后** | 2（sync/async 两个 dispatcher，内含 10 子检查） | 主要为通知/采集 |
| `PostToolUseFailure` | 工具执行**失败后** | 1 | 否 |
| `Stop` | 一次响应结束（交付门） | 7（含唯一阻断型 `stop:plan-canvas-pending`） | 可阻断交付 |
| `SessionEnd` | 会话结束 | 1 | 否 |

**合计 22 个 hooks.json 注册条目。** 其中 `pre:bash:dispatcher` 展开 6 个子检查、2 个 posttooluse dispatcher 合计展开 10 个子检查，故**实际业务检查单元共 35 个**。除两个 bash dispatcher 与 session-start 外，全部套同一套引导层；理解了引导层，22 个条目就只剩业务差异。

---

## 二、核心机制（所有钩子共用）

### 1. 三层调用链

每个 `command` 字段那段被复制了 N 次的超长内联 `node -e "..."`，本质是同一条链：

```
node -e "<解析根目录 + 改 argv + require bootstrap>"
       node  scripts/hooks/run-with-flags.js  <hookId>  <脚本相对路径>  <profiles>
```

- **第一层（`-e` 内联脚本）**：解析插件根目录 `CLAUDE_PLUGIN_ROOT`，把 bootstrap 路径塞进 `argv[1]`，再 `require(bootstrap)`。
- **第二层（[plugin-hook-bootstrap.js](../scripts/hooks/plugin-hook-bootstrap.js)）**：读 `argv[2]=mode`、`argv[3]=relPath`，做路径遍历校验后 `spawnSync` 一个干净子进程跑目标脚本，透传 stdin/stdout/退出码。
- **第三层（[run-with-flags.js](../scripts/hooks/run-with-flags.js)）**：按 `ECC_HOOK_PROFILE` / `ECC_DISABLED_HOOKS` 决定是否真跑；优先同进程 `require(script).run(raw)`（省一次 node 启动 50–100ms），遗留脚本才再 spawn。

### 2. 两种引导模式

并非所有事件都走 bootstrap。源码里有两种形态：

| 模式 | 适用事件 | 形态 | 失败时 |
|---|---|---|---|
| **bootstrap 模式** | PreToolUse、PreCompact、SessionStart（除 `session:start`）、PostToolUse、PostToolUseFailure | `-e` 只解析 root 并 `require(bootstrap)`；bootstrap 再 spawn 目标脚本 | **fail-open**：`exit(0)` + 透传原 stdin（见 [plugin-hook-bootstrap.js:226-259](../scripts/hooks/plugin-hook-bootstrap.js#L226-L259)，共 4 处 fail-open 分支：缺参数 / 未知 mode / catch / 执行失败） |
| **自举内联模式** | Stop、SessionEnd | `-e` 脚本**自己**读 stdin、解析 root、直接 `spawnSync(run-with-flags)`，不经 bootstrap | **fail-loud**：runner 出错时 `exit(1)` + `[Stop]/[SessionEnd] ERROR` 日志 |

> 注：SessionStart 的 `session:start` 是特例——`-e` 直接 `require(session-start-bootstrap.js)`，**不经 plugin-hook-bootstrap.js**（原因见下 2.3）。其余 SessionStart 条目（如 `session-start:plan-canvas-sessions`）仍走 bootstrap→run-with-flags。

> 为什么 Stop 要换模式？因为 Stop 是**交付门**（批量 typecheck/format、成本统计、状态持久化都在这），基础设施出问题必须可见，不能静默放行。bootstrap 的 fail-open 策略对它不合适。

### 3. 特例：SessionStart 的"二级引导"

[SessionStart](../hooks/hooks.json#L112-L123) 的 `session:start` command 末尾是 `node scripts/hooks/session-start-bootstrap.js`，于是链路是四层：

```
-e → bootstrap → session-start-bootstrap.js → run-with-flags(session:start) → session-start.js
```

为什么多一层独立文件？[session-start-bootstrap.js:4-27](../scripts/hooks/session-start-bootstrap.js#L4-L27) 的注释讲得很直白（`!org.isDirectory()` 的具体引用在 L11）：内联 `node -e` 时，shell 会对 JS 源码里的 `!` 做**历史展开**，触发 `SessionStart:startup hook error`。把逻辑挪进独立 `.js` 文件，shell 就再也看不到 JS 源码，`!` 才安全。

### 4. 插件根目录解析（那段超长 IIFE）

`-e` 脚本里的核心是一个 IIFE，按优先级探测根目录：

1. 环境变量 `CLAUDE_PLUGIN_ROOT` 已设置 → 直接用；
2. `~/.claude/scripts/lib/utils.js` 存在 → 根是 `~/.claude`（直接安装）；
3. 依次试已知安装目录：`plugins/ecc`、`plugins/ecc@ecc`、`plugins/marketplaces/ecc`、`plugins/everything-claude-code`、`plugins/everything-claude-code@everything-claude-code`、`plugins/marketplaces/everything-claude-code`；
4. 兜底扫 `plugins/cache/{ecc,everything-claude-code}/<owner>/<repo>/<version>/`；
5. 全失败 → 回退 `~/.claude`。

目的：让同一份 `hooks.json` 在**任意安装形态**（直装 / marketplace / cache 版本目录）下都能正确定位脚本。

### 5. profile 门控（run-with-flags）

每个钩子末尾的 `standard,strict` 是它启用的 profile 级别。[run-with-flags.js](../scripts/hooks/run-with-flags.js) 调 `isHookEnabled(hookId, {profiles})`，结合环境变量 `ECC_HOOK_PROFILE`（当前激活的级别）与 `ECC_DISABLED_HOOKS`（黑名单）决定跑不跑。三级：

- `minimal` — 最小安装也要跑的基础项（指标、生命周期标记）
- `standard` — 默认级别（`ECC_HOOK_PROFILE` 未设时的取值）
- `strict` — 最严格（更多提醒/阻断）

> 两个易忽略的判定细节：① 默认 profile 是 **`standard`**（非 minimal）；② 钩子**未声明 profiles 时默认匹配 `standard,strict`**（parseProfiles fallback）——即 minimal profile 下这些钩子**不运行**。判断某钩子在哪个 profile 生效，看它末尾标的是否含 `minimal`。

标了 `minimal,standard,strict` 的钩子（如 `ecc-metrics-bridge`、`session:end:marker`、`cost-tracker`）在**所有 profile** 下都跑。

### 6. fail-open 与 fail-closed 分工

- **基础设施层**（bootstrap / run-with-flags）：一律 fail-open。任何解析/执行错误都 `exit 0` + 透传，绝不因钩子自身故障阻断工具（对应 node.md 规则"hook 必须在非关键错误时 exit 0"）。
- **业务层安全钩子**：`config-protection`、`mcp-health-check` fail-closed（主动阻断）；`gateguard-fact-force` 正常时阻断、**state 写入失败时 fail-open**（避免永久重试死循环）。详见第三节各表。
- **stdin 超长**（>1MB，`MAX_STDIN` 见 [run-with-flags.js:17](../scripts/hooks/run-with-flags.js#L17)）：不回显截断 JSON（半截 JSON 会被 harness 当钩子失败），改空 stdout+exit 0（`sanitizeEcho`，逻辑在 L157-166），但把 `truncated` 标志经 ctx / `ECC_HOOK_INPUT_TRUNCATED` 传给 hook（L227-233 / L252），让安全类钩子可自行选择阻断。

### 7. 性能优化手段汇总

- **Bash / PostToolUse 预检后处理合并**到 dispatcher（这两类调用极频繁，合并到单次 node 进程避免多次 spawn）；
- **async 钩子**（`"async": true`）不阻塞主流程；
- run-with-flags **优先 `require(run)` 同进程执行**，省一次 node 启动；
- 每层都有 `timeout`，最大 300s（`stop:format-typecheck` 的 typecheck）。

---

## 三、22 个注册条目总表

> 列说明：① 事件类型 ② 钩子 ID（`ECC_DISABLED_HOOKS` 操作的 key）③ matcher ④ 触发条件 ⑤ 作用 / 最终效果 ⑥ 执行链路与最终脚本。链路中「RW」= run-with-flags.js。PostToolUse 表改按「子检查」组织（含 profile / 分发组列）、Stop 表额外含 profile 列，见表头。

### PreToolUse（工具执行前，可阻断）

> 8 个钩子**全部 profile=`standard,strict`**（minimal 下不运行）。阻断语义：可经 exit≠0，**或** stdout 返回 `permissionDecision:'deny'`（exit 0）实现。

| 事件 | 钩子 ID | matcher | 触发条件 | 作用 / 效果 | 执行链路 → 最终脚本 |
|---|---|---|---|---|---|
| PreToolUse | `pre:bash:dispatcher` | Bash | 即将执行任意 Bash 命令 | 合并预检：拦截 `--no-verify`、tmux/推送/提交提醒、GateGuard 事实强制；命中则阻断或注入上下文 | `-e`→bootstrap→[pre-bash-dispatcher.js](../scripts/hooks/pre-bash-dispatcher.js)→`bash-hook-dispatcher.js#runPreBash`（**不走 RW**，dispatcher 内置 profile 门控）→ 6 子检查 |
| PreToolUse | `pre:write:doc-file-warning` | Write | 写入文档类文件 | 仅对 9 个固定大写临时名（NOTES/TODO/SCRATCH/TEMP/DRAFT/BRAINSTORM/SPIKE/DEBUG/WIP）发警告，**exit 0 仅提醒** | `-e`→bootstrap→RW(`doc-file-warning.js#run`) |
| PreToolUse | `pre:edit-write:suggest-compact` | Edit\|Write | 编辑/写入文件 | 累积到阈值时建议手动 compact；**主信号是上下文 token 数**（200k 窗 160k / 1M 窗 250k，每 60k 提醒），工具次数（默认 50）仅弱代理 | …→RW(`suggest-compact.js#run`) |
| PreToolUse | `pre:observe:continuous-learning` | `*` | 任意工具调用前 | 异步采集工具使用观察数据用于学习 | …→RW(`observe-runner.js#run`)，**async** |
| PreToolUse | `pre:governance-capture` | Bash\|Write\|Edit\|MultiEdit | 治理相关工具调用 | 捕获密钥/策略违规/审批事件，事件落 **stderr**；**需 `ECC_GOVERNANCE_CAPTURE=1`**；恒不阻断 | …→RW(`governance-capture.js#run`) |
| PreToolUse | `pre:config-protection` | Write\|Edit\|MultiEdit | 改 lint/format 配置文件时 | **阻断**改配置（exit 2），逼 agent 修代码而非降标准（fail-closed）；**文件不存在（首次创建）放行** | …→RW(`config-protection.js#run`) |
| PreToolUse | `pre:mcp-health-check` | `*` | 调用 MCP 工具前 | 仅对 `mcp__` 开头工具生效；server 不健康则**阻断**（默认 fail-closed exit 2，`ECC_MCP_HEALTH_FAIL_OPEN=1` 可改 fail-open） | …→RW(`mcp-health-check.js#run`) |
| PreToolUse | `pre:edit-write:gateguard-fact-force` | Edit\|Write\|MultiEdit | **每文件首次**编辑/写入 | **阻断**首次改动（stdout `permissionDecision:'deny'`+exit 0），要求先调查 importers / 数据 schema / 用户指令；"首次阻断、第二次放行"；**state 写入失败时 fail-open**；denial 预算前 3 次完整四要素、之后 condensed | …→RW(`gateguard-fact-force.js#run`) |

### PreCompact（上下文压缩前）

| 事件 | 钩子 ID | matcher | 触发条件 | 作用 / 效果 | 执行链路 → 最终脚本 |
|---|---|---|---|---|---|
| PreCompact | `pre:compact` | `*` | 上下文即将被压缩 | 压缩前保存会话状态，避免上下文丢失 | `-e`→bootstrap→RW(`pre-compact.js#run`) |

### SessionStart（会话启动）

| 事件 | 钩子 ID | matcher | 触发条件 | 作用 / 效果 | 执行链路 → 最终脚本 |
|---|---|---|---|---|---|
| SessionStart | `session:start` | `*` | 新会话启动 | 加载上次会话上下文 + 检测包管理器 | `-e`→bootstrap→[session-start-bootstrap.js](../scripts/hooks/session-start-bootstrap.js)→RW(`session:start`)→`session-start.js#run`（**四层**，独立文件规避 shell `!` 历史展开） |
| SessionStart | `session-start:plan-canvas-sessions` | `*` | 新会话启动 | 读 `~/.claude/plan-canvas/sessions.json`，展示最多 5 个 `status!='ended'` 的开放评审会话（文件名 + 未投递反馈数），提示用 `plan-canvas.js await/end` 恢复或关闭；无开放会话则空输出 exit 0 | `-e`→bootstrap→RW(`plan-canvas-sessions.js#run`)，profile=`standard,strict` |

### PostToolUse（工具执行后）

> hooks.json 只注册 **2 个 dispatcher 条目**（`post:dispatcher:sync` matcher `*` timeout 30；`post:dispatcher:async` matcher `*` **async** timeout 45）。下表 10 个是 [posttooluse-dispatcher.js](../scripts/hooks/posttooluse-dispatcher.js) **进程内** `require().run()` 分发的子检查（不 spawn、不走 RW，但用同一个 `isHookEnabled` 做 profile 门控）：7 个走 sync 进程、3 个走 async 进程。

| 子检查 ID | matcher | profile | 触发条件 | 作用 / 效果 | 分发组 |
|---|---|---|---|---|---|
| `post:edit:design-quality-check` | Edit\|Write\|MultiEdit | standard,strict | 前端文件编辑后 | 命中 6 类模板化信号（"Get Started"/"Learn more" CTA、`grid-cols-(3\|4)` 均匀卡片、渐变、`text-center`、默认字体）时警告设计漂移，不阻断 | sync |
| `post:edit:accumulator` | Edit\|Write\|MultiEdit | standard,strict | JS/TS 文件被编辑 | 记录路径到 `<tmp>/ecc-edited-<sessionId>.txt`，供 Stop 时批量 format+typecheck（读完即删） | sync |
| `post:edit:console-warn` | **仅 Edit** | standard,strict | 编辑后 | 警告新增 `console.log`（列行号） | sync |
| `post:governance-capture` | Bash\|Write\|Edit\|MultiEdit | standard,strict | 工具输出含治理事件 | 从工具**输出**捕获治理事件（与 Pre 配对，post 专属的 security_finding 如 sudo/chmod 在此触发）；事件落 stderr | sync |
| `post:session-activity-tracker` | `*` | standard,strict | 任意工具调用后 | 写一行 JSONL 到 `~/.claude/metrics/tool-usage.jsonl`（含密钥脱敏 + git diff 预览） | sync |
| `post:ecc-metrics-bridge` | `*` | **全开** | 任意工具调用后 | 维护运行期指标聚合（tool_count / files_modified / recent_tools 环形缓冲 / cost），供 statusline / context-monitor 消费 | sync |
| `post:ecc-context-monitor` | `*` | standard,strict | 任意工具调用后 | 注入 stdout JSON 警告：上下文 ≤35%/25%、成本 >$5/$10/$50、范围 >20 文件、工具循环 ≥5 次；不阻断 | sync |
| `post:bash:dispatcher` | Bash | 全开 | Bash 执行完 | 合并后处理：命令日志审计、命令成本、PR 创建通知、构建完成通知（**内联 `runPostBash`**，含 4 子检查） | async |
| `post:quality-gate` | Edit\|Write\|MultiEdit | standard,strict | 文件编辑后 | 轻量质量门；**Biome 项目里 .ts/.tsx/.js/.jsx 被跳过**（已由 format 处理），只跑 .json/.md/Prettier/gofmt/ruff；仅 `ECC_QUALITY_GATE_STRICT=true` 时输出 | async |
| `post:observe:continuous-learning` | `*` | standard,strict | 任意工具调用后 | 采集工具**结果**用于学习（与 Pre 配对） | async |

### PostToolUseFailure（工具执行失败后）

| 事件 | 钩子 ID | matcher | 触发条件 | 作用 / 效果 | 执行链路 → 最终脚本 |
|---|---|---|---|---|---|
| PostToolUseFailure | `post:mcp-health-check` | `*` | MCP 工具调用失败 | 记录失败、标记 server 不健康并尝试重连 | `-e`→bootstrap→RW(`mcp-health-check.js#run`) |

### Stop（一次响应结束 — 交付门）

> 全部走**自举内联模式**（不经 bootstrap），runner 失败时 `exit(1)` + `[Stop] ERROR`。

| 事件 | 钩子 ID | matcher | profile | 触发条件 | 作用 / 效果 | 执行链路 → 最终脚本 |
|---|---|---|---|---|---|---|
| Stop | `stop:plan-canvas-pending` | `*` | 全开 | 响应结束 | **唯一阻断型 Stop**：抽干 `sessions.json` 里未投递的浏览器反馈，抽到则 `{decision:'block'}` 要求 agent 当场处理并 `ecc-plan-canvas await --reply` 回复（`stop_hook_active=true` 防自锁）；排第一是为在 turn 真正结束前把人反馈塞回 | `-e`自举→`spawnSync(RW)`→`plan-canvas-pending.js#run`，timeout 30s |
| Stop | `stop:format-typecheck` | `*` | standard,strict | 每次响应结束 | 批量 format（Biome `check --write` / Prettier `--write`）+ typecheck（`tsc --noEmit`）本次响应编辑的 JS/TS（消费 `post:edit:accumulator` 累积的路径，读完即删）；内部预算 270s 留 30s 余量；排除插件 clone 路径；**timeout 300s** | …→`stop-format-typecheck.js#run` |
| Stop | `stop:check-console-log` | `*` | standard,strict | 响应结束 | 扫 git 改动的 JS/TS 文件（排除 test/spec/config 路径）里残留的 `console.log` | …→`check-console-log.js#run` |
| Stop | `stop:session-end` | `*` | 全开 | 响应结束（带 `transcript_path`） | 持久化会话状态到 `<date>-<shortId>-session.tmp`（shortId 取 transcript UUID 末 8 位，避免父子进程覆盖）；可选 LLM 摘要 | …→`session-end.js#run`，async |
| Stop | `stop:evaluate-session` | `*` | 全开 | 响应结束 | **仅 log 一条"该评估了"信号**（够 10 条消息才触发），不实际抽取模式 | …→`evaluate-session.js#run`，async |
| Stop | `stop:cost-tracker` | `*` | 全开 | 响应结束 | 累计 token / 成本到 `~/.claude/metrics/costs.jsonl`；优先用 statusline 写的 `harness-cost-*.json`（≤300s 新鲜）为权威值，fallback 才扫 transcript 估算（按 message.id 去重防膨胀） | …→`cost-tracker.js#run`，async |
| Stop | `stop:desktop-notify` | `*` | standard,strict | 响应结束 | 桌面通知（macOS 优先 OSC 9 转义，fallback osascript；WSL 用 BurntToast） | …→`desktop-notify.js#run`，async |

### SessionEnd（会话结束）

| 事件 | 钩子 ID | matcher | 触发条件 | 作用 / 效果 | 执行链路 → 最终脚本 |
|---|---|---|---|---|---|
| SessionEnd | `session:end:marker` | `*` | 会话真正结束 | 释放本会话的 observer 租约，无剩余租约则停观测器进程（hookId 叫 marker，实际是 observer 生命周期收尾，非"写标记文件"）；**profile 全开** | `-e`自举→`spawnSync(RW)`→`session-end-marker.js#run`，async |

---

## 四、三个 dispatcher 的内部子检查

ECC 把"频繁触发的预检/后处理"合并到单次 node 进程，省下多次 spawn 开销。共 3 个 dispatcher：

| dispatcher | 入口 | hooks.json 注册 | 子检查数 |
|---|---|---|---|
| `pre-bash-dispatcher` | `bash-hook-dispatcher.js#runPreBash` | `pre:bash:dispatcher`（PreToolUse, Bash）| 6 |
| `posttooluse-dispatcher` | `posttooluse-dispatcher.js#cli` | `post:dispatcher:sync` + `post:dispatcher:async`（PostToolUse, `*`）| 10（7 sync + 3 async）|
| post-bash（内嵌）| `bash-hook-dispatcher.js#runPostBash` | **不独立注册**，由 posttooluse-dispatcher 的 ASYNC_HOOKS 内联调用 | 4 |

> `post-bash-dispatcher.js` 文件存在但 hooks.json **未注册**（遗留备用入口）。三个 dispatcher 都**不 spawn run-with-flags**，而是同进程 `require().run()`，但门控用同一个 `isHookEnabled`（[hook-flags.js](../scripts/lib/hook-flags.js)），语义一致。

### `pre:bash:dispatcher` → 6 个子检查（[bash-hook-dispatcher.js:22-52](../scripts/hooks/bash-hook-dispatcher.js#L22-L52)）

| 子检查 ID | profile | 脚本 | 作用 |
|---|---|---|---|
| `pre:bash:block-no-verify` | minimal,standard,strict | `block-no-verify.js` | 拦截 `git commit --no-verify` 绕过钩子的行为 |
| `pre:bash:auto-tmux-dev` | standard,strict | `auto-tmux-dev.js` | 自动管理 tmux 开发环境 |
| `pre:bash:tmux-reminder` | strict | `pre-bash-tmux-reminder.js` | tmux 使用提醒 |
| `pre:bash:git-push-reminder` | strict | `pre-bash-git-push-reminder.js` | `git push` 前提醒 |
| `pre:bash:commit-quality` | strict | `pre-bash-commit-quality.js` | 提交质量检查 |
| `pre:bash:gateguard-fact-force` | standard,strict | `gateguard-fact-force.js` | 事实强制门（与 PreToolUse 同源逻辑） |

> 注：`auto-tmux-dev` 无显式 profiles 字段，按 parseProfiles fallback 等价 `standard,strict`（minimal 下不跑）——并非"全开"。

### post-bash（内嵌于 posttooluse-dispatcher ASYNC）→ 4 个子检查（[bash-hook-dispatcher.js:54-73](../scripts/hooks/bash-hook-dispatcher.js#L54-L73)）

| 子检查 ID | profile | 脚本 | 作用 |
|---|---|---|---|
| `post:bash:command-log-audit` | standard,strict | `post-bash-command-log.js`（mode=`audit`） | 命令日志审计 |
| `post:bash:command-log-cost` | standard,strict | `post-bash-command-log.js`（mode=`cost`） | 命令成本核算 |
| `post:bash:pr-created` | standard,strict | `post-bash-pr-created.js` | 检测到 `gh pr create` 成功时通知 |
| `post:bash:build-complete` | standard,strict | `post-bash-build-complete.js` | 检测构建完成并通知 |

> `command-log-audit` / `command-log-cost` 同样无显式 profiles，fallback 为 `standard,strict`。

### `posttooluse-dispatcher` → 10 个子检查

见[第三节 PostToolUse 表](#posttooluse工具执行后)。该 dispatcher 还自带一层门控：dispatcherId `post:dispatcher:${mode}` 用 `isHookEnabled(..., {profiles:'minimal,standard,strict'})` 判断整个 dispatcher 是否被禁用。

---

## 五、按时间顺序的生命周期视图

```
会话开始
  └─ SessionStart（2 个）
       · session:start ........... 加载上下文 / 探测包管理器
       · plan-canvas-sessions .... 展示开放评审会话
        │
        ▼  （用户每次发消息 → Claude 响应，循环）
  ┌─ PreToolUse（8 个，按 matcher 命中）── 可阻断
  │     · Bash → dispatcher → 6 子检查
  │     · 写文件 → config-protection / gateguard / suggest-compact / doc-warning
  │     · 全工具 → mcp-health-check / observe / governance
  │
  ├─ [工具执行]
  │
  ├─ PostToolUse（2 dispatcher → 10 子检查）── 通知 / 采集
  │     · Bash → post:bash:dispatcher → 4 子检查
  │     · 写文件 → quality-gate / design-check / accumulator / console-warn
  │     · 全工具 → metrics-bridge / context-monitor / activity-tracker / observe
  │
  ├─ PostToolUseFailure（失败时）→ mcp-health-check 标记不健康
  │
  ├─ [上下文将满]
  │   └─ PreCompact: pre:compact .......... 保存压缩前状态
  │
  └─ Stop（一次响应结束，交付门，7 个）
       · plan-canvas-pending（**阻断**）← 抽干未投递浏览器反馈
       · format-typecheck（批量，300s）← 消费 post:edit:accumulator 累积的路径
       · check-console-log
       · session-end / evaluate-session / cost-tracker（async，全 profile）
       · desktop-notify
        │
        ▼
会话结束
  └─ SessionEnd: session:end:marker ....... 释放 observer 租约 / 停观测器
```

---

## 六、设计要点小结

1. **一套运行时 + 22 个注册条目**：这段 `hooks.json` 不是一堆独立钩子，而是统一的「路径解析 → 引导 → 门控 → 执行」运行时，业务脚本挂在末端；3 个 dispatcher 再把高频检查展开为 35 个业务检查单元。
2. **路径无关**：那段丑陋的根目录探测 IIFE 让配置在直装 / marketplace / cache 版本目录等任意形态下都能工作。
3. **合并与异步降本**：Bash / PostToolUse 检查合并到 dispatcher（同进程 `require().run()`）；观测类钩子 async；PostToolUse 用 sync/async 两个 dispatcher 分流，run-with-flags 优先同进程执行。
4. **fail-open / fail-closed 分层**：基础设施 fail-open（绝不因自身故障阻断工具）；`config-protection` / `mcp-health-check` fail-closed；`gateguard` 正常时阻断、**state 写入失败时 fail-open**（避免永久重试死循环）；Stop 交付门 fail-loud（出错必可见）。阻断可经 exit≠0 或 stdout `permissionDecision:'deny'`（exit 0）。
5. **行为约束锚点**：`config-protection`（堵改配置降标准）、`gateguard-fact-force`（堵没调研就动手）、`block-no-verify`（堵绕钩子）、`design-quality-check`（堵模板化 UI）、`stop:plan-canvas-pending`（堵漏处理浏览器反馈）—— 共同把 "Think Before Coding / Surgical Changes / Simplicity First" 这些原则做成**硬约束**而非建议。
6. **可观测闭环**：Pre/Post 成对出现（observe、governance 各一对，事件落 stderr）；Post 累积的编辑路径在 Stop 被 format-typecheck 消费；metrics-bridge 把运行期指标喂给 context-monitor 和 statusline，形成"采集 → 聚合 → 反馈"的闭环。
7. **运维入口**：关闭某钩子 `ECC_DISABLED_HOOKS=<id>`；调级别 `ECC_HOOK_PROFILE=minimal|standard|strict`；试跑不生效 `ECC_DRY_RUN=1` 看 `[DryRun]` 预览。
