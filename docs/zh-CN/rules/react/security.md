---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/components/**/*.ts"
  - "**/app/**/*.ts"
  - "**/pages/**/*.ts"
---
# React 安全

> 本文件扩展了 [typescript/security.md](../typescript/security.md) 和 [common/security.md](../common/security.md)，补充 React 专属内容。

## 通过 `dangerouslySetInnerHTML` 引发的 XSS

CRITICAL。该 prop 的名称故意起得吓人——将每一次使用都视为 code review 的阻断点。

```tsx
// CRITICAL：未经净化的用户输入
<div dangerouslySetInnerHTML={{ __html: userBio }} />

// 正确做法：
// 1. 作为文本渲染
<div>{userBio}</div>

// 2. 通过会执行净化的库来渲染解析后的 markdown
<ReactMarkdown>{userBio}</ReactMarkdown>

// 3. 如果必须使用原始 HTML，先用 DOMPurify 净化
import DOMPurify from "isomorphic-dompurify";
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userBio) }} />
```

针对每个 `dangerouslySetInnerHTML` 调用的审查 checklist：

- 输入是否始终受我们控制？记录其来源。
- 如果来自用户：是否在**同一调用点**进行了净化？（仅当每个使用方都经过验证时，在 API 边界进行净化才可接受。）
- sanitizer 配置是否采用 allowlist 标签，而不是 denylist？

## 不安全的 URL Scheme

`javascript:` 和 `data:` URL 出现在 `href`、`src` 和 `xlink:href` 中时会执行任意代码。

```tsx
// CRITICAL：javascript: URL 注入
<a href={user.website}>Visit</a>   // 若 user.website = "javascript:alert(1)"

// 正确：校验 scheme
function safeUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (["http:", "https:", "mailto:"].includes(parsed.protocol)) return url;
  } catch {
    return undefined;
  }
  return undefined;
}
<a href={safeUrl(user.website)}>Visit</a>
```

React 在开发模式下会对 `href` 中的 `javascript:` URL 发出警告，但运行时并不会拦截它们。`data:` URL 和其他 scheme 同样会绕过。务必始终校验。

## 没有 `rel` 的 `target="_blank"`

不带 `rel="noopener noreferrer"` 的 `<a target="_blank">` 会让目标页面访问 `window.opener` 并执行导航劫持。

```tsx
// 错误
<a href={externalUrl} target="_blank">External</a>

// 正确
<a href={externalUrl} target="_blank" rel="noopener noreferrer">External</a>
```

当 `target="_blank"` 时，现代浏览器默认启用 `noopener`，但不要依赖浏览器默认行为——显式写出。

## Server Action 输入校验

Server Action（`"use server"`）以与公开 API 端点相同的信任级别运行。校验每一项输入。

```tsx
"use server";
import { z } from "zod";

const Input = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(120),
});

export async function updateUser(_state: unknown, formData: FormData) {
  const parsed = Input.safeParse({
    email: formData.get("email"),
    age: Number(formData.get("age")),
  });
  if (!parsed.success) return { error: parsed.error.flatten() };
  // ...
}
```

- 在 action 内部进行认证——不要信任客户端路由门禁
- 授权：确认当前用户对其正在修改的具体记录拥有权限
- 对敏感操作进行 rate limit

## 通过环境变量泄露的 secret

带前缀的环境变量会被打包进客户端。将其视为公开的。

| 框架 | 公开前缀 | 私有 |
|---|---|---|
| Next.js | `NEXT_PUBLIC_*` | 其余全部 |
| Vite | `VITE_*` | 仅 `.env` 服务端可用 |
| Create React App | `REACT_APP_*`，以及 `NODE_ENV` 和 `PUBLIC_URL` | 其余全部（任何不带 `REACT_APP_` 前缀的都仅在服务端可用） |
| Remix | 仅在 `loader`/`action` 中可访问 `process.env` | 同上 |

```ts
// CRITICAL：secret 泄露到 client bundle
const apiKey = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY;
```

在每个涉及环境变量的 PR 上审查：这个字符串出现在公开 bundle 中会不会有问题？

## 认证 / 授权

- 永远不要将 session 存储在 `localStorage` 中——任何 XSS 都能访问。使用 httpOnly 的 secure cookie。
- 永远不要信任客户端设置的状态来门禁敏感 UI。在 JSX 中进行渲染门禁只能阻止显示，无法阻止访问——API 必须强制执行。
- CSRF：基于 cookie 的认证需要 CSRF token 或 `SameSite=Strict`/`Lax` cookie
- 当不使用框架默认值时，对 form action 使用 double-submit cookie 或 origin 校验

## Content Security Policy (CSP)

在服务端配置。React 应用最低可接受的 CSP：

```
default-src 'self';
script-src 'self' 'nonce-{REQUEST_NONCE}';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https://api.example.com;
frame-ancestors 'none';
```

- 避免在 `script-src` 中使用 `unsafe-inline` 和 `unsafe-eval`
- 对于带内联脚本的 SSR（Next.js streaming、hydration data），使用按请求生成的 nonce——Next.js 和 Remix 都支持 nonce 注入
- `style-src 'unsafe-inline'` 对于 CSS-in-JS 库通常难以避免——记录这一权衡

## 通过 Object Spread 引发的 Prototype Pollution

```tsx
// 错误：不可信的 JSON 被直接 spread 到 state 中
const update = await req.json();
setState({ ...state, ...update });    // 攻击者可控制 __proto__

// 正确：用 schema 解析，或对 key 进行防护
const Allowed = z.object({ name: z.string(), email: z.string().email() });
const parsed = Allowed.parse(await req.json());
setState({ ...state, ...parsed });
```

## SSR 模板注入

当使用 `renderToString` 或 `renderToPipeableStream` 时：

- 所有在 JSX 内渲染的值都会被 React 转义——安全
- 传给 `dangerouslySetInnerHTML` 的值不会被转义——与客户端规则相同
- 围绕 React 输出手动构造的 HTML 包装必须经过转义或净化——永远不要将用户输入拼接到周围的 HTML 模板中

## 第三方组件

- 在添加任何 UI 库之前审查 `npm audit`
- 检查该库是否在内部对其输入使用了 `dangerouslySetInnerHTML`（例如富文本编辑器）
- 锁定版本，在重大升级前审查 changelog
- 警惕那些接受 HTML 字符串作为 prop 的组件

## 生产环境中的 Source Map 泄露

生产构建在发布时不应携带 source map，或者将 sourcemap 上传到错误追踪器（Sentry）并从公开 bundle 中剥离。公开的 source map 会泄露内部逻辑和文件结构。

## Agent 支持

- 使用 `security-reviewer` agent 对整个代码库进行综合安全审计
- 使用 `react-reviewer` agent 在主动 code review 中应用 React 专属模式和上述规则
