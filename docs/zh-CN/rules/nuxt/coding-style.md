---
paths:
  - "**/nuxt.config.*"
  - "**/app.config.*"
  - "**/app.vue"
  - "**/pages/**"
  - "**/layouts/**"
  - "**/middleware/**"
---

# Nuxt 编码风格

> 本文件在 [common/coding-style.md](../common/coding-style.md) 基础上扩展，增加 Nuxt 特定内容。

## 目录布局

- 默认 `srcDir` 为 `app/`。框架文件位于 `app/pages/`、`app/layouts/`、`app/middleware/`、`app/plugins/`、`app/app.config.ts`。`nuxt.config.ts` 和 `server/` 保留在项目根目录。
- 某些项目将 `srcDir` 覆盖为 `src/` 以采用 Feature-Sliced Design 布局，并重新映射 `dir.pages`（例如映射到 `src/app/routes`）、`dir.layouts` 以及 `@`/`~` 别名。在假定路径之前，务必先检查 `nuxt.config.ts`。

## Auto-imports 规范

- `app/composables/` 和 `server/utils/` 中的 composables 会被自动 import。不要手动 import Nuxt composables（`useFetch`、`useState`、`navigateTo`）或 `defineStore` / `storeToRefs`。
- 不要添加独立的 `vue-router` 依赖（Nuxt 已内置 v5），也不要手动挂载 `createApp` / `createPinia` / `createRouter`。这些由框架负责装配。

## Compiler macros

- `definePageMeta` 是一个编译期 macro。仅可使用静态值，其内部不得包含 reactive 数据或副作用调用。
- 通过 `declare module '#app'` 来增强带类型的 `PageMeta`，而不是使用类型断言。

## 配置文件分离

三个文件相互独立，不要混用。

- `nuxt.config.ts` = 仅用于构建期（`routeRules`、`modules`、`nitro`、`ssr` 标志）。非 reactive。
- `runtimeConfig`（位于 nuxt.config 内）= 按环境的 runtime 值，可通过 `NUXT_*` 环境变量覆盖。根级 key 仅在服务端可用，`public` key 对客户端可见。
- `app/app.config.ts` = 公开的、构建期固化的 reactive 设置（theme tokens、feature flags）。不支持环境变量覆盖。绝不存放 secrets。

## Head 与 meta

- `nuxt.config.ts` 中的 `app.head` 仅接受静态值。
- Reactive meta 必须通过组件 setup 中的 `useHead` / `useSeoMeta` 来处理，绝不通过 `app.head`。

## 参考

- ECC skills：`nuxt4-patterns`、`vite-patterns`、`frontend-patterns`。
- [Nuxt 目录结构](https://nuxt.com/docs/guide/directory-structure/app)
- [Nuxt 配置](https://nuxt.com/docs/api/nuxt-config)
