---
name: browser-qa
<<<<<<< HEAD
description: 部署功能后，使用本 skill 通过浏览器自动化进行视觉测试与 UI 交互验证。
metadata:
  origin: ECC
---
=======
description: Automate visual testing and UI interaction verification using browser automation after deployment.
metadata:
  origin: ECC
---

# Browser QA — 自动化视觉测试与交互验证
>>>>>>> upstream/main

# 浏览器 QA — 自动化视觉测试与交互

## 何时使用

- 将功能部署到 staging/preview 之后
- 需要跨页面验证 UI 行为时
- 发布之前 — 确认布局、表单、交互确实可用
- 在 review 涉及前端代码的 PR 时
- 无障碍审计与响应式测试

## 工作原理

使用浏览器自动化 MCP（claude-in-chrome、Playwright 或 Puppeteer）像真实用户一样与线上页面交互。

### 安全第一 — blast radius（默认以只读方式运行）

Browser QA 会驱动真实 auth 和真实用户旅程，因此必须明确对待 blast radius。默认采用**只读**方式：绝不针对 production URL 运行 **mutating** 旅程（checkout、payment、delete、mass-update）— 必须有明确的 opt-in **且**提供 staging/preview URL。使用预置的**测试凭据**，绝不使用真实 production 登录信息，并在保存任何截图前对凭据/token/PII 进行**脱敏**。

### Phase 1: 冒烟测试
```
1. Navigate to target URL
2. Check for console errors (filter noise: analytics, third-party)
3. Verify no 4xx/5xx in network requests
4. Screenshot above-the-fold on desktop + mobile viewport
5. Check Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms
   (INP replaced FID in March 2024; thresholds per web.dev)
```

### Phase 2: 交互测试
```
1. Click every nav link — verify no dead links
2. Submit forms with valid data — verify success state
3. Submit forms with invalid data — verify error state
4. Test auth flow: login → protected page → logout (test creds only, never prod)
5. Test critical user journeys (checkout, onboarding, search)
   — read-only by default; only exercise mutating journeys against staging
     with explicit opt-in (see "Safety first" above)
```

### Phase 3: 视觉回归
```
1. Screenshot key pages at 3 breakpoints (375px, 768px, 1440px)
2. Compare against committed baseline screenshots
   — no baseline ⇒ report INCONCLUSIVE, never a silent PASS
3. Flag layout shifts > 5px, missing elements, overflow
4. Check dark mode if applicable
```

### Phase 4: 无障碍
```
1. Run axe-core or equivalent on each page
2. Flag WCAG 2.2 AA violations (contrast, labels, focus order)
3. Verify keyboard navigation works end-to-end
4. Check screen reader landmarks
```

> 注意：axe-core 大约能自动覆盖 WCAG 的 30–40%。一次无报错的运行是**必要但非充分**的 — keyboard nav、focus order 和 screen-reader 检查仍需人工核查。不要仅凭自动化通过就报告 "accessible"。

## 输出格式

```markdown
## QA Report — [URL] — [timestamp]

### Smoke Test
- Console errors: 0 critical, 2 warnings (analytics noise)
- Network: all 200/304, no failures
- Core Web Vitals: LCP 1.2s ✓, CLS 0.02 ✓, INP 89ms ✓

### Interactions
- [✓] Nav links: 12/12 working
- [✗] Contact form: missing error state for invalid email
- [✓] Auth flow: login/logout working

### Visual
- [✗] Hero section overflows on 375px viewport
- [✓] Dark mode: all pages consistent

### Accessibility
- 2 AA violations: missing alt text on hero image, low contrast on footer links

### Verdict: SHIP WITH FIXES (2 issues, 0 blockers)
# verdict ∈ SHIP / SHIP WITH FIXES / DO NOT SHIP; use INCONCLUSIVE if no visual baseline
```

## 集成

可与任何 browser MCP 配合使用：
- `mChild__claude-in-chrome__*` 工具（首选 — 使用你实际的 Chrome）
- 通过 `mcp__browserbase__*` 使用 Playwright
- 直接使用 Puppeteer 脚本

配合 `/canary-watch` 进行部署后监控。
