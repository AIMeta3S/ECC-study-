---
name: make-interfaces-feel-better
description: 应用具体的设计工程细节，让界面显得精致。在评审或改进 UI 的间距、字体排印、边框、阴影、动效、点击区域、图标、文本换行以及交互状态时使用。
metadata:
  origin: community
---

# 让界面感觉更好

本 skill 用于那些能叠加成更精致界面的小型设计工程细节。

来源：从 `linus707` 的过期社区 PR #1659 中抢救而来。

## 何时使用

- 用户说 UI 感觉不对劲、平淡、平庸、拥挤、跳动或未完成。
- 你正在构建控件、卡片、列表、dashboard、导航、表单或工具栏。
- 某个组件需要 hover、active、focus、enter、exit、loading 或 empty 状态。
- 一次前端评审需要具体的 before/after 建议。

## 核心原则

### 同心圆角

对于相邻的嵌套圆角表面：

```text
outer radius = inner radius + padding
```

如果 padding 较大，则将这些层视为独立表面，而不要强套公式。关键是视觉上的协调，而不是死守公式。

### 视觉对齐

几何居中并不总是视觉居中。图标按钮、播放三角形、箭头、星形以及不对称图标通常需要一个小偏移。尽可能修改 SVG；否则用像素级的 margin 或 padding 调整。

### 阴影与边框

用边框表达分隔和 focus ring。当卡片、按钮、下拉菜单或 popover 需要深度感时，使用分层阴影。阴影应当是透明的、足够微妙的，以便在各种背景上都能生效。

### 文本换行

- 在标题和短标题上使用 `text-wrap: balance`。
- 在短到中等长度的正文、说明、描述和列表项上使用 `text-wrap: pretty`。
- 在长篇正文、代码和预格式化内容上避免使用两者。
- 对计数器、计时器、价格、表格以及其他会变动的数字使用 `font-variant-numeric: tabular-nums`。

### 字体平滑

在 macOS 上，如果项目尚未在根布局中应用 antialiased 字体平滑，则应添加：

```css
html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### 图片描边

图片通常需要一道微妙的内嵌描边，以免其边缘与所在表面模糊在一起。

```css
img {
  outline: 1px solid rgba(0, 0, 0, 0.1);
  outline-offset: -1px;
}

@media (prefers-color-scheme: dark) {
  img {
    outline-color: rgba(255, 255, 255, 0.1);
  }
}
```

使用中性的黑色或白色 alpha 描边。不要用品牌色板给图片描边着色。

### 动效

对交互状态变化使用 CSS transition，因为当用户在动效中途改变意图时，transition 可以重新定向。将 keyframe 保留用于分阶段的单次入场或 loading 序列。

好的动效默认值：

- Enter：组合 opacity、小幅 `translateY`，以及可选的 blur。
- Exit：比 enter 更短、更轻，通常为 150ms。
- Press：对触感按钮使用 `scale(0.96)`，并提供一种在动效干扰时禁用它的方式。
- Icon swaps：用 opacity、scale 和 blur 做交叉淡入淡出，而不是瞬间的可见性切换。

### Transition 作用域

永远不要使用 `transition: all`。明确指定发生变化的属性：

```css
.button {
  transition-property: transform, background-color, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
```

仅在 `transform`、`opacity` 和 `filter` 等 compositor-friendly 的属性上，为首帧卡顿使用 `will-change`。永远不要使用 `will-change: all`。

### 点击区域

交互控件应具有至少 40x40px 的点击区域，在布局允许的情况下理想尺寸为 44x44px。当可见图标较小时，用伪元素扩大点击区域，但不要让扩展后的点击区域相互重叠。

## 评审输出

在评审一次 UI 打磨时，以 before/after 行的形式报告具体改动：

| 原则 | Before | After |
| --- | --- | --- |
| 同心圆角 | 父元素和子元素使用相同的圆角 | 父级圆角考虑了 padding |
| Tabular 数字 | 计数器随数字变化而位移 | 计数器使用 `tabular-nums` |
| Transition 作用域 | `transition: all` | 显式指定 transition 属性 |

当代码片段中不够明显时，附上文件路径和相关属性。

省略那些你检查过但未改动的原则。

## 检查清单

- 嵌套的圆角元素在视觉上协调。
- 图标视觉居中。
- 按钮、卡片和 popover 基于正确理由使用边框或阴影。
- 标题和短文本避免了难看的换行。
- 动态数字使用 tabular 数字。
- 图片在需要处有中性描边。
- Enter 和 exit 动效在合适处被拆分、微妙且可中断。
- 按钮具有触感 active 状态，且没有夸张的动效。
- 不存在 `transition: all` 和 `will-change: all`。
- 小控件仍然具有可用的点击区域。
