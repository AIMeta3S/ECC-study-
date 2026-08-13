# ECC Hook 运行机制与安装方式 · 研究报告

> 证据基线：安装相关结论全部以 `scripts/` 实际代码为准（附 `file:line`）；文档描述在标注后采用，凡与代码冲突处均明确指出。

## 关键结论（先看重点）

1. **`install.sh` 是文件复制**，**不通过 `~/.claude/settings.json` 注册 hook**（hook 写到独立的 `~/.claude/hooks/hooks.json`）。⚠️ 但它**并非"完全不碰 settings.json"**：会写 `settings.json` 的 commit attribution 字段，默认禁用 co-author 署名（用户已有显式偏好则跳过，`apply.js:379-381` → `writeClaudeCommitAttributionPreference` L126-156）。
  - **拷贝`hooks/` → `~/.claude/hooks/`**（4 条目：`hooks.json`、`README.md`、`codex-hooks.json`、`memory-persistence/`）
  - **拷贝`scripts/hooks/` → `~/.claude/scripts/hooks/`**（51 文件）
  - **拷贝`scripts/lib/` → `~/.claude/scripts/lib/`**（125 文件，递归）
  - **替换`~/.claude/hooks/hooks.json`中的`${CLAUDE_PLUGIN_ROOT}`**：`apply.js:228-258`（`buildResolvedClaudeHooks`）读源 → `replacePluginRootPlaceholders` L158-181（递归遍历，**只替换字面量 `${CLAUDE_PLUGIN_ROOT}`**）→ L361-373 回写
  - **更新`~/.claude/ecc/install-state.json`**：记录拷贝了哪些文件（每文件 content digest）
2. **1中描述的替换**：代码里的占位符替换函数只替换字面量 `${CLAUDE_PLUGIN_ROOT}`，而当前 `hooks/hooks.json` 里这种占位符**一个都没有**。路径之所以正确，是因为每条 command 内嵌了一段运行时 root 解析器。
3. **"profile" 一词双义**，是最大混淆点：安装 profile（`manifests/install-profiles.json` 里 7 个：minimal/opencode/core/developer/security/research/full，决定**装哪些模块**）≠ 运行时 hook profile（minimal/standard/strict，决定**已装的某条 hook 是否在本会话执行**）。
4. **`hooks/memory-persistence/hooks.json` 不是活配置**，是一份"参考契约"文档——schema 都不是 Claude Code 的 hook schema，运行时 hook 脚本不读取它；安装器会随 hooks/ 目录把它原样复制到 ~/.claude/hooks/memory-persistence/，但不解析其内容（无占位符重写、无 merge）。
5. ECC 采用一种自有 hook 运行模式：通过原生 hook 机制注册，但在每条 hook 的 command 内部套一层包装层（inline 根解析 + plugin-hook-bootstrap → run-with-flags.js/dispatchers + env 门控），用少数几条原生 hook 组织大量检查。包装层在自身出错时 fail-open（exit 0），但 hook 有意的安全 block 仍如实传播 exit 2。
6. **⚠️ install.sh 安装后 hooks 是否「生效」存疑（重要）**。官方「Hook locations」封闭枚举里**没有**「独立的 `~/.claude/hooks/hooks.json`」这一项——`hooks/hooks.json` 只挂在「Plugin」行下，须是**已注册插件根目录下**；而 install.sh 路径**不注册插件**。ECC `README:418` 引用的 "Claude Code v2.1+ already auto-loads plugin `hooks/hooks.json`" —— 官方文档（hooks.md / plugins-reference.md）**确有**"插件启用时其 hooks 自动加载"的描述，但**前提是插件已注册并启用**；install.sh 路径不满足此前提，故「装完即生效」缺乏证据，需运行时实证（`/hooks`）。详见 §2.3。

---

## 第一步：Claude Code 原生 hook 机制

### 1.1 配置位置与层级

hook 定义在 `settings.json` 的 `hooks` 字段。配置分 6 层，**叠加合并**——各层匹配的 hook 都会运行，而非高层覆盖低层（企业 managed policy 可经 `allowManagedHooksOnly` 屏蔽用户/项目/插件层）：

| 载体 | 作用域 |
|---|---|
| 企业 managed policy settings | 组织级 |
| `~/.claude/settings.json` | 用户级 |
| `.claude/settings.json` | 项目级（可 commit） |
| `.claude/settings.local.json` | 项目本地（gitignore） |
| 插件根下的 hooks/hooks.json | 插件级；插件启用时由 Claude Code 自动加载 |
| skill / agent 的 frontmatter（`hooks:` 字段） | 单个技能/子代理级；随其载体加载 |

### 1.2 事件类型

本仓库中涉及的事件有（`hooks/hooks.json` 和 `hooks/memory-persistence/hooks.json` 中的事件）：
  - `SessionStart`: 会话启动/恢复/clear/compact 时触发，stdout 直接作为 Claude 的上下文。
  - `PreToolUse`: 工具调用前触发，可放行/阻断/询问/延后四种决策，并可修改工具输入。
  - `PostToolUse`: 工具成功执行后触发（不可阻断），可向 Claude 反馈或改写工具输出。
  - `PostToolUseFailure`: 工具调用失败后触发，可向 Claude 提供失败上下文。
  - `PreCompact`: 上下文压缩前触发（`trigger` 为 `manual`/`auto`）。
  - `Stop`: 主代理完成本轮响应、准备停止时触发；exit 2 可阻止停止、让 Claude 继续。
  - `SessionEnd`: 会话结束时触发（`reason` 标明原因）；不可阻断，仅用于清理。

除了上述事件，原生系统支持的事件还有：
  - `Setup` : 会话初始化或维护时触发（`trigger` 为 `init`/`maintenance`），不可阻塞。
  - `UserPromptSubmit` : 用户提交 prompt 时触发，可控制是否处理该 prompt 并注入上下文。
  - `UserPromptExpansion` : prompt 内的 slash command（技能/自定义命令）或 MCP prompt 被展开时触发。
  - `PermissionRequest` : 工具调用需要权限决策时触发（区别于每次调用前都跑的 `PreToolUse`）。
  - `PermissionDenied` : auto 模式下自动分类器拒绝工具调用时触发（手动拒绝、`PreToolUse` block、`deny` 规则命中均不触发）。
  - `PostToolBatch` : 一批工具调用全部完成后、下次请求模型前触发一次（`PostToolUse` 逐工具并发，本事件整批一次）。
  - `SubagentStart` : 子代理启动时触发（按 `agent_type` 匹配），不可阻止创建但可向子代理注入上下文。
  - `SubagentStop` : 子代理停止时触发。
  - `StopFailure` : 停止失败/出错时触发（与 `Stop` 配对，按 `error` 类型匹配，仅用于通知与日志）。
  - `Notification` : Claude Code 发送通知时触发，按通知类型匹配（如 `agent_needs_input`、`agent_completed`）。
  - `FileChanged` : 被监听文件发生变更时触发，可动态更新监听路径（`watchPaths`）。
  - `PostCompact`: 上下文压缩完成后触发，用于对压缩后状态作出反应（如记录摘要）。

> 注：官方事件远不止上述 19 个（约 31 个），另含 `MessageDisplay`、`TaskCreated`/`TaskCompleted`、`TeammateIdle`、`InstructionsLoaded`、`ConfigChange`、`CwdChanged`、`DirectoryAdded`、`WorktreeCreate`/`WorktreeRemove`、`Elicitation`/`ElicitationResult` 等，本仓库未涉及，略。

### 1.3 matcher 语义

- `"*"`/空/省略 → 匹配全部；
- 仅含字母/数字/`_`/`-`/空格/`|`/`,` → **精确字符串匹配**，`|` 和 `,` 分隔多值（如 `Edit|Write`；连字符需 v2.1.195+、逗号需 v2.1.191+）；
- 含其他字符 → 当**正则**用（unanchored）。
- 对工具事件（PreToolUse/PostToolUse/...）匹配的是**工具名**；对 SessionStart 匹配的是来源（`startup`/`resume`/`clear`/`compact`）等，不同事件含义不同。

### 1.4 stdin 协议（Claude Code → hook）

公共字段：`session_id`、`transcript_path`、`cwd`、`permission_mode`、`hook_event_name`（新版本另含 `prompt_id`、`effort`）。
工具事件额外：`tool_name`、`tool_input`（Write 含 `file_path`/`content`；Edit 含 `file_path`/`old_string`/`new_string`/`replace_all`；Bash 含 `command`/`description`/`timeout`/`run_in_background`）。`tool_response` 见 PostToolUse 与 PostToolBatch；PostToolUseFailure 带 `error`（非 `tool_response`）。

### 1.5 输出与控制语义

- **exit 0** = 通过（stdout 若是 JSON 则被解析）；
- **exit 2** = 阻塞，stderr 反馈给 Claude（PreToolUse 阻止工具；Stop 阻止停止让 Claude 继续；PostToolUse/PostToolUseFailure 工具已执行无法阻止，但 exit 2 仍会把 stderr 作为警告反馈给 Claude）；
- **其他非零** = 非阻塞错误（注意：`exit 1` 不阻塞，想强制必须 `exit 2`）。
- stdout 可输出 JSON 做高级控制：PreToolUse 用 `hookSpecificOutput.permissionDecision = allow|deny|ask|defer`；各类事件可用 `additionalContext` 给模型注入上下文、`systemMessage` 给用户提示、`continue:false` 停止 Claude。输出字符串上限 10000 字符。

### 1.6 async / timeout

- `async: true`（仅 command 类型）：后台运行，**不阻塞** Claude，结果在**下一轮**注入；不能用于决策（动作已完成）。
- `timeout` 单位是**秒**。同步 hook 超时按非阻塞错误处理（取消该 hook，不影响其他 hook）。

### 1.7 hook 与权限

PreToolUse hook 可返回 `permissionDecision` **动态 allow/deny** 工具调用——这是把 hook 当动态权限决策器的标准用法（全局 CLAUDE.md 里的 `auto-allow-readonly.py` 即此模式）。但 hook 的 `allow` **不能覆盖** deny 规则。

> 以下三步讲的是 ECC 如何在这套原生机制上做工程封装。

---

## 第二步：安装

### 2.1 手动安装
```bash
# 安装 full 模块
bash ./install.sh --profile full

# 只安装 hooks
bash ./install.sh --target claude --modules hooks-runtime
```

命令将：
  - **拷贝`hooks/` → `~/.claude/hooks/`**（4 条目：`hooks.json`/`README.md`/`codex-hooks.json`/`memory-persistence/`）
  - **拷贝`scripts/hooks/` → `~/.claude/scripts/hooks/`**（51 文件）
  - **拷贝`scripts/lib/` → `~/.claude/scripts/lib/`**（125 文件，递归）
  - **替换`~/.claude/hooks/hooks.json`中的`${CLAUDE_PLUGIN_ROOT}`**：`apply.js:228-258` 读源 → `replacePluginRootPlaceholders`（L158-181，只替换字面量 `${CLAUDE_PLUGIN_ROOT}`）→ L361-373 回写
  - **更新`~/.claude/ecc/install-state.json`**：账本，记录 target/modules/operations/每文件 content digest

### 2.2 插件安装
```
claude plugin install
# 或
ecc setup --mode claude-plugin
```
安装后，`~/.claude/plugins/.../hooks/hooks.json`，claude code 会被自动加载。

### 2.3 ⚠️ install.sh 安装后，hook 真的会生效吗？

根据安装脚本实际代码和官方资料证实：
1. install.sh 把 `hooks/hooks.json` 写到 `~/.claude/hooks/hooks.json`（`apply.js:228-258` 解析+替换、`L361-373` 写入），**不通过 settings.json 注册 hook**、不调用任何插件注册流程（不碰 `claude-plugin-setup.js`、不进 marketplace、不写 `enabledPlugins`）。⚠️ 但它**会写 settings.json 的 commit attribution 字段**（`apply.js:379-381`，默认禁用 co-author 署名）——"不写 settings.json"仅对 hook 注册成立，对 commit attribution 不成立。

2. 官方「Hook locations」是**封闭式枚举**（[hooks.md](https://code.claude.com/docs/en/hooks.md)），6 个载体里**没有**「独立的 `~/.claude/hooks/hooks.json`」——`hooks/hooks.json` 这个文件名只出现在「Plugin」行，且明确限定"当插件启用时（when plugin is enabled）"。

3. 一个目录被当"插件"加载其 `hooks/hooks.json` 的前置条件（[plugins-reference.md](https://code.claude.com/docs/en/plugins-reference.md)）：marketplace 安装并 enable / `--plugin-dir|--plugin-url` / skills-directory 且含 `.claude-plugin/plugin.json`。`~/.claude/hooks/` **不在任何一条**。

**结论**：综上所述，无法确定 install.sh 安装的 hook（仅复制文件、未注册插件）**会被加载**；

**如何实证**（文档层面已无更多可查，剩下只能实测）：
1. `/hooks` 命令：看是否出现带 `Plugin Hooks` 标签、来源指向该文件的条目；没有 = 没加载。这是最干净的判据。
2. 写一个 SessionStart 测试 hook（stdout 打印标记串），看会话启动时是否触发。
3. 看 hook 进程的 `CLAUDE_PLUGIN_ROOT` 环境变量是否被注入——官方文档限定它「对插件 hook 进程注入」，有值 = 被当插件 hook 加载（辅助判据，非充分）。

---

## 第三步：两个 hooks.json 详解

### 3.0 先讲运行时执行链（所有 hook 共享）

#### 命令形态

`hooks/hooks.json` 里每条 command 都是一段巨大的 `node -e "..."` 内联代码，它在自身进程里解析 root、经包装层做门控 + fail-open，门控通过后才加载并执行对应的业务 .js，最后把结果按 hook 协议透传回 Claude Code。
按"内联之后交给谁、起几个进程"分**三种形态**：

| 形态 | 用于 | 终点（被 spawn/require 的目标） | 终点之后 |
|---|---|---|---|
| **A. 内联 → require(bootstrap) → spawn 目标** | PreToolUse(8)、PreCompact(1)、SessionStart(2)、PostToolUseFailure(1) | bootstrap.main() 按 mode=`node` spawn 目标 | 多数=**run-with-flags.js**（再跑业务脚本）；**Bash**=pre-bash-dispatcher.js（自处理，不再 spawn）；**session:start**=session-start-bootstrap.js（**再 spawn 一层** run-with-flags.js） |
| **B. 内联 spawnSync 自管 → run-with-flags.js** | Stop(7)、SessionEnd(1) | 内联自己 `resolveEccRoot` + `spawnSync(node, [run-with-flags.js, id, script, profiles], {timeout, maxBuffer})` | run-with-flags.js 照常门控 + 跑业务脚本（同形态 A 的进程2） |
| **C. 内联 → require(dispatcher).cli()** | PostToolUse(sync / async) | posttooluse-dispatcher.js（同进程） | 不起子进程；遍历 SYNC/ASYNC_HOOKS 逐个调 `.run()`，合并 stdout 后一次输出 |

**内联段干了什么**（形态 A/C 共 14 处——bootstrap 12 + dispatcher 2，每处重复同一段约 1.3 KB 的探测+splice+require）：

1. 多级探测 ECC root，结果写回 `process.env.CLAUDE_PLUGIN_ROOT`；
2. `process.argv.splice(1, 0, <targetPath>)` —— 在 argv[1] 插入目标路径，使被 require 的目标能用 `argv[2]/argv[3]/…` 取到参数（等价于直接 `node <target> …`）；
3. `require(targetPath)`：形态 A target=bootstrap、形态 C target=dispatcher，require 即触发其 `main()`/`cli()`。

探测顺序（内联 `INLINE_RESOLVE`，与 `resolve-ecc-root.js` 的 `resolveEccRoot()` 完全一致）：
`CLAUDE_PLUGIN_ROOT` env → `~/.claude` → `~/.claude/plugins/<6 个 slug>`（ecc / ecc@ecc / marketplaces/ecc / everything-claude-code / everything-claude-code@… / marketplaces/everything-claude-code）→ `~/.claude/plugins/cache/{ecc,everything-claude-code}/<org>/<version>/`（两级 readdirSync 扫描）→ fallback `~/.claude`。其中中间候选步（`~/.claude` / 6 slug / cache）借 `require(.../resolve-ecc-root).resolveEccRoot()` 做权威校验（含残装 sentinel：`scripts/lib/utils.js` 文件与 `skills/continuous-learning-v2` 目录须同时存在）；首步（env）与末步（fallback）直接返回、不委托。


**通用执行链（以 PreToolUse Write → run-with-flags.js → 业务脚本 export run() 为例）**

形态 A 主流路径，**2 个进程**（A–E 五步）。bootstrap 与业务脚本都 require 进各自进程、不单独成进程；仅当业务脚本不 export `run()` 时才 legacy 起第 3 个进程。

```
进程1 = node -e "<inline>" node scripts/hooks/run-with-flags.js <id> scripts/hooks/<biz>.js <profiles>
       （Claude Code matcher 命中后 spawn，hook JSON 经 stdin 喂入）

A  内联段（见上）：探测 root → 设 env → splice argv → require(bootstrap)
   splice 后 argv = [node, bootstrap, "node", run-with-flags.js, id, biz.js, profiles]
   其中 argv[1]=bootstrap，argv[2]="node" 即 mode、argv[3]=目标脚本、argv[4:]=其参数

B  require(bootstrap) 触发 main()（靠复合 guard `require.main === module || require.main === undefined` 兜住 node -e 场景，否则 Node 21+ 会静默 no-op）：
   [, , mode, relPath, ...args] = argv → mode="node", relPath="run-with-flags.js", args=[id, biz.js, profiles]
   spawnNode → spawnSync(node, [<root>/run-with-flags.js, id, biz.js, profiles],
                          {input: raw, timeout: 30s, env: {…, CLAUDE_PLUGIN_ROOT, ECC_PLUGIN_ROOT}})
      ── 拉起进程2 ──▶

进程2 = node <root>/scripts/hooks/run-with-flags.js <id> <biz.js> <profiles>

C  读 stdin（≤ 1 MiB，超则截断并置 truncated=true）
D  isHookEnabled(<id>, {profiles}) 三层门控（顺序短路）：
     ① ECC_HOOKS_ENABLED 总开关（默认 true）  ② ECC_DISABLED_HOOKS 黑名单  ③ ECC_HOOK_PROFILE ∈ profilesCsv
   · 任一层不过 / ECC_DRY_RUN / 路径穿越 / 脚本缺失 → 一律 exit 0 + 回吐（放行工具调用，只是不跑业务）；
     dry-run 另往 stderr 写预览；stdin 被截断时回吐空串而非 raw（防截断 JSON 被误判 hook 失败）
   · 通过 → 检测脚本是否 export run()（正则扫源码 module.exports + run）：
       是 → require(<biz>).run(raw, {hookId, pluginRoot, scriptPath, truncated, maxStdin})  【同进程】
       否 → legacy spawnSync(node, [<biz>]) 起进程3

E  run() 返回值经 resolveHookResult 归一（接受 string / Buffer / {stdout, exitCode, stderr, additionalContext}）→
   exitWithStdout 等流排空后 exit → spawnSync 把 {stdout, stderr, status} 回给 bootstrap →
   bootstrap.passthrough 写进程1 stdout（stdout 为空且 status=0 时回吐 raw）、透传 stderr、把 status 作为进程1 exit code →
   Claude Code 读进程1 stdout + exit code
```

**兜底（绝不卡死 Claude Code）**：
- **形态 A**（bootstrap）：bootstrap 自身报错 / 子进程崩溃 / 超时 / 被 signal 终止 → 进程1 写 raw + **exit 0**（fail-open）。
- **形态 B**（Stop/SessionEnd 自管 spawnSync）：root 解析不到（run-with-flags.js 缺失）→ raw + exit 0（fail-open）；但**子进程已启动却失败/超时/signal** → stdout 清空 + **exit 1**（非 fail-open，让失败被看见）。
- **例外**：`session:start` 走独立的 `session-start-bootstrap.js`，其子进程失败时 `exit(1)` 显式报错（不 fail-open）。代码未注释此动机，推测是会话启动失败值得被看见。

**唯一阻塞路径**：业务脚本有意让 `run()` 返回 `exitCode=2`（或 legacy 进程 exit 2），该值经 run-with-flags → bootstrap 一路如实传播为进程1 exit code=2，Claude Code 据此 block 工具；其余异常在形态 A 被吞成 exit 0、在形态 B 子进程失败为 exit 1。

#### 三层门控

**三层门控**（`scripts/lib/hook-flags.js:122-140` `isHookEnabled`）：
1. 总开关 `ECC_HOOKS_ENABLED=false` → 全禁；
2. 黑名单 `ECC_DISABLED_HOOKS=<id>,<id>` → 精确禁某条；
3. profile 匹配：当前 `ECC_HOOK_PROFILE`（默认 `standard`）必须在 hook 声明的 profiles 列表里。每条 command 末尾的 `standard,strict` 就是该 hook 允许运行的 profile 白名单。

> 其他配置：`ECC_DRY_RUN=1`（把「我会跑哪个脚本、hook id、profile、目标工具/文件/命令」拼成一行**预览（preview）**写到 stderr，不执行脚本）

#### 配置来源（值从哪来）

三层门控里的 `ECC_HOOKS_ENABLED` / `ECC_HOOK_PROFILE` 两个变量，除环境变量外还有两级 fallback（`scripts/lib/hook-flags.js:65-86`，按优先级从高到低）：

1. `ECC_*` 环境变量（最高）；
2. `CLAUDE_PLUGIN_OPTION_*` —— Claude 插件选项，由 settings.json 的 `pluginConfigs.ecc.options` 转成大写注入；
3. `ecc/setup.json` —— 托管安装兜底，路径 `<pluginRoot>/ecc/setup.json`，取 `hooks.enabled`/`hooks.profile`。

> `ECC_DISABLED_HOOKS` 和 `ECC_DRY_RUN` **无 fallback**，只能环境变量设。install.sh 路径不生成 `setup.json`，走 install.sh 时第 3 级不存在。

用户要持久化设置环境变量，三种写法：
- 任意路径：`~/.zshrc` 里 `export ECC_HOOK_PROFILE=strict`（最直接）；
- 任意路径：写 `~/.claude/settings.json` 的 `env` 字段（Claude Code 注入所有 hook 子进程）；
- 仅插件路径（`claude plugin install`）：写 `settings.json` 的 `pluginConfigs.ecc.options.{hooks_enabled,hook_profile}`，走上面的第 2 级（即报告 §2.5 说的「另一条会改 settings.json 的路径」）。

---

### 3.1 `hooks/hooks.json`（生产执行图）— 逐条讲解

共 **22 条** hook（`grep -c '"id":' = 22`），顶层 `$schema` 指向 claude-code-settings schema。按事件分组。

#### PreToolUse（8 条）

**① `pre:bash:dispatcher`** — matcher `Bash`
- 作用：Bash 命令的合并预检调度器（质量/tmux/push/GateGuard）。
- 触发：每次要执行 Bash 工具前。
- 流程：A→B→C 后，终点是 `scripts/hooks/pre-bash-dispatcher.js`（极薄 stdin 适配器）→ `scripts/hooks/bash-hook-dispatcher.js` `runPreBash` → **串行跑 6 个子检查、短路**（任一非 0 立即返回）。子检查（id 均带 `pre:bash:` 前缀）：`pre:bash:block-no-verify`（全 profile）、`pre:bash:auto-tmux-dev`（standard,strict）、`pre:bash:tmux-reminder`(strict)、`pre:bash:git-push-reminder`(strict)、`pre:bash:commit-quality`(strict)、`pre:bash:gateguard-fact-force`(standard,strict)。**不走 run-with-flags**，因为多 hook 合并进一个进程省 6× 启动开销。
- 使用：禁某个子检查用 `ECC_DISABLED_HOOKS=pre:bash:tmux-reminder`；`ECC_GATEGUARD=off` 专门关 GateGuard。

**② `pre:write:doc-file-warning`** — matcher `Write`
- 作用：写非标准文档文件（非 README/CLAUDE/CONTRIBUTING 等）时**仅警告**（exit 0）。
- 触发：每次 Write 工具前。
- 流程：标准 A→B→C→D→E，target = `scripts/hooks/doc-file-warning.js`。
- 使用：`ECC_DISABLED_HOOKS=pre:write:doc-file-warning`。

**③ `pre:edit-write:suggest-compact`** — matcher `Edit|Write`
- 作用：到逻辑间隔（约每 50 次工具调用）建议手动 `/compact`。
- 流程：target = `scripts/hooks/suggest-compact.js`。
- 使用：`ECC_DISABLED_HOOKS=pre:edit-write:suggest-compact`。

**④ `pre:observe:continuous-learning`** — matcher `*`，`async:true`，timeout 10
- 作用：记录工具意图，供持续学习。所有工具都触发，后台运行。
- 流程：target = `scripts/hooks/observe-runner.js`。

**⑤ `pre:governance-capture`** — matcher `Bash|Write|Edit|MultiEdit`，timeout 10
- 作用：捕获治理事件（密钥、策略违规、审批请求）。**默认关闭**，需 `ECC_GOVERNANCE_CAPTURE=1` 开启（见 description）。
- 流程：target = `scripts/hooks/governance-capture.js`。
- 使用：`ECC_GOVERNANCE_CAPTURE=1` 启用。

**⑥ `pre:config-protection`** — matcher `Write|Edit|MultiEdit`，timeout 5
- 作用：阻止修改 linter/formatter 配置文件，引导改代码而非弱化配置。
- 流程：target = `scripts/hooks/config-protection.js`。

**⑦ `pre:mcp-health-check`** — matcher `*`
- 作用：MCP 工具执行前检查 server 健康度，阻断不健康的 MCP 调用。
- 流程：target = `scripts/hooks/mcp-health-check.js`。同一脚本另以 id `post:mcp-health-check` 挂在 PostToolUseFailure（见 ⑭）做失败后标记不健康+重连（注意两条 id 前缀不同：`pre:` vs `post:`，仅复用脚本）。

**⑧ `pre:edit-write:gateguard-fact-force`** — matcher `Edit|Write|MultiEdit`，timeout 5
- 作用：**事实强制门**——阻止对每个文件的**首次** Edit/Write/MultiEdit，要求先调研（导入方、数据 schema、用户指令）再放行。
- 流程：target = `scripts/hooks/gateguard-fact-force.js`。
- 使用：`ECC_GATEGUARD=off` 专门关闭（设置/恢复期常用）。

#### PreCompact（1 条）

**⑨ `pre:compact`** — matcher `*`
- 作用：上下文压缩前保存会话状态。
- 流程：target = `scripts/hooks/pre-compact.js`。

#### SessionStart（2 条）

**⑩ `session:start`** — matcher `*`
- 作用：新会话加载有界历史上下文 + 检测包管理器。profilesCsv 为 `minimal,standard,strict`（**全 profile 都跑**，少数之一）——注意它不在 hooks.json 字段里，而由 `session-start-bootstrap.js` 内部硬编码传入 run-with-flags.js。
- 流程：终点是 `scripts/hooks/session-start-bootstrap.js`（用模块版 `resolveEccRoot` 而非内联）→ spawnSync `run-with-flags.js` → `scripts/hooks/session-start.js`。
- 使用：`ECC_SESSION_START_CONTEXT=off` 关闭附加上下文；`ECC_SESSION_START_MAX_CHARS=4000` 限量（默认 8000）。

**⑪ `session-start:plan-canvas-sessions`** — matcher `*`
- 作用：浮现未关闭的 Plan Canvas review session，让新会话能续上 loop。
- 流程：target = `scripts/hooks/plan-canvas-sessions.js`。

#### PostToolUse（2 条 dispatcher，内部扇出 7+3 子 hook）

**⑫ `post:dispatcher:sync`** — matcher `*`，timeout 30
**⑬ `post:dispatcher:async`** — matcher `*`，async:true，timeout 45
- 作用：把多个 PostToolUse hook 合并进**一个进程**跑（省进程启动），同时**保留每条子 hook 的独立门控**（id/matcher/profiles 都在）。
- 触发：每次工具成功后。
- 流程：形态 C——内联 `require(posttooluse-dispatcher.js).cli()`，`main()` 读 argv[2] 选 `sync`/`async` → 从 `SYNC_HOOKS`(7)/`ASYNC_HOOKS`(3) 选一组 → **串行跑、不短路**（PostToolUse 本就不能阻断）、错误隔离。
  - SYNC 7 个：`post:edit:design-quality-check`、`post:edit:accumulator`、`post:edit:console-warn`、`post:governance-capture`、`post:session-activity-tracker`、`post:ecc-metrics-bridge`(全 profile)、`post:ecc-context-monitor`。
  - ASYNC 3 个：`post:bash:dispatcher`（matcher `Bash`，内联调 `bash-hook-dispatcher.runPostBash` 跑 4 个 post-bash 子检查：`post:bash:command-log-audit`/`command-log-cost`/`pr-created`/`build-complete`，均 standard,strict）、`post:quality-gate`、`post:observe:continuous-learning`。
  - 双重门控：先 `matchesTool(hook.matcher, tool_name)` 再 `isHookEnabled(hook.id, {profiles})`。
- 使用：`ECC_DISABLED_HOOKS=post:edit:console-warn` 精确关某条；`ECC_CONTEXT_MONITOR_COST_WARNINGS=off` 关成本提醒（ecc-context-monitor 子项）。

> 注意：README PostToolUse 表（Prettier format / TypeScript check）已过时——这俩现在在 Stop 的 `stop:format-typecheck` 里批量跑。

#### PostToolUseFailure（1 条）

**⑭ `post:mcp-health-check`** — matcher `*`
- 作用：MCP 工具失败后追踪、标记 server 不健康、尝试重连。复用 `scripts/hooks/mcp-health-check.js`。

#### Stop（7 条，全形态 B）

形态 B 特点：内联代码自己做 `fs.readFileSync(0)` 读 stdin，再 `spawnSync(run-with-flags.js, [...], {input:raw, timeout, maxBuffer:16MiB})`，用自定义 `finish()` 等流 drain 后退出。**绕过 bootstrap** 是为了自定义 timeout/maxBuffer。注：7 条 Stop 完全符合；`session:end:marker`（SessionEnd）为**轻量版**——无 `finish()`、无 `maxBuffer`，直接写+exit。

**⑮ `stop:plan-canvas-pending`** — timeout 30，profilesCsv `minimal,standard,strict`（全 profile）。**唯一阻断型 Stop**。
- 作用：agent 停下前抽干当前项目未投递的 Plan Canvas 浏览器反馈（读 `~/.claude/plan-canvas/sessions.json`，优先经本地 server race-free 取）；抽到则返回 block 决策要求 agent 当场处理并回复，`stop_hook_active=true` 时防自锁不重复阻断。
- 流程：spawnSync → run-with-flags → `scripts/hooks/plan-canvas-pending.js`。

**⑯ `stop:format-typecheck`** — timeout 300（5 分钟）
- 作用：在 Stop 时**批量**对本轮所有编辑过的 JS/TS 跑 Biome/Prettier + `tsc --noEmit`（而非每次 Edit 后跑）。
- 流程：spawnSync → run-with-flags → `scripts/hooks/stop-format-typecheck.js`。

**⑰ `stop:check-console-log`** — 作用：每轮响应后检查改动文件里的 `console.log`。target `scripts/hooks/check-console-log.js`。

**⑱ `stop:session-end`** — async，timeout 10。作用：每轮响应后持久化会话状态（Stop 携带 `transcript_path`）。target `scripts/hooks/session-end.js`。

**⑲ `stop:evaluate-session`** — async。作用：评估会话可提取的模式（持续学习）。target `scripts/hooks/evaluate-session.js`。

**⑳ `stop:cost-tracker`** — async。作用：按会话追踪 token/成本指标。target `scripts/hooks/cost-tracker.js`。

**㉑ `stop:desktop-notify`** — async，standard+。作用：Claude 响应后发桌面通知（macOS/WSL）附任务摘要。target `scripts/hooks/desktop-notify.js`。

#### SessionEnd（1 条，形态 B 轻量版）

**㉒ `session:end:marker`** — async，timeout 10，profilesCsv `minimal,standard,strict`（全 profile）。
- 作用：会话结束生命周期标记（非阻塞）。target `scripts/hooks/session-end-marker.js`。

---

### 3.2 `hooks/memory-persistence/hooks.json`（参考契约，非活配置）

#### 它是什么——证据三连

1. **schema 不是 Claude Code 的**。Claude Code hook schema 是 `{hooks:{<Event>:[{matcher,hooks:[...]}]}}`；而这个文件是 `{description, events:[{event,id,script,purpose,blocking}]}`——自定义的"清单"格式，**Claude Code 根本不认识**，放进去也不会被当 hook 加载。
2. **运行时/安装器都不读它**。全仓 grep `memory-persistence`，命中的只有：文档（README/longform-guide 及各语种翻译）、`hooks/README.md:19`、`scripts/harness-audit.js:530-533`（仅检查**目录存在**，不加载内容）。没有任何 `.js` 安装/运行代码 require 或复制它。
3. **文件自述 + README 明说**：`description` 字段写 "The production hook graph is hooks/hooks.json."；`hooks/README.md:19-20` "The executable hook graph remains hooks/hooks.json; the memory persistence directory is the **stable contract** for SessionStart, PreCompact, observation, activity tracking, and SessionEnd behavior."

**定位**：它是 ECC "记忆持久化"生命周期的**稳定契约文档**——用比 `hooks/hooks.json` 更易读的格式，声明"这套功能由哪几个事件的哪些脚本保证"。它的角色类似于接口规约，真正的实现在生产图 `hooks/hooks.json` + `scripts/hooks/` 里。

#### 逐条讲解（6 个事件，字段：event/id/script/purpose/blocking）

| # | event | id | script | purpose | blocking |
|---|---|---|---|---|---|
| 1 | SessionStart | `session:start` | session-start-bootstrap.js | 加载有界历史上下文 + 检测项目状态 | false |
| 2 | PreCompact | `pre:compact` | pre-compact.js | 压缩前持久化会话状态 | false |
| 3 | PreToolUse | `pre:observe:continuous-learning` | observe-runner.js | 记录工具意图（持续学习信号） | false |
| 4 | PostToolUse | `post:observe:continuous-learning` | observe-runner.js | 记录工具结果（持续学习信号） | false |
| 5 | PostToolUse | `post:session-activity-tracker` | session-activity-tracker.js | 记录每会话工具调用与文件活动（ECC2 指标） | false |
| 6 | SessionEnd | `session:end` | session-end.js | 有 transcript 元数据时持久化会话结束摘要 | false |

**与生产图的对应关系**（验证契约一致性）：
- #1 `session:start`、#2 `pre:compact`、#3 `pre:observe:continuous-learning` 在 `hooks/hooks.json` 里**均有对应生产 hook**（id 一致）。
- #4 `post:observe:continuous-learning`、#5 `post:session-activity-tracker` 在生产图里**不作为顶层条目**，而是被折叠进 `post:dispatcher:async` / `post:dispatcher:sync` 的子 hook 列表（见 `scripts/hooks/posttooluse-dispatcher.js` 的 `ASYNC_HOOKS`/`SYNC_HOOKS`）。
- #6 `session:end` 在生产图里对应 `stop:session-end`（挂在 **Stop** 而非 SessionEnd，因为 Stop 才稳定携带 `transcript_path`；生产图的 `session:end:marker` 是另一条 SessionEnd 标记 hook）。

> 即：契约图描述"逻辑生命周期"，生产图描述"物理执行结构"（经 dispatcher 合并、经 run-with-flags 门控）。两者**不完全 1:1**——契约的某些条目在生产里被 dispatcher 吞并或挪了事件。这是正常的演进差异，也正说明为何需要一份独立契约来锁定"对外承诺的行为"。

#### 如何使用它

**不直接使用**。它是给人类和维护者读的参考。若你想确认"记忆持久化"覆盖了哪些生命周期节点，读它；若要调实际行为，改生产图 `hooks/hooks.json` 或用 env var（见第四步）。它被 `scripts/harness-audit.js` 用作"目录存在"的健康检查项。

---

## 第四步：如何使用（实操汇总）

### 安装

```bash
bash ./install.sh --target claude --profile full          # 用户级 ~/.claude/
bash ./install.sh --target claude-project --profile full  # 项目级 ./.claude/
# 或只装 hook 运行时：
bash ./install.sh --target claude --modules hooks-runtime
```

落盘到 `~/.claude/hooks/hooks.json`。⚠️ 但该文件是否被 Claude Code 加载生效**存疑**（见 §2.3）——install.sh 路径不注册插件，官方 Hook locations 枚举不含此独立文件。装完**务必用 `/hooks` 核实**是否出现带 `Plugin Hooks` 标签的条目；若没有，说明未生效，应改走 `claude plugin install`（路径 B，生效有据）。**不要**手抄 repo 的 `hooks.json` 进 `settings.json`。

### 运行时调控（改环境变量，不改文件）

```bash
export ECC_HOOKS_ENABLED=true                      # 总开关
export ECC_HOOK_PROFILE=standard                   # minimal|standard|strict
export ECC_DISABLED_HOOKS="pre:bash:tmux-reminder,pre:edit-write:gateguard-fact-force"  # 按精确 id 禁用
export ECC_GATEGUARD=off                           # 专门关 GateGuard
export ECC_GOVERNANCE_CAPTURE=1                    # 开启治理捕获（默认关）
export ECC_SESSION_START_CONTEXT=off               # 关闭 SessionStart 附加上下文
export ECC_DRY_RUN=1                               # 只 preview 不执行（调试）
```

profile 语义：`minimal`（核心生命周期+安全）、`standard`（默认，平衡）、`strict`（更多提醒与更严护栏）。每条 hook 的 `standard,strict` 后缀决定它在哪些 profile 下生效。

### 排查

- `ECC_DRY_RUN=1` 看 stderr 的 preview，确认某条 hook 是否会被触发、走哪个脚本。
- 包装器**永远 fail-open**：ECC 脚本自身崩溃会 exit 0，不会卡死 Claude Code；所以"hook 没生效"比"hook 报错"更需主动排查。
- 想看 Claude Code 是否真的加载了 hook：用 `/hooks` 命令（原生能力）。

---

## 附：文档与代码不符处（建议修正）

1. `hooks/README.md:26` "so hook commands are rewritten against your actual Claude root" —— installer 确有 rewrite 步骤（`apply.js:158-181` `replacePluginRootPlaceholders`），但当前 `hooks/hooks.json` 不含 `${CLAUDE_PLUGIN_ROOT}` 占位符（每条 command 自带运行时 root 解析器），故该步对 hooks.json 实为 no-op。
2. `hooks/README.md:49-59` PostToolUse 表**部分过时**：`Prettier format`(L57)/`TypeScript check`(L58) 已不在 PostToolUse，实际在 Stop 的 `stop:format-typecheck`；其余（PR logger/Build analysis/Quality gate/Design quality check）仍存在。
3. `.claude-plugin/plugin.json` 的 `hook_profile` 选项文档值（minimal/standard/strict）与安装 profile（7 个）名字撞车，易误解为同一概念。
4. `README:418` 称 "Claude Code v2.1+ already auto-loads plugin `hooks/hooks.json`" —— 官方文档确有"插件 hook 自动加载"描述，但仅针对**已注册启用**的插件；install.sh 路径不注册插件，故此说法对 install.sh 路径不成立（详见 §2.3）。
5. `README:416` 称安装 "leaves any existing `~/.claude/settings.json` untouched" —— 与 `apply.js:379-381` 矛盾：install.sh 路径会写 settings.json 的 commit attribution 字段（禁用 co-author 署名，用户无显式偏好时）。
