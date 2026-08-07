---
name: sequencing
description: Remotion 的时序编排模式——延迟、裁剪、限制元素的时长
metadata:
  tags: sequence, series, timing, delay, trim
---

使用 `<Sequence>` 来延迟元素在时间轴上出现的时间。

```tsx
import { Sequence } from "remotion";

const {fps} = useVideoConfig();

<Sequence from={1 * fps} durationInFrames={2 * fps} premountFor={1 * fps}>
  <Title />
</Sequence>
<Sequence from={2 * fps} durationInFrames={2 * fps} premountFor={1 * fps}>
  <Subtitle />
</Sequence>
```

默认情况下，这会将组件包裹在一个 absolute fill 元素中。
如果元素不应该被包裹，使用 `layout` prop：

```tsx
<Sequence layout="none">
  <Title />
</Sequence>
```

## 预挂载

这会在组件实际播放之前，先在时间轴上加载它。
始终对任何 `<Sequence>` 进行预挂载！

```tsx
<Sequence premountFor={1 * fps}>
  <Title />
</Sequence>
```

## Series

当元素需要依次连续播放、互不重叠时，使用 `<Series>`。

```tsx
import {Series} from 'remotion';

<Series>
  <Series.Sequence durationInFrames={45}>
    <Intro />
  </Series.Sequence>
  <Series.Sequence durationInFrames={60}>
    <MainContent />
  </Series.Sequence>
  <Series.Sequence durationInFrames={30}>
    <Outro />
  </Series.Sequence>
</Series>;
```

与 `<Sequence>` 相同，使用 `<Series.Sequence>` 时元素默认也会被包裹在 absolute fill 元素中，除非将 `layout` prop 设为 `"none"`。

### 带重叠的 Series

使用负的 offset 来实现重叠的 sequence：

```tsx
<Series>
  <Series.Sequence durationInFrames={60}>
    <SceneA />
  </Series.Sequence>
  <Series.Sequence offset={-15} durationInFrames={60}>
    {/* 在 SceneA 结束前 15 帧开始 */}
    <SceneB />
  </Series.Sequence>
</Series>
```

## Sequence 内部的帧引用

在 Sequence 内部，`useCurrentFrame()` 返回本地帧（从 0 开始计算）：

```tsx
<Sequence from={60} durationInFrames={30}>
  <MyComponent />
  {/* 在 MyComponent 内部，useCurrentFrame() 返回 0-29，而不是 60-89 */}
</Sequence>
```

## 嵌套的 Sequence

Sequence 可以嵌套以实现复杂的时序控制：

```tsx
<Sequence from={0} durationInFrames={120}>
  <Background />
  <Sequence from={15} durationInFrames={90} layout="none">
    <Title />
  </Sequence>
  <Sequence from={45} durationInFrames={60} layout="none">
    <Subtitle />
  </Sequence>
</Sequence>
```
