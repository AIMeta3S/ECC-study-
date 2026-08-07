---
name: vite-patterns
description: Vite 构建工具模式，涵盖配置、plugins、HMR、环境变量、proxy 设置、SSR、library mode、依赖预打包以及构建优化。在处理 vite.config.ts、Vite plugins 或基于 Vite 的项目时激活。
metadata:
  origin: ECC
---

# Vite 模式

面向 Vite 8+ 项目的构建工具与 dev server 模式。涵盖配置、环境变量、proxy 设置、library mode、依赖预打包以及常见的生产环境陷阱。

## 何时使用

- 配置 `vite.config.ts` 或 `vite.config.js`
- 设置环境变量或 `.env` 文件
- 为 API 后端配置 dev server proxy
- 优化构建产物（chunks、minification、assets）
- 使用 `build.lib` 发布库
- 排查依赖预打包或 CJS/ESM 互操作问题
- 调试 HMR、dev server 或构建错误
- 选择或排序 Vite plugins

## 工作原理

- **Dev mode** 以原生 ESM 形式提供源文件——不进行打包。transform 按需在每个 module 请求时执行，这就是冷启动快、HMR 精准的原因。
- **Build mode** 使用 Rolldown（v7+）或 Rollup（v5–v6）打包应用以用于生产环境，支持 tree-shaking、code-splitting 以及基于 Oxc 的 minification。
- **依赖预打包（Dependency pre-bundling）** 通过 esbuild 将 CJS/UMD 依赖一次性转换为 ESM，并将结果缓存到 `node_modules/.vite` 下，后续启动会跳过此工作。
- **Plugins** 在 dev 和 build 之间共享统一接口——同一个 plugin 对象既适用于 dev server 的按需 transform，也适用于生产流水线。
- **环境变量** 在构建时静态内联。带 `VITE_` 前缀的变量会成为 bundle 中的公开常量；所有无前缀的变量对客户端代码不可见。

## 示例

### 配置结构

#### 基础配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
})
```

#### 条件配置

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd())   // 仅加载 VITE_ 前缀变量（安全）

  return {
    plugins: [react()],
    server: command === 'serve' ? { port: 3000 } : undefined,
    define: {
      __API_URL__: JSON.stringify(env.VITE_API_URL),
    },
  }
})
```

#### 关键配置项

| 键 | 默认值 | 说明 |
|-----|---------|-------------|
| `root` | `'.'` | 项目根目录（`index.html` 所在位置） |
| `base` | `'/'` | 部署 assets 的公开基础路径 |
| `envPrefix` | `'VITE_'` | 暴露给客户端的环境变量前缀 |
| `build.outDir` | `'dist'` | 输出目录 |
| `build.minify` | `'oxc'` | Minifier（`'oxc'`、`'terser'` 或 `false`） |
| `build.sourcemap` | `false` | `true`、`'inline'` 或 `'hidden'` |

### Plugins

#### 常用 Plugins

大多数 plugin 需求都可以通过少数几个维护良好的 package 满足。在自行编写之前，先优先选用这些。

| Plugin | 用途 | 何时使用 |
|--------|---------|-------------|
| `@vitejs/plugin-react-swc` | 通过 SWC 实现 React HMR + Fast Refresh | React 应用的默认选择（比 Babel 版本更快） |
| `@vitejs/plugin-react` | 通过 Babel 实现 React HMR + Fast Refresh | 仅当需要 Babel 插件时（emotion、MobX decorators） |
| `@vitejs/plugin-vue` | Vue 3 SFC 支持 | Vue 应用 |
| `vite-plugin-checker` | 在 worker 线程中运行 `tsc` + ESLint，并提供 HMR overlay | **任何 TypeScript 应用**——Vite 在 `vite build` 期间不会进行类型检查 |
| `vite-tsconfig-paths` | 遵循 `tsconfig.json` 的 `paths` 别名 | 当 `tsconfig.json` 中已有别名时 |
| `vite-plugin-dts` | 在 library mode 下生成 `.d.ts` 文件 | 发布 TypeScript 库 |
| `vite-plugin-svgr` | 将 SVG 作为 React 组件导入 | 将 SVG 作为组件使用的 React 应用 |
| `rollup-plugin-visualizer` | 生成 bundle treemap/sunburst 报告 | 定期进行 bundle 体积审计（使用 `enforce: 'post'`） |
| `vite-plugin-pwa` | 零配置 PWA + Workbox | 需要离线能力的应用 |

**关键提醒：** `vite build` 只转译但不做类型检查。类型错误会悄无声息地进入生产环境，除非你添加 `vite-plugin-checker` 或在 CI 中运行 `tsc --noEmit`。

#### 编写自定义 Plugins

编写自定义 plugin 的情况很少见——大多数需求都已被现有 plugins 覆盖。当确实需要时，先在 `vite.config.ts` 中内联编写，仅在需要复用时才提取出来。

```typescript
// vite.config.ts — 最小内联 plugin
function myPlugin(): Plugin {
  return {
    name: 'my-plugin',                       // 必填，必须唯一
    enforce: 'pre',                           // 'pre' | 'post'（可选）
    apply: 'build',                           // 'build' | 'serve'（可选）
    transform(code, id) {
      if (!id.endsWith('.custom')) return
      return { code: transformCustom(code), map: null }
    },
  }
}
```

**关键 hooks：** `transform`（修改源码）、`resolveId` + `load`（虚拟模块）、`transformIndexHtml`（注入 HTML）、`configureServer`（添加 dev 中间件）、`hotUpdate`（自定义 HMR——在 v7+ 中取代已废弃的 `handleHotUpdate`）。

**虚拟模块**使用 `\0` 前缀约定——`resolveId` 返回 `'\0virtual:my-id'`，以便其他 plugins 跳过它。用户代码导入 `'virtual:my-id'`。

完整的 plugin API，请参阅 [vite.dev/guide/api-plugin](https://vite.dev/guide/api-plugin)。开发时使用 `vite-plugin-inspect` 调试 transform 流水线。

### HMR API

框架 plugins（`@vitejs/plugin-react`、`@vitejs/plugin-vue` 等）会自动处理 HMR。只有在构建需要跨更新持久化状态的自定义状态存储、开发工具或框架无关的工具时，才直接使用 `import.meta.hot`。

```typescript
// src/store.ts — vanilla 模块的手动 HMR
if (import.meta.hot) {
  // 跨更新持久化状态（必须 MUTATE 原地修改，绝不重新赋值 .data）
  import.meta.hot.data.count = import.meta.hot.data.count ?? 0

  // 在模块被替换之前清理副作用
  import.meta.hot.dispose((data) => clearInterval(data.intervalId))

  // 接受本模块自身的更新
  import.meta.hot.accept()
}
```

所有 `import.meta.hot` 代码都会在生产构建中被 tree-shaken 移除——无需手动移除防护代码。

### 环境变量

Vite 按以下顺序加载 `.env`、`.env.local`、`.env.[mode]` 和 `.env.[mode].local`（后加载的覆盖先加载的）；`*.local` 文件被 gitignore，用于存放本地密钥。

#### 客户端访问

只有带 `VITE_` 前缀的变量会暴露给客户端代码：

```typescript
import.meta.env.VITE_API_URL   // string
import.meta.env.MODE            // 'development' | 'production' | 自定义
import.meta.env.BASE_URL        // base 配置值
import.meta.env.DEV             // boolean
import.meta.env.PROD            // boolean
import.meta.env.SSR             // boolean
```

#### 在配置中使用环境变量

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())          // 仅加载 VITE_ 前缀变量（安全）
  return {
    define: {
      __API_URL__: JSON.stringify(env.VITE_API_URL),
    },
  }
})
```

### 安全

#### `VITE_` 前缀不是安全边界

任何带 `VITE_` 前缀的变量都会在**构建时静态内联到客户端 bundle 中**。minification、base64 编码以及禁用 source map 都无法将其隐藏。有决心的攻击者可以从交付的 JavaScript 中提取任何 `VITE_` 变量。

**规则：** 只有公开值（API URL、feature flag、公钥）才能放进 `VITE_` 变量。密钥（API token、数据库 URL、私钥）必须存放在服务端，位于 API 或 serverless function 之后。

#### `loadEnv('')` 陷阱

```typescript
// BAD：将 '' 作为第三个参数会加载所有环境变量——包括服务端密钥——
// 并使它们可以通过 `define` 内联到客户端代码中。
const env = loadEnv(mode, process.cwd(), '')

// GOOD：显式的前缀列表
const env = loadEnv(mode, process.cwd(), ['VITE_', 'APP_'])
```

#### 生产环境中的 source map

生产环境的 source map 会泄露你的原始源代码。除非你上传到错误追踪器（Sentry、Bugsnag）并在之后本地删除，否则应禁用它们：

```typescript
build: {
  sourcemap: false,                                  // 默认值——保持这样
}
```

#### `.gitignore` 检查清单

- `.env.local`、`.env.*.local` —— 本地密钥覆盖
- `dist/` —— 构建产物
- `node_modules/.vite` —— 预打包缓存（过期条目会导致幽灵错误）

### Server Proxy

```typescript
// vite.config.ts — server.proxy
server: {
  proxy: {
    '/foo': 'http://localhost:4567',                    // 字符串简写形式

    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,                               // 虚拟主机后端需要
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
}
```

对于 WebSocket 代理，在路由配置中添加 `ws: true`。

### 构建优化

#### 手动 Chunks

```typescript
// vite.config.ts — build.rolldownOptions
build: {
  rolldownOptions: {
    output: {
      // 对象形式：分组特定 package
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-popover'],
      },
    },
  },
}
```

```typescript
// 函数形式：按启发式规则拆分
manualChunks(id) {
  if (id.includes('node_modules/react')) return 'react-vendor'
  if (id.includes('node_modules')) return 'vendor'
}
```

### 性能

#### 避免 Barrel 文件

Barrel 文件（`index.ts` 从一个目录重新导出所有内容）会迫使 Vite 加载每个被重新导出的文件，即使你只导入了一个符号。这是官方文档指出的 dev server 性能下降的头号原因。

```typescript
// BAD — 导入一个 util 迫使 Vite 加载整个 barrel
import { slash } from '@/utils'

// GOOD — 直接导入，只加载这一个文件
import { slash } from '@/utils/slash'
```

#### 显式指定导入扩展名

每个隐式扩展名都会通过 `resolve.extensions` 触发多达 6 次文件系统检查。在大型代码库中，这会累积成可观的开销。

```typescript
// BAD
import Component from './Component'

// GOOD
import Component from './Component.tsx'
```

将 `tsconfig.json` 的 `allowImportingTsExtensions` 和 `resolve.extensions` 收窄为你实际使用的扩展名。

#### 预热热路径路由

`server.warmup.clientFiles` 会在浏览器请求之前预 transform 已知的热门入口，从而消除大型应用上的冷加载请求瀑布流。

```typescript
// vite.config.ts
server: {
  warmup: {
    clientFiles: ['./src/main.tsx', './src/routes/**/*.tsx'],
  },
}
```

#### 分析慢的 Dev Server

当 `vite dev` 感觉慢时，用 `vite --profile` 启动，与应用交互，然后按 `p+enter` 保存 `.cpuprofile`。将其加载到 [Speedscope](https://www.speedscope.app) 中以找出哪些 plugins 在耗时——通常是社区 plugins 中的 `buildStart`、`config` 或 `configResolved` hooks。

### Library Mode

发布 npm package 时，使用 `build.lib`。有两个 footgun（易踩的坑）比配置细节更重要：

1. **类型不会被生成** —— 添加 `vite-plugin-dts` 或单独运行 `tsc --emitDeclarationOnly`。
2. **Peer dependencies 必须被 externalize** —— 未声明的 peers 会被打包进你的库，导致消费者出现重复 runtime 错误。

```typescript
// vite.config.ts
build: {
  lib: {
    entry: 'src/index.ts',
    formats: ['es', 'cjs'],
    fileName: (format) => `my-lib.${format}.js`,
  },
  rolldownOptions: {
    external: ['react', 'react-dom', 'react/jsx-runtime'],  // 每个 peer dep
  },
}
```

### SSR Externals

裸的 `createServer({ middlewareMode: true })` 设置属于框架作者的领域。大多数应用应改用 Nuxt、Remix、SvelteKit、Astro 或 TanStack Start。作为框架用户，你*会*调整的是当依赖在 SSR 中出问题时的 externals 配置：

```typescript
// vite.config.ts — ssr options
ssr: {
  external: ['node-native-package'],           // 在 SSR bundle 中保持为 require()
  noExternal: ['esm-only-package'],            // 强制打包进 SSR 产物（修复大多数 SSR 错误）
  target: 'node',                              // 'node' 或 'webworker'
}
```

### 依赖预打包

Vite 通过预打包依赖将 CJS/UMD 转换为 ESM，并减少请求数。

```typescript
// vite.config.ts — optimizeDeps
optimizeDeps: {
  include: [
    'lodash-es',                              // 强制预打包已知的重型依赖
    'cjs-package',                            // 导致互操作问题的 CJS 依赖
    'deep-lib/components/**',                 // 深度导入的 glob
  ],
  exclude: ['local-esm-package'],             // 排除的话必须是合法的 ESM
  force: true,                                // 忽略缓存，重新优化（临时调试用）
}
```

### 常见陷阱

#### Dev 与 Build 不一致

Dev 使用 esbuild/Rolldown 进行 transform；build 使用 Rolldown 进行打包。CJS 库在两者之间可能行为不同。部署前始终用 `vite build && vite preview` 验证。

#### 部署后过期的 chunks

新构建会产生新的 chunk hash。处于活动会话中的用户会请求已不存在的旧文件名。Vite 没有内置解决方案。缓解措施：

- 在一个部署窗口内保留旧的 `dist/assets/` 文件可用
- 在你的 router 中捕获动态导入错误并强制页面重新加载

#### Docker 与容器

Vite 默认绑定 `localhost`，这在容器外部无法访问：

```typescript
// vite.config.ts — Docker/容器设置
server: {
  host: true,                                  // 绑定 0.0.0.0
  hmr: { clientPort: 3000 },                   // 如果在反向代理之后
}
```

#### Monorepo 文件访问

Vite 将文件服务限制在项目根目录。根目录之外的 package 会被阻止访问：

```typescript
// vite.config.ts — monorepo 文件访问
server: {
  fs: {
    allow: ['..'],                             // 允许父目录（workspace 根）
  },
}
```

### 反模式

```typescript
// BAD：将 envPrefix 设为 '' 会将所有环境变量（包括密钥）暴露给客户端
envPrefix: ''

// BAD：假设 require() 在应用源代码中可用——Vite 是 ESM-first
const lib = require('some-lib')                // 改用 import

// BAD：把每个 node_module 拆成单独的 chunk——会产生数百个小文件
manualChunks(id) {
  if (id.includes('node_modules')) {
    return id.split('node_modules/')[1].split('/')[0]   // 每个 package 一个 chunk
  }
}

// BAD：在 library mode 下未 externalize peer deps——会导致重复 runtime 错误
// build.lib 而没有 rolldownOptions.external

// BAD：使用已废弃的 esbuild minifier
build: { minify: 'esbuild' }                  // 使用 'oxc'（默认）或 'terser'

// BAD：通过重新赋值修改 import.meta.hot.data
import.meta.hot.data = { count: 0 }           // 错误：必须修改属性，不能重新赋值
import.meta.hot.data.count = 0                 // 正确
```

**流程反模式：**

- **`vite preview` 不是生产服务器** —— 它是对已构建 bundle 的冒烟测试。将 `dist/` 部署到真正的静态主机（NGINX、Cloudflare Pages、Vercel static）或使用多阶段 Dockerfile。
- **期望 `vite build` 做类型检查** —— 它只转译。类型错误会悄无声息地进入生产环境。添加 `vite-plugin-checker` 或在 CI 中运行 `tsc --noEmit`。
- **默认引入 `@vitejs/plugin-legacy`** —— 它会使 bundle 膨胀约 40%，破坏 source map bundle 分析器，并且对于 95% 以上使用现代浏览器的用户来说是不必要的。应基于真实的分析数据决定是否使用，而非臆测。
- **手写 30 多个 `resolve.alias` 条目来复制 `tsconfig.json` 路径** —— 改用 `vite-tsconfig-paths`。这在 Excalidraw 和 PostHog 中被观察到；新项目应避免。
- **在依赖变更后留下过期的 `node_modules/.vite`** —— 预打包缓存会导致幽灵错误。在切换分支或给依赖打补丁后清除它。

## 快速参考

| 模式 | 何时使用 |
|---------|-------------|
| `defineConfig` | 始终使用——提供类型推断 |
| `loadEnv(mode, root, ['VITE_'])` | 在配置中访问环境变量（显式前缀） |
| `vite-plugin-checker` | 任何 TypeScript 应用（填补类型检查空白） |
| `vite-tsconfig-paths` | 替代手写的 `resolve.alias` |
| `optimizeDeps.include` | 导致互操作问题的 CJS 依赖 |
| `server.proxy` | 在 dev 中将 API 请求路由到后端 |
| `server.host: true` | Docker、容器、远程访问 |
| `server.warmup.clientFiles` | 预 transform 热路径路由 |
| `build.lib` + `external` | 发布 npm package |
| `manualChunks`（对象） | Vendor bundle 拆分 |
| `vite --profile` | 调试慢的 dev server |
| `vite build && vite preview` | 在本地冒烟测试生产 bundle（不是生产服务器） |

## 相关 Skills

- `frontend-patterns` —— React 组件模式
- `docker-patterns` —— 使用 Vite 的容器化开发
- `nextjs-turbopack` —— Next.js 的替代 bundler
