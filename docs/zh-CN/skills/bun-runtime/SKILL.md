---
name: bun-runtime
description: Bun 作为运行时、包管理器、打包器和测试运行器。何时选择 Bun 还是 Node、迁移注意事项，以及 Vercel 支持。
metadata:
  origin: ECC
---

# Bun 运行时

Bun 是一个快速的一体化 JavaScript 运行时和工具集：运行时、包管理器、打包器和测试运行器。

## 何时使用

- **优先选择 Bun** 的场景：新的 JS/TS 项目、安装/运行速度至关重要的脚本、使用 Bun 运行时的 Vercel 部署，以及当你希望使用单一工具链（运行 + 安装 + 测试 + 构建）时。
- **优先选择 Node** 的场景：需要最大程度的生态系统兼容性、依赖 Node 的遗留工具，或某个依赖项存在已知的 Bun 问题时。

适用于：采用 Bun、从 Node 迁移、编写或调试 Bun 脚本/测试，或在 Vercel 等平台上配置 Bun。

## 工作原理

- **运行时**：Node 兼容的直接替代运行时（基于 JavaScriptCore，用 Zig 实现）。
- **包管理器**：`bun install` 比 npm/yarn 快得多。当前 Bun 默认使用 `bun.lock`（文本）作为 lockfile；旧版本使用 `bun.lockb`（二进制）。
- **打包器**：内置打包器和转译器，可用于应用和库。
- **测试运行器**：内置 `bun test`，提供类 Jest 的 API。

**从 Node 迁移**：将 `node script.js` 替换为 `bun run script.js` 或 `bun script.js`。用 `bun install` 代替 `npm install`；大多数包都能正常工作。npm 脚本使用 `bun run`；类 npx 的一次性运行使用 `bun x`。Node 内置模块受到支持；在存在对应 Bun API 的场景下，优先使用它们以获得更好的性能。

**Vercel**：在项目设置中将运行时设为 Bun。构建：`bun run build` 或 `bun build ./src/index.ts --outdir=dist`。安装：使用 `bun install --frozen-lockfile` 以实现可复现的部署。

## 示例

### 运行和安装

```bash
# 安装依赖（创建/更新 bun.lock 或 bun.lockb）
bun install

# 运行脚本或文件
bun run dev
bun run src/index.ts
bun src/index.ts
```

### 脚本与环境变量

```bash
bun run --env-file=.env dev
FOO=bar bun run script.ts
```

### 测试

```bash
bun test
bun test --watch
```

```typescript
// test/example.test.ts
import { expect, test } from "bun:test";

test("add", () => {
  expect(1 + 2).toBe(3);
});
```

### 运行时 API

```typescript
const file = Bun.file("package.json");
const json = await file.json();

Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello");
  },
});
```

## 最佳实践

- 提交 lockfile（`bun.lock` 或 `bun.lockb`）以实现可复现的安装。
- 脚本优先使用 `bun run`。对于 TypeScript，Bun 原生运行 `.ts`。
- 保持依赖项为最新版本；Bun 及其生态系统演进迅速。
