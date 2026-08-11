---
description: 全面审查 Vue.js 代码，包括组合式 API 的正确性、响应式设计、可组合模式、template 安全性、可访问性以及 Vue 特有的性能表现。它会调用 vue-reviewer agent（当 .vue 或 .ts 文件发生变更时，还会同时调用 typescript-reviewer）。
---

# Vue 代码审查

此命令会调用 **vue-reviewer** agent 进行 Vue 专属的代码审查。对于涉及 `.vue` 文件或包含 Vue 代码的 `.ts`/`.js` 文件的 Pull/Merge Request，`vue-reviewer` 和 `typescript-reviewer` 应同时运行 —— 二者各司其职。

## 此命令执行的操作

1. **识别 Vue 变更**：通过 `git diff` 查找已修改的 `.vue` 文件以及与 Vue 相关的 `.ts`/`.js` 文件
2. **运行 Lint**：执行带 `eslint-plugin-vue` 的 `eslint`
3. **Typecheck**：运行 `vue-tsc --noEmit` 或项目标准的 typecheck 命令
4. **仅审查 Vue 相关维度**：reactivity、composables、template security、accessibility、Vue-specific performance
5. **生成报告**：按严重程度对问题进行分类（CRITICAL / HIGH / MEDIUM）

## 何时使用

在以下情况使用 `/vue-review`：

- PR/MR 或 commit 涉及 `.vue` 文件时
- 在编写或修改 Vue 组件、composables 或 Pinia store 之后
- 合并 Vue 代码之前
- 审计 template 安全性时（`v-html`、URL 绑定）
- 审查新 composable 的正确性时
- 审计 Vue 路由守卫和导航时
- 审查 Nuxt 服务端路由或 SSR 专属代码时

对于没有被 Vue 导入的纯 `.ts`/`.js` 变更，使用 `/code-review`（通用）或直接调用 `typescript-reviewer`。

## 本命令与 `/code-review` 及 TypeScript 审查的职责范围

| 工具 | 适用范围 |
|---|---|
| `vue-reviewer`（本命令） | reactivity、composables、template security、a11y、Vue performance、Pinia/Router |
| `typescript-reviewer` | 通用 TS/JS —— `any` 滥用、异步正确性、Node 安全性 |
| `security-reviewer` | 项目范围安全审计 |
| `/code-review` | 通用未提交更改或 PR 审查 |

对于 `.vue` 或 Vue 相关的 PR，请同时调用 `vue-reviewer` 和 `typescript-reviewer`。根据设计，两者的发现不会重叠。

## 审查类别

### CRITICAL（必须修复）

- `v-html` 使用未经清理的输入
- `:href`/`:src` 使用未验证的用户 URL（`javascript:`、`data:`）
- client bundle 中包含 secret（`VITE_*`、Nuxt `public` runtimeConfig）
- 服务端 endpoint 缺少输入验证（Nuxt Nitro）
- 存储 session token 的 `localStorage`/`sessionStorage`
- 在 Vue < 3.5 中解构响应式 props（会破坏 reactivity）
- `reactive()` 对象整体替换（会破坏 watchers）
- Watcher 源追踪 ref 对象而非 `.value`

### HIGH（应当修复）

- Composable with module-scope side effects
- Missing cleanup in composable (watcher, interval, listener)
- `v-for` 没有 `:key` 或使用 `key={index}`
- 同一元素上同时使用 `v-if` 和 `v-for`
- props 结构或内容被修改
- 缺少 prop 验证
- 路由守卫返回 false 但未重定向
- - 在顶层解构 `useRoute().params`（快照）
- `v-model` 绑定到没有 setter 的 computed
- 可访问性违规（缺少标签、非语义化的交互元素）
- 在 actions 外部直接修改 store 属性

### MEDIUM（可考虑）

- Vue 3 新代码中使用 Options API
- 组件超过 300 行
- 在更适合 `v-if` 时使用 `v-show`（或反之）
- `<KeepAlive>` 缺少 `:max`
- 大量数据替换时缺少 `shallowRef`
- 使用自定义验证而非成熟的表单库
- `defineExpose` 暴露了不必要的信息
- 使用 `v-bind="$attrs"` 时未禁用 `inheritAttrs`

## 自动执行的检查

```bash
# Lint（必需）
npx eslint . --ext .vue,.ts,.js

# Vue 专属 typecheck
vue-tsc --noEmit

# 针对性的安全规则
npx eslint . --rule 'vue/no-v-html: warn' \
              --rule 'vue/no-template-target-blank: error'

# 供应链检查
npm audit
```

如果未配置 `eslint-plugin-vue` 或 `vue-tsc`，审查将把此缺失标记为 HIGH 配置问题，并继续执行。

## 示例用法

````text
User: /vue-review

Agent:
# Vue 代码审查报告

## 已审查文件
- src/components/UserCard.vue (modified)
- src/composables/useUser.ts (new)
- src/stores/useUserStore.ts (modified)

## Lint 结果
PASS: eslint 无错误
PASS: vue-tsc 无错误

## 发现的问题

[CRITICAL] 未经净化的 v-html
文件：src/components/UserCard.vue:15
问题：用户可控的 bio 通过 v-html 作为原始 HTML 渲染。
原因：用户输入中注入的 script 标签会导致 XSS。
修复：使用 DOMPurify 进行净化，或作为文本渲染：
```vue
<script setup>
import DOMPurify from "dompurify";
const safeBio = computed(() => DOMPurify.sanitize(user.bio));
</script>
<template>
  <div v-html="safeBio" />
</template>
```

[HIGH] composable 中的 watcher 缺少 cleanup
文件：src/composables/useUser.ts:22
问题：`watch` 回调触发 fetch 但未使用 AbortController；过时的响应可能覆盖较新的数据。
修复：使用 onCleanup 来中止请求：
```ts
watch(userId, async (newId, _old, onCleanup) => {
  const controller = new AbortController();
  onCleanup(() => controller.abort());
  const data = await fetch(`/api/users/${newId}`, { signal: controller.signal });
  user.value = await data.json();
});
```

## 小结
- CRITICAL: 1
- HIGH: 1
- MEDIUM: 0

建议：FAIL - 阻止合并，直至修复 CRITICAL 问题
````

## 批准条件

| 状态 | 条件 |
|---|---|
| PASS：批准 | 无 CRITICAL 或 HIGH 问题 |
| WARNING：警告 | 仅有 MEDIUM 问题（合并时需谨慎） |
| FAIL：阻止 | 发现 CRITICAL 或 HIGH 问题 |

## 与其他命令的配合

- 如果构建已损坏，请先运行项目的构建命令
- 运行测试以确保组件测试通过
- 合并 Vue 代码前运行 `/vue-review`
- 在同一个 PR 上使用 `/code-review` 处理非 Vue 专属的问题

## 相关

- Agent：`agents/vue-reviewer.md`
- 配套 agent：`agents/typescript-reviewer.md`（与 Vue 相关的 TS/JS 时同时运行）
- Skills：`skills/vue-patterns/`
- Rules：`rules/vue/`
