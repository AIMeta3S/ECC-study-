---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# React Native / Expo 性能

> 本文件扩展了 [common/performance.md](../common/performance.md)，补充 React Native / Expo 专属内容。

## 渲染

- 用 `React.memo` memoize 高开销组件；仅当 `useCallback`/`useMemo` 能真正避免 re-render 时，才用它们 memoize 传给子组件的 callback/value。
- 保持组件 state 局部且范围狭窄——将 state 提升得过高会引发大块子树的 re-render。
- 避免在热路径上于 props 中内联创建新的 object/array/function；它们会破坏 memoization。
- 拆分大型 screen，使一次 state 变更只 re-render 尽可能小的子树。

## 列表

- 对于大型或异构列表，使用 `FlatList`/`SectionList`，或 `FlashList`（Shopify）。
- 提供 `keyExtractor`、memoize 过的 `renderItem`，并在可能时保持稳定的 item 高度（`getItemLayout`）。
- 针对高开销 row 调优 `initialNumToRender`、`windowSize`、`maxToRenderPerBatch`。
- 绝不要在 `ScrollView` 内用 `.map()` 渲染大型数据集。

## 图片与资源

- 使用 `expo-image` 来提供 cache、优先级和 placeholder；提供尺寸合适的图片。
- 避免将全分辨率图片加载到小的缩略图中。

## 动画

- 优先使用 `react-native-reanimated`（在 UI thread 上运行），而非 JS 驱动的 `Animated` API。
- 对于 legacy `Animated`，在支持处设置 `useNativeDriver: true`。
- 将高开销计算移出 JS thread；卸载到 Reanimated worklet 或 native module。

## 运行时与构建

- 基于 **New Architecture**（Fabric + TurboModules）构建。它在近期的 Expo SDK 中为默认（SDK 53–54 仍可 opt-out），并从 SDK 55+ 起强制启用——无法禁用。发布前验证每个 native dependency 都兼容 New Architecture。
- 确保启用 **Hermes**（在现代 Expo 中为默认），以获得更快的启动速度和更低的内存占用。
- 将非关键工作推迟到 first paint 之后；lazy-load 重量级 screen/module。
- 对于可以等到动画完成的工作，使用 `InteractionManager.runAfterInteractions`。

## 测量

- 使用 React DevTools profiler、Hermes sampling profiler 和应用内的 performance monitor 进行 profiling。（避免使用 Flipper——它已 deprecated 且在 New Architecture 上不受支持。）
- 关注：未虚拟化的长列表、过大的图片、频繁的整树 re-render，以及 JS thread 上的同步工作。
