> 本文件扩展了 [common/security.md](../common/security.md)，增加了 Web 特有的安全内容。

# Web 安全规则

## Content Security Policy

始终配置生产环境的 CSP。

### 基于 Nonce 的 CSP

对脚本使用基于每个请求的 nonce，而不是 `'unsafe-inline'`。

```text
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{RANDOM}' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.example.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
```

根据项目调整 origins。不要不加修改地盲目照搬此代码块。

## XSS 防护

- 永远不要注入未 sanitize 的 HTML
- 除非先进行 sanitize，否则避免使用 `innerHTML` / `dangerouslySetInnerHTML`
- 对动态模板值进行 escape
- 在绝对必要时，使用经过审查的本地 sanitizer 对用户 HTML 进行 sanitize

## 第三方脚本

- 异步加载
- 从 CDN 提供服务时使用 SRI
- 每季度审计
- 在可行时，对关键依赖优先采用自托管

## HTTPS 与 Headers

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## 表单

- 对会改变状态的表单启用 CSRF 防护
- 对提交端点实施 rate limiting
- 在客户端和服务端都进行校验
- 优先使用 honeypot 或轻量级反滥用措施，而非默认的重度 CAPTCHA
