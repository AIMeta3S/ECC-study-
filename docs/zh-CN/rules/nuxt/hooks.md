---
paths:
  - "**/nuxt.config.*"
  - "**/app.config.*"
  - "**/server/**/*.ts"
  - "**/*.vue"
---

# Nuxt Hooks

> 本文件在 [common/hooks.md](../common/hooks.md) 基础上扩展了 Nuxt 特定内容。

这些是用于 Nuxt 工作的 Claude Code harness hooks。它们通过 harness 运行，而非由 Claude 运行。

## Typecheck

- `nuxi typecheck` 封装了 `vue-tsc`。需要 `vue-tsc` + `typescript` 作为开发依赖。
- 在 `.vue` / `.ts` 编辑或 pre-commit 时运行。Typecheck 是全项目范围的，因此要对其进行 debounce 并用 timeout 包裹（参照 `web/hooks.md`，例如 `timeout 60 nuxi typecheck`），这样卡住的 typecheck 会被回收清除，而不是在快速编辑过程中不断堆积。

## Lint

- 使用 `@nuxt/eslint` 模块（flat config，项目感知，会生成 `.nuxt/eslint.config.mjs`）。
- 运行 `eslint .` 或 `eslint --fix`。这是 Nuxt 官方的 ESLint 集成，优先于手工配置使用。

## Format

- 使用 `prettier --write`，或在 `@nuxt/eslint` 中启用样式规则，以避免 Prettier 与 ESLint 的冲突。
- 选定唯一的格式化主导工具。不要同时运行 Prettier 和 ESLint 的样式规则。

## 建议的 PostToolUse 链

- 当对 `app/**` 和 `server/**` 执行 Edit 时：先运行 `eslint --fix`，然后运行 `timeout 60 nuxi typecheck`。
- 顺序很重要：先执行 lint-fix（会修改文件），后执行带 timeout 的 typecheck（验证结果）。Debounce 仍然适用。

## 参考

- ECC skills：`nuxt4-patterns`、`vite-patterns`。
- [@nuxt/eslint 模块](https://eslint.nuxt.com/)
- [nuxi typecheck](https://nuxt.com/docs/api/commands/typecheck)
