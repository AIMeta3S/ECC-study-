---
name: text-animations
description: Remotion 的排版与文本动画模式。
metadata:
  tags: typography, text, typewriter, highlighter ken
---

## 文本动画

基于 `useCurrentFrame()`，逐字符缩减字符串，创建打字机效果。

## 打字机效果

查看 [打字机](assets/text-animations-typewriter.tsx) 示例，这是一个包含闪烁光标和首句之后暂停的高级示例。

对打字机效果，始终使用字符串切片。绝不使用逐字符透明度。

## 单词高亮

查看 [单词高亮](assets/text-animations-word-highlight.tsx) 示例，了解单词高亮如何实现动画，就像使用荧光笔一样。
