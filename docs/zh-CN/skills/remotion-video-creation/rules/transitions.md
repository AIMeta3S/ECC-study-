---
name: transitions
description: Remotion 的全屏场景过渡。
metadata:
  tags: transitions, fade, slide, wipe, scenes
---

## 全屏过渡

使用 `<TransitionSeries>` 在多个场景或片段之间制作动画过渡。
这会将子元素设置为绝对定位。

## 前置条件

首先需要安装 @remotion/transitions 包。
如果尚未安装，请使用以下命令：

```bash
npx remotion add @remotion/transitions # 如果项目使用 npm
bunx remotion add @remotion/transitions # 如果项目使用 bun
yarn remotion add @remotion/transitions # 如果项目使用 yarn
pnpm exec remotion add @remotion/transitions # 如果项目使用 pnpm
```

## 示例用法

```tsx
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={60}>
    <SceneA />
  </TransitionSeries.Sequence>
  <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
  <TransitionSeries.Sequence durationInFrames={60}>
    <SceneB />
  </TransitionSeries.Sequence>
</TransitionSeries>;
```

## 可用的过渡类型

从各自的模块中导入过渡效果：

```tsx
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';
import {flip} from '@remotion/transitions/flip';
import {clockWipe} from '@remotion/transitions/clock-wipe';
```

## 带方向的 Slide 过渡

为进入/退出动画指定 slide 方向。

```tsx
import {slide} from '@remotion/transitions/slide';

<TransitionSeries.Transition presentation={slide({direction: 'from-left'})} timing={linearTiming({durationInFrames: 20})} />;
```

方向：`"from-left"`、`"from-right"`、`"from-top"`、`"from-bottom"`

## 时序选项

```tsx
import {linearTiming, springTiming} from '@remotion/transitions';

// linearTiming - 恒定速度
linearTiming({durationInFrames: 20});

// springTiming - 自然的运动效果
springTiming({config: {damping: 200}, durationInFrames: 25});
```

## 时长计算

过渡会使相邻场景重叠，因此总 composition 长度比所有 sequence 时长之和**更短**。

例如，两个 60 帧的 sequence 加上一个 15 帧的 transition：

- 无过渡：`60 + 60 = 120` 帧
- 有过渡：`60 + 60 - 15 = 105` 帧

要减去 transition 的时长，因为在过渡期间两个场景会同时播放。

### 获取 transition 的时长

在 timing 对象上使用 `getDurationInFrames()` 方法：

```tsx
import {linearTiming, springTiming} from '@remotion/transitions';

const linearDuration = linearTiming({durationInFrames: 20}).getDurationInFrames({fps: 30});
// 返回 20

const springDuration = springTiming({config: {damping: 200}}).getDurationInFrames({fps: 30});
// 返回基于 spring 物理计算得出的时长
```

对于未显式指定 `durationInFrames` 的 `springTiming`，其时长取决于 `fps`，因为它需要计算 spring 动画何时稳定下来。

### 计算总 composition 时长

```tsx
import {linearTiming} from '@remotion/transitions';

const scene1Duration = 60;
const scene2Duration = 60;
const scene3Duration = 60;

const timing1 = linearTiming({durationInFrames: 15});
const timing2 = linearTiming({durationInFrames: 20});

const transition1Duration = timing1.getDurationInFrames({fps: 30});
const transition2Duration = timing2.getDurationInFrames({fps: 30});

const totalDuration = scene1Duration + scene2Duration + scene3Duration - transition1Duration - transition2Duration;
// 60 + 60 + 60 - 15 - 20 = 145 帧
```
