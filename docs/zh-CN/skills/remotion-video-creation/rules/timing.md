---
name: timing
description: Remotion 中的插值曲线 - linear、easing、spring 动画
metadata:
  tags: spring, bounce, easing, interpolation
---

简单的线性插值使用 `interpolate` 函数完成。

```ts title="在 100 帧内从 0 到 1"
import {interpolate} from 'remotion';

const opacity = interpolate(frame, [0, 100], [0, 1]);
```

默认情况下，值不会被钳制（clamp），因此值可能会超出 [0, 1] 的范围。
以下是对值进行钳制的方法：

```ts title="在 100 帧内从 0 到 1（带外推）"
const opacity = interpolate(frame, [0, 100], [0, 1], {
  extrapolateRight: 'clamp',
  extrapolateLeft: 'clamp',
});
```

## Spring 动画

Spring 动画具有更自然的运动效果。
它们会随时间从 0 变化到 1。

```ts title="在 100 帧内从 0 到 1 的 spring 动画"
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';

const frame = useCurrentFrame();
const {fps} = useVideoConfig();

const scale = spring({
  frame,
  fps,
});
```

### 物理属性

默认配置为：`mass: 1, damping: 10, stiffness: 100`。
这会使动画在稳定前产生少许回弹效果。

可以这样覆盖配置：

```ts
const scale = spring({
  frame,
  fps,
  config: {damping: 200},
});
```

实现无回弹自然运动的推荐配置是：`{ damping: 200 }`。

以下是一些常见配置：

```tsx
const smooth = {damping: 200}; // 平滑，无回弹（细微的显隐效果）
const snappy = {damping: 20, stiffness: 200}; // 干脆利落，极少回弹（UI 元素）
const bouncy = {damping: 8}; // 回弹入场（活泼的动画）
const heavy = {damping: 15, stiffness: 80, mass: 2}; // 沉重、缓慢、轻微回弹
```

### 延迟

动画默认立即开始。
使用 `delay` 参数可将动画延迟指定的帧数。

```tsx
const entrance = spring({
  frame: frame - ENTRANCE_DELAY,
  fps,
  delay: 20,
});
```

### 持续时间

`spring()` 具有基于物理属性的自然持续时间。
要将动画拉伸到特定持续时间，请使用 `durationInFrames` 参数。

```tsx
const spring = spring({
  frame,
  fps,
  durationInFrames: 40,
});
```

### 将 spring() 与 interpolate() 结合使用

将 spring 的输出（0-1）映射到自定义范围：

```tsx
const springProgress = spring({
  frame,
  fps,
});

// 映射到旋转角度
const rotation = interpolate(springProgress, [0, 1], [0, 360]);

<div style={{rotate: rotation + 'deg'}} />;
```

### 叠加 spring

spring 仅返回数字，因此可以进行数学运算：

```tsx
const frame = useCurrentFrame();
const {fps, durationInFrames} = useVideoConfig();

const inAnimation = spring({
  frame,
  fps,
});
const outAnimation = spring({
  frame,
  fps,
  durationInFrames: 1 * fps,
  delay: durationInFrames - 1 * fps,
});

const scale = inAnimation - outAnimation;
```

## Easing

可以将 easing 添加到 `interpolate` 函数中：

```ts
import {interpolate, Easing} from 'remotion';

const value1 = interpolate(frame, [0, 100], [0, 1], {
  easing: Easing.inOut(Easing.quad),
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});
```

默认的 easing 是 `Easing.linear`。
还有其他多种凹凸类型：

- `Easing.in` 用于缓慢启动并加速
- `Easing.out` 用于快速启动并减速
- `Easing.inOut`

以及曲线（从最接近线性到最弯曲排序）：

- `Easing.quad`
- `Easing.sin`
- `Easing.exp`
- `Easing.circle`

凹凸类型和曲线需要组合起来才能构成一个 easing 函数：

```ts
const value1 = interpolate(frame, [0, 100], [0, 1], {
  easing: Easing.inOut(Easing.quad),
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});
```

也支持三次贝塞尔曲线：

```ts
const value1 = interpolate(frame, [0, 100], [0, 1], {
  easing: Easing.bezier(0.8, 0.22, 0.96, 0.65),
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});
```
