---
name: motion-patterns
description: 面向 React / Next.js 的生产级动画模式 —— 涵盖 button、modal、toast、stagger、page transitions、exit animations、scroll 与 layout，基于 motion-foundations tokens 与 springs 构建。
version: 1.0
tags: [motion, animation, ui-patterns]
category: frontend
author: jeff
---

# Motion Patterns

针对最常见的 UI 动画需求提供的可直接复制粘贴的模式。
此处的每个模式都构建于 `motion-foundations` tokens 与 springs 之上。
不要在此定义新的 duration 或 easing 值 —— 通过 import 引入它们。

## 何时启用

- 为 button、card、modal 或 toast notification 添加动画
- 构建带 stagger 效果的列表入场
- 在 Next.js App Router 中设置 page transitions
- 为条件渲染内容添加入场或退场动画
- 实现 scroll-reveal、scroll-linked 进度条或 sticky story 区段
- 构建可展开的 cards、accordions 或 shared-element transitions

## 产出

本 skill 产出：

- 面向所有标准 UI 组件的无障碍、SSR-safe 动画
- 用 `AnimatePresence` 包裹、具备正确退场行为的条件渲染
- 面向 Next.js App Router 的 page transition 包装组件
- 使用 `useScroll` + `useTransform` 的 scroll-reveal 与 scroll-linked 模式
- 用于元素展开与 crossfade 的 layout 动画模式（`layout`、`layoutId`）

## 原则

- 每个模式都从 `motion-foundations` import。不使用裸数字。
- 每个条件渲染都用带 `key` 的 `AnimatePresence` 包裹。
- exit 动画始终与 enter 动画一起定义 —— 绝不事后补齐。
- `layout` 仅用于小幅、局部位移。大型子树使用显式 transforms。

## 规则

1. **始终用带 `key` 的 `AnimatePresence` 包裹条件渲染**，key 设置在直接子元素上。缺少 key，退场动画永远不会触发。
2. **在定义 `initial` + `animate` 时始终同时定义 `exit`。** 没有退场的动画是不完整的。
3. **page transitions 上使用 `mode="wait"`。** 退场必须完成后入场才能开始。
4. **严禁对子树中子元素超过约 5 个或 DOM 深度嵌套的场景使用 `layout`。** 改用显式的 `x`/`y` transforms。
5. **stagger 间隔必须保持在 `0.05s` 到 `0.10s` 之间。** 低于此范围显得机械；高于此范围显得迟钝。
6. **Modal 必须始终包含：** focus trap、Escape-key close、scroll lock、`role="dialog"`、`aria-modal="true"`。
7. **scroll reveals 使用 `viewport={{ once: true }}`。** 滚出时重复触发会分散注意力，而非提供信息。
8. **所有 token 值都从 `motion-foundations` import。** 不使用内联数字。

## 决策指引

### 选择正确的模式

| 情形 | 模式 |
| ---------------------------------------- | ---------------------- |
| 元素出现 / 消失             | `AnimatePresence`      |
| 一组项目依次加载        | Stagger variants       |
| 在路由之间导航                | Page transition wrapper|
| 元素原地改变尺寸            | `layout` prop          |
| 同一元素在不同页面上下文间移动  | `layoutId`             |
| 元素滚动进入视口时入场   | `whileInView`          |
| 数值与滚动位置绑定            | `useScroll` + `useTransform` |

### 何时使用 `mode="wait"` 与 `mode="sync"`

| 模式 | 适用场景 |
| ------- | --------------------------------------- |
| `wait` | Page transitions、内容切换（一次一个） |
| `sync` | 堆叠的 notifications、列表项（可重叠） |
| `popLayout` | 从可重排列表中移除的项目 |

## 核心概念

### AnimatePresence 契约

三件事必须始终成立：

1. `AnimatePresence` 包裹条件渲染
2. 直接子元素拥有 `key`
3. 子元素拥有 `exit` prop

遗漏其中任何一项，退场动画都会静默失败。

### layout 与 layoutId

- `layout` —— 在原位对元素自身尺寸/位置的变化做动画
- `layoutId` —— 链接两个独立元素，在多次 render 之间对它们做 crossfade

在可展开容器内部对文本使用 `layout="position"`，可防止文本重排被动画化。

## 代码示例

### Button feedback

```tsx
"use client"
import { motion } from "motion/react"
import { springs, motionTokens } from "@/lib/motion-tokens"

<motion.button
  whileHover={{ scale: motionTokens.scale.pop }}
  whileTap={{ scale: motionTokens.scale.press }}
  transition={springs.snappy}
/>
```

### Stagger list

```tsx
"use client"
import { motion } from "motion/react"
import { motionTokens, springs } from "@/lib/motion-tokens"

const container = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,   // 处于 0.05–0.10 规则范围内
      delayChildren: 0.1,
    },
  },
}

const item = {
  hidden:  { opacity: 0, y: motionTokens.distance.md },
  visible: { opacity: 1, y: 0, transition: springs.gentle },
}

<motion.ul variants={container} initial="hidden" animate="visible">
  {items.map((i) => (
    <motion.li key={i.id} variants={item} />
  ))}
</motion.ul>
```

### Modal

```tsx
"use client"
import { motion, AnimatePresence } from "motion/react"
import { motionTokens, springs } from "@/lib/motion-tokens"

// 在调用处包裹：
// <AnimatePresence>{isOpen && <Modal key="modal" />}</AnimatePresence>

export function Modal({ onClose }: { onClose: () => void }) {
  return (
    <>
      {/* Overlay */}
      <motion.div
        className="fixed inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel —— 无障碍要求：focus trap、Escape close、
          scroll lock、role="dialog"、aria-modal="true" */}
      <motion.div
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 rounded-xl bg-white p-6"
        initial={{
          opacity: 0,
          scale: motionTokens.scale.press,
          y: motionTokens.distance.sm,
        }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{
          opacity: 0,
          scale: motionTokens.scale.press,
          y: motionTokens.distance.sm,
        }}
        transition={springs.gentle}
      />
    </>
  )
}
```

### Toast stack

```tsx
"use client"
import { motion, AnimatePresence } from "motion/react"
import { motionTokens, springs } from "@/lib/motion-tokens"

<AnimatePresence mode="sync">
  {toasts.map((t) => (
    <motion.div
      key={t.id}
      layout
      initial={{
        opacity: 0,
        x: motionTokens.distance.xl,
        scale: motionTokens.scale.subtle,
      }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{
        opacity: 0,
        x: motionTokens.distance.xl,
        scale: motionTokens.scale.subtle,
      }}
      transition={springs.snappy}
    />
  ))}
</AnimatePresence>
```

### Page transition（Next.js App Router）

```tsx
// components/page-transition.tsx
"use client"
import { motion, AnimatePresence } from "motion/react"
import { usePathname } from "next/navigation"
import { motionTokens } from "@/lib/motion-tokens"

const variants = {
  initial: { opacity: 0, y: motionTokens.distance.sm },
  enter:   { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -motionTokens.distance.sm },
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="enter"
        exit="exit"
        transition={{
          duration: motionTokens.duration.normal,
          ease: motionTokens.easing.smooth,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

### Scroll reveal

```tsx
"use client"
import { motion } from "motion/react"
import { motionTokens, springs } from "@/lib/motion-tokens"

<motion.div
  initial={{ opacity: 0, y: motionTokens.distance.lg }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-80px" }}   // once: true —— 规则 7
  transition={{ duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth }}
/>
```

### Scroll progress bar

```tsx
"use client"
import { motion, useScroll } from "motion/react"

export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  return (
    <motion.div
      className="fixed top-0 left-0 h-1 bg-indigo-500 origin-left w-full"
      style={{ scaleX: scrollYProgress }}
    />
  )
}
```

### Expanding card

```tsx
"use client"
import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { springs, motionTokens } from "@/lib/motion-tokens"

export function ExpandingCard({ title, body }: { title: string; body: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div layout onClick={() => setExpanded(!expanded)} className="cursor-pointer">
      {/* layout="position" 防止文本重排被动画化 */}
      <motion.h2 layout="position" className="font-semibold">
        {title}
      </motion.h2>

      <AnimatePresence>
        {expanded && (
          <motion.p
            key="body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.duration.fast }}
          >
            {body}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
```

### Shared-element crossfade

```tsx
// 源 context
<motion.img layoutId="hero-image" src={src} className="w-16 h-16 rounded" />

// 目标 context（相同 layoutId —— motion 负责处理过渡）
<motion.img layoutId="hero-image" src={src} className="w-full rounded-xl" />
```

### Accordion

```tsx
<motion.div
  initial={false}
  animate={{ opacity: open ? 1 : 0, scaleY: open ? 1 : 0 }}
  style={{ transformOrigin: "top", overflow: "hidden" }}
  transition={{
    duration: motionTokens.duration.normal,
    ease: motionTokens.easing.smooth,
  }}
> {children}
</motion.div>
```

## 端到端示例

一个在挂载时入场、处理条件渲染存在性、并尊重 reduced motion 的 staggered list —— 综合了 tokens、springs、AnimatePresence 以及来自 `motion-foundations` 的无障碍 hook：

```tsx
"use client"
import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { motionTokens, springs } from "@/lib/motion-tokens"
import { useSafeMotion } from "@/hooks/use-reduced-motion"

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

function ListItem({ label, onRemove }: { label: string; onRemove: () => void }) {
  const safe = useSafeMotion(motionTokens.distance.sm)
  return (
    <motion.li
      variants={{
        hidden:  safe.initial,
        visible: safe.animate,
      }}
      exit={safe.exit}
      transition={springs.gentle}
      className="flex items-center justify-between p-3 rounded-lg bg-white shadow-sm"
    >
      <span>{label}</span>
      <button onClick={onRemove}>Remove</button>
    </motion.li>
  )
}

export function AnimatedList({ items, onRemove }: {
  items: { id: string; label: string }[]
  onRemove: (id: string) => void
}) {
  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-2"
    >
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <ListItem
            key={item.id}
            label={item.label}
            onRemove={() => onRemove(item.id)}
          />
        ))}
      </AnimatePresence>
    </motion.ul>
  )
}
```

## 约束 / 非目标

本 skill **不**涵盖：

- Token 与 spring 定义 → 参见 `motion-foundations`
- Drag 交互、swipe 手势、可重排列表 → 参见 `motion-advanced`
- 文本动画（word/character reveal、counters） → 参见 `motion-advanced`
- SVG path drawing 或 morphing → 参见 `motion-advanced`
- 自定义动画 hooks → 参见 `motion-advanced`
- 不使用 `motion/react` 的纯 CSS transitions

## Anti-Patterns

| Anti-pattern | 违反的规则 | 修复方式 |
| -------------------------------------------- | ------- | ------------------------------------------ |
| `AnimatePresence` 子元素缺少 `key` | 规则 1 | 为直接子元素添加稳定的 `key` |
| 只有 `initial` + `animate` 而无 `exit` | 规则 2 | 始终将三者一起定义 |
| page transition 未设置 `mode="wait"` | 规则 3 | 为 `AnimatePresence` 添加 `mode="wait"` |
| 50 项列表上使用 `layout` | 规则 4 | 改用 `mode="popLayout"` 或显式 transforms |
| 10 项列表上使用 `staggerChildren: 0.2` | 规则 5 | 上限锁定在 `0.08–0.10` |
| Modal 缺少 focus trap | 规则 6 | 添加 `focus-trap-react` 或 Radix Dialog |
| `whileInView` 未设置 `viewport={{ once: true }}` | 规则 7 | 重复入场分散注意力，而非提供信息 |
| `transition={{ duration: 0.3 }}` 内联 | 规则 8 | 改用 `motionTokens.duration.normal` |

## 相关 Skills

- **`motion-foundations`** —— 定义本 skill 中每个模式都会 import 的所有 tokens、springs、`useSafeMotion` hook 以及 SSR guards。必须先完成设置。
- **`motion-advanced`** —— 通过 drag、gestures、SVG、text、custom hooks 与命令式时序扩展这些模式。不重新定义本 skill 中的任何模式。
