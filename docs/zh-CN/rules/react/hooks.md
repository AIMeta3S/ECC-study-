---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/hooks/**/*.ts"
  - "**/hooks/**/*.js"
  - "**/use-*.ts"
  - "**/use-*.tsx"
---
# React Hooks

> 本文件涵盖 **React hooks**（`useState`、`useEffect`、`useMemo`、`useCallback`、custom hooks）——而不是 Claude Code 的 `hooks/` 运行时系统。命名与本仓库通用的按语言划分的约定 `rules/<lang>/hooks.md` 一致。
>
> 扩展 [typescript/patterns.md](../typescript/patterns.md) 和 [common/patterns.md](../common/patterns.md)。

## Rules of Hooks

强制启用 `eslint-plugin-react-hooks`，并将 `react-hooks/rules-of-hooks` 设置为 error。

1. Hooks 只能在 function component 或其他 hook 的顶层调用
2. 永远不要在循环、条件分支、嵌套函数中使用，也不要在 early return 之后使用
3. 每次 render 都必须以相同顺序调用
4. 只能在 React function components 或 custom hooks（以 `use` 开头的函数）内部调用

```tsx
// 错误：条件性调用 hook
function Foo({ enabled }: { enabled: boolean }) {
  if (enabled) {
    const [x, setX] = useState(0); // 违反规则
  }
}

// 正确：hook 无条件调用，条件放在内部
function Foo({ enabled }: { enabled: boolean }) {
  const [x, setX] = useState(0);
  if (!enabled) return null;
  return <span>{x}</span>;
}
```

## `useEffect` — 何时不应使用

`useEffect` 用于与外部系统（订阅、浏览器 API、第三方库）同步。它**不是**以下场景的正确工具：

- Derived state —— 在 render 期间计算
- 为 rendering 转换数据 —— 在 render 期间计算
- 当 prop 变化时重置 state —— 在父组件上使用 `key` 或从 props 派生
- 通知父组件 state 变化 —— 在 event handler 中调用 callback
- 初始化应用级 singleton —— 在 module 侧或 `main.tsx` 中调用该函数

```tsx
// 错误：用 effect 处理 derived state
const [fullName, setFullName] = useState("");
useEffect(() => {
  setFullName(`${first} ${last}`);
}, [first, last]);

// 正确：在 render 期间派生
const fullName = `${first} ${last}`;
```

## Dependency Arrays

- 始终包含在 effect/callback 内部引用的每一个 reactive value
- 启用 `react-hooks/exhaustive-deps` lint 规则——永远不要在没有注释说明原因的情况下静默它
- 如果 dep array 变得臃肿，说明 effect 承担了太多职责——拆分它
- 传入 deps 的函数要保持稳定 identity：仅当该函数本身是另一个 hook 的 dependency 或传入 memoized 子组件时，才用 `useCallback` 包裹

## Cleanup

每一个 subscription、interval、listener 或 in-flight request 都必须清理。

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal }).then(handleResponse);
  return () => controller.abort();
}, [url]);
```

```tsx
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, []);
```

缺少 cleanup = deps 变化时出现 race conditions，unmount 时出现内存泄漏。

## `useMemo` 和 `useCallback` —— 何时值得使用

默认立场：**不要 memoize**。仅在以下情况添加 `useMemo` / `useCallback`：

1. 该 value 作为 prop 传给被 `React.memo` 包裹的子组件，且 identity 很重要
2. 该 value 是另一个 `useEffect` / `useMemo` / `useCallback` 的 dependency
3. 计算成本明显很高（假设之前先 profile）

过早的 memoization 会增加噪音、隐藏 bug，并且可能比它所替代的重新计算更慢。

## Custom Hooks

在以下情况下提取 custom hook：

- 相同的 hook 序列（state + effect + computed）出现在 2 个或以上组件中
- 该逻辑有清晰、可命名的目的（`useDebounce`、`useOnClickOutside`、`useLocalStorage`）
- 你希望独立于任何组件测试该逻辑

在以下情况下不要提取：

- 它只有一个调用者——直接 inline
- 这个 "hook" 只是一个换了名字的 `useState`——增加了间接层，没有价值

```tsx
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
```

## `useState` 模式

- 仅在 mount 时从 prop 获取 initial state：当计算开销较大时，传入一个函数 `useState(() => computeInitial(prop))`
- 当新 state 依赖于旧 state 时使用 functional updater：`setCount(c => c + 1)`——永远不要在 async 或 batched 上下文中使用 `setCount(count + 1)`
- 仅当相关 state 总是一起变化时才将它们分组为一个 object；否则拆分为多个 `useState` 调用
- 一旦 state 转换依赖于前一个 state 或有 3 个或以上相关值时，使用 `useReducer`

## `useRef` 模式

- 用于 imperative API 的 DOM refs（focus、scroll、第三方库）
- 不触发 re-render 的 mutable container（timer id、previous value、"is mounted" flag）
- 永远不要在 render 期间读取或写入 `ref.current`——只能在 effect 或 event handler 内部
- `useImperativeHandle` 仅在向 parent ref 暴露子组件 API 时使用——最后的应急手段

## `useSyncExternalStore`

使用此 hook 订阅任何 external store（浏览器 API、第三方 state 库、custom event emitter）。它是在 concurrent rendering 下保证 external state 安全的受支持方式。

```tsx
const isOnline = useSyncExternalStore(
  (cb) => {
    window.addEventListener("online", cb);
    window.addEventListener("offline", cb);
    return () => {
      window.removeEventListener("online", cb);
      window.removeEventListener("offline", cb);
    };
  },
  () => navigator.onLine,
  () => true,
);
```

## React 19 新增内容

- `use()` —— inline 展开 promise 和 context；可以条件性调用（唯一具备此特性的 hook）
- `useFormStatus()` / `useFormState()`（或 `useActionState`）—— 无需 prop drilling 即可获取表单提交 state
- `useOptimistic()` —— 在 server action pending 期间进行 optimistic UI 更新
- `useTransition()` —— 标记非紧急 state 更新，使紧急更新保持响应

当项目以 React 19+ 为目标时，优先使用这些而非手写的等价实现。

## Stale Closure 陷阱

Async handler 和 interval 会捕获创建它们的那次 render 中的值。修复方式：

1. 使用 `setState` 的 functional updater 形式
2. 将变化的值放入 `useEffect` 的 dep array，并重建 handler
3. 从一个保持同步的 ref 中读取

## Lint 配置

必需的规则：

```json
{
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

在新代码的 CI 中将 `exhaustive-deps` 警告视为错误。
