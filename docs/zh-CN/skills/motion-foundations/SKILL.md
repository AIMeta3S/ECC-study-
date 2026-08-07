---
name: motion-foundations
description: 为使用 motion/react 的 React / Next.js 提供 motion tokens、spring 预设、性能规则、设备适配、无障碍强制约束与 SSR 安全。基础层 — 所有其他 motion skill 均依赖此层。
version: 1.0
tags: [motion, animation, performance, accessibility]
category: frontend
author: jeff
---

# Motion 基础

motion 系统的基础层。定义了供下游 skill（`motion-patterns`、`motion-advanced`）继承的所有取值、约束与规则。在任何动画工作开始之前，先加载此 skill。

## 何时激活

- 从零开始构建任何带动画的组件
- 设置 tokens、spring 预设或 easing 取值
- 实现 `prefers-reduced-motion` 支持
- 调试由动画 initial 状态引发的 hydration 不匹配
- 评估某段动画是否真的应该存在

## 输出

此 skill 产出：

- 一个共享的 `motionTokens` 对象（duration、easing、distance、scale）
- 一个共享的 `springs` 预设映射（5 个命名配置）
- 一个被所有组件使用的 `shouldAnimate()` 门控
- 通过 `useReducedMotion` 实现的、符合无障碍要求的动画默认值
- SSR 安全的 initial 状态，零 hydration 警告

## 原则

Motion 必须至少满足以下一项，否则必须移除：

- 引导注意力
- 传达状态
- 保持空间连续性

响应性始终优先于流畅性。一段导致输入延迟的 60 fps 动画，比没有动画更糟糕。

## 规则

这些规则没有商量余地，适用于系统中的每一个组件。

1. **只使用 `motion/react`。** 永远不要从 `framer-motion` 导入。永远不要在同一棵组件树中混用两者。
2. **`initial` 必须与服务端输出一致。** 如果服务端渲染 `opacity: 1`，`initial` prop 也必须是 `opacity: 1`。没有例外。
3. **Reduced motion 优先于一切。** 当 `useReducedMotion()` 返回 `true` 或 `prefersReduced` 为 `true` 时，所有 transform 都被禁用。仅涉及 opacity 的淡入淡出且时长 ≤ 0.2s，是唯一允许的兜底方案。
4. **永远不要为布局属性添加动画。** `width`、`height`、`top`、`left`、`margin`、`padding` 禁止出现在 `animate` 中。只使用 `transform` 和 `opacity`。
5. **所有 token 取值来自 `motionTokens`。** 禁止在组件文件中硬编码 duration 和 easing。
6. **所有 spring 配置来自 `springs` 映射。** 禁止内联 `stiffness`/`damping` 取值。
7. **`"use client"` 是必需的** — 每个从 `motion/react` 导入的文件都必须包含它。
8. **永远不要在模块层级读取 `window` 或 `navigator`。** 始终用 `typeof window !== "undefined"` 做保护。

## 决策指引

### 选择 duration

| Token | 使用场景 |
| --------- | -------------------------------------------- |
| `instant` | 提示框显示/隐藏、焦点环、徽标更新 |
| `fast` | 按钮反馈、图标切换、chip 切换 |
| `normal` | 模态框打开、卡片展开、页面元素入场 |
| `slow` | Hero 入场、整页 transition |
| `crawl` | 刻意的叙事性展示；谨慎使用 |

### 选择 spring

| Preset | 使用场景 |
| --------- | ------------------------------------------ |
| `snappy` | 默认 UI — 按钮、chip、导航项 |
| `gentle` | 卡片、模态框、面板柔和落地 |
| `bouncy` | 活泼时刻 — 空状态、新手引导 |
| `instant` | 提示框、弹出层、下拉菜单 |
| `release` | 拖拽释放 — 自然的物理手感 |

### 何时完全禁用动画

在以下情况禁用（让 `shouldAnimate()` 返回 `false`）：

- `prefersReduced` 为 `true`
- `isLowEnd` 为 `true` 且动画非必需
- 元素在屏幕外且永远不会进入视口
- 动画纯粹是装饰性的，没有任何 UX 目的

## 核心概念

### Token 系统

```ts
// lib/motion-tokens.ts
export const motionTokens = {
  duration: {
    instant: 0.08,
    fast:    0.18,
    normal:  0.35,
    slow:    0.6,
    crawl:   1.0,
  },
  easing: {
    smooth: [0.22, 1, 0.36, 1],
    sharp:  [0.4, 0, 0.2, 1],
    bounce: [0.34, 1.56, 0.64, 1],
    linear: [0, 0, 1, 1],
  },
  distance: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 48,
  },
  scale: {
    subtle: 0.98,
    press:  0.95,
    pop:    1.04,
  },
}

export const springs = {
  snappy:  { type: "spring", stiffness: 300, damping: 30 },
  gentle:  { type: "spring", stiffness: 120, damping: 14 },
  bouncy:  { type: "spring", stiffness: 400, damping: 10 },
  instant: { type: "spring", stiffness: 600, damping: 35 },
  release: { type: "spring", stiffness: 200, damping: 20, restDelta: 0.001 },
}
```

### 运行时 flag

```ts
// lib/motion-config.ts
export const motionConfig = {
  isLowEnd() {
    return (
      typeof navigator !== "undefined" &&
      navigator.hardwareConcurrency <= 4
    )
  },

  prefersReduced() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
  },

  shouldAnimate({ essential = false } = {}) {
    if (this.prefersReduced()) return false
    if (!essential && this.isLowEnd()) return false
    return true
  },

  duration() {
    return this.isLowEnd() || this.prefersReduced()
      ? motionTokens.duration.instant
      : motionTokens.duration.normal
  },
}
```

### 无障碍

**优先级顺序（从高到低）：**

1. `prefers-reduced-motion: reduce` — 禁用所有 transform，将 opacity transition 限制在 ≤ 0.2s
2. 低端设备检测 — 缩短 duration、移除非必需的动画
3. 设计偏好 — 其他一切

Motion 必须优雅降级。绝不能以导致 layout shift 或让人迷失方向的方式突然消失。

```tsx
// hooks/use-reduced-motion.tsx
"use client"
import { useReducedMotion } from "motion/react"

export function useSafeMotion(fullY: number = 16) {
  const reduce = useReducedMotion()
  return {
    initial: { opacity: 0, y: reduce ? 0 : fullY },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: reduce ? 0 : -fullY },
  }
}
```

```css
/* globals.css */
@media (prefers-reduced-motion: reduce) {
  .motion-safe-transition  { transition: opacity 0.15s; }
  .motion-reduce-transform { transform: none !important; }
}
```

```html
<!-- Tailwind -->
<div class="motion-safe:animate-fade motion-reduce:opacity-100"></div>
```

### SSR / hydration 安全

**规则：`initial` 必须始终与服务端渲染的内容一致。**

```tsx
// 错误 — 服务端渲染 opacity:1 但 initial 为 0 → hydration 不匹配
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} />

// 正确 — 使用 AnimatePresence 或推迟到客户端挂载
"use client"
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])

<motion.div
  initial={{ opacity: mounted ? 0 : 1 }}
  animate={{ opacity: 1 }}
/>
```

## 代码示例

### 端到端：tokens + springs + 无障碍 + SSR 守卫

```tsx
// components/fade-in-card.tsx
"use client"

import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { motionTokens, springs } from "@/lib/motion-tokens"
import { useSafeMotion } from "@/hooks/use-reduced-motion"
import { motionConfig } from "@/lib/motion-config"

interface FadeInCardProps {
  children: React.ReactNode
  delay?: number
}

export function FadeInCard({ children, delay = 0 }: FadeInCardProps) {
  // SSR 守卫 — initial 必须与服务端输出一致 (opacity: 1)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // 无障碍 — 当启用 reduced motion 时禁用 transform
  const safeMotion = useSafeMotion(motionTokens.distance.md)

  // 设备门控 — 在低端硬件上跳过动画
  if (!motionConfig.shouldAnimate() || !mounted) {
    return <div>{children}</div>
  }

  return (
    <motion.div
      initial={safeMotion.initial}
      animate={safeMotion.animate}
      exit={safeMotion.exit}
      transition={{
        ...springs.gentle,
        delay,
      }}
      whileHover={{ scale: motionTokens.scale.pop }}
      whileTap={{ scale: motionTokens.scale.press }}
    >
      {children}
    </motion.div>
  )
}
```

## 约束 / 非目标

此 skill **不**涵盖：

- UI 组件模式（按钮、模态框、stagger）→ 见 `motion-patterns`
- 拖拽、手势、SVG、文本动画、自定义 hooks → 见 `motion-advanced`
- 没有 `motion/react` 的纯 CSS 动画或 Tailwind `animate-*` class
- 第三方动画库（GSAP、anime.js 等）
- Motion 设计决策（何时动画、强调什么）— 这是设计关注点，不是代码约束

## Anti-Patterns

| Anti-pattern | 违反规则 | 修复方式 |
| --------------------------------------- | ------- | ------------------------------- |
| `import { motion } from "framer-motion"` | 规则 1 | 使用 `motion/react` |
| 在 SSR 组件上使用 `initial={{ opacity: 0 }}` | 规则 2 | 添加挂载守卫 |
| 跳过 `useReducedMotion` 检查 | 规则 3 | 使用 `useSafeMotion` hook |
| `animate={{ width: "100%" }}` | 规则 4 | 改用 `scaleX` transform |
| 内联 `transition={{ duration: 0.4 }}` | 规则 5 | 使用 `motionTokens.duration.normal` |
| 内联 `{ stiffness: 300, damping: 30 }` | 规则 6 | 使用 `springs.snappy` |
| 缺少 `"use client"` 指令 | 规则 7 | 添加到文件顶部 |
| 在模块层级使用 `navigator.hardwareConcurrency` | 规则 8 | 用 `typeof navigator !== "undefined"` 包裹 |

## 相关 skill

- **`motion-patterns`** — 消费此处定义的 tokens 与 springs 来构建按钮、模态框、stagger、页面 transition 和滚动模式。不重新定义任何取值。
- **`motion-advanced`** — 消费此处定义的 tokens 与 springs 来构建拖拽、SVG、文本和手势模式。在此基础之上增加 `useAnimate` 序列与自定义 hooks。
