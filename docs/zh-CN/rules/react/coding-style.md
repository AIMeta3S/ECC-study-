---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/components/**/*.ts"
  - "**/components/**/*.js"
  - "**/hooks/**/*.ts"
  - "**/hooks/**/*.js"
---
# React 编码风格

> 本文件在 [typescript/coding-style.md](../typescript/coding-style.md) 和 [common/coding-style.md](../common/coding-style.md) 的基础上扩展了 React 特定内容。

## 文件扩展名

- `.tsx` 用于任何包含 JSX 的文件，即使是单行代码片段
- `.ts` 用于纯逻辑、不含 JSX 的自定义 hooks、类型定义、工具函数
- `.test.tsx` / `.test.ts` 与源文件一一对应
- 仅当项目有意避免 TypeScript 时才使用 `.jsx` —— 在 review 时标记每个新增的无类型 React 文件

## 命名

- 组件：符号和文件名都使用 `PascalCase`（`UserCard.tsx`，默认导出 `UserCard`）
- 自定义 hooks：符号使用 `useCamelCase`，当项目约定为 kebab-case 时文件名使用 kebab-case（`use-debounce.ts` 导出 `useDebounce`）
- Context：`<Domain>Context` 符号，`<Domain>Provider` provider 组件，`use<Domain>` consumer hook
- 事件处理函数：组件内部使用 `handleClick`、`handleSubmit`；接收它的 prop 为 `onClick`、`onSubmit`
- 布尔类型 prop：`isLoading`、`hasError`、`canSubmit` —— 布尔值绝不单独使用 `loading` 或 `error`

## 组件结构

```tsx
type Props = {
  user: User;
  onSelect: (id: string) => void;
};

export function UserCard({ user, onSelect }: Props) {
  return (
    <button type="button" onClick={() => onSelect(user.id)}>
      {user.name}
    </button>
  );
}
```

- 优先使用 `type Props = {}` 定义封闭的组件 prop 类型
- 仅当 prop 类型通过 declaration merging 扩展，或作为 public API 扩展点导出时才使用 `interface`
- 始终在参数列表中解构 props —— 函数体内禁止通过 `props.user` 访问
- 通过 JSX 隐式推断返回类型（仅当函数有条件返回且联合类型干扰 inference 时才使用 `function Foo(): JSX.Element`）

## JSX

- 无子元素时自闭合标签：`<img />`、`<UserCard user={u} />`
- 当不需要 DOM 元素时，优先使用 fragments `<>...</>` 而非包裹用的 `<div>`
- 条件渲染：布尔值用 `{condition && <Foo />}`，二选一用三元表达式，guard clauses 用提前返回
- 当逻辑多行致使可读性变差时，绝不在 JSX 中内联 —— 提取为 return 上方的 const 或独立函数

```tsx
// 推荐
const greeting = user.isAdmin ? "Welcome, admin" : `Hello ${user.name}`;
return <h1>{greeting}</h1>;

// 而非
return <h1>{user.isAdmin ? "Welcome, admin" : `Hello ${user.name}`}</h1>;
```

## Server / Client Boundary（Next.js App Router、RSC）

- 新文件默认为 Server Component —— 仅当文件使用 state、effects、refs、浏览器 API 或事件处理函数时才添加 `"use client"`
- 将 `"use client"` 指令放在第 1 行，位于所有 import 之前
- 禁止在 `"use server"` action 文件中 import Client Component 文件
- 禁止通过 client module 重新导出 server-only 代码 —— bundler 会将其静默打包进去

## Import

- React import 放在最前：`import { useState } from "react"`
- 其次是第三方 libs，然后是项目绝对路径 import，最后是相对路径 import
- 仅类型 import：`import type { ReactNode } from "react"` —— 当 ESLint 的 `consistent-type-imports` 已配置时，禁止在一条语句中混合 runtime import 与 type import

## Hooks 规范

完整规则见 [hooks.md](./hooks.md)。风格要点：

- 自定义 hooks 必须以 `use` 开头 —— 由 `eslint-plugin-react-hooks` 强制执行
- 将所有 hook 调用集中在组件顶部，位于任何条件逻辑之前
- 避免为单行包装创建临时 hooks —— 直接内联调用

## State

- 优先使用 local state（`useState`），仅在被共享时才向上提升
- 使用 Context 处理被多个组件读取的横切 state（theme、auth、i18n）—— 不适用于高频更新
- 当 state 必须跨路由切换持久化、跨标签页同步，或需要通过 devtools 调试时，使用 external store（Zustand、Jotai、Redux Toolkit）
- 绝不复制可派生的 state —— 在 render 时计算

## Class Components

新代码中禁止使用。当对遗留 class components 进行非平凡修改时，将其转换为 function components。

## 单组件文件布局

```
components/UserCard/
  UserCard.tsx
  UserCard.module.css   # 或 styled-components，或内联 Tailwind classes
  UserCard.test.tsx
  index.ts              # 仅用于 re-export
```

对于简单的展示型组件，内联编写为单文件组件即可。
