---
paths:
  - "**/*.vue"
---

# Vue 编码风格

> 本文件扩展了 [common/coding-style.md](../common/coding-style.md)，补充 Vue 特定内容。

## SFC 结构

- 新代码必须使用 `<script setup lang="ts">` 配合 Composition API。不得使用 Options API。
- `.vue` 文件内的 block 顺序：先 `<script setup>`，再 `<template>`，最后 `<style scoped>`。每个文件一个 component。
- 命名：component 文件使用 PascalCase（`AuctionCard.vue`），composables 使用 camelCase 并以 `useXxx` 为前缀（`useAuctionTimer`）。
- 使用 Prettier 格式化，配合 ESLint flat config 以及 `eslint-plugin-vue`（`vue/vue3-recommended`）规则。类型检查使用 `vue-tsc`。

## 响应式规范

- `ref` 是主要的状态 API。在 script 中通过 `.value` 修改，仅在 template 顶层自动解包。
- `arrays`、`Map` 或 `Set` 中嵌套的 `ref` 读取时仍需使用 `.value`。
- 仅在需要将对象状态分组时才考虑使用 `reactive`。永远不要整体重新赋值一个 `reactive` 对象。
- 未经 `toRefs` / `storeToRefs` 处理，不要解构 `reactive` 对象或 Pinia store。直接解构会静默丢失响应式。

## computed 与 watcher

- `computed` 的 getter 必须是纯函数：无副作用，无异步操作，无 DOM 访问。
- 3.4+ 版本中，`computed` 仅在返回值发生变化时才触发更新。当值相同时返回先前的对象引用，以跳过下游更新。
- `watch` 是 lazy 的。监听响应式属性时应传入一个 getter（如 `watch(() => x.value, ...)`），而不是直接传入原始响应式对象。
- `watchEffect` 是 eager 的，且在第一个 `await` 之后停止追踪依赖。

## 生命周期与 DOM

- 在 `setup` 中同步注册生命周期 hook（`onMounted`、`onUnmounted`）。
- 在 `onUnmounted` 中清理 timers 、listeners 和 subscriptions。
- 仅在 `await nextTick()` 之后 读取 或 measure DOM。

## 宏与模板

- 宏：`defineProps` / `defineEmits`（元组形式 `change: [id: number]`），3.4+ 引入的 `defineModel` 用于 `v-model`，使用 `withDefaults` 或 3.5+ 的 reactive-props-destructure 设置默认值，`defineExpose` 用于公开 ref API。
- 每个 `v-for` 都必须设置 `:key`，其值应为稳定唯一的原始值。绝不使用数组索引，也不使用对象。
- 绝不在同一个元素上同时使用 `v-if` 和 `v-for`。应使用 `<template v-for>` 包裹，并在内部元素上使用 `v-if`，或者预先计算一个过滤后的列表。

```vue
<script setup lang="ts">
const props = defineProps<{ id: number }>()
const emit = defineEmits<{ change: [id: number] }>()
const open = defineModel<boolean>('open', { default: false })
</script>
```

## 参考

- ECC skill：`frontend-patterns`、`vite-patterns`。
- 文档：<https://vuejs.org/api/sfc-script-setup.html> · <https://vuejs.org/guide/essentials/reactivity-fundamentals.html> · <https://eslint.vuejs.org/>
