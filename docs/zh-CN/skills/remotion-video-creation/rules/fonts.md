---
name: fonts
description: 在 Remotion 中加载 Google Fonts 和本地字体
metadata:
  tags: fonts, google-fonts, typography, text
---

# 在 Remotion 中使用字体

## Google Fonts with @remotion/google-fonts

使用 Google Fonts 的推荐方式。它是类型安全的，并会在字体就绪前自动阻塞渲染。

### 前置条件

首先，需要安装 @remotion/google-fonts 包。
如果尚未安装，请使用以下命令：

```bash
npx remotion add @remotion/google-fonts # 如果项目使用 npm
bunx remotion add @remotion/google-fonts # 如果项目使用 bun
yarn remotion add @remotion/google-fonts # 如果项目使用 yarn
pnpm exec remotion add @remotion/google-fonts # 如果项目使用 pnpm
```

```tsx
import { loadFont } from "@remotion/google-fonts/Lobster";

const { fontFamily } = loadFont();

export const MyComposition = () => {
  return <div style={{ fontFamily }}>Hello World</div>;
};
```

建议仅指定所需的字重和 subsets 以减小文件大小：

```tsx
import { loadFont } from "@remotion/google-fonts/Roboto";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});
```

### 等待字体加载

如果需要知道字体何时就绪，请使用 `waitUntilDone()`：

```tsx
import { loadFont } from "@remotion/google-fonts/Lobster";

const { fontFamily, waitUntilDone } = loadFont();

await waitUntilDone();
```

## Local fonts with @remotion/fonts

对于本地字体文件，请使用 `@remotion/fonts` 包。

### 前置条件

首先，安装 @remotion/fonts：

```bash
npx remotion add @remotion/fonts # 如果项目使用 npm
bunx remotion add @remotion/fonts # 如果项目使用 bun
yarn remotion add @remotion/fonts # 如果项目使用 yarn
pnpm exec remotion add @remotion/fonts # 如果项目使用 pnpm
```

### 加载本地字体

将字体文件放在 `public/` 文件夹中，并使用 `loadFont()`：

```tsx
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

await loadFont({
  family: "MyFont",
  url: staticFile("MyFont-Regular.woff2"),
});

export const MyComposition = () => {
  return <div style={{ fontFamily: "MyFont" }}>Hello World</div>;
};
```

### 加载多个字重

使用相同的 family name 分别加载每个字重：

```tsx
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

await Promise.all([
  loadFont({
    family: "Inter",
    url: staticFile("Inter-Regular.woff2"),
    weight: "400",
  }),
  loadFont({
    family: "Inter",
    url: staticFile("Inter-Bold.woff2"),
    weight: "700",
  }),
]);
```

### 可用选项

```tsx
loadFont({
  family: "MyFont", // 必填：在 CSS 中使用的名称
  url: staticFile("font.woff2"), // 必填：字体文件 URL
  format: "woff2", // 可选：根据扩展名自动检测
  weight: "400", // 可选：字体字重
  style: "normal", // 可选：normal 或 italic
  display: "block", // 可选：font-display 行为
});
```

## 在组件中使用

在组件顶层调用 `loadFont()`，或在单独的文件中调用（该文件需被提前 import）：

```tsx
import { loadFont } from "@remotion/google-fonts/Montserrat";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

export const Title: React.FC<{ text: string }> = ({ text }) => {
  return (
    <h1
      style={{
        fontFamily,
        fontSize: 80,
        fontWeight: "bold",
      }}
    >
      {text}
    </h1>
  );
};
```
