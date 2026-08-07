---
name: react-patterns
description: React 18/19 模式，涵盖 hooks 规范、server/client component 边界、Suspense + error boundary、form action、数据获取、state 管理决策树以及无障碍优先的组合方式。在编写或审查 React 组件时使用。
metadata:
  origin: ECC
---

# React 模式

地道的 React 18/19 模式，用于构建健壮、无障碍、高性能的组件树。

## 何时启用

- 编写或修改 React function component、自定义 hook 或组件树
- 审查 JSX/TSX 文件
- 设计 state 结构或组件组合
- 迁移 class component 或大量使用 `forwardRef`/`useEffect` 的旧代码
- 在 local state、lifted state、context 与 external store 之间做选择
- 使用 Server Component / Client Component（Next.js App Router、RSC）
- 使用 React 19 action 或 controlled input 实现表单
- 用 TanStack Query / SWR / RSC 接入数据获取

## 核心原则

### 1. Render 是 Props 和 State 的纯函数

```tsx
// Good：在 render 期间派生
function Cart({ items }: { items: CartItem[] }) {
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  return <span>{formatMoney(total)}</span>;
}

// Bad：派生的 state 单独存储
function Cart({ items }: { items: CartItem[] }) {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    setTotal(items.reduce((sum, i) => sum + i.price * i.qty, 0));
  }, [items]);
  return <span>{formatMoney(total)}</span>;
}
```

在 `useEffect` 中派生 state 会增加一次 render 周期，可能出现不同步，并掩盖数据流。

### 2. 副作用放在 Render 之外

effect、mutation、网络调用和订阅应放在事件处理函数或 `useEffect` 中——绝不放在 render 函数体内。

### 3. 组合优于继承

React 没有组件继承模型。通过 `children`、render prop 或组件 prop 进行组合。

## Hooks 规范

完整规则见 [rules/react/hooks.md](../../rules/react/hooks.md)。要点：

- 只在顶层调用，不要放在条件语句中
- 为每个订阅、定时器、监听器执行清理
- 当新 state 依赖于旧 state 时，使用函数式更新（`setX(prev => prev + 1)`）
- 默认做法：不做 memoize——仅当 profiler 或依赖链证明必要时，才添加 `useMemo`/`useCallback`
- 仅当相同的 hook 序列出现在 2 个及以上组件中时，才提取自定义 hook

## State 位置决策树

```
仅被一个组件使用？
  -> 在其中使用 useState

被父组件和若干后代使用？
  -> 提升到最近的共同祖先

被相距较远的分支使用，且读取频率低（theme、auth、locale）？
  -> React Context

在整个树中共享高频更新？
  -> external store（Zustand、Jotai、Redux Toolkit）

从服务端派生？
  -> server-state library（TanStack Query、SWR、RSC fetch）
```

大多数页面不需要 context 或全局 store。在重复的状态提升变得令人痛苦之前，请抵制抽象。

## Server / Client Component（RSC）

```tsx
// Server Component - 默认、async，自身永不下发 JS
export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({ where: { id: params.id } });
  if (!product) notFound();
  return <ProductView product={product} />;
}

// Client Component - 用 "use client" 显式启用
"use client";
export function AddToCartButton({ productId }: { productId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => addToCart(productId))}
    >
      {pending ? "Adding..." : "Add to cart"}
    </button>
  );
}
```

边界：

- Server -> Client：传递可序列化的 props 或 `children`
- Client -> Server：通过 `<form action={...}>` 或在事件处理函数中命令式地调用 Server Action
- 绝不在 Client Component 文件中 `import` Server Component——应通过 `children` 来组合

## Suspense + Error Boundaries

```tsx
<ErrorBoundary fallback={<ErrorView />}>
  <Suspense fallback={<UserSkeleton />}>
    <UserDetail id={id} />
  </Suspense>
</ErrorBoundary>
```

- 将 Suspense boundary 放在靠近数据的位置，而不是路由根部——逐步展示内容
- Error Boundary 仍是 class API；如需 hook 友好的封装，使用 `react-error-boundary`
- boundary 会捕获其子组件在 render、生命周期和构造函数中抛出的错误——不会捕获事件处理函数或 async 代码中的错误

## 表单

### React 19 form action（新代码首选）

```tsx
"use client";
import { useActionState } from "react";

const initial = { error: null as string | null };

async function updateUserAction(_prev: typeof initial, formData: FormData) {
  "use server";
  const parsed = UserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid input" };
  await db.user.update({ where: { id: parsed.data.id }, data: parsed.data });
  return { error: null };
}

export function UserForm() {
  const [state, formAction, pending] = useActionState(updateUserAction, initial);
  return (
    <form action={formAction}>
      <input name="name" required />
      <button type="submit" disabled={pending}>Save</button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
```

### Controlled Input

当 value 驱动其他 UI、每次按键都需要格式化，或需要实时校验时，使用 controlled input。

### 复杂表单

对于多步表单、动态字段数组或跨字段校验：使用专门的库（React Hook Form、TanStack Form）。在表单复杂度超过简单场景后，自行实现 state 管理就是维护陷阱。

## 数据获取决策矩阵

| 需求 | 工具 |
|---|---|
| Next.js App Router 中按请求获取数据 | RSC `await fetch()` |
| 客户端 cache + mutation + invalidation | TanStack Query |
| 轻量级客户端 cache + revalidation | SWR |
| 实时订阅 | Server-Sent Events、WebSockets 或库自带的 subscription API |
| 一次性 fire-and-forget | 在事件处理函数中调用 `fetch()` |

避免用 `useEffect` + `fetch` 获取应用数据——会有 race condition、无 cache、无重试、无法与 Suspense 集成。

## 组合配方

### 通过 `children` 实现 Slot

```tsx
<Layout>
  <Header />
  <Main>{content}</Main>
</Layout>
```

### 命名 Slot

```tsx
<Page header={<Nav />} sidebar={<Filters />}>
  <Results />
</Page>
```

### Compound Component（通过 Context 共享 state）

```tsx
<Tabs defaultValue="profile">
  <Tabs.List>
    <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
    <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Panel value="profile"><Profile /></Tabs.Panel>
  <Tabs.Panel value="settings"><Settings /></Tabs.Panel>
</Tabs>
```

### Render prop / function-as-child

当父组件需要向渲染输出传递参数时很有用：

```tsx
<DataLoader id={id}>
  {({ data, isLoading }) => isLoading ? <Spinner /> : <UserCard user={data} />}
</DataLoader>
```

现代替代方案：使用返回相同数据结构的 hook（`useData(id)`）——通常更简洁。

## 性能

### `React.memo` 何时真正有用

仅在以下情况下用 `React.memo` 包裹组件：

1. 它频繁 re-render
2. 它的 props 在多次 render 之间通常相同
3. 它的 render 开销可衡量且较大

`React.memo` 会在每次 render 时增加一次相等性检查。如果大多数 render 中 props 都不同，这个检查就是纯粹的开销。

### 避免 Render 级联

- 尽可能把 state 下放而不是上提
- 拆分 context：每个关注点一个 context，这样 `themeContext` 的变更不会导致 auth 的消费者 re-render
- 对 external state 库使用 `useSyncExternalStore`——这是安全 concurrent rendering 的必要条件

### 列表

- 提供稳定的 `key` prop（使用数据库 id，而非数组索引）
- 当可见条目超过约 50 个且行内容非简单内容时，用 `@tanstack/react-virtual` 或 `react-window` 对长列表进行虚拟化

## 无障碍优先的组合

- 在使用 `role` 属性之前，始终先渲染语义化 HTML（`<button>`、`<a>`、`<nav>`、`<main>`）
- 每个可交互元素都必须能通过键盘访问
- 表单输入需要 label——`<label htmlFor>`，或当视觉上仅由图标标注时使用 `aria-label`
- 在路由切换和 modal 打开/关闭时管理焦点
- 在组件测试中运行 `axe`（见 [skills/react-testing](../react-testing/SKILL.md)）
- 交叉引用：[skills/accessibility/SKILL.md](../accessibility/SKILL.md) 涵盖 WCAG 标准和模式库

## 路由

本 skill 与具体 router 无关。上述模式适用于 React Router、TanStack Router、Next.js App Router、Remix Router。Router 特定的模式（loader、action、嵌套布局）请遵循相应 router 的文档——它们是叠加在 React 核心之上的框架关注点。

## 范围之外（指引小节）

- **Next.js 特定内容**：App Router 数据加载、Route Handlers、Middleware、Parallel Routes——属于独立关注点，请查阅 Next.js 文档
- **React Native**：平台特定的模式差异较大，值得单独建立一个 `react-native-patterns` skill（目前还没有）
- **Remix**：Loader/action 约定与 RSC 有重叠，但请遵循 Remix 文档

## 相关资源

- 规则：[rules/react/](../../rules/react/) —— coding-style、hooks、patterns、security、testing
- Skill：[react-performance](../react-performance/SKILL.md) 提供 Vercel 衍生的 performance 规则集，[frontend-patterns](../frontend-patterns/SKILL.md) 涵盖跨框架 UI 关注点，[accessibility](../accessibility/SKILL.md)，[angular-developer](../angular-developer/SKILL.md) 用于框架对比
- Agent：`react-reviewer` 负责代码审查，`react-build-resolver` 处理 build/bundler 错误
- 命令：`/react-review`、`/react-build`、`/react-test`

## 示例

### 用于防抖搜索的自定义 hook

```tsx
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function SearchBox() {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 300);
  const { data } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchApi(debounced),
    enabled: debounced.length > 0,
  });
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <Results items={data ?? []} />
    </>
  );
}
```

### 用 React 19 `useOptimistic` 实现 Optimistic UI

```tsx
"use client";
import { useOptimistic } from "react";

export function MessageList({ messages }: { messages: Message[] }) {
  const [optimistic, addOptimistic] = useOptimistic(
    messages,
    (state, newMessage: Message) => [...state, newMessage],
  );

  async function send(formData: FormData) {
    const text = String(formData.get("text"));
    addOptimistic({ id: "pending", text, sender: "me" });
    await saveMessage(text);
  }

  return (
    <>
      <ul>{optimistic.map((m) => <li key={m.id}>{m.text}</li>)}</ul>
      <form action={send}>
        <input name="text" />
        <button type="submit">Send</button>
      </form>
    </>
  );
}
```

### 拆分 context 以避免 render 级联

```tsx
// 两个 context：一个很少变化，一个频繁变化
const ThemeContext = createContext<Theme>("light");
const NotificationsContext = createContext<Notification[]>([]);

// 仅消费 ThemeContext 的组件在 notifications 变化时不会 re-render
```
