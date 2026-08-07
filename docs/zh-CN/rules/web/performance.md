> 本文件在 [common/performance.md](../common/performance.md) 的基础上扩展了 web 特有的性能内容。

# Web 性能规则

## Core Web Vitals 目标

| 指标 | 目标 |
|--------|--------|
| LCP | < 2.5s |
| INP | < 200ms |
| CLS | < 0.1 |
| FCP | < 1.5s |
| TBT | < 200ms |

## Bundle Budget

| 页面类型 | JS Budget (gzipped) | CSS Budget |
|-----------|---------------------|------------|
| Landing page | < 150kb | < 30kb |
| App page | < 300kb | < 50kb |
| Microsite | < 80kb | < 15kb |

## 加载策略

1. 在确有需要时内联 critical above-the-fold CSS
2. 仅 preload hero image 和主字体
3. defer 非关键 CSS 或 JS
4. 动态 import 体积较大的库

```js
const gsapModule = await import('gsap');
const { ScrollTrigger } = await import('gsap/ScrollTrigger');
```

## 图片优化

- 明确指定 `width` 和 `height`
- 仅对 hero media 使用 `loading="eager"` 加 `fetchpriority="high"`
- below-the-fold 资源使用 `loading="lazy"`
- 优先使用 AVIF 或 WebP，并提供 fallback
- 绝不交付远大于渲染尺寸的源图

## 字体加载

- 最多两个 font family，除非有明确的例外
- `font-display: swap`
- 尽可能 subset
- 仅 preload 真正关键的字重/样式

## 动画性能

- 仅对 compositor-friendly 的属性做动画
- `will-change` 使用要克制，用完即移除
- 简单 transition 优先用 CSS
- JS 动画使用 `requestAnimationFrame` 或成熟的动画库
- 避免 scroll handler 频繁触发；使用 IntersectionObserver 或行为良好的库

## 性能检查清单

- [ ] 所有图片都有明确的尺寸
- [ ] 没有意外的 render-blocking 资源
- [ ] 动态内容不会引起 layout shift
- [ ] 动画仅作用于 compositor-friendly 的属性
- [ ] 第三方脚本以 async/defer 加载，且仅在需要时加载
