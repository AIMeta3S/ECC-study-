---
paths:
  - "**/nuxt.config.*"
  - "**/server/**/*.ts"
  - "**/pages/**"
  - "**/layouts/**"
  - "**/middleware/**"
---

# Nuxt 测试

> 本文件在 [common/testing.md](../common/testing.md) 基础上扩展了 Nuxt 专属内容。

包：`@nuxt/test-utils`。以 Vitest 为核心进行单元测试和组件测试，内置 Playwright 浏览器 E2E 支持。nuxt-vitest 和 vitest-environment-nuxt 已被取代并合并其中。

## 初始设置

- 安装开发依赖：`@nuxt/test-utils vitest @vue/test-utils happy-dom playwright-core`。
- 配置：从 `@nuxt/test-utils/config` 引入 `defineVitestConfig({ test: { environment: 'nuxt' } })`。多项目场景使用 `defineVitestProject`（隔离 unit / nuxt / e2e 环境）。
- 将 `@nuxt/test-utils/module` 添加到 `nuxt.config`。可通过 `// @vitest-environment nuxt` 按文件启用。

## 运行时辅助函数

从 `@nuxt/test-utils/runtime` 导入。

- `mountSuspended(component, opts)` 在 Nuxt 环境中挂载组件，支持 async setup + plugin 注入（接受 `@vue/test-utils` 的 mount options + `route`）。
- `renderSuspended(component, opts)` 是 Testing Library 的变体（需要 `@testing-library/vue`）。
- `mockNuxtImport(name, factory)` 用于 mock auto-imports（例如 `useState`）。每个文件中每个 import 仅可调用一次，使用 `vi.hoisted()`。
- `mockComponent(name, factory)` 通过 PascalCase 名称或路径进行 mock。
- `registerEndpoint(path, handler|opts)` mock 一个 Nitro endpoint，用于测试 server routes 或 stub 后端。支持 method + `once`。

## E2E 辅助函数

从 `@nuxt/test-utils/e2e` 导入。

- 在 describe block 内调用 `await setup({ rootDir, server, browser, ... })`（管理 beforeAll/afterAll）。
- 然后使用 `$fetch(url)`（返回渲染后的 HTML）、`fetch(url)`（返回响应对象）、`url(path)`（返回带端口的完整 URL）、`createPage(url)`（Playwright）。
- Playwright 集成：从 `@nuxt/test-utils/playwright` 导入 `expect` / `test`。

## 测试内容与方式

- Composables：使用 `mockNuxtImport` mock auto-imports，并通过 `mountSuspended` 挂载 host component，以在 Nuxt 运行时中驱动 `useState` / `useFetch`。
- Server routes：使用 `registerEndpoint` 进行 stub，或通过 e2e 的 `$fetch` / `fetch` 针对真实的 Nitro server。

## 参考

- ECC skills：`nuxt4-patterns`、`e2e-testing`、`vite-patterns`。
- [Nuxt 测试文档](https://nuxt.com/docs/getting-started/testing)
- [@nuxt/test-utils npm](https://www.npmjs.com/package/@nuxt/test-utils)
