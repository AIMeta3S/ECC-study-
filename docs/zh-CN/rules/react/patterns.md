---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/components/**/*.ts"
  - "**/components/**/*.js"
  - "**/app/**/*.tsx"
  - "**/pages/**/*.tsx"
---
# React 模式

> 本文件在 [typescript/patterns.md](../typescript/patterns.md) 和 [common/patterns.md](../common/patterns.md) 的基础上扩展了 React 专属内容。关于 hook 的规则请参见 [hooks.md](./hooks.md)。

## Container / Presentational 拆分

Container 组件负责数据获取、state 和 side effects。Presentational 组件接收 props 并 render —— 不进行 service 调用，除本地 UI state 外不使用 hook。

```tsx
// Container —— 持有数据
export function UserPage({ userId }: { userId: string }) {
  const { data: user, isLoading } = useUser(userId);
  if (isLoading) return <Spinner />;
  if (!user) return <NotFound />;
  return <UserCard user={user} onSelect={handleSelect} />;
}

// Presentational —— 纯粹
export function UserCard({ user, onSelect }: { user: User; onSelect: (id: string) => void }) {
  return <button onClick={() => onSelect(user.id)}>{user.name}</button>;
}
```

## State 放置位置决策树

1. 只被一个组件使用 → 在其内部使用 `useState`
2. 被父组件和若干子组件使用 → 提升至最近的公共祖先，通过 props 传递
3. 跨越较远的分支使用 → React Context，**仅用于低频读取**（theme、auth、locale）
4. 在整个组件树中共享的高频更新 → external store（Zustand、Jotai、Redux Toolkit）
5. 来自 server 的数据 → server-state library（TanStack Query、SWR、RSC fetch）—— 而非 application state

将 Context 用于频繁变化的值会导致每个 consumer 在每次更新时都 re-render。

## Server / Client Component 边界（RSC、Next.js App Router）

- Server Component 是默认选项 —— 它们在 server 上运行，不会下发到 client，并且可以直接 `await`
- Client Component 通过在文件顶部添加 `"use client"` 来声明启用
- 数据向下流动：Server Component 可以 render 一个 Client Component 并传递可序列化的 props
- Client Component 不能 import Server Component，但可以通过 `children` 或具名 slot 接收

```tsx
// Server（默认）
export default async function Page() {
  const user = await fetchUser();
  return <UserClient user={user} />;
}

// Client
"use client";
export function UserClient({ user }: { user: User }) {
  const [tab, setTab] = useState("profile");
  return <Tabs value={tab} onChange={setTab}>{user.name}</Tabs>;
}
```

- 绝不要从 Client Component 文件中 import `"server-only"` 包（DB client、secrets）—— 应将其封装在 Server Component 或 Server Action 中
- 用 `import "server-only"` 标记敏感模块，这样一旦 client 文件 import 它们，bundler 就会报错

## Suspense + Error Boundary

每个 Suspense boundary 上方都需要一个 Error Boundary。这一组合负责处理两种状态。

```tsx
<ErrorBoundary fallback={<ErrorView />}>
  <Suspense fallback={<Skeleton />}>
    <UserDetails id={id} />
  </Suspense>
</ErrorBoundary>
```

- 将 Suspense boundary 放置在靠近需要数据的位置，而不是 route 根部
- 多个更窄的 boundary 会逐步展示已加载的内容
- Error Boundary 必须是 Class Component（React 19 目前还没有函数式等价物），或者使用诸如 `react-error-boundary` 之类的 library wrapper

## Form

### Uncontrolled（React 19 + form actions）

当 form 有明确的提交步骤时，优先使用带 form actions 的 uncontrolled input。value 由浏览器持有；React 在提交时通过 `FormData` 读取它。

```tsx
async function action(formData: FormData) {
  "use server";
  await saveUser({ name: String(formData.get("name")) });
}

export function UserForm() {
  return (
    <form action={action}>
      <input name="name" required />
      <button type="submit">Save</button>
    </form>
  );
}
```

### Controlled

当 value 需要驱动其他 UI、需要实时校验或格式化时，请使用 controlled input。

```tsx
const [email, setEmail] = useState("");
return <input value={email} onChange={(e) => setEmail(e.target.value)} />;
```

### Form Library

对于复杂的 form（多步骤、动态字段数组、跨字段校验），请使用 library：

- React Hook Form —— re-render 最少，uncontrolled 优先
- TanStack Form —— 类型化，framework-agnostic
- Final Form —— 当基于 subscription 的 re-render 很重要时

## 数据获取

| 策略 | 使用时机 |
|---|---|
| RSC fetch（在 Server Component 中 `await`）| Next.js App Router 中按请求的数据，不需要 client 端 cache |
| TanStack Query | Client 端 cache、mutation、optimistic update、polling |
| SWR | 轻量级 cache + revalidation，比 TanStack Query 更简单 |
| 在 `useEffect` 中 `fetch` | 避免 —— 会产生 race condition、没有 cache、没有 retry。仅在一次性的 fire-and-forget 场景才可接受 |

当有真正的 cache library 可用时，绝不要在 `useEffect` 中 fetch —— 这些 library 会处理 deduping、cache invalidation、error retry 以及 Suspense 集成。

## List 与 Key

- `key` 必须在不同 render 之间保持稳定 —— 对于任何可能重新排序、插入或删除的 list，绝不能使用 `index`
- `key` 只需在 sibling 之间唯一，不需要全局唯一
- 使用 index 作为 key 的 list 在重新排序时，会导致子组件中的 state 错误地附着到其他行上

## Composition 优先于 Inheritance

- 传递 `children` 以实现 slot 风格的 composition
- 传递 render-prop 函数以实现参数化 rendering
- 传递组件类型作为插件扩展点：`renderItem={UserRow}`
- 绝不要通过扩展组件 class 来特化行为

## Compound Component

对于相关控件（Tabs、Accordion、Menu），使用通过 Context 共享 state 的 compound component：

```tsx
<Tabs defaultValue="profile">
  <Tabs.List>
    <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
    <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Panel value="profile"><ProfileForm /></Tabs.Panel>
  <Tabs.Panel value="settings"><SettingsForm /></Tabs.Panel>
</Tabs>
```

## Portal

使用 `createPortal` 来实现 modal、tooltip、toast container —— 任何必须脱离 parent 的 `overflow: hidden` 或 `z-index` 层叠上下文的内容。将其渲染到挂载于 `index.html` 中的稳定 DOM 节点。

## Ref 与 Forwarding（React 19+）

React 19 允许 function component 把 `ref` 作为常规 prop 接收 —— 不再需要 `forwardRef`。

```tsx
export function Input({ ref, ...rest }: { ref?: React.Ref<HTMLInputElement> } & InputProps) {
  return <input ref={ref} {...rest} />;
}
```

仍在 React 18 上的较老 codebase 依然需要 `forwardRef`。

## 超出范围（指引性章节）

### Next.js（App Router）

- Server Action、Route Handler、Middleware、Parallel/Intercepted Route、流式 Metadata
- 视为独立的 framework 关注点 —— 当添加较深的 Next 专属 pattern 时，建议开设专门的 `rules/nextjs/` 轨道
- 目前请遵循 Next.js 官方文档中关于 App Router 的具体说明

### React Native

- 平台专属 import（`Platform.OS`、`.ios.tsx` / `.android.tsx`）、`StyleSheet`、navigation library（React Navigation、Expo Router）
- 视为独立的轨道 —— `rules/react-native/` 尚不存在
- 本文件中的 React 核心 hook/pattern 仍然适用

## Skill Reference

关于 React 的深入内容请参见 `skills/react-patterns/SKILL.md`。关于跨 framework 的前端关注点请参见 `skills/frontend-patterns/SKILL.md`。关于 accessibility 请参见 `skills/accessibility/SKILL.md`。
