---
name: images
description: 使用 `<Img>` 组件在 Remotion 中嵌入图片
metadata:
  tags: images, img, staticFile, png, jpg, svg, webp
---

# 在 Remotion 中使用图片

## `<Img>` 组件

始终使用来自 `remotion` 的 `<Img>` 组件来显示图片：

```tsx
import { Img, staticFile } from "remotion";

export const MyComposition = () => {
  return <Img src={staticFile("photo.png")} />;
};
```

## 重要限制

**你必须使用来自 `remotion` 的 `<Img>` 组件。** 不要使用：

- 原生 HTML `<img>` 元素
- Next.js 的 `<Image>` 组件
- CSS `background-image`

`<Img>` 组件可确保图片在渲染前完全加载，避免在视频导出时出现闪烁和空白帧。

## 使用 staticFile() 加载本地图片

将图片放在 `public/` 文件夹中，并使用 `staticFile()` 来引用它们：

```
my-video/
├─ public/
│  ├─ logo.png
│  ├─ avatar.jpg
│  └─ icon.svg
├─ src/
├─ package.json
```

```tsx
import { Img, staticFile } from "remotion";

<Img src={staticFile("logo.png")} />
```

## 远程图片

远程 URL 可以直接使用，无需 `staticFile()`：

```tsx
<Img src="https://example.com/image.png" />
```

确保远程图片已启用 CORS。

对于动态 GIF，请改用来自 `@remotion/gif` 的 `<Gif>` 组件。

## 尺寸与定位

使用 `style` prop 来控制尺寸和位置：

```tsx
<Img
  src={staticFile("photo.png")}
  style={{
    width: 500,
    height: 300,
    position: "absolute",
    top: 100,
    left: 50,
    objectFit: "cover",
  }}
/>
```

## 动态图片路径

对于动态文件引用，使用 template literals：

```tsx
import { Img, staticFile, useCurrentFrame } from "remotion";

const frame = useCurrentFrame();

// 图片序列
<Img src={staticFile(`frames/frame${frame}.png`)} />

// 根据 props 选择
<Img src={staticFile(`avatars/${props.userId}.png`)} />

// 条件图片
<Img src={staticFile(`icons/${isActive ? "active" : "inactive"}.svg`)} />
```

此模式适用于：

- 图片序列（逐帧动画）
- 用户专属头像或个人资料图片
- 基于主题的图标
- 依赖状态的图形

## 获取图片尺寸

使用 `getImageDimensions()` 来获取图片的尺寸：

```tsx
import { getImageDimensions, staticFile } from "remotion";

const { width, height } = await getImageDimensions(staticFile("photo.png"));
```

这对于计算宽高比或设置 composition 的尺寸很有用：

```tsx
import { getImageDimensions, staticFile, CalculateMetadataFunction } from "remotion";

const calculateMetadata: CalculateMetadataFunction = async () => {
  const { width, height } = await getImageDimensions(staticFile("photo.png"));
  return {
    width,
    height,
  };
};
```
