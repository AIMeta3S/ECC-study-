
## 第二步：`./install.sh --profile full` 如何处理 hook（以代码为准）

### 2.1 执行链路：install.sh 只是薄包装

`install.sh:32` 只有 33 行，核心一行 `exec node scripts/install-apply.js "$@"`。真正干活的是 Node 安装器，链路：

```
install-apply.js main()
 → scripts/lib/install/runtime.js  (createInstallPlanFromRequest)
 → scripts/lib/install-executor.js (createManifestInstallPlan)
 → scripts/lib/install-manifests.js (resolveInstallPlan)
 → scripts/lib/install/apply.js    (applyInstallPlan)   ← hook 在这里落盘
```

### 2.2 profile 解析与清单

- 参数解析：`scripts/lib/install/request.js:42-44` `--profile` 取值；`request.js:135-137` 必须给出 `--profile`/`--modules`/`--with` 之一。
- profile 清单定义在 `manifests/install-profiles.json:3-103`，共 **7 个**：`minimal`、`opencode`、`core`、`developer`、`security`、`research`、`full`。
- **是否含 hook 运行时**取决于 profile 是否纳入 `hooks-runtime` 模块：`minimal`/`opencode` **不含**（`install-profiles.json:5-21` 明确写 "no hook runtime"），其余 5 个（core/developer/security/research/full）**含**。
- `full` 含 25 个模块（`install-profiles.json:73-102`），其中包括 `hooks-runtime`。
- `hooks-runtime` 模块定义在 `manifests/install-modules.json:85-105`：`paths: ["hooks", "scripts/hooks", "scripts/lib"]`，即把这三个目录铺到目标。

### 2.3 核心：hook 的落盘机制（关键证据）

**结论：hook 是单文件覆盖写入 `<targetRoot>/hooks/hooks.json`，不 merge 进 settings.json，不符号链接。**

证据链（均在 `scripts/lib/install/apply.js`）：

1. 目标路径计算：`buildResolvedClaudeHooks` `apply.js:178-208`，仅当 target 是 `claude` 或 `claude-project` 时介入；`apply.js:184` `hooksDestinationPath = path.join(plan.targetRoot, 'hooks', 'hooks.json')`。
2. 从源文件读取：`apply.js:194` 直接读 `hooks/hooks.json`。
3. 调用占位符替换：`apply.js:195` `replacePluginRootPlaceholders(...)`。
4. 整文件覆盖写：`apply.js:311-323` `fs.writeFileSync(hooksDestinationPath, JSON.stringify(...) + '\n')`。

目标 root：默认 `--target claude` → `~/.claude/`（`scripts/lib/install-targets/claude-home.js:48-53`，`rootSegments: ['.claude']`、`kind:'home'`）。故 hook 落到 `~/.claude/hooks/hooks.json`。

### 2.4 "command 路径改写"的真相（文档误导）

`apply.js:108-131` 的 `replacePluginRootPlaceholders` 只替换字面量 `${CLAUDE_PLUGIN_ROOT}`。但实测（grep）：

- `process.env.CLAUDE_PLUGIN_ROOT` 出现 **21** 次；
- `${CLAUDE_PLUGIN_ROOT}` 出现 **0** 次。

**所以这一步对当前 hooks.json 是 no-op。** `hooks/README.md:26` 说的"use the installer so hook commands are rewritten against your actual Claude root"——与代码不符。命令路径之所以对，是因为每条 command 内嵌的运行时解析器（见第三步）在触发时自行探测 ECC root，与 installer 无关。

### 2.5 settings.json 是否被改？

**不被 `install.sh` 改动**。apply.js 全文无 settings.json 读写；`README:464` "leaves any existing `~/.claude/settings.json` untouched" 与代码一致。

> 注意：存在**另一条**会改 settings.json 的路径——`ecc setup` / `claude plugin install`（走 `scripts/lib/claude-plugin-setup.js:323-343` `writeClaudePluginOptions`，写 `pluginConfigs.ecc.options.{hooks_enabled,hook_profile}`），但**它不被 install.sh 调用**。两条路径互斥，README 也警告不要混用。

### 2.6 幂等性与卸载

- **幂等**：`install-executor.js:696-720` `dedupeCopyFileOperations` 对同 destination 的 copy-file 只留一条；落盘是覆盖写，**重复安装不会累积 hook 条目**。
- **卸载**：`scripts/uninstall.js` 读 `~/.claude/ecc/install-state.json` 账本逐个删除。因 install 从未写 settings.json，卸载也无需清理 settings.json。
- **风险**：手动改过 `~/.claude/hooks/hooks.json` 后再装一次会被**无情覆盖且不备份**（`apply.js:318` writeFileSync）。

### 2.7 文档 vs 代码冲突汇总

| 文档说法 | 代码事实 |
|---|---|
| "installer 改写 hook 命令路径" | 占位符替换是 no-op，路径靠运行时解析器 |
| `hooks/README.md` PostToolUse 表列了 "Prettier format / TypeScript check" 作 PostToolUse | 实际 format/typecheck 已移到 **Stop** 事件（`stop:format-typecheck` 批量跑），README 表格过时 |
| 问到 "standard/strict 安装 profile" | 安装 profile 只有 7 个且无 standard/strict；standard/strict 是**运行时** profile |

### 2.8 ⚠️ 证据缺口：install.sh 路径的 hook 真的会生效吗？

把「落盘」和「生效」分开看：

**已证实（代码铁证）**：install.sh 把 `hooks/hooks.json` 写到 `~/.claude/hooks/hooks.json`（`apply.js:184 / 311-323`），且不写 settings.json、不调用任何插件注册流程（不碰 `claude-plugin-setup.js`、不进 marketplace、不写 `enabledPlugins`）。

**未证实（且官方文档反而不支持）**：`~/.claude/hooks/hooks.json` 这个独立文件会被 Claude Code 加载执行。三条依据：
1. 官方「Hook locations」是**封闭式枚举**（[hooks.md](https://code.claude.com/docs/en/hooks.md)），6 个载体里**没有**「独立的 `~/.claude/hooks/hooks.json`」——`hooks/hooks.json` 这个文件名只出现在「Plugin」行，且明确限定"当插件启用时（when plugin is enabled）"。
2. 一个目录被当"插件"加载其 `hooks/hooks.json` 的前置条件（[plugins-reference.md](https://code.claude.com/docs/en/plugins-reference.md)）：marketplace 安装并 enable / `--plugin-dir|--plugin-url` / skills-directory 且含 `.claude-plugin/plugin.json`。`~/.claude/hooks/` **不在任何一条**。
3. ECC `README:466` 的原话 "Claude Code v2.1+ already auto-loads plugin hooks/hooks.json" 在官方文档（hooks.md / plugins-reference.md / changelog）**查无此句**；官方相关原话一律指向「已注册并启用的插件」。

> 结论：按官方文档可**合理推断** install.sh 路径（仅复制文件、未注册插件）的 hook **不会被加载**；但官方没有原话直接说「不扫描 `~/.claude/hooks/hooks.json`」，故严格等级是「文档可合理推断为否，非原话明说」。文档层已到顶，剩余只能实测。

**两条安装路径对比**（这是理解 ECC 为何提供两条路径的关键）：

| 路径 | 入口 | 是否注册插件 | hook 落点 | 生效证据 |
|---|---|---|---|---|
| **A. 手动铺底** | `./install.sh --profile full` | **否** | `~/.claude/hooks/hooks.json` | **存疑**（官方枚举不含此独立文件） |
| **B. 插件系统** | `claude plugin install` / `ecc setup --mode claude-plugin` | **是** | `~/.claude/plugins/.../hooks/hooks.json` | **有据**（官方：已启用插件的 hooks/hooks.json 自动加载） |

这解释了 README 为何警告「装了插件就别再跑 install.sh」——两条路径机制不同，混用会留下不一致状态。实践含义：**想让 ECC hook 确定生效，应走路径 B**；路径 A 装完必须自检。

**如何实证**（文档层面已无更多可查，剩下只能实测）：
1. `/hooks` 命令：看是否出现带 `Plugin Hooks` 标签、来源指向该文件的条目；没有 = 没加载。这是最干净的判据。
2. 写一个 SessionStart 测试 hook（stdout 打印标记串），看会话启动时是否触发。
3. 看 hook 进程的 `CLAUDE_PLUGIN_ROOT` 环境变量是否被注入——官方文档限定它「对插件 hook 进程注入」，有值 = 被当插件 hook 加载（辅助判据，非充分）。

> 本机状态：`~/.claude/hooks/hooks.json`、`~/.claude/ecc/install-state.json`、`~/.claude/plugins/{ecc,everything-claude-code}` **均不存在**——这台机器未安装 ECC，无法在此实证，结论止步于文档层面。

---
