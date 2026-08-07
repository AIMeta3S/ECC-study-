---
name: charts
description: Remotion 的图表与数据可视化模式。在创建柱状图、饼图、直方图、进度条或任何数据驱动的动画时使用。
metadata:
  tags: charts, data, visualization, bar-chart, pie-chart, graphs
---

# Remotion 中的图表

你可以在 Remotion 中使用常规的 React 代码来创建柱状图——允许使用 HTML 和 SVG，以及 D3.js。

## 禁止不由 `useCurrentFrame()` 驱动的动画

禁用所有第三方库的动画。
它们会在渲染期间导致闪烁。
应改为从 `useCurrentFrame()` 驱动所有动画。

## 柱状图动画

查看[柱状图示例](assets/charts/bar-chart.tsx)以了解基本的实现示例。

### 交错柱状图

你可以像这样为柱状条的高度添加动画并使其依次错开出现：

```tsx
const STAGGER_DELAY = 5;
const frame = useCurrentFrame();
const {fps} = useVideoConfig();

const bars = data.map((item, i) => {
  const delay = i * STAGGER_DELAY;
  const height = spring({
    frame,
    fps,
    delay,
    config: {damping: 200},
  });
  return <div style={{height: height * item.value}} />;
});
```

## 饼图动画

使用 stroke-dashoffset 为各扇形片段添加动画，从 12 点钟方向开始。

```tsx
const frame = useCurrentFrame();
const {fps} = useVideoConfig();

const progress = interpolate(frame, [0, 100], [0, 1]);

const circumference = 2 * Math.PI * radius;
const segmentLength = (value / total) * circumference;
const offset = interpolate(progress, [0, 1], [segmentLength, 0]);

<circle r={radius} cx={center} cy={center} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={`${segmentLength} ${circumference}`} strokeDashoffset={offset} transform={`rotate(-90 ${center} ${center})`} />
```
