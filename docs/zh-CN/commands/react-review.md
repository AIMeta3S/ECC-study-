---
description: 综合性的 React/JSX 代码审查，覆盖 hook 正确性、渲染性能、Server Component / Client Component 边界、可访问性以及 React 特有的安全问题。调用 react-reviewer agent（在 TSX/JSX 改动时同时调用 typescript-reviewer）。
---

# React 代码审查

此 command 调用 **react-reviewer** agent 执行 React 专项代码审查。对于涉及 `.tsx`/`.jsx` 文件的 pull request，应同时运行 `react-reviewer` 和 `typescript-reviewer` —— 二者各自负责独立的职责范围。

## 此 Command 的功能

1. **识别 React 改动**：通过 `git diff` 找出被修改的 `.tsx`/`.jsx` 文件（以及包含 React 的 `.ts`/`.js` 文件）
2. **运行 Lint**：配合 `eslint-plugin-react-hooks` 和 `eslint-plugin-jsx-a11y` 执行 `eslint`
3. **类型检查**：运行 `tsc --noEmit` 或项目标准的 typecheck 命令
4. **仅审查 React 相关领域**：Hook 规则、RSC 边界、可访问性、渲染性能、React 特有的安全
5. **生成报告**：按严重程度（CRITICAL / HIGH / MEDIUM）对问题进行分类

## 使用时机

在以下情况使用 `/react-review`：

- PR 或 commit 涉及 `.tsx`/`.jsx` 文件
- 编写或修改 React 组件、自定义 hook 或页面之后
- 合并 React 代码之前
- 审查 UI 组件的可访问性
- 审查新 hook 是否符合 rules-of-hooks 以及依赖项正确性
- 审查 Next.js App Router 的 Server Component / Client Component 边界

对于不含 React import 的纯 `.ts`/`.js` 改动，请改用 `/code-review`（通用）或直接调用 `typescript-reviewer`。

## 范围对比：`/code-review` 与 TypeScript 审查

| 工具 | 范围 |
|---|---|
| `react-reviewer`（此 command） | Hook 规则、JSX、RSC、a11y、React 特有的安全、渲染性能 |
| `typescript-reviewer` | 通用 TS/JS —— `any` 滥用、async 正确性、Node 安全 |
| `security-reviewer` | 全项目安全审计 |
| `/code-review` | 通用未提交改动或 PR 审查 |

在 TSX/JSX 的 PR 上，同时调用 `react-reviewer` 和 `typescript-reviewer`。各自的发现按设计互不重叠。

## 审查类别

### CRITICAL（必须修复）

- `dangerouslySetInnerHTML` 使用了未经 sanitize 的输入
- `href`/`src` 使用未校验的用户 URL（`javascript:`、`data:`）
- Server Action 缺少输入校验
- Secret 泄露进 client bundle（`NEXT_PUBLIC_*`、`VITE_*`、`REACT_APP_*`）
- 使用 `localStorage`/`sessionStorage` 存放 session token
- 条件性的 hook 调用（违反 Rules of Hooks）
- 直接修改 state
- 在组件或自定义 hook 之外调用 hook

### HIGH（应当修复）

- `useEffect`/`useMemo`/`useCallback` 缺少依赖项（在没有正当理由的情况下禁用了 `exhaustive-deps`）
- 用 Effect 派生 state
- Effect 缺少 cleanup
- handler / interval 中存在 stale closure
- 在 Client Component 中 import 了仅 Server 端使用的模块
- 通过 props 将敏感数据泄露给 Client Component
- Server Actions 缺少 auth 检查
- 可访问性违规（缺少 label、非语义化的交互元素、ARIA 误用）
- 在动态列表中使用 `key={index}`
- 重复的 state、useEffect 链

### MEDIUM（可考虑）

- 在没有实测收益的情况下过度 memoize
- 将内联新建的 object/function 作为 prop 传给已 memoize 的子组件
- 仅在路由根节点使用 Suspense（没有渐进式展现）
- 长列表未使用 virtualization
- 高频变化的值通过 `useContext` 传递
- 在非简单表单中自造校验逻辑
- prop drilling 超过 3 层
- 组件超过 200 行
- 新代码中使用 class component

## 自动执行的检查

```bash
# Lint（任何有意义的审查都必需）
npx eslint . --ext .tsx,.jsx,.ts,.js

# 类型检查（纯 JS 项目可平滑跳过）
npm run typecheck --if-present
[ -f tsconfig.json ] && tsc --noEmit -p tsconfig.json

# 针对性的 a11y 规则
npx eslint . --rule 'jsx-a11y/alt-text: error' \
              --rule 'jsx-a11y/anchor-is-valid: error' \
              --rule 'jsx-a11y/click-events-have-key-events: error'

# 供应链
npm audit
```

如果未配置 `eslint-plugin-react-hooks` 或 `eslint-plugin-jsx-a11y`，审查会把该缺失标记为 HIGH 级别的配置问题并继续执行。

## 使用示例

````text
User: /react-review

Agent:
# React 代码审查报告

## 已审查的文件
- src/components/UserCard.tsx（已修改）
- src/hooks/useUser.ts（新增）

## Lint 结果
PASS: eslint clean
PASS: typecheck clean

## 发现的问题

[CRITICAL] 未经 sanitize 的 dangerouslySetInnerHTML
文件：src/components/UserCard.tsx:42
问题：用户可控的 bio 被作为原始 HTML 渲染。
原因：用户输入中存储的 script 标签会导致 XSS。
修复：使用 DOMPurify 进行 sanitize，或作为文本渲染：
```tsx
import DOMPurify from "isomorphic-dompurify";
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(user.bio) }} />
```

[HIGH] Effect 缺少 cleanup
文件：src/hooks/useUser.ts:18
问题：`fetch` 调用没有 AbortController；可能在组件 unmount 后调用 setState。
修复：添加 AbortController 并进行 cleanup：
```ts
useEffect(() => {
  const ac = new AbortController();
  fetch(`/api/users/${id}`, { signal: ac.signal })
    .then(r => r.json())
    .then(setUser);
  return () => ac.abort();
}, [id]);
```

## 摘要
- CRITICAL: 1
- HIGH: 1
- MEDIUM: 0

建议：FAIL：在 CRITICAL 问题修复前阻止合并
````

## 通过标准

| 状态 | 条件 |
|---|---|
| PASS：通过 | 没有 CRITICAL 或 HIGH 问题 |
| WARNING：警告 | 仅有 MEDIUM 问题（谨慎合并） |
| FAIL：阻止合并 | 发现 CRITICAL 或 HIGH 问题 |

## 与其他 Command 的配合

- 如果 build 已损坏，先运行 `/react-build`
- 运行 `/react-test` 以确保组件测试通过
- 合并前运行 `/react-review`
- 在同一 PR 上处理非 React 特有的关注点时使用 `/code-review`

## 相关资源

- Agent：`agents/react-reviewer.md`
- 配套 agent：`agents/typescript-reviewer.md`（针对 TSX/JSX PR 同时运行）
- Skills：`skills/react-patterns/`、`skills/react-testing/`、`skills/accessibility/`
- Rules：`rules/react/`
