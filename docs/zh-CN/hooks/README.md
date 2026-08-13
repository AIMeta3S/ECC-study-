# Hooks

Hooks 是事件驱动的自动化机制，会在 Claude Code 工具执行之前或之后触发。它们用于强制执行代码质量检查、尽早捕获错误，并自动化重复性检查。

## Hooks 如何工作

```
用户请求 → Claude 选择工具 → PreToolUse hook 运行 → 工具执行 → PostToolUse hook 运行
```

- **PreToolUse** hooks 在工具执行前运行。它们可以 **block**（exit code 2）或 **warn**（通过 stderr 输出而不阻断）。
- **PostToolUse** hooks 在工具完成后运行。它们可以分析输出，但不能 block。
- **Stop** hooks 在每次 Claude 响应后运行。
- **SessionStart/SessionEnd** hooks 在会话生命周期边界运行。
- **PreCompact** hooks 在 context compaction 之前运行，适合用于保存状态。

## Hooks in This Plugin

Memory persistence 生命周期定义位于 `hooks/memory-persistence/` 中。可执行 hook graph 仍为 `hooks/hooks.json`；memory persistence 目录是 SessionStart、PreCompact、observation、activity tracking 和 SessionEnd 行为的稳定契约。

## Installing These Hooks Manually

对于 Claude Code 的手动安装，不要将仓库原始 `hooks.json` 粘贴到 `~/.claude/settings.json` 中，或直接复制到 `~/.claude/hooks/hooks.json`。签入的文件是面向 plugin/repo 的，应通过 ECC installer 安装或作为 plugin 加载。

请改用 installer，以便 hook commands 会针对你的实际 Claude root 被重写：

```bash
bash ./install.sh --target claude --modules hooks-runtime
```

```powershell
pwsh -File .\install.ps1 --target claude --modules hooks-runtime
```

这会将解析后的 hooks 安装到 `~/.claude/hooks/hooks.json`。在 Windows 上，Claude config root 是 `%USERPROFILE%\\.claude`。

### PreToolUse Hooks

| Hook | Matcher | Behavior | Exit Code |
|------|---------|----------|-----------|
| **Dev server blocker** | `Bash` | Block 在 tmux 外执行 `npm run dev` 等命令——确保日志可访问 | 2 (blocks) |
| **Tmux reminder** | `Bash` | 建议对长时间运行的命令（npm test, cargo build, docker）使用 tmux | 0 (warns) |
| **Git push reminder** | `Bash` | 提醒在 `git push` 之前 review 变更 | 0 (warns) |
| **Pre-commit quality check** | `Bash` | 在 `git commit` 前运行质量检查：对 staged 文件进行 lint，当通过 `-m/--message` 提供时验证 commit message 格式，检测 console.log/debugger/secrets | 2 (blocks critical) / 0 (warns) |
| **Doc file warning** | `Write` | 对非标准 `.md`/`.txt` 文件发出警告（允许 README、CLAUDE、CONTRIBUTING、CHANGELOG、LICENSE、SKILL、docs/、skills/）；跨平台路径处理 | 0 (warns) |
| **Strategic compact** | `Edit\|Write` | 在逻辑间隔（约每 50 次 tool call）建议手动执行 `/compact` | 0 (warns) |

### PostToolUse Hooks

| Hook | Matcher | What It Does |
|------|---------|-------------|
| **PR logger** | `Bash` | 在 `gh pr create` 之后记录 PR URL 和 review command |
| **Build analysis** | `Bash` | 在 build 命令后进行后台分析（async、non-blocking） |
| **Quality gate** | `Edit\|Write\|MultiEdit` | 在编辑后运行快速质量检查 |
| **Design quality check** | `Edit\|Write\|MultiEdit` | 当前端编辑趋向 generic template-looking UI 时发出警告 |
| **Prettier format** | `Edit` | 在编辑后使用 Prettier 自动格式化 JS/TS 文件 |
| **TypeScript check** | `Edit` | 在编辑 `.ts`/`.tsx` 文件后运行 `tsc --noEmit` |
| **console.log warning** | `Edit` | 对编辑文件中的 `console.log` 语句发出警告 |

### Lifecycle Hooks

| Hook | Event | What It Does |
|------|-------|-------------|
| **Session start** | `SessionStart` | 加载先前上下文并检测 package manager |
| **Plan Canvas sessions** | `SessionStart` | 浮出打开的 Plan Canvas browser reviews，使新会话可以恢复循环 |
| **Pre-compact** | `PreCompact` | 在 context compaction 之前保存状态 |
| **Console.log audit** | `Stop` | 每次响应后检查所有修改文件中的 `console.log` |
| **Session summary** | `Stop` | 当 transcript path 可用时持久化 session 状态 |
| **Pattern extraction** | `Stop` | 评估 session 中可提取的 patterns（continuous learning） |
| **Cost tracker** | `Stop` | 发出轻量级 run-cost telemetry markers |
| **Desktop notify** | `Stop` | 发送 macOS 桌面通知，包含任务摘要（standard+） |
| **Session end marker** | `SessionEnd` | Lifecycle marker 和清理日志 |

## Customizing Hooks

### Disabling a Hook

移除或注释掉 `hooks.json` 中的 hook 条目。如果以 plugin 安装，可以在 `~/.claude/settings.json` 中 override：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [],
        "description": "Override: allow all .md file creation"
      }
    ]
  }
}
```

### Runtime Hook Controls (Recommended)

使用 environment variables 控制 hook 行为，无需编辑 `hooks.json`：

```bash
# 主开关。显式环境变量值会 override plugin 偏好。
export ECC_HOOKS_ENABLED=true

# minimal | standard | strict（默认：standard）
export ECC_HOOK_PROFILE=standard

# 禁用特定 hook ID（逗号分隔）
export ECC_DISABLED_HOOKS="pre:bash:tmux-reminder,post:edit:typecheck"

# 仅在 setup 或 recovery 期间禁用 GateGuard
export ECC_GATEGUARD=off

# 限制 SessionStart 附加上下文（默认：8000 字符）
export ECC_SESSION_START_MAX_CHARS=4000

# 完全禁用 SessionStart 附加上下文
export ECC_SESSION_START_CONTEXT=off

# 保留 context/scope/loop 警告，但抑制 API-rate cost 估算
export ECC_CONTEXT_MONITOR_COST_WARNINGS=off
```

Windows PowerShell:

```powershell
[Environment]::SetEnvironmentVariable('ECC_CONTEXT_MONITOR_COST_WARNINGS', 'off', 'User')
```

Claude setup-only value:
- `off` — 通过 `ecc setup` 禁用本地 ECC hook 工作；它不是 runtime hook profile。

Runtime hook profiles:
- `minimal` — 仅保留 essential lifecycle 和 safety hooks。
- `standard` — 默认；平衡 quality + safety checks。
- `strict` — 启用 additional reminders 和更严格的 guardrails。

Claude plugin 提供与 personal `hooks_enabled` 和 `hook_profile` settings 相同的选项。运行 `ecc setup --mode claude-plugin` 来安装或更新 plugin 并更改这些偏好。

### Writing Your Own Hook

Hooks 是 shell commands，通过 stdin 接收 JSON 格式的 tool input，并且必须向 stdout 输出 JSON。

**Basic structure:**

```javascript
// my-hook.js
let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  const input = JSON.parse(data);

  // 访问 tool 信息
  const toolName = input.tool_name;        // "Edit"、"Bash"、"Write" 等
  const toolInput = input.tool_input;      // tool 专用参数
  const toolOutput = input.tool_output;    // 仅在 PostToolUse 中可用

  // 警告（非阻断）：写入 stderr
  console.error('[Hook] Warning message shown to Claude');

  // 阻断（仅 PreToolUse）：以 code 2 退出
  // process.exit(2);

  // 始终将原始 data 输出到 stdout
  console.log(data);
});
```

**Exit codes:**
- `0` — 成功（继续执行）
- `2` — 阻断 tool call（仅 PreToolUse）
- 其他非零 — 错误（记录但不会阻断）

### Hook Input Schema

```typescript
interface HookInput {
  tool_name: string;          // "Bash"、"Edit"、"Write"、"Read" 等
  tool_input: {
    command?: string;         // Bash：正在运行的 command
    file_path?: string;       // Edit/Write/Read：目标文件
    old_string?: string;      // Edit：被替换的文本
    new_string?: string;      // Edit：替换文本
    content?: string;         // Write：文件内容
  };
  tool_output?: {             // 仅 PostToolUse
    output?: string;          // Command/tool 输出
  };
}
```

### Async Hooks

对于不应阻断主流程的 hooks（例如 background analysis）：

```json
{
  "type": "command",
  "command": "node my-slow-hook.js",
  "async": true,
  "timeout": 30
}
```

Async hooks 在后台运行。它们不能 block 工具执行。

## Common Hook Recipes

### Warn about TODO comments

```json
{
  "matcher": "Edit",
  "hooks": [{
    "type": "command",
    "command": "node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const i=JSON.parse(d);const ns=i.tool_input?.new_string||'';if(/TODO|FIXME|HACK/.test(ns)){console.error('[Hook] New TODO/FIXME added - consider creating an issue')}console.log(d)})\""
  }],
  "description": "在添加 TODO/FIXME 注释时发出警告"
}
```

### Block large file creation

```json
{
  "matcher": "Write",
  "hooks": [{
    "type": "command",
    "command": "node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const i=JSON.parse(d);const c=i.tool_input?.content||'';const lines=c.split('\\n').length;if(lines>800){console.error('[Hook] BLOCKED: File exceeds 800 lines ('+lines+' lines)');console.error('[Hook] Split into smaller, focused modules');process.exit(2)}console.log(d)})\""
  }],
  "description": "阻止创建超过 800 行的文件"
}
```

### Auto-format Python files with ruff

```json
{
  "matcher": "Edit",
  "hooks": [{
    "type": "command",
    "command": "node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const i=JSON.parse(d);const p=i.tool_input?.file_path||'';if(/\\.py$/.test(p)){const{execFileSync}=require('child_process');try{execFileSync('ruff',['format',p],{stdio:'pipe'})}catch(e){}}console.log(d)})\""
  }],
  "description": "在编辑后使用 ruff 自动格式化 Python 文件"
}
```

### Require test files alongside new source files

```json
{
  "matcher": "Write",
  "hooks": [{
    "type": "command",
    "command": "node -e \"const fs=require('fs');let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const i=JSON.parse(d);const p=i.tool_input?.file_path||'';if(/src\\/.*\\.(ts|js)$/.test(p)&&!/\\.test\\.|\\.spec\\./.test(p)){const testPath=p.replace(/\\.(ts|js)$/,'.test.$1');if(!fs.existsSync(testPath)){console.error('[Hook] No test file found for: '+p);console.error('[Hook] Expected: '+testPath);console.error('[Hook] Consider writing tests first (/tdd)')}}console.log(d)})\""
  }],
  "description": "在新增源文件时提醒创建测试"
}
```

## Cross-Platform Notes

Hook logic 使用 Node.js 脚本实现，以实现 Windows、macOS 和 Linux 上的跨平台行为。continuous-learning observer 以 Node-mode hook 形式暴露，并通过带 Windows 安全 fallback 行为的 profile-gated runner 委托给其现有的 `observe.sh` 实现。

## Related

- [rules/common/hooks.md](../rules/common/hooks.md) — Hook architecture guidelines
- [skills/strategic-compact/](../skills/strategic-compact/) — Strategic compaction skill
- [scripts/hooks/](../scripts/hooks/) — Hook script implementations