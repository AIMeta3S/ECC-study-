---
description: 全面的 Vue.js 代码审查，涵盖 Composition API 正确性、reactivity、composable 模式、template 安全、accessibility 以及 Vue 特有的性能问题。调用 vue-reviewer agent（在涉及 .vue/.ts 变更时同时调用 typescript-reviewer）。
---

# Vue 代码审查

此命令为 Vue 专属代码审查调用 **vue-reviewer** agent。对于涉及 `.vue` 文件或包含 Vue 的 `.ts`/`.js` 文件的 pull request，应同时运行 `vue-reviewer` 和 `typescript-reviewer` —— 二者各司其职、互不重叠。

## 此命令执行的操作

1. **识别 Vue 变更**：通过 `git diff` 查找已修改的 `.vue` 文件以及与 Vue 相关的 `.ts`/`.js` 文件
2. **运行 Lint**：执行带 `eslint-plugin-vue` 的 `eslint`
3. **Typecheck**：运行 `vue-tsc --noEmit` 或项目标准的 typecheck 命令
4. **仅审查 Vue 相关维度**：reactivity、composables、template 安全、accessibility、Vue 特有的性能
5. **生成报告**：按 severity 对 issue 分类（CRITICAL / HIGH / MEDIUM）

## 何时使用

在以下情况使用 `/vue-review`：

- PR 或 commit 涉及 `.vue` 文件
- 编写或修改 Vue 组件、composables 或 Pinia store 之后
- 合并 Vue 代码之前
- 审计 template 安全（`v-html`、URL 绑定）
- 审查新 composable 的正确性
- 审计 Vue Router guard 与导航
- 审查 Nuxt server route 或 SSR 专属代码

对于不含 Vue 导入的纯 `.ts`/`.js` 变更，使用 `/code-review`（通用）或直接调用 `typescript-reviewer`。

## 适用范围对比：`/code-review` 与 TypeScript 审查

| 工具 | 适用范围 |
|---|---|
| `vue-reviewer`（此命令） | reactivity、composables、template 安全、a11y、Vue 性能、Pinia/Router |
| `typescript-reviewer` | 通用 TS/JS —— `any` 滥用、async 正确性、Node 安全 |
| `security-reviewer` | 项目级安全审计 |
| `/code-review` | 通用未提交变更或 PR 审查 |

在涉及 `.vue` / Vue 相关的 PR 上，同时调用 `vue-reviewer` 和 `typescript-reviewer`。二者各自的发现在设计上互不重叠。

## 审查类别

### CRITICAL（必须修复）

- `v-html` 使用未 sanitize 的输入
- `:href`/`:src` 使用未验证的用户 URL（`javascript:`、`data:`）
- client bundle 中包含 secret（`VITE_*`、Nuxt `public` runtimeConfig）
- 服务端 endpoint 缺少输入验证（Nuxt Nitro）
- 使用 `localStorage`/`sessionStorage` 存储 session token
- 在 Vue < 3.5 中对 reactive props 解构（会破坏 reactivity）
- `reactive()` 对象整体替换（会破坏 watcher）
- watcher source 追踪 ref 对象而非 `.value`

### HIGH（应当修复）

- composable 存在 module-scope side effect
- composable 缺少 cleanup（watcher、interval、listener）
- `v-for` 缺少 `:key` 或使用 `key={index}`
- 同一元素上同时使用 `v-if` + `v-for`
- props mutation
- 缺少 prop validation
- route guard 返回 false 但未 redirect
- `useRoute().params` 在顶层解构（snapshot 问题）
- `v-model` 绑定到无 setter 的 computed
- accessibility 违规（缺少 label、非语义化的交互元素）
- 在 actions 之外直接修改 store 属性

### MEDIUM（可考虑）

- 新的 Vue 3 代码中使用 Options API
- 组件超过 300 行
- 在更适合 `v-if` 时使用 `v-show`（或反之）
- `<KeepAlive>` 缺少 `:max`
- 大量替换的数据缺少 `shallowRef`
- 使用自定义 validation 而非成熟的表单库
- `defineExpose` 暴露过多内容
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

# 供应链
npm audit
```

若未配置 `eslint-plugin-vue` 或 `vue-tsc`，审查会将该缺口标记为 HIGH 配置 issue 并继续。

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

## 发现的 issue

[CRITICAL] 未 sanitize 的 v-html
文件：src/components/UserCard.vue:15
问题：用户可控的 bio 通过 v-html 作为原始 HTML 渲染。
原因：用户输入中注入的 script 标签会导致 XSS。
修复：使用 DOMPurify 进行 sanitize，或作为文本渲染：
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
问题：`watch` 回调在未使用 AbortController 的情况下发起 fetch；陈旧响应可能覆盖较新的数据。
修复：使用 onCleanup 来 abort：
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

建议：FAIL：在 CRITICAL issue 修复前阻止合并
````

## 批准条件

| 状态 | 条件 |
|---|---|
| PASS: Approve | 无 CRITICAL 或 HIGH issue |
| WARNING: Warning | 仅有 MEDIUM issue（谨慎合并） |
| FAIL: Block | 发现 CRITICAL 或 HIGH issue |

## 与其他命令的配合

- 若构建已损坏，先运行项目的构建命令
- 运行测试以确保组件测试通过
- 合并 Vue 代码之前运行 `/vue-review`
- 对同一 PR 上非 Vue 专属的问题，使用 `/code-review`

## 相关

- Agent：`agents/vue-reviewer.md`
- 配套 agent：`agents/typescript-reviewer.md`（针对 Vue 相关 TS/JS 一同运行）
- Skills：`skills/vue-patterns/`
- Rules：`rules/vue/`
