> 本文件在 [common/hooks.md](../common/hooks.md) 基础上扩展了 Web 专用的 hook 建议。

# Web Hooks

## 推荐的 PostToolUse Hooks

优先使用项目本地工具。不要将 hook 接入远程一次性 package 执行。

### Format on Save

编辑后使用项目现有的 formatter 入口：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "pnpm prettier --write \"$FILE_PATH\"",
        "description": "Format edited frontend files"
      }
    ]
  }
}
```

通过 `yarn prettier` 或 `npm exec prettier --` 的等效本地命令也可以，前提是它们使用仓库自有的依赖。

### Lint Check

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "pnpm eslint --fix \"$FILE_PATH\"",
        "description": "Run ESLint on edited frontend files"
      }
    ]
  }
}
```

### Type Check

使用 `--incremental`，这样重复运行会复用之前的 `.tsbuildinfo`（未变更代码上 1-3 秒，而非每次 30-60 秒）。用 `timeout` 包裹，这样卡住的 tsc 会被操作系统回收，而不是跨编辑不断累积——这能防止当编辑触发速度快于 tsc 完成速度时出现多进程堆积。

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "timeout 60 pnpm tsc --noEmit --pretty false --incremental --tsBuildInfoFile node_modules/.cache/tsc-hook.tsbuildinfo",
        "description": "Type-check after frontend edits (incremental + timeout-capped)"
      }
    ]
  }
}
```

**为什么这两个 flag 都重要：**
- 没有 `--incremental`，每次编辑都从头重新检查整个程序。在真实的 Next.js 项目上这会迅速堆积：5-10 秒间隔的编辑 + 30-60 秒的 tsc 运行 = N 个并发 tsc 进程。
- 没有 `timeout`，卡住的 tsc（传递依赖变更、type-checker 卡在递归类型上）永远不会退出，并在父 shell 退出时变成孤儿进程。
- `--tsBuildInfoFile` 是必需的，因为 `--noEmit` 通常会抑制 buildinfo 的写入；显式指定路径才能让 incremental 继续工作。

如果你在没有 GNU coreutils 的 Windows 上，请将 `timeout 60` 替换为 PowerShell wrapper，或依赖 Stop/SessionEnd hook 来清理过期的 tsc 进程。

### CSS Lint

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "pnpm stylelint --fix \"$FILE_PATH\"",
        "description": "Lint edited stylesheets"
      }
    ]
  }
}
```

## PreToolUse Hooks

### 限制文件大小

依据 tool input content 阻止超大写入，而不是依据一个可能尚不存在的文件：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "command": "node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const i=JSON.parse(d);const c=i.tool_input?.content||'';const lines=c.split('\\n').length;if(lines>800){console.error('[Hook] BLOCKED: File exceeds 800 lines ('+lines+' lines)');console.error('[Hook] Split into smaller modules');process.exit(2)}console.log(d)})\"",
        "description": "Block writes that exceed 800 lines"
      }
    ]
  }
}
```

## Stop Hooks

### 最终 Build 验证

```json
{
  "hooks": {
    "Stop": [
      {
        "command": "pnpm build",
        "description": "Verify the production build at session end"
      }
    ]
  }
}
```

## Ordering

推荐顺序：
1. format
2. lint
3. type check
4. build 验证
