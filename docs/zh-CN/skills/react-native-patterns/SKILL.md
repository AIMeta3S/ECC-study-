---
name: react-native-patterns
description: React Native 与 Expo 应用模式 —— 涵盖 Expo Router 导航、状态分层（server/client/route/form）、配合 Zod 的 TanStack Query 数据获取、高性能列表、NativeWind/StyleSheet 样式、原生 API 以及安全存储。在构建或编辑 React Native / Expo 屏幕、组件、导航或数据层时使用。
origin: ECC
---

# React Native / Expo 模式

构建生产级 React Native + Expo 应用的实用模式。涵盖导航、状态、数据获取、列表、样式与原生 API。与 `rules/react-native/` 规则集配套使用：规则说明 *要强制什么*，本 skill 展示 *如何做*。

下文提及的库（NativeWind、Zustand/Jotai、TanStack Query）均为常见且成熟的选项，仅作示例说明 —— 模式本身比具体包更重要，任何等效方案皆可。使用 Zod 做校验，以与 ECC 既有的 `typescript/` 规则保持一致。

这些模式假设运行于 New Architecture 之上的 managed Expo workflow（Expo Router、EAS、`expo-*` 模块）（在近期的 Expo SDK 中为默认，自 SDK 55+ 起强制启用）。它们不假设存在浏览器 DOM —— React Native 没有 `<div>`、没有 URL 栏，也没有 Web 的数据获取默认行为。

## 何时激活

在以下情况使用本 skill：

- 构建或编辑 React Native / Expo 屏幕、组件或导航
- 使用 Expo Router 设置路由（基于文件的 `app/` 目录）
- 判断状态应放在何处（server cache、client store、route params 还是 form）
- 使用 TanStack Query 接入数据获取并用 Zod 校验响应
- 渲染较长或较重的列表
- 选择或应用样式方案（NativeWind 或 StyleSheet）
- 访问原生设备 API（相机、定位、通知）或安全存储
- 审查 RN 代码中移动端特有的问题

请勿在此套用 Web/React-DOM 模式 —— URL-as-state、`<div>` 以及 SWR-for-browser 不适用于 React Native。

## 核心概念

### 项目结构（Expo Router）

`app/` 下的基于文件的路由。保持路由文件精简：它们读取并校验参数，然后委托给位于 `components/` 或 `features/` 的屏幕组件。

```
app/
  _layout.tsx          # 根 stack
  (tabs)/
    _layout.tsx        # tab navigator
    index.tsx          # Home
  user/[id].tsx        # 动态路由
components/
features/
  user/UserProfile.tsx
```

### 导航：校验路由参数

Deep links 与动态路由会传入不可信字符串。使用前用 Zod 校验它们。

```tsx
// app/user/[id].tsx
import { useLocalSearchParams, router } from 'expo-router'
import { z } from 'zod'
import { UserProfile } from '@/features/user/UserProfile'

const Params = z.object({ id: z.string().uuid() })

export default function UserRoute() {
  const parsed = Params.safeParse(useLocalSearchParams())
  if (!parsed.success) {
    router.replace('/not-found')
    return null
  }
  return <UserProfile userId={parsed.data.id} />
}
```

### 状态：保持关注点分离

不要将 server 数据复制进 client store。每个关注点都有自己的归属。

| 关注点 | 常见选择 |
|---------|------|
| Server state（远程数据） | server-cache 库（TanStack Query、SWR） |
| Client/UI state | 轻量级 store（Zustand、Jotai）或 Context |
| Route/navigation state | Expo Router params |
| Form state | 表单库（如 React Hook Form）+ schema 校验 |
| Secrets / tokens | `expo-secure-store` |
| 非敏感数据的持久化 | `AsyncStorage` / MMKV |

优先使用局部 `useState`，直到状态确实需要被共享。

### 数据获取：cache 库 + Zod

使用 server-cache 库（TanStack Query、SWR），而不是 fetch-in-`useEffect`。在边界处校验并从 schema 推断类型。显式处理 loading、error 与 empty 状态。（示例使用 TanStack Query。）

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

const User = z.object({ id: z.string(), email: z.string().email() })
type User = z.infer<typeof User>

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async (): Promise<User> => User.parse(await api.getUser(id)),
  })
}

export function useUpdateEmail(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => api.updateEmail(id, email),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user', id] }),
  })
}
```

### 列表：使用虚拟化，绝不在 ScrollView 中 map 大数组

```tsx
import { FlatList } from 'react-native'

<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={renderItem}          // 已 memoize
  initialNumToRender={10}
  windowSize={5}
/>
```

对于大型或异构列表，使用 `FlashList`（Shopify 出品）。

### 样式：选择一种体系

`StyleSheet.create()` 是框架原生选项；utility-class 库（如 NativeWind）是常见的替代方案。选择一种并保持一致。绝不要在热点路径上于 JSX 内联构建 style 对象。

```tsx
// NativeWind
<View className="p-4 rounded-2xl bg-white">
  <Text className="text-base font-semibold">Hello</Text>
</View>

// StyleSheet
const styles = StyleSheet.create({ card: { padding: 16, borderRadius: 16, backgroundColor: '#fff' } })
<View style={styles.card}>...</View>
```

### 原生 API：封装进 hooks，清理 effect

将 Expo SDK 调用与订阅放在 `use*` hooks 内，而非 JSX 中。始终进行清理。

```tsx
import { useEffect, useState } from 'react'
import * as Location from 'expo-location'

type LocationState =
  | { status: 'loading' }
  | { status: 'denied' }
  | { status: 'granted'; coords: Location.LocationObjectCoords }

export function useCurrentLocation() {
  // 跟踪 status，而不仅是 coords —— 这样 UI 就能区分"仍在加载"
  // 与"权限被拒绝"，并给出可操作的提示。
  const [state, setState] = useState<LocationState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        if (active) setState({ status: 'denied' })
        return
      }
      const pos = await Location.getCurrentPositionAsync({})
      if (active) setState({ status: 'granted', coords: pos.coords })
    })()
    return () => { active = false }   // 卸载后忽略过期结果
  }, [])

  return state
}
```

### token 的安全存储

```tsx
import * as SecureStore from 'expo-secure-store'

await SecureStore.setItemAsync('auth_token', token)   // Keychain / Keystore
const token = await SecureStore.getItemAsync('auth_token')
```

## 代码示例

### 一个完整的屏幕：route → query → list → states

```tsx
// app/(tabs)/orders.tsx
import { memo, useCallback } from 'react'
import { FlatList, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

const OrderSchema = z.object({ id: z.string(), total: z.number(), status: z.string() })
const OrdersSchema = z.array(OrderSchema)
type Order = z.infer<typeof OrderSchema>

function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => OrdersSchema.parse(await api.listOrders()),
  })
}

// 已 memoize，使其引用在多次 render 之间保持稳定（参见列表相关指引）。
const OrderRow = memo(function OrderRow({ item }: { item: Order }) {
  return (
    <View className="px-4 py-3 border-b border-neutral-200">
      <Text className="font-medium">#{item.id}</Text>
      <Text className="text-neutral-500">{item.status} · ${item.total}</Text>
    </View>
  )
})

export default function OrdersScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useOrders()
  const renderItem = useCallback(({ item }: { item: Order }) => <OrderRow item={item} />, [])

  if (isLoading) return <Centered><Text>Loading…</Text></Centered>
  if (isError) return <Centered><Text accessibilityRole="alert">Could not load orders.</Text></Centered>
  if (!data?.length) return <Centered><Text>No orders yet.</Text></Centered>

  return (
    <FlatList
      data={data}
      keyExtractor={(o) => o.id}
      onRefresh={refetch}
      refreshing={isRefetching}
      renderItem={renderItem}
    />
  )
}
```

### 表单：React Hook Form + Zod resolver

```tsx
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TextInput, Button, Text } from 'react-native'

const Schema = z.object({ email: z.string().email('Invalid email') })
type FormValues = z.infer<typeof Schema>

export function EmailForm({ onSubmit }: { onSubmit: (v: FormValues) => void }) {
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { email: '' },
  })

  return (
    <>
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="none"
            keyboardType="email-address"
            accessibilityLabel="Email address"
          />
        )}
      />
      {errors.email && <Text accessibilityRole="alert">{errors.email.message}</Text>}
      <Button title="Save" onPress={handleSubmit(onSubmit)} />
    </>
  )
}
```

## 反模式

```tsx
// 错误：在 ScrollView 内 map 大数组（无虚拟化、卡顿、内存占用高）
<ScrollView>{items.map((i) => <Row key={i.id} item={i} />)}</ScrollView>
// 正确：使用 FlatList / FlashList

// 错误：将 server 数据复制进 client store（两个真相源、数据过期）
const useStore = create((set) => ({ users: [], setUsers: (u) => set({ users: u }) }))
useEffect(() => { getUsers().then(setUsers) }, [])
// 正确：由 useQuery 持有 server state；按需派生

// 错误：把 token 放进 AsyncStorage（未加密）
await AsyncStorage.setItem('auth_token', token)
// 正确：使用 expo-secure-store

// 错误：盲目信任 deep-link 参数
const { id } = useLocalSearchParams(); fetchUser(id)
// 正确：使用前用 Zod 校验

// 错误：在热点路径上每次 render 都重建内联 style 对象
<View style={{ padding: 16, backgroundColor: '#fff' }} />
// 正确：在模块作用域使用 StyleSheet.create，或使用 NativeWind className

// 错误：把真实 secret 打进 bundle
const STRIPE_SECRET = 'sk_live_...'
// 正确：将特权调用保留在服务端；只下发受后端规则保护的 public key
```

## 最佳实践

- 保持路由文件精简；将逻辑放入屏幕组件和 `use*` hooks。
- 用 Zod 校验每一处外部输入（API 响应、路由参数、push payload）。
- 让 TanStack Query 持有 server state；保持 client store 精简。
- 始终渲染 loading、error 与 empty 状态 —— 切勿只放一个 spinner 而无兜底。
- 列表虚拟化；对 `renderItem` 做 memoize；提供稳定的 `keyExtractor`。
- 使用 `react-native-reanimated` 做动画（UI thread）；避免在 JS thread 上执行繁重工作。
- 将 token 存入 `expo-secure-store`；永远不要信任客户端来做授权。
- 从一开始就尊重 safe area、Dynamic Type 以及无障碍 role/label。
- 发布前确认每个原生依赖都与 New Architecture 兼容。

## 相关 skill

- `frontend-patterns` —— React/Next.js（Web）模式；对共通的 React 概念有用，但针对 DOM。
- `coding-standards` —— 适用于 RN 代码的 TypeScript/JavaScript 惯用写法。
- `tdd-workflow`、`e2e-testing` —— 测试流程（RN 使用 Jest + React Native Testing Library，以及 Maestro/Detox）。
- `security-review` —— 通用安全清单，与上文 RN bundle/secret 指引互补。
