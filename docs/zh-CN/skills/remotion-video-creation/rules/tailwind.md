---
name: tailwind
description: 在 Remotion 中使用 TailwindCSS。
metadata:
---

如果 TailwindCSS 已安装在项目中，你就可以也应该在 Remotion 中使用它。

不要使用 `transition-*` 或 `animate-*` classes —— 必须始终通过 `useCurrentFrame()` hook 来实现动画。

在 Remotion 项目中必须先安装并启用 Tailwind —— 使用 WebFetch 抓取  <https://www.remotion.dev/docs/tailwind> 获取操作指南。
