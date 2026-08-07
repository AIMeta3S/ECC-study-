---
description: 增量修复 React build 失败（Vite、webpack、Next.js、CRA、Parcel、esbuild、Bun）—— JSX/TSX 编译错误、hydration 不一致、server/client component 边界失败、类型缺失。调用 react-build-resolver agent 进行最小化、精准的修复。
---

# React Build 与修复

本 command 调用 **react-build-resolver** agent，以最小改动增量修复 React build 错误。

## 本 Command 的功能

1. **检测 Build System**：识别 Vite、webpack、Next.js、CRA、Parcel、esbuild 或 Bun
2. **运行 Build**：执行项目的 build script
3. **解析错误**：按层分组（TypeScript / bundler config / runtime / hydration）
4. **增量修复**：一次修复一个错误，每次改动后重新运行 build
5. **报告总结**：展示已修复的内容和剩余问题

## 使用时机

在以下情况使用 `/react-build`：

- `npm run build`（或 pnpm/yarn/bun 等效命令）失败
- TypeScript 或 React 升级后出现 JSX/TSX 编译错误
- Next.js 运行时出现 hydration mismatch 错误
- App Router 中出现 Server/Client Component 边界错误
- 安装或升级 `react`、`react-dom`、`@types/react` 或某个 bundler 后
- 涉及 React 的类型缺失或 "module not found" 错误

## 范围

本 command 负责 **React build/bundler/runtime hydration** 失败。对于不涉及 React 的纯 TypeScript 类型错误，请改用 `/build-fix`（通用）。

## 执行的诊断命令

```bash
# 项目的 build script（首选）
npm run build --if-present
pnpm build 2>/dev/null
yarn build 2>/dev/null
bun run build 2>/dev/null

# 独立的 typecheck
npm run typecheck --if-present
tsc --noEmit -p tsconfig.json

# 特定 bundler 的 fallback
next build                          # Next.js
vite build                          # Vite
react-scripts build                 # CRA
webpack --mode=production           # webpack
parcel build src/index.html         # Parcel
bun build ./src/index.tsx --outdir=dist
```

## 示例会话

````text
User: /react-build

Agent:
# React Build 修复

## 检测到的 Build System
Vite（存在 vite.config.ts，deps 中有 @vitejs/plugin-react）

## 初始诊断

```bash
$ npm run build
> tsc -b && vite build

src/components/UserCard.tsx:1:8 - error TS6133: 'React' is declared but its value is never read.
src/components/Modal.tsx:12:15 - error TS7016: Could not find a declaration file for module 'react-portal'.
src/pages/Home.tsx:42:5 - error: 'useState' is not defined
```

发现错误：3

## 修复 1：旧的 JSX transform 残留

文件：src/components/UserCard.tsx:1
原因：`tsconfig.json` 已使用 `"jsx": "react-jsx"`；显式的 `import React` 未被使用。

```tsx
// 已移除
- import React from 'react';
```

```bash
$ npm run build
# 剩余 2 个错误
```

## 修复 2：类型缺失

文件：src/components/Modal.tsx
原因：未安装 `@types/react-portal`。

```bash
$ npm i -D @types/react-portal
added 1 package
```

```bash
$ npm run build
# 剩余 1 个错误
```

## 修复 3：缺失 hook import

文件：src/pages/Home.tsx
原因：引用了 `useState` 但未导入。

```tsx
- import { useEffect } from "react";
+ import { useEffect, useState } from "react";
```

```bash
$ npm run build
# Build 成功！
```

## 最终验证

```bash
$ npm run build
✓ built in 2.34s

$ npm test
✓ 47 tests passed
```

## 总结

| 指标 | 数量 |
|--------|-------|
| 已修复的 build 错误 | 3 |
| 修改的文件 | 2 |
| 新增的依赖 | 1 (@types/react-portal) |
| 剩余问题 | 0 |

Build Status: PASS: SUCCESS
````

## 常见错误修复

| 错误 | 典型修复 |
|---|---|
| `'React' is not defined` | 在 tsconfig 中设置 `"jsx": "react-jsx"`（React 17+） |
| 缺失 `@types/react` | `npm i -D @types/react @types/react-dom` |
| `Unexpected token '<'` | 添加 `@vitejs/plugin-react` / `babel-loader` |
| `You're importing a component that needs useState`（Next.js） | 添加 `"use client"` 或将 hook 移到 Client Component 子级 |
| `Module not found: Can't resolve 'fs'`（Next.js） | 移除 `fs` import 或将逻辑移入 Server Component / API route |
| `Hydration failed because the initial UI does not match` | 将 `Date.now()`/`Math.random()`/`window.*` 移到 `useEffect` |
| `Invalid hook call` | 存在多个 React 副本 —— 通过 `resolutions`/`overrides` 去重 |
| `Element type is invalid` | default 与 named import 不匹配 |

## 修复策略

1. **先修复 compile 错误** —— 代码必须能 build
2. **再修复 hydration 错误** —— 影响生产环境正确性
3. **最后修复 bundler config** —— 恢复 plugin/loader 正确性
4. **每次只修复一处** —— 验证每处改动
5. **最小改动** —— 绝不在没有说明的情况下使用 `// @ts-ignore`
6. **每次修复后重新运行** —— 立即暴露新错误

## 停止条件

agent 将在以下情况下停止并报告：

- 同一错误尝试 3 次后仍然存在
- 修复引入的错误多于解决的错误
- 需要超出 build 修复范围的架构性变更（例如重新设计 RSC 边界）
- Bundler 版本不再支持已安装的 React 主版本

## 相关 Commands

- `/react-test` —— build 通过后运行测试
- `/react-review` —— build 成功后审查代码质量
- `/build-fix` —— 通用 build 修复工具（非 React）
- `verification-loop` skill —— 完整的验证 loop

## 相关资源

- Agent：`agents/react-build-resolver.md`
- Skills：`skills/react-patterns/`、`skills/frontend-patterns/`
- Rules：`rules/react/coding-style.md`、`rules/react/patterns.md`
