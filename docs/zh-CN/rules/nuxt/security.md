---
paths:
  - "**/nuxt.config.*"
  - "**/app.config.*"
  - "**/server/**/*.ts"
---

# Nuxt 安全

> 本文件扩展了 [common/security.md](../common/security.md)，增加了 Nuxt 特定内容。

## runtimeConfig 的 public 与 private

- 根级 `runtimeConfig` 键仅服务端可用。`runtimeConfig.public` 会被序列化到每个页面 payload 中（客户端可见）。
- Secret 只能放在根级。绝不要把 secret 放在 `app.config.ts` 或 `runtimeConfig.public` 中，两者都会打包进 client bundle。
- 官方警告："注意不要通过渲染或将其传入 `useState`，把 runtime config 键暴露给客户端。"

## 服务器路由的输入校验

- 使用 h3 的 validating reader。不要信任原始的 `readBody` / `getQuery` / `getRouterParam`。
  - `readValidatedBody(event, schema)` 校验 body。
  - `getValidatedQuery(event, schema)` 校验 query。
  - `getValidatedRouterParams(event, schema)` 校验 route param。
- 它们都接受校验函数或 Zod schema，失败时抛出异常。

## SSR payload 泄漏

- `useState`、`useFetch` / `useAsyncData` 的结果，或 `runtimeConfig.public` 中的任何内容都会被序列化到 client payload 中。绝不要把 secret 写入这些位置。
- 使用 `useServerSeoMeta` 设置仅服务端的 meta，且无客户端开销。

## SSR 下的 cookie 与认证透传

- Nuxt 不会自动把传入用户的 cookie 附加到出站的服务端 `$fetch` 上。
- 使用 `useRequestFetch()`（最简洁，已预绑定到 request header）或 `useRequestHeaders(['cookie'])` 显式转发。
- 通过 `$fetch.raw` + `appendResponseHeader(event, 'set-cookie', ...)` 将后端的 `Set-Cookie` 转发给浏览器。
- socket.io 仅用于客户端（`.client.ts` plugin），绝不能用于 SSR。

## 服务端 $fetch 的 SSRF

- 服务器路由具有完整的网络出口能力。绝不要把用户可控的输入直接传入服务端 `$fetch` 的 URL 或 host 中。
- 先校验 param（使用上述 h3 工具），对目标做 allowlist，固定到 `runtimeConfig.public.apiBase`，拒绝用户提供的绝对 URL。
- 仅对发起外部网络请求（服务端 `$fetch`）、处理 auth token 或 credential、或执行敏感 mutation 或授权检查的路由自动触发 `/security-review`。示例：易受 SSRF 影响的代理端点、token exchange 或密码重置、管理员操作。跳过那些只接受已校验 query param 的无害只读路由。

## 参考

- ECC skill：`security-review`、`nuxt4-patterns`。
- [Nuxt runtime config](https://nuxt.com/docs/guide/going-further/runtime-config)
- [h3 request utils](https://v1.h3.dev/utils/request)
