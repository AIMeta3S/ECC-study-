---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# React Native / Expo Hooks

> 本文件扩展了 [common/hooks.md](../common/hooks.md)，提供 React Native / Expo 专用的自动化指引。

这些是推荐的 PostToolUse 自动化，用于保持 RN/Expo 代码健康。在 hook runtime 中接入它们（或手动运行）；根据你的包管理器调整命令。

## 建议的 PostToolUse 检查（在编辑 *.ts/*.tsx 时）

- **类型检查：** `tsc --noEmit` — 尽早发现类型错误。
- **Lint：** `npx expo lint`（使用 `eslint-config-expo`；从 SDK 53+ 起默认采用 flat config `eslint.config.js`）。
- **格式化：** 对已更改的文件执行 `prettier --write`。

## 发布前 / 定期

- `npx expo-doctor` — 校验 Expo/native 依赖的健康状况与配置。
- `npx expo install --check` — 保持 native 依赖与已安装的 Expo SDK 对齐。
- `npm audit` — 依赖漏洞扫描。

## 注意事项

- 不要在快速编辑 hook 中运行沉重的 native 构建；编辑时的 hook 只保留 typecheck/lint/format。
- 将 `eas build` / E2E 保留给显式命令或 CI，不要用于每次编辑的自动化。
- 保持这些与 ECC hook runtime 控制项（`ECC_HOOK_PROFILE`、`ECC_DISABLED_HOOKS`）一致。
