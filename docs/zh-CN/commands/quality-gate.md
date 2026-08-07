---
description: 对单个文件运行 ECC formatter quality gate，并报告修复步骤。
---

# Quality Gate Command

formatter quality gate 的操作员入口，该 gate 通常作为
`post:quality-gate` PostToolUse hook (`scripts/hooks/quality-gate.js`) 运行。

## 实际工作原理

该 gate 是一个由 hook 输入驱动的单文件 formatter 检查，而非通过 CLI flag 控制：

- 脚本从 hook 的 stdin JSON 中读取目标
  (`tool_input.file_path`)；它不接受路径参数。
- 行为开关是环境变量：
  - `ECC_QUALITY_GATE_FIX=true` - 应用 formatting 修复，而非仅检查
  - `ECC_QUALITY_GATE_STRICT=true` - 将 formatter 失败记为 gate 失败
- 按文件类型覆盖：
  - `.ts/.tsx/.js/.jsx/.json/.md` - Biome `check` 或 Prettier `--check`，
    取决于项目附带哪一个（此处跳过 Biome 下的 JS/TS，因为
    `post-edit-format` 已经运行了 `biome check --write`）
  - `.go` - `gofmt`
  - `.py` - `ruff format`
- lint 和 type 检查不属于此 gate。对于 lint/type/test pipeline，请使用
  `verification-loop` skill 或对应语言的 verification skill。

## 用法

要针对单个文件手动运行该 gate，请将 hook 风格的 JSON 通过管道传递给
脚本（如果需要 fix 或 strict 行为，请先设置相应的环境变量开关）：

```bash
echo '{"tool_input":{"file_path":"src/example.ts"}}' \
  | ECC_QUALITY_GATE_FIX=true node scripts/hooks/quality-gate.js
```

然后报告 formatter 发现的问题以及具体的修复步骤。

## 备注

Hook 接线位于 `hooks/hooks.json` 中（`post:quality-gate`，通过
`run-with-flags.js` 配置 `standard`/`strict` profile）。

## 参数

$ARGUMENTS:

- `[path]` 要检查的可选文件。脚本本身不接受任何 CLI
  参数——当提供路径时，在运行上述命令之前，将其替换为 stdin JSON 中所示的
  `tool_input.file_path`
