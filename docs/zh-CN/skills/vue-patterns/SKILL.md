---
name: vue-patterns
description: Vue.js 3 Composition API 模式、组件架构、响应式最佳实践、Pinia 状态管理、Vue Router 导航与 Nuxt SSR 模式。适用于 Vue、Nuxt、Vite 或 Pinia 项目。
origin: ECC
---

# Vue.js 模式与最佳实践

使用 Composition API（`<script setup>`）进行 Vue.js 3 开发的综合指南，涵盖组件设计、响应式、状态管理、路由、测试与 SSR 模式。在 Nuxt 与原生 Vue 存在差异处，附带 Nuxt 专属指引。

## 何时激活

在以下情况激活此 skill：
- 项目使用 Vue.js（任意版本）、Nuxt、Vite + Vue 或 Pinia。
- 用户询问 Vue 组件架构、composables、响应式或状态管理。
- 审查 Vue Single-File Components（`.vue` 文件）。
- 配置 Vue Router、Pinia store 或 Vite/Vitest 配置。
- 讨论 Vue 专属的性能、安全或 SSR 模式。

---

## 1. 项目结构

### 推荐布局（Feature-First）

```
src/
├── api/              # API 客户端与端点定义
├── assets/           # 静态资源（图片、字体、图标）
├── components/       # 共享/可复用组件
│   ├── base/         # 基础 UI 原语（Button、Input、Modal）
│   └── features/     # 功能专属的共享组件
├── composables/      # 可复用的 Composition API 逻辑
├── layouts/          # 页面布局（可选）
├── pages/            # 路由级页面组件
├── router/           # Vue Router 配置
├── stores/           # Pinia store
├── types/            # TypeScript 类型定义
├── utils/            # 纯工具函数
└── App.vue           # 根组件
```

### 文件命名

| 约定 | 何时使用 |
|------|---------|
| `PascalCase.vue` | 所有组件（由 `vue/multi-word-component-names` 强制） |
| `useCamelCase.ts` | composables |
| `camelCase.ts` | 工具、API 客户端、类型 |
| `kebab-case` 目录 | 路由段、功能文件夹 |

---

## 2. 组件架构

### Single-File Component 顺序

```vue
<script setup lang="ts">
// 1. 导入（vue → 生态库 → 绝对路径 → 相对路径）
// 2. Props & Emits & Slots
// 3. Composables
// 4. 本地 state（ref/reactive）
// 5. Computed 属性
// 6. 方法
// 7. Watcher
// 8. Lifecycle hook
</script>

<template>
  <!-- Template 内容 -->
</template>

<style scoped>
  /* Scoped 样式 */
</style>
```

### Presentational 与 Container

- **Container 组件**：负责数据获取、状态与副作用，渲染 presentational 组件。
- **Presentational 组件**：接收 props、emit 事件。无 API 调用，不访问 store。纯渲染。

### Props 最佳实践

```ts
// 基于类型的 props（含默认值）
interface Props {
  label: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  items: Item[];
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primary",
  disabled: false,
});
```

- 始终提供 `type`，并在合适处提供 `required`/`default`。
- Boolean props：`isXxx`、`hasXxx`、`canXxx`。
- 永远不要修改 props——改为 emit 事件。
- 对于 v-model 绑定，使用 `defineModel()`（Vue 3.4+）或 `modelValue` + `update:modelValue`。

### Events

```ts
const emit = defineEmits<{
  submit: [];
  "update:modelValue": [value: string];
  select: [id: string, index: number];
}>();
```

- 在 template 中使用 kebab-case（`@update:model-value`）。
- 在 script 中使用 camelCase（`emit("update:modelValue", val)`）。

---

## 3. Composables（可复用逻辑）

### 结构

```ts
// composables/useDebounce.ts
export function useDebounce<T>(value: MaybeRef<T>, delay: number): Ref<T> {
  const debounced = ref(toValue(value)) as Ref<T>;

  let timer: ReturnType<typeof setTimeout>;
  watch(
    () => toValue(value),
    (newVal) => {
      clearTimeout(timer);
      timer = setTimeout(() => { debounced.value = newVal; }, delay);
    }
  );

  onUnmounted(() => clearTimeout(timer));
  return readonly(debounced);
}
```

### 规则

- 必须以 `use` 前缀开头。
- 返回响应式值（`ref`、`computed`、`reactive`），绝不返回普通原始值。
- 通过 `MaybeRef` / `toRef()` / `toValue()` 接受响应式输入。
- 在 `onUnmounted` 或 watcher 的 `onCleanup` 中清理副作用。
- 禁止模块级副作用。

### 与 Mixins 对比

composables 完全替代 Vue 2 的 mixin：
- **Mixins**：不透明的数据流、真相来源冲突、命名冲突。
- **Composables**：显式导入、清晰的返回值、可组合且 tree-shakable。

---

## 4. 状态管理

### 何时使用何种模式

| 模式 | 用例 |
|------|------|
| `ref()` / `reactive()` | 本地组件 state |
| Props + Emits | 父子组件通信 |
| Provide / Inject | 主题、配置、插件 API |
| Pinia store | 全局、共享、复杂 state |
| Server state composable | 带缓存的 API 数据（包装 `fetch`/TanStack Query） |

### Pinia Setup Store（首选）

```ts
// stores/useCartStore.ts
export const useCartStore = defineStore("cart", () => {
  const items = ref<CartItem[]>([]);
  const isLoading = ref(false);

  const totalPrice = computed(() =>
    items.value.reduce((sum, i) => sum + i.price * i.quantity, 0)
  );
  const itemCount = computed(() =>
    items.value.reduce((sum, i) => sum + i.quantity, 0)
  );

  async function addItem(productId: string) {
    isLoading.value = true;
    try {
      const item = await fetchProduct(productId);
      const existing = items.value.find(i => i.id === item.id);
      if (existing) existing.quantity++;
      else items.value.push({ ...item, quantity: 1 });
    } finally {
      isLoading.value = false;
    }
  }

  return { items, isLoading, totalPrice, itemCount, addItem };
});
```

- 使用 Setup Store 语法（而非 Options Store）。
- 业务级 mutation 优先使用 action，分组更新使用 `$patch()`。
- 每个异步 action 都要处理 loading + success + error。

---

## 5. Vue Router

### 路由定义

```ts
const routes = [
  {
    path: "/users/:id",
    name: "user-detail",
    component: () => import("@/pages/UserDetail.vue"), // 懒加载
    props: true, // 将 params 作为 props 传入
    meta: { requiresAuth: true },
  },
];
```

### Navigation Guard

```ts
router.beforeEach((to, from) => {
  const { isLoggedIn } = useAuthStore();
  if (to.meta.requiresAuth && !isLoggedIn) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
});
```

### 响应式路由 Params

当组件保持挂载但路由 params 改变时：

```ts
const route = useRoute();
const id = computed(() => route.params.id as string);
watch(id, (newId) => fetchItem(newId));
```

---

## 6. Template 模式

### Template 语法

```vue
<!-- v-if/v-else-if/v-else -->
<div v-if="isLoading">Loading...</div>
<div v-else-if="error">Error: {{ error }}</div>
<div v-else>{{ content }}</div>

<!-- v-show 用于频繁切换 -->
<div v-show="isOpen">Toggled content</div>

<!-- v-for 配合稳定 key -->
<div v-for="item in items" :key="item.id">{{ item.name }}</div>

<!-- Computed 过滤列表（不要在同一元素上用 v-if + v-for） -->
<div v-for="item in activeItems" :key="item.id">{{ item.name }}</div>

<!-- 事件处理 -->
<form @submit.prevent="handleSubmit">
  <button type="submit">Save</button>
</form>

<!-- v-model -->
<input v-model="name" />
<CustomInput v-model="value" v-model:title="title" />
```

---

## 7. 性能

| 技术 | 何时使用 |
|------|---------|
| `v-memo` | 很少变化的列表项 |
| `v-once` | 一次性渲染且永远静态的内容 |
| `shallowRef()` | 整体替换的大型数据结构 |
| `shallowReactive()` | 仅顶层属性需要响应式 |
| 用 `v-show` 替代 `v-if` | 频繁的可见性切换 |
| `<KeepAlive :max="10">` | 缓存切换的视图 |
| 懒加载路由 | 对非关键路由使用 `() => import(...)` |
| `Suspense` | 带回退的异步组件加载 |

---

## 8. 测试

### 技术栈

- **Vitest** 用于单元测试与组件测试
- **Vue Test Utils** 用于挂载与交互
- **@pinia/testing** 用于 store mock
- **Playwright** 用于 E2E

### 组件测试模式

```ts
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import UserCard from "./UserCard.vue";

beforeEach(() => { setActivePinia(createPinia()); });

it("renders and emits", async () => {
  const wrapper = mount(UserCard, {
    props: { user: { id: "1", name: "Alice" } },
  });
  expect(wrapper.text()).toContain("Alice");
  await wrapper.find("button").trigger("click");
  expect(wrapper.emitted("select")![0]).toEqual(["1"]);
});
```

---

## 9. Nuxt 专属模式

### Auto-Import

Nuxt 会 auto-import `ref`、`computed`、`watch`、`useFetch`、`useAsyncData` 等。直接使用无需导入。对于非 Nuxt 项目，始终显式导入。

### useAsyncData / useFetch

```ts
const { data: user, pending, error, refresh } = await useAsyncData(
  "user", // 用于缓存的唯一 key
  () => $fetch(`/api/users/${id}`),
);

const { data: posts } = await useFetch("/api/posts", {
  query: { page: 1 },
  key: "posts-page-1", // 对请求去重
});
```

### Server Route

```ts
// server/api/users/[id].ts
export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.string().uuid(),
  }).parse);
  // ... 获取并返回
});
```

### Runtime Config

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    // 仅服务端
    apiSecret: "",
    // public（暴露给客户端）
    public: {
      apiBase: "https://api.example.com",
    },
  },
});
```

---

## 10. Vue 3.5+ 新 API

### Reactive Props Destructure

Vue 3.5 稳定了 reactive props destructure——从 `defineProps()` 解构出的变量自动具备响应式：

```ts
// Vue 3.5+：解构的 props 是响应式的（无需 toRefs）
const { count = 0, msg = "hello" } = defineProps<{
  count?: number;
  msg?: string;
}>();

// 限制：无法直接 watch 解构的 prop
watch(() => count, (newVal) => { ... }); // 通过：需要 getter
```

### `useTemplateRef()`

对于 template 引用，用 `useTemplateRef()` 替换名称匹配的普通 ref：

```ts
import { useTemplateRef } from "vue";
const inputEl = useTemplateRef<HTMLInputElement>("input");
// "input" 对应 template 中的 ref="input" 属性，而非变量名
```

支持动态 ref ID：`useTemplateRef(dynamicRefId)`。

### `onWatcherCleanup()`

全局可导入的 watcher cleanup API（Vue 3.5+）。必须在 watcher 回调内同步调用：

```ts
import { watch, onWatcherCleanup } from "vue";

watch(userId, async (newId) => {
  const controller = new AbortController();
  onWatcherCleanup(() => controller.abort());
  // ... 使用 signal 获取
});
```

### `useId()`

为表单元素和无障碍生成 SSR 稳定的唯一 ID：

```ts
import { useId } from "vue";
const id = useId();
```

### `defer` Teleport

`<Teleport defer>` 允许 teleport 到在同一渲染周期内渲染的目标：

```vue
<Teleport defer to="#container">Content</Teleport>
<div id="container"></div>
```

### Lazy Hydration（SSR）

`defineAsyncComponent()` 现支持 `hydrate` 策略：

```ts
import { defineAsyncComponent, hydrateOnVisible } from "vue";
const AsyncComp = defineAsyncComponent({
  loader: () => import("./Comp.vue"),
  hydrate: hydrateOnVisible(),
});
```

---

## 反模式

| 反模式 | 为什么错 | 修复方法 |
|--------|----------|----------|
| 解构 `defineProps()`（Vue < 3.5） | 捕获快照，丢失响应式 | 通过 `props.xxx` 访问或使用 `toRefs()` |
| 对解构的 prop 使用 `watch()`（Vue 3.5+） | 编译时错误——解构的 prop 无法直接 watch | 使用 getter 包装：`watch(() => count, ...)` |
| 同一元素上 `v-if` + `v-for` | 执行顺序不明确 | 使用 computed 过滤数组 |
| `v-for` 的 key = index | 重排时状态损坏 | 使用稳定的数据库 ID |
| 修改 props | 违反单向数据流 | emit 事件或使用 `v-model` |
| 对用户内容使用 `v-html` | XSS 漏洞 | 用 DOMPurify 消毒 |
| Vue 3 中使用 Mixins | 不透明、易冲突 | 用 composables 替代 |
| composable 中的模块级副作用 | 跨实例共享 | 限定在 `onMounted` + `onUnmounted` 中 |
| 对可替换 state 使用 `reactive()` | 替换会破坏响应式 | 改用 `ref()` |
| 无 cleanup 的 watcher | 内存泄漏、竞态条件 | 使用 `onCleanup` 或 `onWatcherCleanup()`（Vue 3.5+） |
| 新 Vue 3 代码中使用 Options API | 生态已转向 Composition API | 使用 `<script setup>` |
| 用普通 ref 作 template 引用 | 不支持动态 ref，名称匹配脆弱 | 使用 `useTemplateRef()`（Vue 3.5+） |

## 相关 Skill

- `accessibility` — ARIA、语义化 HTML、焦点管理
- `frontend-patterns` — 跨框架前端架构
- `typescript` — 应用到 Vue 项目的 TypeScript 最佳实践
- `coding-standards` — 通用代码质量标准
