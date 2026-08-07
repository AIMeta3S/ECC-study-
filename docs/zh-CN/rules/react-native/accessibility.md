---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# React Native / Expo 无障碍

> 将 ECC 质量标准延伸至无障碍（a11y）。将 a11y 视为发布要求，而非事后补充。
> 目标：在屏幕阅读器（iOS 上的 VoiceOver、Android 上的 TalkBack）以及大字号环境下均可正常使用。

## 标签

- 每个交互元素都具有 `accessibilityRole` 和 `accessibilityLabel`（或可读的子文本）。
- 仅含图标的按钮必须具有 `accessibilityLabel`——因为没有可供屏幕阅读器朗读的可见文本。
- 仅当操作不明显时才使用 `accessibilityHint`；保持简短。
- 在容器上使用 `accessible` 对相关元素进行分组，以便在适当时将它们作为一个整体进行朗读。

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Delete item"
  onPress={onDelete}
>
  <TrashIcon />
</Pressable>
```

## 状态与 Live Regions

- 使用 `accessibilityState` 传达状态（例如 `{ disabled, selected, checked, expanded }`）。
- 在需要时通过 `accessibilityLiveRegion`（Android）和 `AccessibilityInfo.announceForAccessibility` 公告异步/临时性变更（toast、校验错误）。
- 在屏幕阅读器可触及的文本中反映加载/错误/空状态——而不仅仅是 spinner 或颜色。

## 触摸目标与布局

- 最小触摸目标约为 44x44pt（iOS）/ 48x48dp（Android）；使用 `hitSlop` 放大小型控件。
- 尊重 Dynamic Type / 字体缩放——避免会裁剪缩放文本的固定高度；在最大的无障碍字号下进行测试。
- 遵循 `prefers-reduced-motion`（`AccessibilityInfo.isReduceMotionEnabled`）——对非必要的动画进行限制。

## 颜色与对比度

- 不要仅靠颜色传达含义；应与文本、图标或形状结合使用。
- 满足 WCAG AA 对比度要求：正文文本 4.5:1，大号文本以及有意义的 UI/图形元素 3:1。
- 同时验证浅色和深色主题。

## 焦点与导航

- 合理的焦点顺序；在打开时将焦点移至新内容（modal、screen），并在关闭时恢复。
- 确保自定义组件可被屏幕阅读器触及和操作，而不仅仅是通过触摸。

## 测试

- 在真实设备上使用 VoiceOver 和 TalkBack 进行手动测试——自动化检查无法发现所有问题。
- 在组件测试中，按 role/label 进行查询（见 testing.md），使 a11y 与测试相互促进。
- 将 a11y 加入发布前门禁：关键流程须通过屏幕阅读器走查。
