---
name: trimming
description: Remotion 的裁剪模式 - 剪掉动画的开头或结尾
metadata:
  tags: sequence, trim, clip, cut, offset
---

使用带负数 `from` 值的 `<Sequence>` 来裁剪动画的开头。

## 裁剪开头

负数的 `from` 值会向后偏移时间，使动画从中间某处开始播放：

```tsx
import { Sequence, useVideoConfig } from "remotion";

const fps = useVideoConfig();

<Sequence from={-0.5 * fps}>
  <MyAnimation />
</Sequence>
```

动画从其进度第 15 帧处出现 - 前 15 帧被裁剪掉了。
在 `<MyAnimation>` 内部，`useCurrentFrame()` 从 15 开始，而不是 0。

## 裁剪结尾

使用 `durationInFrames` 在指定时长后卸载内容：

```tsx

<Sequence durationInFrames={1.5 * fps}>
  <MyAnimation />
</Sequence>
```

动画播放 45 帧后，组件卸载。

## 裁剪与延迟

嵌套 sequences 以同时裁剪开头并延迟其出现的时间：

```tsx
<Sequence from={30}>
  <Sequence from={-15}>
    <MyAnimation />
  </Sequence>
</Sequence>
```

内层 sequence 从开头裁剪 15 帧，外层 sequence 将结果延迟 30 帧。
