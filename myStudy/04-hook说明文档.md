# ECC hooks.json 完整解读

> 解读对象：[hooks/hooks.json](../hooks/hooks.json)（共 354 行）
> 范围：全部 7 个生命周期事件、28 个钩子。
> 配套源码：[scripts/hooks/](../scripts/hooks/) 下的引导层与各业务脚本。

---

## 一、文件总览

`hooks.json` 顶层是 `{ "hooks": { <事件类型>: [...] } }`。Claude Code 在会话生命周期的 7 个节点上，按 `matcher` 命中并执行注册的命令。命中后可通过 **退出码 / stdout** 阻断、改写或放行工具调用。

| 事件类型 | 中文释义 | 钩子数 | 能否阻断工具 |
|---|---|---|---|
| `PreToolUse` | 工具执行**前** | 8 | 是（exit≠0 或改 stdout） |
| `PreCompact` | 上下文压缩**前** | 1 | 否（仅保存状态） |
| `SessionStart` | 会话启动 | 1 | 否 |
| `PostToolUse` | 工具执行**后** | 10 | 主要为通知/采集 |
| `PostToolUseFailure` | 工具执行**失败后** | 1 | 否 |
| `Stop` | 一次响应结束（交付门） | 6 | 可阻断交付 |
| `SessionEnd` | 会话结束 | 1 | 否 |

**合计 28 个钩子。** 除两个 bash dispatcher 与 session-start 外，全部套同一套引导层；理解了引导层，28 个钩子就只剩业务差异。

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
| **bootstrap 模式** | PreToolUse、PreCompact、SessionStart、PostToolUse、PostToolUseFailure | `-e` 只解析 root 并 `require(bootstrap)`；bootstrap 再 spawn 目标脚本 | **fail-open**：`exit(0)` + 透传原 stdin（见 [plugin-hook-bootstrap.js:215-250](../scripts/hooks/plugin-hook-bootstrap.js#L215-L250)） |
| **自举内联模式** | Stop、SessionEnd | `-e` 脚本**自己**读 stdin、解析 root、直接 `spawnSync(run-with-flags)`，不经 bootstrap | **fail-loud**：runner 出错时 `exit(1)` + `[Stop]/[SessionEnd] ERROR` 日志 |

> 为什么 Stop 要换模式？因为 Stop 是**交付门**（批量 typecheck/format、成本统计、状态持久化都在这），基础设施出问题必须可见，不能静默放行。bootstrap 的 fail-open 策略对它不合适。

### 3. 特例：SessionStart 的"二级引导"

[SessionStart](../hooks/hooks.json#L112-L124) 的 command 末尾是 `node scripts/hooks/session-start-bootstrap.js`，于是链路是四层：

```
-e → bootstrap → session-start-bootstrap.js → run-with-flags(session:start) → session-start.js
```

为什么多一层独立文件？[session-start-bootstrap.js:9-27](../scripts/hooks/session-start-bootstrap.js#L9-L27) 的注释讲得很直白：内联 `node -e` 时，shell 会对 JS 源码里的 `!`（如 `!org.isDirectory()`）做**历史展开**，触发 `SessionStart:startup hook error`。把逻辑挪进独立 `.js` 文件，shell 就再也看不到 JS 源码，`!` 才安全。

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
- `standard` — 默认级别
- `strict` — 最严格（更多提醒/阻断）

标了 `minimal,standard,strict` 的钩子（如 `ecc-metrics-bridge`、`session:end:marker`、`cost-tracker`）在**所有 profile** 下都跑。

### 6. fail-open 与 fail-closed 分工

- **基础设施层**（bootstrap / run-with-flags）：一律 fail-open。任何解析/执行错误都 `exit 0` + 透传，绝不因钩子自身故障阻断工具（对应 node.md 规则"hook 必须在非关键错误时 exit 0"）。
- **业务层安全钩子**（`config-protection`、`gateguard-fact-force`）：fail-closed，主动阻断。
- **stdin 超长**（>1MB）：[run-with-flags.js:17,154-157](../scripts/hooks/run-with-flags.js#L17) 不回显截断 JSON（半截 JSON 会被 harness 当钩子失败），改空 stdout+exit 0，但把 `truncated` 标志传给 hook，让安全类钩子可自行选择阻断。

### 7. 性能优化手段汇总

- **Bash 预检/后处理合并**到单个 dispatcher（Bash 调用极频繁，避免多次 spawn node）；
- **async 钩子**（`"async": true`）不阻塞主流程；
- run-with-flags **优先 `require(run)` 同进程执行**，省一次 node 启动；
- 每层都有 `timeout`，最大 300s（`stop:format-typecheck` 的 typecheck）。

---

## 三、28 个钩子总表

> 列说明：① 事件类型 ② 钩子 ID（`ECC_DISABLED_HOOKS` 操作的 key）③ matcher ④ 触发条件 ⑤ 作用 / 最终效果 ⑥ 执行链路与最终脚本。链路中「RW」= run-with-flags.js。

### PreToolUse（工具执行前，可阻断）

| 事件 | 钩子 ID | matcher | 触发条件 | 作用 / 效果 | 执行链路 → 最终脚本 |
|---|---|---|---|---|---|
| PreToolUse | `pre:bash:dispatcher` | Bash | 即将执行任意 Bash 命令 | 合并预检：拦截 `--no-verify`、tmux/推送/提交提醒、GateGuard 事实强制；命中则阻断或注入上下文 | `-e`→bootstrap→[pre-bash-dispatcher.js](../scripts/hooks/pre-bash-dispatcher.js)→`bash-hook-dispatcher.js#runPreBash`（**不走 RW**，dispatcher 内置 profile 门控）→ 6 子检查 |
| PreToolUse | `pre:write:doc-file-warning` | Write | 写入文档类文件 | 对非标准文档文件发警告，**exit 0 仅提醒** | `-e`→bootstrap→RW(`doc-file-warning.js#run`) |
| PreToolUse | `pre:edit-write:suggest-compact` | Edit\|Write | 编辑/写入文件 | 累积到逻辑阈值时建议手动 compact 上下文 | …→RW(`suggest-compact.js#run`) |
| PreToolUse | `pre:observe:continuous-learning` | `*` | 任意工具调用前 | 异步采集工具使用观察数据用于学习 | …→RW(`observe-runner.js#run`)，**async** |
| PreToolUse | `pre:governance-capture` | Bash\|Write\|Edit\|MultiEdit | 治理相关工具调用 | 捕获密钥/策略违规/审批事件；**需 `ECC_GOVERNANCE_CAPTURE=1`** | …→RW(`governance-capture.js#run`) |
| PreToolUse | `pre:config-protection` | Write\|Edit\|MultiEdit | 改 lint/format 配置文件时 | **阻断**改配置，逼 agent 修代码而非降标准（fail-closed） | …→RW(`config-protection.js#run`) |
| PreToolUse | `pre:mcp-health-check` | `*` | 调用 MCP 工具前 | MCP server 不健康则**阻断**调用（matcher 是 `*`，脚本内按工具类型过滤） | …→RW(`mcp-health-check.js#run`) |
| PreToolUse | `pre:edit-write:gateguard-fact-force` | Edit\|Write\|MultiEdit | **每文件首次**编辑/写入 | **阻断**首次改动，要求先调查 importers / 数据 schema / 用户指令（fail-closed，强制 Think Before Coding） | …→RW(`gateguard-fact-force.js#run`) |

### PreCompact（上下文压缩前）

| 事件 | 钩子 ID | matcher | 触发条件 | 作用 / 效果 | 执行链路 → 最终脚本 |
|---|---|---|---|---|---|
| PreCompact | `pre:compact` | `*` | 上下文即将被压缩 | 压缩前保存会话状态，避免上下文丢失 | `-e`→bootstrap→RW(`pre-compact.js#run`) |

### SessionStart（会话启动）

| 事件 | 钩子 ID | matcher | 触发条件 | 作用 / 效果 | 执行链路 → 最终脚本 |
|---|---|---|---|---|---|
| SessionStart | `session:start` | `*` | 新会话启动 | 加载上次会话上下文 + 检测包管理器 | `-e`→bootstrap→[session-start-bootstrap.js](../scripts/hooks/session-start-bootstrap.js)→RW(`session:start`)→`session-start.js#run`（**四层**，独立文件规避 shell `!` 历史展开） |

### PostToolUse（工具执行后）

| 事件 | 钩子 ID | matcher | 触发条件 | 作用 / 效果 | 执行链路 → 最终脚本 |
|---|---|---|---|---|---|
| PostToolUse | `post:bash:dispatcher` | Bash | Bash 执行完 | 合并后处理：命令日志审计、命令成本、PR 创建通知、构建完成通知 | `-e`→bootstrap→[post-bash-dispatcher.js](../scripts/hooks/post-bash-dispatcher.js)→`bash-hook-dispatcher.js#runPostBash`（**不走 RW**）→ 4 子检查，**async** |
| PostToolUse | `post:quality-gate` | Edit\|Write\|MultiEdit | 文件编辑后 | 跑质量门检查 | …→RW(`quality-gate.js#run`)，async |
| PostToolUse | `post:edit:design-quality-check` | Edit\|Write\|MultiEdit | 前端文件编辑后 | 警告"趋向模板化通用 UI"的设计漂移 | …→RW(`design-quality-check.js#run`) |
| PostToolUse | `post:edit:accumulate` | Edit\|Write\|MultiEdit | JS/TS 文件被编辑 | 记录路径，供 Stop 时批量 format+typecheck | …→RW(`post-edit-accumulator.js#run`) |
| PostToolUse | `post:edit:console-warn` | Edit | 编辑后 | 警告新增 `console.log` | …→RW(`post-edit-console-warn.js#run`) |
| PostToolUse | `post:governance-capture` | Bash\|Write\|Edit\|MultiEdit | 工具输出含治理事件 | 从工具**输出**捕获治理事件（与 Pre 配对）；需 `ECC_GOVERNANCE_CAPTURE=1` | …→RW(`governance-capture.js#run`) |
| PostToolUse | `post:session-activity-tracker` | `*` | 任意工具调用后 | 按 session 累计工具调用/文件活动（ECC2 指标） | …→RW(`session-activity-tracker.js#run`) |
| PostToolUse | `post:observe:continuous-learning` | `*` | 任意工具调用后 | 采集工具**结果**用于学习（与 Pre 配对） | …→RW(`observe-runner.js#run`)，async |
| PostToolUse | `post:ecc-metrics-bridge` | `*` | 任意工具调用后 | 维护运行期指标聚合，供 statusline / context-monitor 消费；**profile 全开** | …→RW(`ecc-metrics-bridge.js#run`) |
| PostToolUse | `post:ecc-context-monitor` | `*` | 任意工具调用后 | 注入警告：上下文耗尽 / 高成本 / 范围蔓延 / 工具循环 | …→RW(`ecc-context-monitor.js#run`) |

### PostToolUseFailure（工具执行失败后）

| 事件 | 钩子 ID | matcher | 触发条件 | 作用 / 效果 | 执行链路 → 最终脚本 |
|---|---|---|---|---|---|
| PostToolUseFailure | `post:mcp-health-check` | `*` | MCP 工具调用失败 | 记录失败、标记 server 不健康并尝试重连 | `-e`→bootstrap→RW(`mcp-health-check.js#run`) |

### Stop（一次响应结束 — 交付门）

> 全部走**自举内联模式**（不经 bootstrap），runner 失败时 `exit(1)` + `[Stop] ERROR`。

| 事件 | 钩子 ID | matcher | 触发条件 | 作用 / 效果 | 执行链路 → 最终脚本 |
|---|---|---|---|---|---|
| Stop | `stop:format-typecheck` | `*` | 每次响应结束 | 批量 Biome/Prettier format + `tsc` typecheck 本次响应编辑的所有 JS/TS（合并自 `post:edit:accumulate`）；**timeout 300s** | `-e`自举→`spawnSync(RW)`→`stop-format-typecheck.js#run` |
| Stop | `stop:check-console-log` | `*` | 响应结束 | 检查改动文件里残留的 `console.log` | …→`check-console-log.js#run` |
| Stop | `stop:session-end` | `*` | 响应结束（带 `transcript_path`） | 持久化会话状态；**profile 全开** | …→`session-end.js#run`，async |
| Stop | `stop:evaluate-session` | `*` | 响应结束 | 评估本次会话可提取的学习模式；**profile 全开** | …→`evaluate-session.js#run`，async |
| Stop | `stop:cost-tracker` | `*` | 响应结束 | 累计 token / 成本指标；**profile 全开** | …→`cost-tracker.js#run`，async |
| Stop | `stop:desktop-notify` | `*` | 响应结束 | 桌面通知（macOS/WSL）任务完成 | …→`desktop-notify.js#run`，async |

### SessionEnd（会话结束）

| 事件 | 钩子 ID | matcher | 触发条件 | 作用 / 效果 | 执行链路 → 最终脚本 |
|---|---|---|---|---|---|
| SessionEnd | `session:end:marker` | `*` | 会话真正结束 | 写入会话结束生命周期标记（非阻塞）；**profile 全开** | `-e`自举→`spawnSync(RW)`→`session-end-marker.js#run`，async |

---

## 四、两个 Bash dispatcher 的内部子检查

[bash-hook-dispatcher.js](../scripts/hooks/bash-hook-dispatcher.js) 把"频繁触发的 Bash 预检/后处理"合并到单次 node 进程，省下多次 spawn 开销。子检查列表：

### `pre:bash:dispatcher` → 6 个子检查（[bash-hook-dispatcher.js:22-52](../scripts/hooks/bash-hook-dispatcher.js#L22-L52)）

| 子检查 ID | profile | 脚本 | 作用 |
|---|---|---|---|
| `pre:bash:block-no-verify` | minimal,standard,strict | `block-no-verify.js` | 拦截 `git commit --no-verify` 绕过钩子的行为 |
| `pre:bash:auto-tmux-dev` | （默认全开） | `auto-tmux-dev.js` | 自动管理 tmux 开发环境 |
| `pre:bash:tmux-reminder` | strict | `pre-bash-tmux-reminder.js` | tmux 使用提醒 |
| `pre:bash:git-push-reminder` | strict | `pre-bash-git-push-reminder.js` | `git push` 前提醒 |
| `pre:bash:commit-quality` | strict | `pre-bash-commit-quality.js` | 提交质量检查 |
| `pre:bash:gateguard-fact-force` | standard,strict | `gateguard-fact-force.js` | 事实强制门（与 PreToolUse 同源逻辑） |

### `post:bash:dispatcher` → 4 个子检查（[bash-hook-dispatcher.js:54-73](../scripts/hooks/bash-hook-dispatcher.js#L54-L73)）

| 子检查 ID | profile | 脚本 | 作用 |
|---|---|---|---|
| `post:bash:command-log-audit` | （默认全开） | `post-bash-command-log.js`（mode=`audit`） | 命令日志审计 |
| `post:bash:command-log-cost` | （默认全开） | `post-bash-command-log.js`（mode=`cost`） | 命令成本核算 |
| `post:bash:pr-created` | standard,strict | `post-bash-pr-created.js` | 检测到 `gh pr create` 成功时通知 |
| `post:bash:build-complete` | standard,strict | `post-bash-build-complete.js` | 检测构建完成并通知 |

---

## 五、按时间顺序的生命周期视图

```
会话开始
  └─ SessionStart: session:start ........... 加载上下文 / 探测包管理器
        │
        ▼  （用户每次发消息 → Claude 响应，循环）
  ┌─ PreToolUse（8 个，按 matcher 命中）── 可阻断
  │     · Bash → dispatcher → 6 子检查
  │     · 写文件 → config-protection / gateguard / suggest-compact / doc-warning
  │     · 全工具 → mcp-health-check / observe / governance
  │
  ├─ [工具执行]
  │
  ├─ PostToolUse（10 个）── 通知 / 采集
  │     · Bash → dispatcher → 4 子检查
  │     · 写文件 → quality-gate / design-check / accumulate / console-warn
  │     · 全工具 → metrics-bridge / context-monitor / activity-tracker / observe
  │
  ├─ PostToolUseFailure（失败时）→ mcp-health-check 标记不健康
  │
  ├─ [上下文将满]
  │   └─ PreCompact: pre:compact .......... 保存压缩前状态
  │
  └─ Stop（一次响应结束，交付门，6 个）
        · format-typecheck（批量，300s）← 消费 post:edit:accumulate 累积的路径
        · check-console-log
        · session-end / evaluate-session / cost-tracker（async，全 profile）
        · desktop-notify
        │
        ▼
会话结束
  └─ SessionEnd: session:end:marker ....... 写入结束标记
```

---

## 六、设计要点小结

1. **一套运行时 + 28 条业务规则**：这段 `hooks.json` 不是 28 个独立钩子，而是统一的「路径解析 → 引导 → 门控 → 执行」运行时，业务脚本挂在末端。
2. **路径无关**：那段丑陋的根目录探测 IIFE 让配置在直装 / marketplace / cache 版本目录等任意形态下都能工作。
3. **合并与异步降本**：Bash 检查合并到 dispatcher；观测/指标类钩子一律 async；run-with-flags 优先同进程 `require(run)`。
4. **fail-open / fail-closed 分层**：基础设施 fail-open（绝不因自身故障阻断工具）；安全业务（config-protection、gateguard）fail-closed；Stop 交付门 fail-loud（出错必可见）。
5. **行为约束锚点**：`config-protection`（堵改配置降标准）、`gateguard-fact-force`（堵没调研就动手）、`block-no-verify`（堵绕钩子）、`design-quality-check`（堵模板化 UI）—— 共同把 "Think Before Coding / Surgical Changes / Simplicity First" 这些原则做成**硬约束**而非建议。
6. **可观测闭环**：Pre/Post 成对出现（observe、governance 各一对）；Post 累积的编辑路径在 Stop 被 format-typecheck 消费；metrics-bridge 把运行期指标喂给 context-monitor 和 statusline，形成"采集 → 聚合 → 反馈"的闭环。
7. **运维入口**：关闭某钩子 `ECC_DISABLED_HOOKS=<id>`；调级别 `ECC_HOOK_PROFILE=minimal|standard|strict`；试跑不生效 `ECC_DRY_RUN=1` 看 `[DryRun]` 预览。
