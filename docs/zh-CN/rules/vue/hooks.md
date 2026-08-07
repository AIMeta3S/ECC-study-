---
paths:
  - "**/*.vue"
  - "**/*.ts"
  - "**/*.tsx"
---

# Vue Hooks

> 本文件在 [common/hooks.md](../common/hooks.md) 基础上扩展了 Vue 特定内容。

## PostToolUse 目标

在编辑后对 `*.vue`、`*.ts` 和 `*.tsx` 运行。尽可能将作用范围限定在已更改的文件。

## Typecheck

- 使用 `vue-tsc --noEmit` 进行 SFC 加 TypeScript 检查。普通的 `tsc` 无法读取 `.vue` single-file component，因此不得作为本项目的 typecheck hook。
- Typecheck 是 project-wide。对其进行防抖处理或限定作用域，以避免每次按键都保存的循环导致编辑器卡顿。

## Lint 与 Format

- `eslint --fix` with `eslint-plugin-vue`（flat-config `vue/vue3-recommended`）可同时覆盖 template 和 script 的 lint。
- 使用 `prettier --write` 进行 formatting。建议使用 Prettier-via ESLint 而不是单独使用 Prettier 进行格式化，以避免重复格式化和循环问题。

## 架构边界

- 可选：使用 `@feature-sliced/steiger` 或 `eslint-plugin-boundaries` 强制执行 Feature-Sliced Design 的 slice 边界，阻止深层的 cross-slice import。

## 顺序

```bash
# changed files only
eslint --fix "$FILE"
prettier --write "$FILE"
# project-wide, debounced
vue-tsc --noEmit
```

- 先逐文件运行 lint 和 format，最后再运行项目级的 typecheck，以便类型错误反映的是已 format 的源码。

## 参考

- ECC skills：`frontend-patterns`、`vite-patterns`。
- 文档：<https://github.com/vuejs/language-tools> (vue-tsc) · <https://eslint.vuejs.org/> · <https://github.com/feature-sliced/steiger>
