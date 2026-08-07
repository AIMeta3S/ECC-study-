---
paths:
  - "**/*.component.ts"
  - "**/*.component.html"
  - "**/*.service.ts"
  - "**/*.interceptor.ts"
---
# Angular 安全

> 本文件在 [common/security.md](../common/security.md) 基础上扩展了 Angular 特定内容。

## XSS 防范

Angular 会自动 sanitize 绑定的值。切勿对用户可控的输入绕过 sanitizer。

```typescript
// 错误：绕过 sanitization —— 存在 XSS 风险
this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(userInput);

// 正确：在信任前显式 sanitize
this.safeHtml = this.sanitizer.sanitize(SecurityContext.HTML, userInput);
```

- 除非有文档记录并经审查的理由，否则切勿使用 `bypassSecurityTrust*` 方法
- 避免将 `[innerHTML]` 用于不可信内容 —— 改用 `innerText` 或 sanitize pipe
- 切勿将 `[href]` 绑定到用户输入 —— Angular 不会在所有上下文中拦截 `javascript:` URL
- 切勿从用户数据构造模板字符串

## HTTP 安全

应专用 `HttpClient` —— 除非别无选择，否则绝不使用裸 `fetch()` 或 `XHR`。

```typescript
// 错误：绕过 interceptors（认证 header、错误处理、日志）
const res = await fetch('/api/users');

// 正确
users$ = this.http.get<User[]>('/api/users');
```

- 通过 interceptors 附带 auth token —— 切勿在单个 service 调用中硬编码
- 对 API 响应进行类型检查与校验 —— 在边界处将外部数据视为 `unknown`
- 切勿 log 可能包含 token、PII 或凭据的 HTTP 响应

## Secret 管理

```typescript
// 错误：在源码中硬编码 secret
const apiKey = 'sk-live-xxxx';

// 正确：通过环境注入
import { environment } from '../environments/environment';
const apiKey = environment.apiKey;
```

- 将 `environment.ts` 视为 config 结构 —— 切勿将真实 secret 存储在受版本控制的 environment 文件中
- 通过 CI/CD 注入生产环境的 secret（环境变量、secret manager）

## Route Guard

每个需要认证或受角色限制的 route 都必须有 guard。切勿仅依赖隐藏 UI 元素。

```typescript
{
  path: 'admin',
  canMatch: [authGuard, roleGuard('admin')],
  loadChildren: () => import('./admin/admin.routes'),
}
```

对敏感 route 使用 `canMatch` —— 它能彻底阻止未授权用户加载该 route module。

## SSR 安全

使用 Angular SSR 时：

- 除非刻意公开，否则切勿通过 `TransferState` 将服务端环境变量暴露给客户端
- 在服务端渲染前 sanitize 所有输入 —— 基于 DOM 的 XSS 也可能发生在服务端
- 在服务端避免使用 `window`、`document`、`localStorage` —— 用 `isPlatformBrowser` 做守卫，或通过 `DOCUMENT` token 注入

## Content Security Policy

在服务端配置 CSP header。避免在 `script-src` 中使用 `unsafe-inline`。当使用 SSR 并带有 inline script 时，通过 Angular 的 CSP 支持使用 nonce。

## Agent 支持

- 使用 **security-reviewer** skill 进行全面的安全审计
