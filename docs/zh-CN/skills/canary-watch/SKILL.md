---
name: canary-watch
description: 在发布后使用此 skill 监控并验证已部署的 URL — 检查 HTTP 端点、SSE 流、静态资源、控制台错误，以及在 deploy、合并或依赖升级后的性能回归。冒烟 / canary / 部署后验证。
metadata:
  origin: ECC
---

# Canary Watch — 部署后监控

## 何时使用

- 部署到 production 或 staging 后
- 合并有风险的 PR 后
- 当你想验证某个修复确实生效时
- 在发布窗口期间持续监控
- 依赖升级后

## 工作原理

监控已部署的 URL 是否出现回归。以循环方式运行，直到被停止或监控窗口到期。

### 监控内容

```
1. HTTP Status — is the page returning 200?
2. Console Errors — new errors that weren't there before?
3. Network Failures — failed API calls, 5xx responses?
4. Performance — LCP/CLS/INP regression vs baseline?
5. Content — did key elements disappear? (h1, nav, footer, CTA)
6. API Health — are critical endpoints responding within SLA?
7. Static Assets — are JS, CSS, image, and font requests returning 2xx/3xx with expected content types?
8. SSE Streams — do event-stream endpoints connect and receive an initial event or heartbeat?
```

### 监控模式

**快速检查**（默认）：单次扫描，报告结果
```
/canary-watch https://myapp.com
```

**持续监控**：每 N 分钟检查一次，持续 M 小时
```
/canary-watch https://myapp.com --interval 5m --duration 2h
```

**对比模式**：对比 staging 与 production
```
/canary-watch --compare https://staging.myapp.com https://myapp.com
```

### 告警阈值

```yaml
critical:  # 立即告警
  - HTTP status != 200
  - Console error count > 5 (new errors only)
  - LCP > 4s
  - API endpoint returns 5xx
  - Static asset returns 4xx/5xx
  - SSE endpoint cannot connect or drops before first heartbeat

warning:   # 在报告中标记
  - LCP increased > 500ms from baseline
  - CLS > 0.1
  - New console warnings
  - Response time > 2x baseline
  - Static asset content type changed unexpectedly
  - SSE heartbeat latency > 2x baseline

info:      # 仅记录日志
  - Minor performance variance
  - New network requests (third-party scripts added?)
```

### 通知

当突破 critical 阈值时：
- 桌面通知（macOS/Linux）
- 可选：Slack/Discord webhook
- 记录到 `~/.claude/canary-watch.log`

## 输出

```markdown
## Canary Report — myapp.com — 2026-03-23 03:15 PST

### Status: HEALTHY ✓

| Check | Result | Baseline | Delta |
|-------|--------|----------|-------|
| HTTP | 200 ✓ | 200 | — |
| Console errors | 0 ✓ | 0 | — |
| LCP | 1.8s ✓ | 1.6s | +200ms |
| CLS | 0.01 ✓ | 0.01 | — |
| API /health | 145ms ✓ | 120ms | +25ms |
| Static assets | 42/42 ✓ | 42/42 | — |
| SSE /events | connected ✓ | connected | +80ms heartbeat |

### No regressions detected. Deploy is clean.
```

## 集成

配合使用：
- `/browser-qa` 用于部署前验证
- Hooks：作为 `git push` 的 PostToolUse hook 添加，以便在 deploy 后自动检查
- CI：在 GitHub Actions 的 deploy 步骤之后运行
