> 本文件在 [common/coding-style.md](../common/coding-style.md) 基础上扩展了 Web 专属的前端内容。

# Web 编码风格

## 文件组织

按 feature 或 surface area 组织，而非按文件类型：

```text
src/
├── components/
│   ├── hero/
│   │   ├── Hero.tsx
│   │   ├── HeroVisual.tsx
│   │   └── hero.css
│   ├── scrolly-section/
│   │   ├── ScrollySection.tsx
│   │   ├── StickyVisual.tsx
│   │   └── scrolly.css
│   └── ui/
│       ├── Button.tsx
│       ├── SurfaceCard.tsx
│       └── AnimatedText.tsx
├── hooks/
│   ├── useReducedMotion.ts
│   └── useScrollProgress.ts
├── lib/
│   ├── animation.ts
│   └── color.ts
└── styles/
    ├── tokens.css
    ├── typography.css
    └── global.css
```

## CSS Custom Properties

将 design tokens 定义为变量。不要重复硬编码调色板、排版或间距：

```css
:root {
  --color-surface: oklch(98% 0 0);
  --color-text: oklch(18% 0 0);
  --color-accent: oklch(68% 0.21 250);

  --text-base: clamp(1rem, 0.92rem + 0.4vw, 1.125rem);
  --text-hero: clamp(3rem, 1rem + 7vw, 8rem);

  --space-section: clamp(4rem, 3rem + 5vw, 10rem);

  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}
```

## 仅用于动画的属性

优先使用 compositor-friendly 的 motion：
- `transform`
- `opacity`
- `clip-path`
- `filter`（谨慎使用）

避免对影响布局的属性做动画：
- `width`
- `height`
- `top`
- `left`
- `margin`
- `padding`
- `border`
- `font-size`

## Semantic HTML 优先

```html
<header>
  <nav aria-label="Main navigation">...</nav>
</header>
<main>
  <section aria-labelledby="hero-heading">
    <h1 id="hero-heading">...</h1>
  </section>
</main>
<footer>...</footer>
```

当存在 semantic element 时，不要堆叠通用的 wrapper `div`。

## 命名

- 组件：PascalCase（`ScrollySection`、`SurfaceCard`）
- Hooks：`use` 前缀（`useReducedMotion`）
- CSS 类：kebab-case 或 utility class
- 动画时间线：体现意图的 camelCase（`heroRevealTl`）
