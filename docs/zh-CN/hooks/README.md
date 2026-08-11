# Hooks

Hooks 是事件驱动的自动化机制，会在 Claude Code 工具执行之前或之后触发。它们用于强制执行代码质量、及早捕捉错误，并自动化重复性检查。

## Hooks 的工作方式

```
User request 
  → Claude picks a tool 
    → PreToolUse hook runs 
      → Tool executes 
        → PostToolUse hook runs
```

- **PreToolUse** hooks 在工具执行之前运行。它们可以 **阻塞**（exit code 2）或 **警告**（向 stderr 输出且不阻塞）。
- **PostToolUse** hooks 在工具完成后运行。它们可以分析输出，但不能阻塞。
- **Stop** hooks 在每次 Claude 响应后运行。
- **SessionStart/SessionEnd** hooks 在会话生命周期的边界运行。
- **PreCompact** hooks 在上下文压缩前运行，适用于保存状态。

## 本插件中的 Hooks

Memory persistence 生命周期定义位于 `hooks/memory-persistence/`。是 SessionStart、PreCompact、observation、activity tracking 及 SessionEnd 行为的稳定契约。
可执行的 hook graph 仍然是 `hooks/hooks.json`。

## 手动安装这些 Hooks

对于 Claude Code 手动安装，切勿将原始仓库中的 `hooks.json` 直接粘贴到 `~/.claude/settings.json` 中，或将其直接复制到 `~/.claude/hooks/hooks.json`。把`hooks/`目录相关文件收录到仓库中是为 plugin/repo-oriented 准备的，应通过 ECC installer 安装，或作为 plugin 加载。

请使用 installer：

```bash
bash ./install.sh --target claude --modules hooks-runtime
```

```powershell
pwsh -File .\install.ps1 --target claude --modules hooks-runtime
```

该命令将：
  - **拷贝`hooks/` → `~/.claude/hooks/`**（5 文件）
  - **拷贝`scripts/hooks/` → `~/.claude/scripts/hooks/`**（约 50 文件）
  - **拷贝`scripts/lib/` → `~/.claude/scripts/lib/`**（约 123 文件，递归）
  - **替换`~/.claude/hooks/hooks.json`中的`{CLAUDE_PLUGIN_ROOT}`**：读源文件 → 替换 → 回写文件
  - **更新`~/.claude/ecc/install-state.json`**：账本，schema `ecc.install.v1`，记录 target/modules/operations/每文件 contentSha256

注意：在 Windows 上，Claude 配置根目录为 `%USERPROFILE%\.claude`。

### PreToolUse Hooks

| Hook | Matcher | 行为 | Exit Code |
|------|---------|----------|-----------|
| **Dev server blocker** | `Bash` | 阻塞非 tmux 环境中的 `npm run dev` 等——确保能访问日志 | 2（阻塞） |
| **Tmux reminder** | `Bash` | 建议为长时间运行的命令使用 tmux（如 npm test, cargo build, docker） | 0（警告） |
| **Git push reminder** | `Bash` | 提醒在 `git push` 前 review 变更 | 0（警告） |
| **Pre-commit quality check** | `Bash` | 在 `git commit` 前运行质量检查：对 staged files 执行 lint，当通过 `-m/--message` 提供时验证 commit message 格式，检测 console.log/debugger/secrets | 2（阻塞严重问题）/ 0（警告） |
| **Doc file warning** | `Write` | 警告非标准的 `.md`/`.txt` 文件（允许 README、CLAUDE、CONTRIBUTING、CHANGELOG、LICENSE、SKILL、docs/、skills/）；跨平台路径处理 | 0（警告） |
| **Strategic compact** | `Edit\|Write` | 建议在合理的间隔（约每 50 次 tool 调用）手动执行 `/compact` | 0（警告） |

### PostToolUse Hooks

| Hook | Matcher | 功能 |
|------|---------|-------------|
| **PR logger** | `Bash` | 在 `gh pr create` 后记录 PR URL 与 review 命令 |
| **Build analysis** | `Bash` | 在 build 命令之后进行后台分析（async，非阻塞） |
| **Quality gate** | `Edit\|Write\|MultiEdit` | 在编辑后运行快速质量检查 |
| **Design quality check** | `Edit\|Write\|MultiEdit` | 当前端编辑趋向于通用模板化 UI 时发出警告 |
| **Prettier format** | `Edit` | 在编辑后使用 Prettier 自动格式化 JS/TS 文件 |
| **TypeScript check** | `Edit` | 在编辑 `.ts`/`.tsx` 文件后运行 `tsc --noEmit` |
| **console.log warning** | `Edit` | 警告编辑文件中存在 `console.log` 语句 |

### Lifecycle Hooks

| Hook | 事件 | 功能 |
|------|-------|-------------|
| **Session start** | `SessionStart` | 加载先前的上下文并检测 package manager |
| **Plan Canvas sessions** | `SessionStart` | 呈现已打开的 Plan Canvas 浏览器审查，以便新会话可以继续循环 |
| **Pre-compact** | `PreCompact` | 在上下文压缩前保存状态 |
| **Console.log audit** | `Stop` | 在每次响应后检查所有已修改文件中是否存在 `console.log` |
| **Session summary** | `Stop` | 当 transcript 路径可用时持久化 session 状态 |
| **Pattern extraction** | `Stop` | 评估 session 以提取模式（持续学习） |
| **Cost tracker** | `Stop` | 发出轻量级运行成本遥测标记 |
| **Desktop notify** | `Stop` | 发送带有任务摘要的 macOS 桌面通知（standard+） |
| **Session end marker** | `SessionEnd` | 生命周期标记与清理日志 |

## 自定义 Hooks

### 禁用 Hook

在 `hooks.json` 中删除或注释掉对应的 hook 条目。如果作为 plugin 安装，可以在你的 `~/.claude/settings.json` 中覆盖：

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

使用环境变量来控制 hook 行为，而无需编辑 `hooks.json`：

```bash
# 总开关。显式设置的环境变量会覆盖 plugin 偏好。
export ECC_HOOKS_ENABLED=true

# minimal | standard | strict（默认：standard）
export ECC_HOOK_PROFILE=standard

# 禁用特定的 hook ID（逗号分隔）
export ECC_DISABLED_HOOKS="pre:bash:tmux-reminder,post:edit:typecheck"

# 在 setup 或恢复期间仅禁用 GateGuard
export ECC_GATEGUARD=off

# 限制 SessionStart 附加上下文（默认：8000 字符）
export ECC_SESSION_START_MAX_CHARS=4000

# 完全禁用 SessionStart 附加上下文
export ECC_SESSION_START_CONTEXT=off

# 保留 context/scope/loop 警告，但抑制 API 速率成本估算
export ECC_CONTEXT_MONITOR_COST_WARNINGS=off
```

Windows PowerShell：

```powershell
[Environment]::SetEnvironmentVariable('ECC_CONTEXT_MONITOR_COST_WARNINGS', 'off', 'User')
```

Claude setup 专用值：
- `off` — 通过 `ecc setup` 禁用本地 ECC hook 工作；这不是运行时 hook profile。

运行时 hook profile：
- `minimal` — 仅保留必要的生命周期和安全 hooks。
- `standard` — 默认；质量与安全检查的平衡。
- `strict` — 启用额外的提醒和更严格的护栏。

Claude plugin 暴露了与个人 `hooks_enabled` 和 `hook_profile` 设置相同的选项。运行 `ecc setup --mode claude-plugin` 以安装或更新 plugin 并更改这些偏好。

### 编写你自己的 Hook

Hooks 是 shell commands，通过 stdin 以 JSON 形式接收工具输入，并且必须将 JSON 输出到 stdout。

**基本结构：**

```javascript
// my-hook.js
let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  const input = JSON.parse(data);

  // 访问工具信息
  const toolName = input.tool_name;        // "Edit", "Bash", "Write" 等
  const toolInput = input.tool_input;      // 工具特定参数
  const toolOutput = input.tool_output;    // 仅 PostToolUse 可用

  // 警告（非阻塞）：写入 stderr
  console.error('[Hook] Warning message shown to Claude');

  // 阻塞（仅 PreToolUse）：以 exit code 2 退出
  // process.exit(2);

  // 始终将原始数据输出到 stdout
  console.log(data);
});
```

**Exit codes：**
- `0` — 成功（继续执行）
- `2` — 阻止工具调用（仅 PreToolUse）
- 其他非零值 — 错误（记录日志但不阻塞）

### Hook Input Schema

```typescript
interface HookInput {
  tool_name: string;          // "Bash", "Edit", "Write", "Read" 等
  tool_input: {
    command?: string;         // Bash: 正在运行的命令
    file_path?: string;       // Edit/Write/Read: 目标文件
    old_string?: string;      // Edit: 被替换的文本
    new_string?: string;      // Edit: 替换文本
    content?: string;         // Write: 文件内容
  };
  tool_output?: {             // 仅 PostToolUse
    output?: string;          // 命令/工具输出
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

Async hooks 在后台运行。它们无法阻塞工具执行。

## 常见 Hook 示例

### 对 TODO 注释发出警告

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

### 阻止创建过大的文件

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

### 要求在新增源文件时同时创建测试文件

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

Hook 逻辑使用 Node.js 脚本实现，以在 Windows、macOS 和 Linux 上实现跨平台行为。continuous-learning observer 以 Node-mode hook 的形式暴露，并通过一个带 profile-gated runner 的机制委派给现有的 `observe.sh` 实现，同时具备 Windows 安全回退行为。

## 相关资源

- [rules/common/hooks.md](../rules/common/hooks.md) — Hook 架构指南
- [skills/strategic-compact/](../skills/strategic-compact/) — Strategic compaction skill
- [scripts/hooks/](../scripts/hooks/) — Hook 脚本实现