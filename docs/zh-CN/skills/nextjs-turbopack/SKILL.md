---
name: nextjs-turbopack
description: Next.js 16+ 与 Turbopack —— 增量打包、文件系统缓存、开发速度，以及何时使用 Turbopack vs webpack。
metadata:
  origin: ECC
---

# Next.js and Turbopack

Next.js 16+ 默认使用 Turbopack 进行本地开发：一个用 Rust 编写的增量 bundler，能够显著加快开发启动和热更新速度。

## 何时使用

- **Turbopack（默认开发）**：用于日常开发。更快的冷启动和 HMR，尤其是在大型应用中。
- **Webpack（遗留开发）**：仅在遇到 Turbopack bug，或在开发中依赖 webpack 专属 plugin 时使用。使用 `--webpack`（或 `--no-turbopack`，取决于你的 Next.js 版本；请查阅你所使用版本的文档）来禁用。
- **生产环境**：生产构建行为（`next build`）可能使用 Turbopack 或 webpack，具体取决于 Next.js 版本；请查阅你所使用版本的官方 Next.js 文档。

适用场景：开发或调试 Next.js 16+ 应用、诊断缓慢的开发启动或 HMR，或优化生产 bundle。

## 工作原理

- **Turbopack**：用于 Next.js 开发的增量 bundler。使用文件系统缓存，使重启速度大幅提升（例如在大型项目上快 5–14 倍）。
- **开发默认**：从 Next.js 16 起，`next dev` 默认使用 Turbopack 运行，除非被禁用。
- **文件系统缓存**：重启会复用先前的工作；缓存通常位于 `.next` 下；基本使用无需额外配置。
- **Bundle Analyzer（Next.js 16.1+）**：实验性 Bundle Analyzer，用于检查输出并发现沉重的依赖；通过配置或 experimental flag 启用（参见你所使用版本的 Next.js 文档）。

## 示例

### 命令

```bash
next dev
next build
next start
```

### 用法

运行 `next dev` 使用 Turbopack 进行本地开发。使用 Bundle Analyzer（参见 Next.js 文档）来优化 code-splitting 并裁剪大型依赖。在可能的情况下优先使用 App Router 和 server components。

## Middleware 文件命名

Next.js 16 引入了 `proxy.ts` 作为 middleware 文件名，取代了较早的 `middleware.ts` 约定：

- **Next.js 16+**：在项目根目录使用 `proxy.ts`
- **Next.js 16 之前**：在项目根目录使用 `middleware.ts`

文件名的变更与 **Next.js 版本**绑定，而与正在使用哪个 bundler（Turbopack 或 webpack）无关。请始终查阅你所审查版本的官方文档。

**不要将 `proxy.ts` 标记为 Next.js 16 项目中命名错误或缺失的 middleware 文件。** 该文件是正确且有意为之的。建议将其重命名为 `middleware.ts` 会破坏 middleware 执行。

参考：[Next.js proxy 文档](https://nextjs.org/docs/app/getting-started/proxy)

## 最佳实践

- 保持使用较新的 Next.js 16.x，以获得稳定的 Turbopack 和缓存行为。
- 如果开发缓慢，请确保你正在使用 Turbopack（默认），且缓存未被不必要地清除。
- 对于生产 bundle 大小问题，请使用你所使用版本的官方 Next.js bundle 分析工具。
