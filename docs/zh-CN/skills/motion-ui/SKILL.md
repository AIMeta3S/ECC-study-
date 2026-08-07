---
name: motion-ui
description: "面向 React/Next.js 的生产级 UI 动效系统。当实现动画、过渡或动效模式时使用。"
metadata:
  origin: ECC
---

# 动效系统 v4.2

面向 React / Next.js 的生产级 UI 动效系统。

聚焦于**性能、无障碍性与可用性**——而非装饰。

## 何时使用

在以下情况使用本动效系统：动效用于

* 引导注意力（例如新手引导、关键操作）
* 传达状态（加载中、成功、错误、过渡）
* 保持空间连续性（布局变化、导航）

### 适用场景

* 交互组件（按钮、模态框、菜单）
* 状态过渡（加载中 → 已加载、打开 → 关闭）
* 导航与布局连续性（共享元素、crossfade）

### 注意事项

* **无障碍性**：始终支持 reduced motion
* **设备适配**：针对低端设备进行调整
* **性能权衡**：优先保证响应性而非视觉流畅度

### 应避免使用动效的情况

* 纯装饰性动效
* 降低可用性或清晰度
* 对性能产生负面影响

---

## 工作原理

### 核心原则

动效必须：

* 引导注意力
* 传达状态
* 保持空间连续性

如果一项都不满足 → 移除它。

---

### 安装

```bash
npm install motion
```

---

### 版本

* `motion/react` - 当前 Motion for React 项目的默认导入（包名：`motion`）
* `framer-motion` - 仍依赖 Framer Motion 的项目的旧版导入路径

**不要混用。** 混用会导致内部调度器冲突并破坏 `AnimatePresence` 上下文——来自一个包的组件无法与来自另一个包的组件协调退出动画。

检查你的项目使用的是哪个版本：

```bash
cat package.json | grep -E '"motion"|"framer-motion"'
```

始终从单一来源一致地导入：

```ts
// 正确（现代）
import { motion, AnimatePresence } from "motion/react"

// 正确（旧版）
import { motion, AnimatePresence } from "framer-motion"

// 永远不要在同一项目中混用两者
```

---

### Motion Tokens

```ts
// motionTokens.ts
export const motionTokens = {
  duration: {
    fast: 0.18,
    normal: 0.35,
    slow: 0.6
  },
  // 将这些用作 `transition` 对象中的 `ease` 值：
  // transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
  easing: {
    smooth: [0.22, 1, 0.36, 1] as [number, number, number, number],
    sharp:  [0.4,  0, 0.2, 1] as [number, number, number, number]
  },
  distance: {
    sm: 8,
    md: 16,
    lg: 24
  }
}
```

使用示例：

```tsx
import { motionTokens } from "@/lib/motionTokens"

<motion.div
  initial={{ opacity: 0, y: motionTokens.distance.md }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    duration: motionTokens.duration.normal,
    ease: motionTokens.easing.smooth
  }}
/>
```

---

### 性能规则

**安全**

* transform
* opacity

**避免**

* width / height
* top / left

规则：响应性 > 流畅度

---

### 设备适配

该启发式方法结合了 CPU 核心数**和**可用内存以获得更可靠的信号。`deviceMemory` 在 Chrome/Android 上可用；fallback 覆盖 Safari 和 Firefox。

```ts
const isLowEnd =
  typeof navigator !== "undefined" && (
    // 低内存（仅 Chrome/Android；其他环境为 undefined → 视为性能充足）
    (navigator.deviceMemory !== undefined && navigator.deviceMemory <= 2) ||
    // 核心数少且无内存 API（覆盖 Safari/Firefox 在弱硬件上的情况）
    (navigator.deviceMemory === undefined && navigator.hardwareConcurrency <= 4)
  )

const duration = isLowEnd ? 0.2 : 0.4
```

---

### 无障碍性

#### JS（useReducedMotion）

```tsx
import { motion, useReducedMotion } from "motion/react"

export function FadeIn() {
  const reduce = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 24 }}
      animate={{ opacity: 1, y: 0 }}
    />
  )
}
```

#### CSS

```css
@media (prefers-reduced-motion: reduce) {
  .motion-safe-transition {
    transition: opacity 0.2s;
  }

  .motion-reduce-transform {
    transform: none !important;
  }
}
```

#### Tailwind

```html
<div class="motion-safe:animate-fade motion-reduce:opacity-100"></div>
```

---

### 架构与模式

#### 核心模式

| 场景 | 模式 |
|---|---|
| 悬停反馈 | `whileHover` |
| 点击 / 按压反馈 | `whileTap` |
| 滚动时显现 | `whileInView` |
| 滚动联动值 | `useScroll` + `useTransform` |
| 条件性挂载/卸载 | `AnimatePresence` |
| 小幅布局位移（单个元素，< ~300px 变化） | `layout` prop |
| 大幅布局位移或整页 reflow | 避免 `layout`；改用 CSS transitions 或页面级路由 |
| 复杂的命令式序列 | `useAnimate` |

> **为什么在大容器上要避免使用 `layout`？** Framer 的 layout 动画使用 `transform` 来协调位置，但在跨整视口或触发深层 reflow 的元素上，测量开销会导致可见的卡顿和 CLS。优先使用 CSS Grid/Flexbox transitions，或仅在特定子元素上配合 `layoutId` 使用。

#### 布局与过渡

* 共享元素过渡 → `layoutId`（每个已挂载实例必须唯一）
* 进入 / 退出过渡 → `AnimatePresence`（参见下文的 `mode` 指引）

#### AnimatePresence `mode`

始终显式指定 `mode`——默认值（`"sync"`）会同时执行进入和退出动画，这在大多数 UI 模式中会导致视觉重叠。

| `mode` | 适用时机 |
|---|---|
| `"wait"` | 退出完成后才开始进入。用于**模态框、toast、页面过渡**。 |
| `"sync"`（默认） | 进入和退出重叠。仅当重叠是有意为之的时候使用（例如 crossfade 轮播）。 |
| `"popLayout"` | 退出的元素立即从文档流中弹出；剩余项动画填充空隙。用于**列表、标签页、可关闭的卡片**。 |

```tsx
// 模态框——始终使用 "wait"
<AnimatePresence mode="wait">
  {open && <Modal key="modal" />}
</AnimatePresence>

// 可关闭的列表项——使用 "popLayout"
<AnimatePresence mode="popLayout">
  {items.map(item => <Card key={item.id} />)}
</AnimatePresence>
```

---

### 高级模式（概念）

* 视差（滚动联动 transform）
* 滚动叙事（sticky 区段）
* 3D 倾斜（基于指针的 transform）
* Crossfade（共享 `layoutId`）
* 渐进显现（clip-path）
* 骨架屏加载（循环 opacity）
* 微交互（hover/tap 反馈）
* 弹簧系统（基于物理的动效）

---

### 模态框要素

* 焦点陷阱
* Escape 关闭
* 滚动锁定
* ARIA roles
* 使用 `AnimatePresence mode="wait"`，确保退出动画完成后下一个模态框才进入

#### 完整示例

```tsx
import React, { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "motion/react"

function useFocusTrap(ref: React.RefObject<HTMLDivElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return
    const el = ref.current
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]

    function handleKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }

    el.addEventListener("keydown", handleKey)
    first?.focus()
    return () => el.removeEventListener("keydown", handleKey)
  }, [active, ref])
}

function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [active])
}

function Modal({ open, closeModal }: { open: boolean; closeModal: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useFocusTrap(ref, open)
  useScrollLock(open)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal()
    }
    if (open) window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, closeModal])

  return (
    // mode="wait" 确保退出动画完成后任何新模态框才进入
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 flex items-center justify-center bg-black/40"
        >
          <motion.div
            ref={ref}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1,    opacity: 1 }}
            exit={{    scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white p-6 rounded"
          >
            <h2 id="modal-title">Dialog Title</h2>
            <button onClick={closeModal}>Close</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Example() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Modal open={open} closeModal={() => setOpen(false)} />
    </>
  )
}
```

---

### SSR 安全性

* 服务端和客户端渲染的初始状态需保持一致
* 避免隐式的动画起点（始终显式设置 `initial`）
* 在 Next.js App Router 中，将 motion 组件包裹在 `"use client"` 中

---

### 调试

检查：

* 导入错误（混用了 `motion/react` 和 `framer-motion`）
* Next.js App Router 中缺失 `"use client"` 指令
* `AnimatePresence` 子元素缺失 `key` prop
* Hydration 不匹配（SSR 与客户端的初始状态不一致）
* 在大容器上误用 `layout` prop 导致 reflow 卡顿
* 基于状态的动画未触发（检查依赖数组）

---

### QA

* 无 CLS
* 键盘可用
* 模态框中焦点已被陷阱捕获
* ARIA roles 正确（`role="dialog"`、`aria-modal="true"`）
* 尊重 reduced motion 偏好（`useReducedMotion` + CSS media query）
* Next.js 中无 hydration 警告
* 卸载时动画干净停止（无内存泄漏）
* 所有使用点都显式设置了 `AnimatePresence mode`

---

### 反模式

* 对布局属性（`width`、`height`、`top`、`left`）做动画
* 无目的的无限循环动画（始终自问：这传达了什么状态？）
* 列表过度 stagger（`staggerChildren` 保持 ≤ 0.1s；超过会感觉迟钝）
* 忽略 reduced motion 偏好
* 在大型或全视口容器上使用 `layout`
* 在 `AnimatePresence` 上省略 `mode`（默认 `"sync"` 会导致视觉重叠）
* 纯为装饰而使用动效

---

### 设计哲学

动效即交互设计。

---

### 最终规则

> 如果动效不能改善 UX → 移除它。

---

## 示例

### 按钮交互

```tsx
import { motion } from "motion/react"

export function Button() {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
    >
      Click me
    </motion.button>
  )
}
```

---

### Reduced Motion 示例

```tsx
import { motion, useReducedMotion } from "motion/react"

export function FadeIn() {
  const reduce = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.1 : 0.35, ease: [0.22, 1, 0.36, 1] }}
    />
  )
}
```

---

### Stagger 列表

```tsx
import { motion } from "motion/react"

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 } // 保持 ≤ 0.1s 以避免迟钝
  }
}

const item = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
}

export function List() {
  return (
    <motion.ul variants={container} initial="hidden" animate="visible">
      {[1, 2, 3].map(i => (
        <motion.li key={i} variants={item}>Item {i}</motion.li>
      ))}
    </motion.ul>
  )
}
```

---

### 带 AnimatePresence 的模态框

```tsx
import { motion, AnimatePresence } from "motion/react"

export function Modal({ open }: { open: boolean }) {
  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1    }}
          exit={{    opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
    </AnimatePresence>
  )
}
```

---

### 滚动视差

```tsx
import { useScroll, useTransform, motion } from "motion/react"

export function Parallax() {
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -80])

  return <motion.div style={{ y }} />
}
```

---

### 骨架屏加载

```tsx
import { motion } from "motion/react"

export function Skeleton() {
  return (
    <motion.div
      className="bg-gray-200 h-6 w-full rounded"
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{
        duration: 1.5,       // 舒适的脉冲——原先缺失，导致快速闪烁
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  )
}
```

---

### 共享布局（Crossfade）

```tsx
import { motion } from "motion/react"

// layoutId 在每个已挂载实例上必须唯一。
// 如果可能同时存在多个实例，追加唯一的 id：
// layoutId={`shared-${item.id}`}
export function Shared() {
  return <motion.div layoutId="shared" />
}
```
