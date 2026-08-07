---
paths:
  - "**/nuxt.config.*"
  - "**/app.config.*"
  - "**/app.vue"
  - "**/server/**/*.ts"
  - "**/pages/**"
  - "**/middleware/**"
---

# Nuxt 模式

> 本文件在 [common/patterns.md](../common/patterns.md) 基础上扩展 Nuxt 特定内容。

## 数据获取方式选择

关键所在。按渲染时机选择，而非凭习惯。

- `useFetch(url)` = SSR 安全，URL 优先的初始/首次绘制数据。默认选择。将服务端结果通过 payload 转发，因此不会出现 hydration 重复 fetch。
- `useAsyncData(key, fn)` = SSR 安全，自定义 async 逻辑（SDK / GraphQL / 组合调用）。显式 key 可在多个组件间共享结果。
- `$fetch` = 仅用于客户端交互（表单提交、按钮点击、POST/PUT/DELETE）。非 SSR 安全，若用于首次绘制会重复 fetch。
- 规则：凡在首次绘制时渲染的内容用 `useFetch` / `useAsyncData`，`$fetch` 仅用于事件驱动的 mutation。

## 共享状态

- `useState('key', () => init)` 用于 SSR 安全的共享状态。值必须可被 JSON 序列化。
- 禁止在 module scope 使用 `export const x = ref()`。单一共享实例会在并发 SSR 请求间泄漏，导致内存泄漏。
- 使用 `@pinia/nuxt` 时：Pinia 用于领域状态，`useState` 用于跨组件的小型基础类型。
- 异步服务端初始化放在 `callOnce(async () => {...})` 中，不要作为 `useAsyncData` 内部的副作用。

## Nitro 服务端路由

- `server/api/*.{get,post}.ts` 按路径 + 方法自动注册。处理函数为 `defineEventHandler((event) => ...)`。
- 错误通过 `throw createError({ status, statusText })` 抛出。优先使用 Web API 的 `status` / `statusText`，而非已弃用的 `statusCode` / `statusMessage`。
- `server/middleware/` 不得返回响应。只能修改 `event.context` 或设置头部。

## 路由中间件

- `app/middleware/*.ts` 使用 `defineNuxtRouteMiddleware((to, from) => ...)`。
- 使用 `to` / `from` 参数。不要在中间件中调用 `useRoute()`。
- `.global` 后缀在每条路由上运行。返回 `navigateTo()` 进行重定向，返回 `abortNavigation()` 中止导航。

## Hydration 安全的渲染

- 对于延迟 fetch，依据 `status`（`idle | pending | success | error`）进行分支处理。
- `useAsyncData` 的 payload 使用 `devalue`（Date/Map/Set/refs 得以保留）。`server/api` 的响应仅支持 `JSON.stringify`，因此对非 JSON 类型需定义 `toJSON()`。
- 用 `pick` / `transform` 缩减 payload。这会减小序列化后的大小，但不会跳过 fetch。

## 参考

- ECC skills：`nuxt4-patterns`、`vite-patterns`、`frontend-patterns`。
- [Nuxt data fetching](https://nuxt.com/docs/getting-started/data-fetching)
- [Nuxt state management](https://nuxt.com/docs/getting-started/state-management)
- [Nuxt server engine (Nitro)](https://nuxt.com/docs/guide/directory-structure/server)
