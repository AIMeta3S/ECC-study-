---
paths:
  - "**/*.vue"
---

# Vue 模式

> 本文件在 [common/patterns.md](../common/patterns.md) 的基础上扩展了 Vue 特定内容。

## Composables

- composable（`useXxx`）是可复用逻辑单元。在 Feature-Sliced Design 中，它位于切片的 `model` segment。
- 接受 `MaybeRefOrGetter<T>` 输入并用 `toValue` 标准化，这样调用方可以传入 ref、getter 或原始值。
- 返回 `toRefs(reactive(...))`，这样使用者解构时不会丢失响应性。
- 使用 lifecycle hooks 或 `provide` / `inject` 的 composable 必须在组件的 `setup` 内调用，不能延迟调用或条件调用。

## Props、Emits、v-model

- 基于类型的 `defineProps<Props>()` 和元组形式的 `defineEmits<{ change: [id: number] }>()`。
- 使用 `defineModel<T>('name', { default })` 实现双向绑定。它会被编译为一个 prop 外加一个 `update:*` emit。

## Provide / Inject

- 使用 `provide` / `inject` 处理 tree-scoped 数据，避免 prop drilling。
- 类型安全且无冲突的 key：`const key = Symbol() as InjectionKey<T>`。
- provider 负责所有 mutation。暴露一个 `readonly` ref 外加一个显式的 updater 函数，绝不暴露原始的可变 ref。

## Pinia（FSD model segment）

- Prefer setup stores: ref is state, computed is getters, function is actions.
- Setup stores 不会自动获得 `$reset`。需要自行定义。
- 对 state 和 getters 使用 `storeToRefs`。action 直接从 store 上解构。
- 永远不要将原始 auth token 持久化到 `localStorage`。

## vue-router

- Lazy-load route components with dynamic `import()`.
- A global `beforeEach` auth gate keyed on `meta.requiresAuth`. Guards return `false` (cancel), a route location (redirect), or `undefined` / `true` (continue).
- Watch `() => route.params.id`, not the whole `route` object.

## vue-query（server cache）

- `@tanstack/vue-query` owns server-cache state. Pinia owns client state.
- Put request functions plus `queryOptions` factories in the FSD `api` segment.
- Critical: put the ref or computed ITSELF in the query key, never `.value`. Passing `.value` freezes the key and kills reactive refetch.

```ts
useQuery({ queryKey: ['auction', id], queryFn: () => fetchAuction(toValue(id)) })
// after a mutation
queryClient.invalidateQueries({ queryKey: ['auction', id] })
```

## 参考

- ECC skills：`frontend-patterns`、`vite-patterns`。
- 文档：<https://pinia.vuejs.org/> · <https://router.vuejs.org/> · <https://tanstack.com/query/latest/docs/framework/vue/overview> · <https://vuejs.org/guide/reusability/composables.html>
