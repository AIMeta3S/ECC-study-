---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# React Native / Expo 模式

> 本文件在 [common/patterns.md](../common/patterns.md) 基础上扩展了 React Native / Expo 特有的模式。
> 注意：不要在 React Native 项目中安装 `web/` ruleset —— 那些模式假定 DOM 存在（例如 URL-as-state），在此并不适用。

## Navigation（Expo Router）

Expo Router 是 Expo 内置的、基于文件的路由（`app/` 目录）；React Navigation 是成熟的替代方案。下面的示例使用 Expo Router；无论使用哪种，这些原则都适用。

- 保持路由文件（`app/**`）精简 —— 它们只负责把 params 和 hooks 接到一个位于 `components/` 或 `features/` 的 screen 组件上。
- 为 route params 添加类型；对不可信 params（例如来自 deep links 的）在使用前用 Zod 校验。
- 使用带类型的 navigation helpers（`useLocalSearchParams`、`Link`、`router.push`）。
- 集中管理 linking config；绝不要在没有校验的情况下信任 deep-link params。

```tsx
// app/user/[id].tsx
import { useLocalSearchParams, router } from 'expo-router'
import { z } from 'zod'

const Params = z.object({ id: z.string().uuid() })

export default function UserScreen() {
  // 使用 safeParse 而非 parse：否则格式错误的 deep link 会在 render 期间抛错
  // 并导致 screen 崩溃。应重定向，而不是抛错。
  const parsed = Params.safeParse(useLocalSearchParams())
  if (!parsed.success) {
    router.replace('/not-found')
    return null
  }
  return <UserProfile userId={parsed.data.id} />
}
```

## State Management

规则是让这些关注点保持分离，不要把服务器数据复制到 client stores 中。下面列出的工具是常见选择，而非硬性要求 —— 选择适合你项目的即可。

| 关注点 | 常见选择 |
|---------|---------|
| Server state | 一个 server-cache library（TanStack Query、SWR） |
| Client/UI state | 一个轻量级 store（Zustand、Jotai）或 Context |
| Navigation/route state | Expo Router params（而不是 global store） |
| Form state | 一个 form library（例如 React Hook Form）配合 schema validation |
| Secure persistence | `expo-secure-store` |
| Non-secure persistence | `AsyncStorage` / MMKV |

- 派生值，而不是存储冗余的 computed state。
- 保持 global client state 最小化；优先使用本地 `useState`，直到确实需要共享时再提升。

## Data Fetching

使用 server-cache library（TanStack Query、SWR），而不是临时性的 fetch-in-`useEffect`。示例使用 TanStack Query。

- 服务器的读取经 cache 路由（例如 `useQuery`），mutations 也通过它（例如 `useMutation`）并配合 cache invalidation。
- 在 boundary 处用 Zod 校验 API responses；从 schema 推断类型。（Zod 已是 ECC 的 `typescript/` rules 中 validation 的默认选择。）
- 在 UI 中显式处理这三种状态：loading、error、empty。
- 对快速交互使用 optimistic updates：snapshot、apply、失败时 rollback 并给出可见反馈。
- 并行获取独立数据；避免 parent 与 child 之间的 request waterfalls。

```tsx
function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => userSchema.parse(await api.getUser(id)),
  })
}
```

## Lists

- 使用 `FlatList`/`SectionList`（对于大型/重型列表使用 `FlashList`） —— 绝不要在 `ScrollView` 内对大数组调用 `.map()`。
- 提供稳定的 `keyExtractor`；memoize `renderItem`。
- 对长数据集进行 paginate 或 virtualize。

## Custom Hooks

- 将可复用的逻辑（数据、权限、device APIs）提取到 `use*` hooks 中。
- 把 side effects（Expo SDK 调用、subscriptions）放在 hooks 内部，而不是 JSX 中。

## Async & Effects

- 在 effect 的 return function 中清理 subscriptions、timers 和 listeners。
- 在 unmount 时取消或忽略过时的 async results，以避免 setState-after-unmount。
