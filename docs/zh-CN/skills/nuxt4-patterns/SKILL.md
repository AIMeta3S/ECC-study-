---
name: nuxt4-patterns
description: 针对 Nuxt 4 应用的 hydration 安全、性能、路由规则、lazy loading，以及使用 useFetch 和 useAsyncData 进行 SSR 安全数据获取的相关模式。
metadata:
  origin: ECC
---

# Nuxt 4 模式

在构建或调试涉及 SSR、混合渲染、路由规则或页面级数据获取的 Nuxt 4 应用时使用。

## 何时激活

- 服务端 HTML 与客户端状态之间的 hydration 不匹配
- 路由级渲染决策，例如 prerender、SWR、ISR 或客户端专属区块
- 围绕 lazy loading、lazy hydration 或 payload 大小的性能优化工作
- 使用 `useFetch`、`useAsyncData` 或 `$fetch` 进行页面或组件的数据获取
- 与路由参数、中间件或 SSR/客户端差异相关的 Nuxt 路由问题

## Hydration 安全

- 保持首次渲染的确定性。不要将 `Date.now()`、`Math.random()`、浏览器专属 API 或对 storage 的读取直接放入 SSR 渲染的模板状态中。
- 当服务端无法产生相同的 markup 时，将浏览器专属逻辑移至 `onMounted()`、`import.meta.client`、`ClientOnly` 或 `.client.vue` 组件中。
- 使用 Nuxt 的 `useRoute()` 组合式函数，而非来自 `vue-router` 的同名函数。
- 不要使用 `route.fullPath` 来驱动 SSR 渲染的 markup。URL fragment 是客户端专属的，这可能导致 hydration 不匹配。
- 将 `ssr: false` 视为真正浏览器专属区域的兜底方案，而非修复不匹配的默认手段。

## 数据获取

- 在页面和组件中，优先使用 `await useFetch()` 进行 SSR 安全的 API 读取。它会将服务端获取的数据转发到 Nuxt payload 中，避免在 hydration 时进行二次 fetch。
- 当 fetcher 不是简单的 `$fetch()` 调用、需要自定义 key，或在组合多个 async 数据源时，使用 `useAsyncData()`。
- 为 `useAsyncData()` 提供稳定的 key，以实现 cache 复用和可预测的 refresh 行为。
- 保持 `useAsyncData()` 的 handler 无 side effect。它们可能在 SSR 和 hydration 期间运行。
- 将 `$fetch()` 用于用户触发的写入或客户端专属操作，而非用于应从 SSR 进行 hydration 的顶层页面数据。
- 对于不应阻塞导航的非关键数据，使用 `lazy: true`、`useLazyFetch()` 或 `useLazyAsyncData()`。在 UI 中处理 `status === 'pending'`。
- 仅对 SEO 或首次绘制不需要的数据使用 `server: false`。
- 使用 `pick` 精简 payload 大小，当不需要深度响应性时优先使用更浅的 payload。

```ts
const route = useRoute()

const { data: article, status, error, refresh } = await useAsyncData(
  () => `article:${route.params.slug}`,
  () => $fetch(`/api/articles/${route.params.slug}`),
)

const { data: comments } = await useFetch(`/api/articles/${route.params.slug}/comments`, {
  lazy: true,
  server: false,
})
```

## 路由规则

对于渲染和缓存策略，优先使用 `nuxt.config.ts` 中的 `routeRules`：

```ts
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },
    '/products/**': { swr: 3600 },
    '/blog/**': { isr: true },
    '/admin/**': { ssr: false },
    '/api/**': { cache: { maxAge: 60 * 60 } },
  },
})
```

- `prerender`：在构建时生成静态 HTML
- `swr`：返回已缓存内容，并在后台 revalidate
- `isr`：在受支持的平台上进行 incremental static regeneration
- `ssr: false`：客户端渲染的路由
- `cache` 或 `redirect`：Nitro 层级的响应行为

按路由组而非全局选择路由规则。营销页面、目录、dashboard 和 API 通常需要不同的策略。

## Lazy Loading 与性能

- Nuxt 已按路由对页面进行代码分割。在对组件拆分进行微优化之前，请先确保路由边界有意义。
- 使用 `Lazy` 前缀动态 import 非关键组件。
- 使用 `v-if` 条件渲染 lazy 组件，使 chunk 在 UI 实际需要之前不会被加载。
- 对 below-the-fold 或非关键的交互式 UI 使用 lazy hydration。

```vue
<template>
  <LazyRecommendations v-if="showRecommendations" />
  <LazyProductGallery hydrate-on-visible />
</template>
```

- 对于自定义策略，使用 `defineLazyHydrationComponent()` 配合 visibility 或 idle 策略。
- Nuxt 的 lazy hydration 作用于 single-file component。向经过 lazy hydration 的组件传递新 props 会立即触发 hydration。
- 对内部导航使用 `NuxtLink`，以便 Nuxt 可以 prefetch 路由组件和生成的 payload。

## 审查清单

- 首次 SSR 渲染与 hydration 后的客户端渲染产生相同的 markup
- 页面数据使用 `useFetch` 或 `useAsyncData`，而非顶层 `$fetch`
- 非关键数据为 lazy 加载，并具备明确的 loading UI
- 路由规则与页面的 SEO 和新鲜度需求相匹配
- 重量级交互式 island 采用 lazy-load 或 lazy hydration
