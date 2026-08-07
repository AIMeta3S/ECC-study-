---
name: benchmark
description: 使用此 skill 测量性能基线，在 PR 前后检测回归，并比较不同技术栈方案。
metadata:
  origin: ECC
---

# Benchmark — 性能基线与回归检测

## 何时使用

- 在 PR 前后测量性能影响
- 为项目建立性能基线
- 当用户反馈"感觉慢"时
- 发布前——确保达到性能目标
- 将你的技术栈与替代方案进行比较

## 工作原理

### 模式 1：页面性能

通过 browser MCP 测量真实浏览器指标：

```
1. Navigate to each target URL
2. Measure Core Web Vitals:
   - LCP (Largest Contentful Paint) — target < 2.5s
   - CLS (Cumulative Layout Shift) — target < 0.1
   - INP (Interaction to Next Paint) — target < 200ms
   - FCP (First Contentful Paint) — target < 1.8s
   - TTFB (Time to First Byte) — target < 800ms
3. Measure resource sizes:
   - Total page weight (target < 1MB)
   - JS bundle size (target < 200KB gzipped)
   - CSS size
   - Image weight
   - Third-party script weight
4. Count network requests
5. Check for render-blocking resources
```

### 模式 2：API 性能

对 API endpoint 进行 benchmark：

```
1. Hit each endpoint 100 times
2. Measure: p50, p95, p99 latency
3. Track: response size, status codes
4. Test under load: 10 concurrent requests
5. Compare against SLA targets
```

### 模式 3：构建性能

测量开发反馈循环：

```
1. Cold build time
2. Hot reload time (HMR)
3. Test suite duration
4. TypeScript check time
5. Lint time
6. Docker build time
```

### 模式 4：前后对比

在修改前后运行以测量影响：

```
/benchmark baseline    # 保存当前指标
# ... 进行修改 ...
/benchmark compare     # 与基线进行对比
```

输出：
```
| Metric | Before | After | Delta | Verdict |
|--------|--------|-------|-------|---------|
| LCP | 1.2s | 1.4s | +200ms | WARNING: WARN |
| Bundle | 180KB | 175KB | -5KB | ✓ BETTER |
| Build | 12s | 14s | +2s | WARNING: WARN |
```

## 输出

将基线以 JSON 格式存储在 `.ecc/benchmarks/` 中。通过 Git 追踪，以便团队共享基线。

## 集成

- CI：在每个 PR 上运行 `/benchmark compare`
- 与 `/canary-watch` 搭配用于部署后监控
- 与 `/browser-qa` 搭配用于完整的发布前检查清单
