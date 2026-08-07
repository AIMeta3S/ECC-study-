---
name: react-performance
description: React 和 Next.js 的性能优化模式，改编自 Vercel Engineering 的 React Best Practices (https://github.com/vercel-labs/agent-skills)。将 70+ 条规则按优先级组织为 8 个类别 —— waterfalls、bundle size、server-side、client fetching、re-render、rendering、JS micro-perf、advanced。在编写、审查或重构 React/Next.js 代码以提升性能时使用。
metadata:
  origin: ECC
---

# React 性能

针对 React 18/19 和 Next.js 的性能优化模式，改编自 [Vercel Labs `react-best-practices`](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)（MIT，v1.0.0）。本 skill 按优先级组织规则，并为主动式 code review 和重构提供决策树指引。

## 何时激活

- 为提升性能而编写或审查 React/Next.js 代码时
- 诊断页面加载缓慢、交互迟滞或客户端 CPU 占用过高时
- 审计 bundle size 或 Lighthouse Core Web Vitals 回归时
- 消除 Server Components / API routes 中的 waterfall 时
- 减少客户端 re-render 时
- 优化长列表、动画或 hydration 时
- 在涉及 `app/`、`pages/`、`components/` 或数据层的 PR 中审计优化选择时

## 优先级索引

| Priority | Category | Prefix | 何时重要 |
|---|---|---|---|
| 1 — CRITICAL | 消除 waterfall | `async-` | 当 `await` 后紧跟独立的 `await` 时 |
| 2 — CRITICAL | bundle size 优化 | `bundle-` | 首次加载 JS、路由级 import、第三方库 |
| 3 — HIGH | 服务端性能 | `server-` | RSC、Server Actions、API routes、SSR |
| 4 — MEDIUM-HIGH | 客户端数据获取 | `client-` | 在 hook 中使用 SWR / TanStack Query / 原生 `fetch` |
| 5 — MEDIUM | re-render 优化 | `rerender-` | 高频 state 更新、父子组件扇出 |
| 6 — MEDIUM | rendering 性能 | `rendering-` | 长列表、动画、hydration |
| 7 — LOW-MEDIUM | JavaScript 性能 | `js-` | 热循环、频繁分配 |
| 8 — LOW | 高级模式 | `advanced-` | Effect-event 集成、稳定的 ref |

## 1. 消除 waterfall (CRITICAL)

> "Waterfall 是头号性能杀手" —— 每一个串行 `await` 都会引入完整的网络延迟。

### 在 await 之前先检查低成本条件

在 await 远程数据之前，先检查同步条件（props、env、硬编码 flag）。

```ts
// 错误示例
async function Page({ id }: { id: string }) {
  const flag = await getFlag("show-page");
  if (!flag || !id) return null;
  const data = await getData(id);
  // ...
}

// 正确示例 —— 先用低成本的同步条件短路
async function Page({ id }: { id: string }) {
  if (!id) return null;
  const flag = await getFlag("show-page");
  if (!flag) return null;
  const data = await getData(id);
}
```

### 延迟 await 直到实际使用时

将 `await` 移到实际使用它的分支中。

```ts
// 错误示例 —— 在判断是否需要数据之前就 await
const user = await getUser(id);
if (mode === "guest") return renderGuest();
return renderUser(user);

// 正确示例
if (mode === "guest") return renderGuest();
const user = await getUser(id);
return renderUser(user);
```

### 对独立任务使用 Promise.all

```ts
// 错误示例 —— 串行
const user = await getUser(id);
const posts = await getPosts(id);
const followers = await getFollowers(id);

// 正确示例 —— 并行
const [user, posts, followers] = await Promise.all([
  getUser(id),
  getPosts(id),
  getFollowers(id),
]);
```

### 部分依赖 —— 早点启动，晚点 await

```ts
// 正确示例 —— 启动所有 promise，仅在需要每个结果时才 await
const userP = getUser(id);
const postsP = getPosts(id);
const profile = await getProfile(id);
if (profile.private) return null;
const [user, posts] = await Promise.all([userP, postsP]);
```

### 用 Suspense 实现 streaming

将 `<Suspense>` 边界靠近数据所在位置，使页面先绘制能绘制的部分，同时较慢的子树以流式加载进来。权衡之处：内容到达时会出现布局偏移 —— 提前预留空间（skeleton 或 `min-height`）。

### Server Components：通过组合实现并行

```tsx
// 错误示例 —— 同级 await 在单个组件内串行执行
export default async function Page() {
  const user = await getUser();
  const cart = await getCart();
  return <View user={user} cart={cart} />;
}

// 正确示例 —— 拆分为子组件，React 会并行执行它们
export default async function Page() {
  return (
    <View>
      <UserSection />
      <CartSection />
    </View>
  );
}
```

## 2. bundle size 优化 (CRITICAL)

### 使用直接 import，而非 barrel 文件

Barrel `index.ts` 文件会强制 bundler 遍历整个 module 图，即便 tree-shaking 移除了其中大部分。在许多真实应用中，直接 import 可为首次加载的 JS 节省 200-800ms。

```ts
// 错误示例
import { Button, Card, Modal } from "@/components";

// 正确示例
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
```

Next.js 13.5+ 提供 [Optimize Package Imports](https://nextjs.org/docs/app/api-reference/next-config-js/optimizePackageImports)，可对列入清单的 package 自动完成此优化 —— 请启用它；未列入清单的库仍需手动直接 import。

### 使用可静态分析的路径

```ts
// 错误示例 —— 破坏了 bundler/trace 分析
const mod = await import(`./pages/${name}`);

// 正确示例 —— 每个分支显式指定
const mod = name === "home" ? await import("./pages/home") : await import("./pages/about");
```

### 对重型组件使用动态 import

```tsx
import dynamic from "next/dynamic";

const HeavyChart = dynamic(() => import("./HeavyChart"), {
  loading: () => <Skeleton />,
  ssr: false, // 仅在客户端使用时
});
```

### 延迟加载第三方脚本

在 hydration 之后加载 analytics、日志、客服 widget。使用 `next/script` 并设置 `strategy="afterInteractive"`（默认）或 `"lazyOnload"`。

### 条件化 module 加载

```tsx
if (user.role === "admin") {
  const { AdminPanel } = await import("./admin/AdminPanel");
  // ...
}
```

### 在 hover/focus 时预加载

在 hover 时触发 `<link rel="preload">` 或 `import()`，使得用户点击时 bundle 已在 cache 中。

## 3. 服务端性能 (HIGH)

### 像 API routes 一样对 Server Actions 进行认证

每一个 `"use server"` 函数都是公开的 endpoint。在 action 内部进行认证（authenticate）和授权（authorize）—— 绝不要依赖调用方 Client Component 的门控。

```ts
"use server";
export async function deleteUser(formData: FormData) {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  const targetId = String(formData.get("id"));
  if (session.user.role !== "admin" && session.user.id !== targetId) {
    throw new Error("Forbidden");
  }
  await db.user.delete({ where: { id: targetId } });
}
```

### 用 `React.cache()` 实现按请求去重

```ts
import { cache } from "react";

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});
```

`React.cache` 在单个 request 内去重。在同一次 render 中从三个 Server Components 调用 `getUser("1")` = 一次 DB 查询。

### 对跨请求数据使用 LRU cache

对于不会按请求变化的数据（config、lookup table），在 React 之外用 LRU cache 或 `unstable_cache` 进行缓存。

### 避免 RSC props 中的重复序列化

当 Server Component 将同一份数据渲染到多个 Client Components 时，数据会按消费方各序列化一次。将 Client Component 提升到上层并以 children 形式传入。

### 将静态 I/O 提升到 module 作用域

```ts
// 正确示例 —— 在 module 加载时运行一次
const fontData = readFileSync(fontPath);

export async function Page() {
  return <Banner font={fontData} />;
}
```

### RSC/SSR 中不要有可变的 module 级 state

服务端的 module state 在所有请求之间共享 —— 会造成用户间的 race condition。改用 request 范围的存储（`headers()`、`cookies()`、async context）。

### 最小化传递给 Client Components 的数据

仅序列化 Client 所需的内容。在 DB 层裁剪字段、做分页、做列投影。

### 用 Promise.all 对每个 item 的嵌套 fetch 并行化

```ts
const users = await getUsers();
const enriched = await Promise.all(
  users.map(async (u) => ({ ...u, posts: await getPostsFor(u.id) })),
);
```

### 用 `after()` 执行非阻塞任务

Next.js 15 的 `after()` 在响应发送之后执行任务 —— 日志、cache 预热、analytics。

```ts
import { after } from "next/server";
export async function GET() {
  const data = await getData();
  after(() => logAnalytics(data));
  return Response.json(data);
}
```

## 4. 客户端数据获取 (MEDIUM-HIGH)

### 用 SWR / TanStack Query 做去重

多个组件调用 `useUser(id)` 应当共享一次网络请求和一条 cache 记录。使用 SWR 或 TanStack Query —— 绝不要为共享数据自己手写 `useEffect` + `fetch`。

### 全局事件监听器去重

```tsx
// 错误示例 —— 每个组件各自添加
useEffect(() => {
  window.addEventListener("scroll", handler);
  return () => window.removeEventListener("scroll", handler);
}, []);

// 正确示例 —— 通过 hook + 全局 subject 实现单一共享监听器
const useScroll = createScrollHook(); // 底层是 singleton subject
```

### 滚动事件使用 passive 监听器

```ts
window.addEventListener("scroll", handler, { passive: true });
```

提升滚动流畅度；该监听器无法调用 `preventDefault()`。

### localStorage：版本化 + 精简

- 始终存储一个 `version` 字段；schema 变更时递增版本号，并迁移或丢弃旧数据
- 保持 payload 精简 —— `localStorage` 是同步的，会阻塞主线程

## 5. re-render 优化 (MEDIUM)

### 不要订阅仅在 callback 中使用的 state

```tsx
// 错误示例 —— 每次 count 变化都触发 re-render
const count = useStore((s) => s.count);
const handler = () => doSomething(count);

// 正确示例 —— 调用时才读取一次
const handler = () => {
  const count = useStore.getState().count;
  doSomething(count);
};
```

### 将昂贵的工作提取到 memo 化的组件中

```tsx
// 正确示例 —— 子组件仅在 `items` 变化时才 re-render
const Heavy = memo(function Heavy({ items }: { items: Item[] }) {
  return <Chart data={transform(items)} />;
});
```

### 提升 default 的非 primitive props

```tsx
// 错误示例 —— 每次 render 都创建新数组，破坏 memo
<List items={items ?? []} />

// 正确示例
const EMPTY: Item[] = [];
<List items={items ?? EMPTY} />
```

### effect 中使用 primitive 依赖

```tsx
// 错误示例 —— 每次 render 都有新的对象 identity
useEffect(() => {}, [{ id, name }]);

// 正确示例 —— primitive
useEffect(() => {}, [id, name]);
```

### 订阅派生的 boolean，而非原始值

```tsx
// 错误示例 —— 购物车的任何变化都触发 re-render
const cart = useStore((s) => s.cart);
const hasItems = cart.length > 0;

// 正确示例 —— 仅在空/非空状态翻转时才 re-render
const hasItems = useStore((s) => s.cart.length > 0);
```

### 在 render 期间派生，绝不要通过 `useEffect`

```tsx
// 错误示例
const [full, setFull] = useState("");
useEffect(() => setFull(`${first} ${last}`), [first, last]);

// 正确示例
const full = `${first} ${last}`;
```

### 用函数式 `setState` 获得稳定的 callback

```tsx
// 正确示例
const increment = useCallback(() => setCount((c) => c + 1), []);
```

### 为昂贵值使用 lazy state initializer

```tsx
const [tree] = useState(() => parseTree(largeInput));
```

### 简单 primitive 不要用 memo

`useMemo(() => x + 1, [x])` 是无谓的开销。memo 的价值体现在对象 identity 和昂贵计算上。

### 拆分具有独立依赖的 hook

```tsx
// 错误示例 —— 任一 source 变化时两个 selector 都重新执行
const { a, b } = useSomething(source1, source2);

// 正确示例
const a = useA(source1);
const b = useB(source2);
```

### 将交互逻辑移入 event handler

event handler 只在用户操作时执行 —— `useEffect` 会在依赖变化时重新执行。

### 用 `startTransition` 处理非紧急更新

```tsx
const [pending, startTransition] = useTransition();
startTransition(() => setFilters(newFilters));
```

### 用 `useDeferredValue` 处理昂贵的 render

```tsx
const deferredQuery = useDeferredValue(query);
const results = useMemo(() => expensiveSearch(deferredQuery), [deferredQuery]);
```

### 对频繁变化的临时值使用 `useRef`

适用于那些频繁变化但不应触发 re-render 的值（timestamp、last-key、accumulator）。

### 不要在组件内部定义组件

```tsx
// 错误示例 —— 每次 Outer render 时 Inner 都是一个新组件
function Outer() {
  const Inner = () => <span />;
  return <Inner />;
}
```

每次 render 都会创建一个新的 `Inner` 类型，破坏 reconciliation 并导致子组件被卸载。

## 6. rendering 性能 (MEDIUM)

### 让 wrapper 动起来，而不是 SVG

对 SVG 外层的 `<div>` wrapper 做 transform 会由 GPU 加速；对 SVG 本身做 transform 会触发 paint。

### 对长列表使用 `content-visibility: auto`

```css
.row { content-visibility: auto; contain-intrinsic-size: auto 80px; }
```

浏览器会跳过屏幕外的 rendering —— 对有数百行的列表来说是重大优化。

### 提升静态 JSX

```tsx
const STATIC_HEADER = <h1>Title</h1>;
function Page() {
  return <>{STATIC_HEADER}<Body /></>;
}
```

### SVG：降低坐标精度

`d="M10.123456,20.654321"` → `d="M10.12,20.65"`。每一位数字都占字节；视觉差异在亚像素级别。

### 通过 inline script 实现 hydration 无闪烁

对于 hydration 之前就需要的值（theme、locale），inline 一个 `<script>`，在 React mount 之前设置 `document.documentElement.dataset.*`。

### 精确地抑制预期的 hydration mismatch

```tsx
<time suppressHydrationWarning>{new Date().toLocaleString()}</time>
```

仅用于已知会出现差异的叶子节点 —— 绝不要用在含有其他 children 的树上。

### 用 `<Activity>` 控制显示/隐藏，替代 mount/unmount

React 19 的 `<Activity mode="visible|hidden">` 让树结构和 effect 保持 mounted 状态，只是隐藏起来 —— 对 tab 和 accordion 来说比 unmount/remount 成本更低。

### 条件渲染时用三元运算符替代 `&&`

```tsx
// 错误示例 —— `0` 会被渲染成文本节点
{count && <Badge>{count}</Badge>}

// 正确示例
{count > 0 ? <Badge>{count}</Badge> : null}
```

### 用 `useTransition` 处理 loading 状态

将 `startTransition` 与 action 搭配使用；当下一个 state 计算时，React 会以 `isPending` 状态显示之前的 UI。

### React DOM 资源提示

```tsx
import { preload, preconnect } from "react-dom";
preload("/api/critical", { as: "fetch" });
preconnect("https://api.example.com");
```

### 在 `<script>` 标签上使用 `defer` / `async`

`defer` 用于在 DOMContentLoaded 之后按顺序执行；`async` 用于 fire-and-forget。

## 7. JavaScript 性能 (LOW-MEDIUM)

- **批量处理 DOM/CSS 变更** —— 通过 class 切换或 `cssText` 应用，而非逐属性修改
- **重复查找使用 `Map`** —— `O(1)` vs `O(n)` 线性扫描
- **在循环中缓存属性访问** —— `const len = arr.length`
- **对纯函数做 memoize** —— module 级 `Map<key, result>`
- **缓存 `localStorage` 读取** —— 同步 API；每次 render 只读一次
- **将 `filter().map()` 合并为一次遍历** —— `flatMap` 或单个 `for`
- **在做昂贵比较之前先检查数组长度**
- **函数中使用 early return**
- **将 RegExp 提到循环之外** —— 编译并非免费
- **求 min/max 用循环**，而非 `sort()` —— `O(n)` vs `O(n log n)`
- **成员判断使用 `Set`/`Map`** —— `O(1)` vs `Array.includes` 的 `O(n)`
- **需要 immutability 时使用 `toSorted()`，而非 mutation**
- **用 `flatMap` 在一次遍历中完成 map 和 filter**
- **非关键任务使用 `requestIdleCallback`**

## 8. 高级模式 (LOW)

### `useEffectEvent` 依赖

来自 `useEffectEvent` 的值是稳定的 —— 不要将它们加入 effect 依赖。

### event handler 的 ref

适用于传给 memo 化子组件的稳定 callback：

```tsx
const handlerRef = useRef(handler);
useEffect(() => { handlerRef.current = handler; });
const stable = useCallback((arg) => handlerRef.current(arg), []);
```

### 每个 app 加载时只初始化一次

对于 module 级 singleton（telemetry、logger），用 module 作用域的 flag 做守卫 —— 而不是 `useEffect`。

### 用 `useLatest` 实现稳定的 callback ref

```tsx
function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
```

## 自动化工具

其中许多规则如今已自动化：

- **Next.js 13.5+ Optimize Package Imports** —— barrel import 优化
- **React Compiler**（RFC，canary 版本）—— 自动 memoization
- **Turbopack** —— 更快的构建，更好的 tree-shaking
- **Bundle Analyzer**（`@next/bundle-analyzer`）—— 可视化首次加载的 JS

当项目接入 React Compiler 后，应将 `rerender-*` 的手动 memoization 规则降级为"仅审查"—— compiler 会处理这些。手动 `useMemo`/`useCallback` 反而成了多余的噪声。

## Lighthouse / Web Vitals 对应关系

| Metric | 最相关的类别 |
|---|---|
| **LCP** (Largest Contentful Paint) | waterfall、bundle size、资源提示 |
| **INP** (Interaction to Next Paint) | re-render、rendering、JavaScript |
| **CLS** (Cumulative Layout Shift) | rendering（Suspense 摆放位置、图片尺寸） |
| **TBT** (Total Blocking Time) | bundle size、JavaScript、延迟加载第三方 |
| **FID**（已废弃） | bundle size、hydration |

## 相关资源

- Skills：[react-patterns](../react-patterns/SKILL.md)、[react-testing](../react-testing/SKILL.md)、[frontend-patterns](../frontend-patterns/SKILL.md)、[accessibility](../accessibility/SKILL.md)、[nextjs-turbopack](../nextjs-turbopack/SKILL.md)
- Rules：[rules/react/](../../rules/react/)
- Agents：`react-reviewer` 在 code review 中执行这些规则；`react-build-resolver` 处理相关的构建失败
- Commands：`/react-review`、`/react-build`、`/react-test`

## 出处

改编自 Vercel Labs 的 `react-best-practices` skill（MIT License，版权所有 Vercel Engineering，v1.0.0 2026 年 1 月）。来源：[https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)。

本 skill 对原始的 70 条规则目录进行了重组与改编，整理为一份可导航的参考。如需包含扩展示例的完整原始规则集，请参见上游仓库。
