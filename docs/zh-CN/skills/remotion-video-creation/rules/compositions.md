---
name: compositions
description: 定义 compositions、stills、folders、default props 和动态 metadata
metadata:
  tags: composition, still, folder, props, metadata
---

`<Composition>` 定义一段可渲染视频的 component、width、height、fps 和 duration。

它通常放在 `src/Root.tsx` 文件中。

```tsx
import { Composition } from "remotion";
import { MyComposition } from "./MyComposition";

export const RemotionRoot = () => {
  return (
    <Composition
      id="MyComposition"
      component={MyComposition}
      durationInFrames={100}
      fps={30}
      width={1080}
      height={1080}
    />
  );
};
```

## Default Props

传入 `defaultProps` 来为你的 component 提供初始值。
值必须是 JSON-serializable 的（支持 `Date`、`Map`、`Set` 和 `staticFile()`）。

```tsx
import { Composition } from "remotion";
import { MyComposition, MyCompositionProps } from "./MyComposition";

export const RemotionRoot = () => {
  return (
    <Composition
      id="MyComposition"
      component={MyComposition}
      durationInFrames={100}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={{
        title: "Hello World",
        color: "#ff0000",
      } satisfies MyCompositionProps}
    />
  );
};
```

对 props 使用 `type` 声明而非 `interface`，以确保 `defaultProps` 的 type safety。

## Folders

使用 `<Folder>` 在侧边栏中组织 compositions。
Folder 名称只能包含字母、数字和连字符。

```tsx
import { Composition, Folder } from "remotion";

export const RemotionRoot = () => {
  return (
    <>
      <Folder name="Marketing">
        <Composition id="Promo" /* ... */ />
        <Composition id="Ad" /* ... */ />
      </Folder>
      <Folder name="Social">
        <Folder name="Instagram">
          <Composition id="Story" /* ... */ />
          <Composition id="Reel" /* ... */ />
        </Folder>
      </Folder>
    </>
  );
};
```

## Stills

使用 `<Still>` 来生成单帧图像。它不需要 `durationInFrames` 或 `fps`。

```tsx
import { Still } from "remotion";
import { Thumbnail } from "./Thumbnail";

export const RemotionRoot = () => {
  return (
    <Still
      id="Thumbnail"
      component={Thumbnail}
      width={1280}
      height={720}
    />
  );
};
```

## Calculate Metadata

使用 `calculateMetadata` 来根据数据让 dimensions、duration 或 props 动态化。

```tsx
import { Composition, CalculateMetadataFunction } from "remotion";
import { MyComposition, MyCompositionProps } from "./MyComposition";

const calculateMetadata: CalculateMetadataFunction<MyCompositionProps> = async ({
  props,
  abortSignal,
}) => {
  const data = await fetch(`https://api.example.com/video/${props.videoId}`, {
    signal: abortSignal,
  }).then((res) => res.json());

  return {
    durationInFrames: Math.ceil(data.duration * 30),
    props: {
      ...props,
      videoUrl: data.url,
    },
  };
};

export const RemotionRoot = () => {
  return (
    <Composition
      id="MyComposition"
      component={MyComposition}
      durationInFrames={100} // 占位符，将被覆盖
      fps={30}
      width={1080}
      height={1080}
      defaultProps={{ videoId: "abc123" }}
      calculateMetadata={calculateMetadata}
    />
  );
};
```

该函数可以返回 `props`、`durationInFrames`、`width`、`height`、`fps` 以及与 codec 相关的默认值。它会在渲染开始前运行一次。
