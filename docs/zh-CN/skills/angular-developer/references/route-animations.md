# 路由过渡动画

Angular Router 支持浏览器的 **View Transitions API**，用于在路由之间实现平滑的视觉过渡。

## 启用 View Transitions

将 `withViewTransitions()` 添加到你的 router 配置中。

```ts
provideRouter(routes, withViewTransitions());
```

这是一种**渐进增强**。在不支持该 API 的浏览器中，router 仍然可以工作，但不会有过渡动画。

## 工作原理

1. 浏览器对旧状态截图。
2. Router 更新 DOM（激活新组件）。
3. 浏览器对新状态截图。
4. 浏览器在两个状态之间播放动画。

## 使用 CSS 自定义

过渡效果在**全局 CSS 文件**中自定义（而非组件作用域的 CSS）。

使用 `::view-transition-old()` 和 `::view-transition-new()` 伪元素。

```css
/* 示例：交叉淡入淡出 + 滑动 */
::view-transition-old(root) {
  animation: 90ms cubic-bezier(0.4, 0, 1, 1) both fade-out;
}
::view-transition-new(root) {
  animation: 210ms cubic-bezier(0, 0, 0.2, 1) 90ms both fade-in;
}
```

## 高级控制

使用 `onViewTransitionCreated` 可跳过过渡效果，或基于导航上下文自定义行为。

```ts
withViewTransitions({
  onViewTransitionCreated: ({transition, from, to}) => {
    // 对特定路由跳过动画
    if (to.url === '/no-animation') {
      transition.skipTransition();
    }
  },
});
```

## 最佳实践

- **全局样式**：始终在 `styles.css` 中定义过渡动画，以避免视图封装问题。
- **View Transition 名称**：为需要在不同路由间平滑过渡的元素（例如页眉图片）分配唯一的 `view-transition-name`。
