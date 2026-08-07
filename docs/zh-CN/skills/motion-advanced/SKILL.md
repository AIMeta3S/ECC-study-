---
name: motion-advanced
description: React / Next.js 的高级 motion 模式——drag & drop、手势、文本动画、SVG 路径绘制、自定义 hook、命令式序列（useAnimate）、加载器，以及完整的 API 决策树。需要 motion-foundations。
version: 1.0
tags: [motion, animation, advanced, gestures, svg]
category: frontend
author: jeff
---

# Motion Advanced

复杂的、交互式的、基于物理的动画模式。
需要先配置 `motion-foundations`。
当 `motion-patterns` 不够用时使用这些模式。

## 何时激活

- 构建拖动关闭式 sheet、滑动手势或可重排列表
- 逐词、逐字符地为文本添加动画，或实现实时计数器
- 绘制 SVG 路径、变形图标或为圆形进度条添加动画
- 编写自定义动画 hook（`useScrollReveal`、磁性按钮、光标跟随器）
- 用 `useAnimate` 命令式地编排多步动画序列
- 构建 spinner、shimmer 骨架屏、脉冲指示器或按钮加载状态

## 输出

本 skill 产出：

- 拖拽交互：可拖拽卡片、拖动关闭式 sheet、`Reorder.Group` 列表
- 手势 hook：滑动检测、长按、捏合轮廓
- 文本动画组件：逐词显现、逐字符打字机、数字计数器
- SVG 动画：路径绘制显现、图标变形、描边进度环
- 自定义 hook：`useScrollReveal`、`useHoverScale`、`useNavigationDirection`、`useInViewOnce`
- 通过 `useAnimate` 实现的命令式序列，配合中断安全的 `async/await`
- 加载器组件：spinner、shimmer、脉冲点、进度条、按钮加载状态

## 原则

- 基于物理的 motion（`useSpring`、`springs.*`）在直接操作场景下总是比基于时长的更自然。
- `useMotionValue` + `useTransform` 计算派生值而不会触发 re-render。
- `useAnimate` 序列是命令式的且中断安全——在动画进行中调用 `animate()` 会自动取消前一个动画。
- Motion value（`useMotionValue`、`useSpring`）是 SSR 安全的，不会导致 hydration 错误。

## 规则

1. **拖拽交互必须在触摸设备上测试**，而不仅仅是鼠标。`drag` prop 在两者上都能工作，但手感和阈值不同。
2. **无限动画必须在 `document.visibilityState === "hidden"` 时暂停。** 后台标签页不得消耗 GPU/CPU。
3. **滑动阈值必须明确。** 切勿仅凭速度推断意图；结合 `offset` + `velocity` 检查。
4. **`useAnimate` 的 scope ref 必须附加到已挂载的 DOM 元素上。** 在挂载前调用 `animate()` 会静默抛出异常。
5. **Motion value 不得在 render 中重新创建。** 在组件体内使用 `useMotionValue(0)` 是正确的；在 render 中使用 `new MotionValue(0)` 是错误的。
6. **所有 token 值都从 `motion-foundations` 导入。** 不得使用内联数字。
7. **自定义 hook 必须处理清理。** 每个 `window.addEventListener` 都需要在 `useEffect` 的返回值中有匹配的 `removeEventListener`。
8. **SVG 变形要求路径命令数量相等。** 命令结构不同的路径会 snap 而不是平滑插值。

## 决策指引

### 选择正确的高级 API

| 场景 | API |
| ------------------------------ | -------------------------------- |
| 释放时带物理效果的拖拽 | `drag` + `dragTransition: springs.release` |
| 有序的拖拽重排列表 | `Reorder.Group` + `Reorder.Item` |
| 按拖拽偏移关闭 | `drag="y"` + `onDragEnd` 偏移检查 |
| 左右滑动 | `drag="x"` + `onDragEnd` 偏移检查 |
| 长按 | `useLongPress` hook |
| 随时间平滑的值 | `useSpring` |
| 从另一个值派生 | `useTransform` |
| 多步序列 | `useAnimate` 配合 `async/await` |
| 一次性命令式动画 | 来自 `motion` 的 `animate()` |
| 文本逐词进入 | 在 `inline-block` span 上做 Stagger |
| SVG 绘制显现 | `pathLength` 0 → 1 |
| SVG 变形 | `d` 属性补间（命令数相等） |
| 圆形进度 | `strokeDashoffset` 补间 |

### 何时使用 `useSpring` 对比 spring transition

| | `useSpring` | `transition: springs.*` |
| -------------- | ---------------------------------------- | ----------------------- |
| 用于 | 光标跟随器、指针追踪值 | 离散状态变化 |
| 更新方式 | 连续、每帧更新 | 由状态变化触发 |
| 中断 | 平滑——物理从当前速度接管 | 从当前值重启 |

## 核心概念

### useMotionValue + useTransform

无需 re-render 的响应式计算：

```tsx
const x = useMotionValue(0)
const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0])
// opacity 在 x 变化时每帧更新——无 setState，无 re-render
```

### useAnimate

返回 `[scope, animate]`。scope ref 必须附加到 DOM 元素上。
`animate()` 调用是中断安全的——在执行中调用会取消前一次运行。

```tsx
const [scope, animate] = useAnimate()

async function play() {
  await animate(".step-1", { opacity: 1 }, { duration: 0.3 })
  await animate(".step-2", { x: 0 },       { duration: 0.4 })
        animate(".step-3", { scale: 1 },    { duration: 0.25 })  // 触发后不等待
}

return <div ref={scope}>...</div>
```

## 代码示例

### 可拖拽卡片

```tsx
"use client"
import { motion } from "motion/react"
import { springs, motionTokens } from "@/lib/motion-tokens"

<motion.div
  drag
  dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
  dragElastic={0.1}
  whileDrag={{
    scale: motionTokens.scale.pop,
    boxShadow: "0 16px 40px rgba(0,0,0,0.2)",
  }}
  dragTransition={springs.release}
/>
```

### 拖动关闭式 sheet

```tsx
"use client"
import { motion, useMotionValue, useTransform } from "motion/react"

export function BottomSheet({ onClose }: { onClose: () => void }) {
  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 200], [1, 0])

  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: 0 }}
      style={{ y, opacity }}
      onDragEnd={(_, info) => {
        // 规则 3：结合 offset + velocity
        if (info.offset.y > 120 || info.velocity.y > 500) onClose()
      }}
    />
  )
}
```

### 可重排列表

```tsx
"use client"
import { Reorder } from "motion/react"

export function SortableList() {
  const [items, setItems] = useState(initialItems)
  return (
    <Reorder.Group axis="y" values={items} onReorder={setItems}>
      {items.map((item) => (
        <Reorder.Item key={item.id} value={item}>
          {item.label}
        </Reorder.Item>
      ))}
    </Reorder.Group>
  )
}
```

### 滑动检测

```tsx
"use client"
import { motion } from "motion/react"

const OFFSET_THRESHOLD  = 50
const VELOCITY_THRESHOLD = 300

<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  onDragEnd={(_, info) => {
    const swipedRight = info.offset.x > OFFSET_THRESHOLD  || info.velocity.x > VELOCITY_THRESHOLD
    const swipedLeft  = info.offset.x < -OFFSET_THRESHOLD || info.velocity.x < -VELOCITY_THRESHOLD
    if (swipedRight) onSwipeRight()
    if (swipedLeft)  onSwipeLeft()
  }}
/>
```

### 长按 hook

```tsx
import { useRef } from "react"

export function useLongPress(callback: () => void, ms = 600) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  return {
    onPointerDown:  () => { timerRef.current = setTimeout(callback, ms) },
    onPointerUp:    () => clearTimeout(timerRef.current),
    onPointerLeave: () => clearTimeout(timerRef.current),
  }
}
```

### 逐词显现

```tsx
"use client"
import { motion } from "motion/react"
import { springs } from "@/lib/motion-tokens"

export function AnimatedText({ text }: { text: string }) {
  return (
    <motion.p
      variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      initial="hidden"
      animate="visible"
    >
      {text.split(" ").map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-1"
          variants={{
            hidden:  { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: springs.gentle },
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.p>
  )
}
```

### 数字计数器

```tsx
"use client"
import { useRef, useEffect } from "react"
import { animate } from "motion"
import { motionTokens } from "@/lib/motion-tokens"

export function Counter({ to }: { to: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const controls = animate(0, to, {
      duration: motionTokens.duration.crawl,
      ease: motionTokens.easing.smooth,
      onUpdate: (v) => {
        if (nodeRef.current) nodeRef.current.textContent = Math.round(v).toString()
      },
    })
    return controls.stop   // 规则 7：清理
  }, [to])

  return <span ref={nodeRef} />
}
```

### SVG 路径绘制显现

```tsx
"use client"
import { motion } from "motion/react"
import { motionTokens } from "@/lib/motion-tokens"

<motion.path
  d="M 0 100 Q 50 0 100 100"
  initial={{ pathLength: 0, opacity: 0 }}
  animate={{ pathLength: 1, opacity: 1 }}
  transition={{ duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth }}
/>
```

### 描边进度环

```tsx
"use client"
import { motion } from "motion/react"
import { motionTokens } from "@/lib/motion-tokens"

const CIRCUMFERENCE = 2 * Math.PI * 40   // r=40

export function ProgressRing({ progress }: { progress: number }) {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <motion.circle
        cx="50" cy="50" r="40"
        fill="none" stroke="#6366f1" strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        animate={{ strokeDashoffset: CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE }}
        transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
        style={{ rotate: -90, transformOrigin: "center" }}
      />
    </svg>
  )
}
```

### useScrollReveal hook

```tsx
"use client"
import { useRef } from "react"
import { useScroll, useTransform } from "motion/react"
import { motionTokens } from "@/lib/motion-tokens"

export function useScrollReveal() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1])
  const y       = useTransform(scrollYProgress, [0, 0.3], [motionTokens.distance.lg, 0])
  return { ref, style: { opacity, y } }
}

// 用法
const { ref, style } = useScrollReveal()
<motion.section ref={ref} style={style} />
```

### 光标跟随器

```tsx
"use client"
import { useEffect } from "react"
import { motion, useMotionValue, useSpring } from "motion/react"
import { springs } from "@/lib/motion-tokens"

export function CursorFollower() {
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const sx = useSpring(x, springs.gentle)
  const sy = useSpring(y, springs.gentle)

  useEffect(() => {
    const move = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY) }
    window.addEventListener("mousemove", move)
    return () => window.removeEventListener("mousemove", move)   // 规则 7
  }, [])

  return (
    <motion.div
      className="fixed top-0 left-0 w-6 h-6 rounded-full bg-indigo-500
                 pointer-events-none -translate-x-1/2 -translate-y-1/2 z-50"
      style={{ x: sx, y: sy }}
    />
  )
}
```

### Shimmer 骨架屏

```tsx
"use client"
import { useEffect } from "react"
import { motion, useAnimation } from "motion/react"
import { motionTokens } from "@/lib/motion-tokens"

export function ShimmerSkeleton({ className = "" }: { className?: string }) {
  const controls = useAnimation()

  useEffect(() => {
    const play = () =>
      controls.start({
        x: ["-100%", "100%"],
        transition: {
          repeat: Infinity,
          duration: motionTokens.duration.crawl,
          ease: motionTokens.easing.linear,
        },
      })

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") controls.stop()
      else void play()
    }

    void play()
    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      controls.stop()
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [controls])

  return (
    <div className={`relative overflow-hidden bg-gray-200 rounded ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
        initial={{ x: "-100%" }}
        animate={controls}
      />
    </div>
  )
}
```

### 按钮加载状态

```tsx
"use client"
import { motion, AnimatePresence } from "motion/react"
import { motionTokens, springs } from "@/lib/motion-tokens"

export function LoadingButton({
  loading,
  label,
  onClick,
}: {
  loading: boolean
  label: string
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      animate={{ opacity: loading ? 0.7 : 1 }}
      whileTap={loading ? {} : { scale: motionTokens.scale.press }}
      transition={springs.snappy}
      disabled={loading}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.duration.fast }}
          >
            …
          </motion.span>
        ) : (
          <motion.span
            key="label"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.duration.fast }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
```

### 带可见性暂停的无限动画

```tsx
"use client"
import { useEffect } from "react"
import { motion, useAnimation } from "motion/react"
import { motionTokens } from "@/lib/motion-tokens"

export function PulseDot() {
  const controls = useAnimation()

  useEffect(() => {
    const pulse = () =>
      controls.start({
        scale: [1, 1.4, 1],
        opacity: [1, 0.6, 1],
        transition: { repeat: Infinity, duration: motionTokens.duration.crawl },
      })

    // 规则 2：标签页隐藏时暂停
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") controls.stop()
      else void pulse()
    }

    void pulse()
    document.addEventListener("visibilitychange", handleVisibility)
    // 规则 7：卸载时停止 controls 并移除监听器。
    return () => {
      controls.stop()
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [controls])

  return <motion.span className="w-2 h-2 rounded-full bg-green-400" animate={controls} />
}
```

## 端到端示例

带 shimmer 内容、加载状态和 reduced motion 支持的拖动关闭式 sheet——结合了 `useMotionValue`、`useTransform`、`useSafeMotion`、`AnimatePresence` 以及来自 `motion-foundations` 的 token：

```tsx
"use client"
import { useState } from "react"
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react"
import { springs, motionTokens } from "@/lib/motion-tokens"
import { useSafeMotion } from "@/hooks/use-reduced-motion"
import { ShimmerSkeleton } from "./shimmer-skeleton"

export function DismissibleSheet({
  isOpen,
  onClose,
  loading,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  loading: boolean
  children: React.ReactNode
}) {
  const safe = useSafeMotion(motionTokens.distance.xl)
  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 200], [1, 0])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet——拖动关闭 */}
          <motion.div
            key="sheet"
            className="fixed bottom-0 inset-x-0 rounded-t-2xl bg-white p-6"
            drag="y"
            dragConstraints={{ top: 0 }}
            style={{ y, opacity }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) onClose()
            }}
            initial={safe.initial}
            animate={safe.animate}
            exit={safe.exit}
            transition={springs.gentle}
          >
            {loading ? (
              <div className="space-y-3">
                <ShimmerSkeleton className="h-4 w-3/4" />
                <ShimmerSkeleton className="h-4 w-1/2" />
                <ShimmerSkeleton className="h-20 w-full" />
              </div>
            ) : children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

## 约束 / 非目标

本 skill **不**涵盖：

- Token 和 spring 定义 → 见 `motion-foundations`
- 标准 UI 模式（button、modal、stagger、页面过渡）→ 见 `motion-patterns`
- 不使用 `motion/react` 的纯 CSS 动画或 Tailwind `animate-*`
- 基于 Canvas 或 WebGL 的动画（Three.js、Pixi 等）
- 带外部状态管理器的完整 drag-and-drop 系统（dnd-kit、react-beautiful-dnd）
- 游戏循环或逐帧动画

## 反模式

| 反模式 | 违反规则 | 修复 |
| ---------------------------------------------- | ------- | ------------------------------------------------ |
| `drag` 只在桌面测试 | 规则 1 | 在触摸模拟器和真实设备上测试 |
| `animate={{ repeat: Infinity }}` 无暂停 | 规则 2 | 添加 `visibilitychange` 监听器 |
| `onDragEnd` 只检查 offset 不检查 velocity | 规则 3 | 同时检查 `info.offset` 和 `info.velocity` |
| 在 `useEffect` 之前调用 `animate(scope, ...)` | 规则 4 | 仅在挂载后调用 `animate()` |
| render 中的 `const x = new MotionValue(0)` | 规则 5 | 使用 `const x = useMotionValue(0)` |
| 内联的 `transition={{ duration: 1.2 }}` | 规则 6 | 使用 `motionTokens.duration.crawl` |
| 无清理的 `useEffect` | 规则 7 | 返回 `removeEventListener` / `controls.stop` |
| 命令数不同的路径之间做 SVG 变形 | 规则 8 | 在动画前规范化 path 命令 |

## 相关 skill

- **`motion-foundations`** —— 定义了此处导入的所有 token、spring、`useSafeMotion` 和 SSR 守卫。必须在使用本 skill 前配置好。
- **`motion-patterns`** —— 处理标准 UI 模式（button、modal、stagger、页面过渡、滚动显现）。在求助于此处的高级模式之前先使用它。
