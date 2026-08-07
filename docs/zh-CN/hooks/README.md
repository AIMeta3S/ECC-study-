# Hooks

Hooks 是事件驱动的自动化机制，在 Claude Code 工具执行之前或之后触发。它们用于强制保障代码质量、及早发现错误，并自动化重复性的检查。

## Hooks 的工作原理

```
User request → Claude picks a tool → PreToolUse hook runs → Tool executes → PostToolUse hook runs
```

- **PreToolUse** hooks 在工具执行之前运行。它们可以 **block**（exit code 2）或 **warn**（写 stderr 但不阻止执行）。
- **PostToolUse** hooks 在工具执行完成之后运行。它们可以分析输出但不能阻止执行。
- **Stop** hooks 在每次 Claude 响应之后运行。
- **SessionStart/SessionEnd** hooks 在 session 生命周期的边界处运行。
- **PreCompact** hooks 在 context compaction 之前运行，适合用于保存状态。

## 本插件中的 Hooks

Memory persistence 生命周期定义位于 `hooks/memory-persistence/`。
可执行的 hook 图仍然是 `hooks/hooks.json`；memory persistence 目录是 SessionStart、PreCompact、observation、activity tracking 以及 SessionEnd 行为的稳定契约。

## 手动安装这些 Hooks

对于 Claude Code 手动安装，不要将仓库原始的 `hooks.json` 粘贴到 `~/.claude/settings.json`，也不要直接复制到 `~/.claude/hooks/hooks.json`。仓库检入的这个文件面向 plugin/repo 使用场景，应当通过 ECC 安装器安装或作为 plugin 加载。

请改用安装器，这样 hook 命令会根据你实际的 Claude 根目录进行重写：

```bash
bash ./install.sh --target claude --modules hooks-runtime
```

```powershell
pwsh -File .\install.ps1 --target claude --modules hooks-runtime
```

这会将解析后的 hooks 安装到 `~/.claude/hooks/hooks.json`。在 Windows 上，Claude 配置根目录是 `%USERPROFILE%\\.claude`。

### PreToolUse Hooks

| Hook | Matcher | 行为 | Exit Code |
|------|---------|------|-----------|
| **Dev server blocker** | `Bash` | 阻止在 tmux 之外运行 `npm run dev` 等命令 —— 确保可以访问 log | 2 (blocks) |
| **Tmux reminder** | `Bash` | 为长时间运行的命令（npm test、cargo build、docker）建议使用 tmux | 0 (warns) |
| **Git push reminder** | `Bash` | 在 `git push` 之前提醒 review 改动 | 0 (warns) |
| **Pre-commit quality check** | `Bash` | 在 `git commit` 之前运行质量检查：对 staged 文件执行 lint，当通过 `-m/--message` 提供时验证 commit message 格式，检测 console.log/debugger/secrets | 2 (blocks critical) / 0 (warns) |
| **Doc file warning** | `Write` | 对非标准的 `.md`/`.txt` 文件发出警告（允许 README、CLAUDE、CONTRIBUTING、CHANGELOG、LICENSE、SKILL、docs/、skills/）；跨平台路径处理 | 0 (warns) |
| **Strategic compact** | `Edit\|Write` | 在逻辑间隔点（大约每 50 次工具调用）建议手动执行 `/compact` | 0 (warns) |

### PostToolUse Hooks

| Hook | Matcher | 作用 |
|------|---------|------|
| **PR logger** | `Bash` | 在 `gh pr create` 之后记录 PR URL 和 review 命令 |
| **Build analysis** | `Bash` | 在 build 命令之后进行后台分析（async、non-blocking） |
| **Quality gate** | `Edit\|Write\|MultiEdit` | 在 edit 之后运行快速质量检查 |
| **Design quality check** | `Edit\|Write\|MultiEdit` | 当前端 edit 偏向通用模板化的 UI 时发出警告 |
| **Prettier format** | `Edit` | 在 edit 之后使用 Prettier 自动格式化 JS/TS 文件 |
| **TypeScript check** | `Edit` | 在编辑 `.ts`/`.tsx` 文件之后运行 `tsc --noEmit` |
| **console.log warning** | `Edit` | 对已编辑文件中的 `console.log` 语句发出警告 |

### Lifecycle Hooks

| Hook | Event | 作用 |
|------|-------|------|
| **Session start** | `SessionStart` | 加载之前的 context 并检测包管理器 |
| **Pre-compact** | `PreCompact` | 在 context compaction 之前保存状态 |
| **Console.log audit** | `Stop` | 在每次响应之后检查所有修改过的文件是否含 `console.log` |
| **Session summary** | `Stop` | 当 transcript path 可用时持久化 session 状态 |
| **Pattern extraction** | `Stop` | 评估 session 中是否含有可提取的模式（continuous learning） |
| **Cost tracker** | `Stop` | 发出轻量的运行成本 telemetry 标记 |
| **Desktop notify** | `Stop` | 发送 macOS 桌面通知，附带任务摘要（standard 及以上 profile） |
| **Session end marker** | `SessionEnd` | 生命周期标记与清理 log |

## 自定义 Hooks

### 禁用某个 Hook

删除或在 `hooks.json` 中注释掉对应的 hook 条目。如果是作为 plugin 安装的，请在你的 `~/.claude/settings.json` 中覆盖：

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

### 运行时 Hook 控制（推荐）

使用环境变量来控制 hook 行为，无需编辑 `hooks.json`：

```bash
# minimal | standard | strict（默认：standard）
export ECC_HOOK_PROFILE=standard

# 禁用特定的 hook ID（逗号分隔）
export ECC_DISABLED_HOOKS="pre:bash:tmux-reminder,post:edit:typecheck"

# 仅在安装或恢复期间禁用 GateGuard
export ECC_GATEGUARD=off

# 限制 SessionStart 额外 context 的大小（默认：8000 字符）
export ECC_SESSION_START_MAX_CHARS=4000

# 完全禁用 SessionStart 的额外 context
export ECC_SESSION_START_CONTEXT=off

# 保留 context/scope/loop 警告，但抑制 API 速率相关的成本估算
export ECC_CONTEXT_MONITOR_COST_WARNINGS=off
```

Windows PowerShell：

```powershell
[Environment]::SetEnvironmentVariable('ECC_CONTEXT_MONITOR_COST_WARNINGS', 'off', 'User')
```

Profiles：
- `minimal` —— 仅保留必要的 lifecycle 和安全 hooks。
- `standard` —— 默认档；平衡质量与安全检查。
- `strict` —— 启用额外的提醒和更严格的 guardrails。

### 编写自己的 Hook

Hooks 是 shell 命令，通过 stdin 接收 JSON 格式的 tool input，并必须通过 stdout 输出 JSON。

**基本结构：**

```javascript
// my-hook.js
let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  const input = JSON.parse(data);

  // 访问工具信息
  const toolName = input.tool_name;        // "Edit"、"Bash"、"Write" 等
  const toolInput = input.tool_input;      // 工具特定的参数
  const toolOutput = input.tool_output;    // 仅在 PostToolUse 中可用

  // 警告（不阻止执行）：写入 stderr
  console.error('[Hook] Warning message shown to Claude');

  // 阻止执行（仅 PreToolUse）：以 code 2 退出
  // process.exit(2);

  // 始终将原始数据输出到 stdout
  console.log(data);
});
```

**Exit code（退出码）：**
- `0` —— 成功（继续执行）
- `2` —— 阻止该 tool call（仅 PreToolUse）
- 其他非零值 —— 错误（会被记录但不阻止执行）

### Hook Input Schema

```typescript
interface HookInput {
  tool_name: string;          // "Bash"、"Edit"、"Write"、"Read" 等
  tool_input: {
    command?: string;         // Bash：正在运行的命令
    file_path?: string;       // Edit/Write/Read：目标文件
    old_string?: string;      // Edit：被替换的文本
    new_string?: string;      // Edit：替换后的文本
    content?: string;         // Write：文件内容
  };
  tool_output?: {             // 仅 PostToolUse 可用
    output?: string;          // 命令/工具的输出
  };
}
```

### Async Hooks

对于不应阻塞主流程的 hooks（例如后台分析）：

```json
{
  "type": "command",
  "command": "node my-slow-hook.js",
  "async": true,
  "timeout": 30
}
```

Async hooks 在后台运行。它们无法阻止工具执行。

## 常用 Hook 配方

### 警告 TODO 注释

```json
{
  "matcher": "Edit",
  "hooks": [{
    "type": "command",
    "command": "node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const i=JSON.parse(d);const ns=i.tool_input?.new_string||'';if(/TODO|FIXME|HACK/.test(ns)){console.error('[Hook] New TODO/FIXME added - consider creating an issue')}console.log(d)})\""
  }],
  "description": "Warn when adding TODO/FIXME comments"
}
```

### 阻止创建大文件

```json
{
  "matcher": "Write",
  "hooks": [{
    "type": "command",
    "command": "node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const i=JSON.parse(d);const c=i.tool_input?.content||'';const lines=c.split('\\n').length;if(lines>800){console.error('[Hook] BLOCKED: File exceeds 800 lines ('+lines+' lines)');console.error('[Hook] Split into smaller, focused modules');process.exit(2)}console.log(d)})\""
  }],
  "description": "Block creation of files larger than 800 lines"
}
```

### 使用 ruff 自动格式化 Python 文件

```json
{
  "matcher": "Edit",
  "hooks": [{
    "type": "command",
    "command": "node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const i=JSON.parse(d);const p=i.tool_input?.file_path||'';if(/\\.py$/.test(p)){const{execFileSync}=require('child_process');try{execFileSync('ruff',['format',p],{stdio:'pipe'})}catch(e){}}console.log(d)})\""
  }],
  "description": "Auto-format Python files with ruff after edits"
}
```

### 要求为新源码文件配套测试文件

```json
{
  "matcher": "Write",
  "hooks": [{
    "type": "command",
    "command": "node -e \"const fs=require('fs');let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const i=JSON.parse(d);const p=i.tool_input?.file_path||'';if(/src\\/.*\\.(ts|js)$/.test(p)&&!/\\.test\\.|\\.spec\\./.test(p)){const testPath=p.replace(/\\.(ts|js)$/,'.test.$1');if(!fs.existsSync(testPath)){console.error('[Hook] No test file found for: '+p);console.error('[Hook] Expected: '+testPath);console.error('[Hook] Consider writing tests first (/tdd)')}}console.log(d)})\""
  }],
  "description": "Remind to create tests when adding new source files"
}
```

## 跨平台说明

Hook 逻辑用 Node.js 脚本实现，以便在 Windows、macOS 和 Linux 上保持跨平台一致行为。continuous-learning observer 以 Node 模式 hook 的形式暴露，通过一个 profile 控制的 runner 委托给其既有的 `observe.sh` 实现，并带有 Windows 安全的 fallback 行为。

## 相关内容

- [rules/common/hooks.md](../rules/common/hooks.md) —— Hook 架构指南
- [skills/strategic-compact/](../skills/strategic-compact/) —— Strategic compaction skill
- [scripts/hooks/](../scripts/hooks/) —— Hook 脚本实现
