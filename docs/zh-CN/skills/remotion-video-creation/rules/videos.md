---
name: videos
description: 在 Remotion 中嵌入视频 —— 裁剪、音量、速度、循环、音调
metadata:
  tags: video, media, trim, volume, speed, loop, pitch
---

# 在 Remotion 中使用视频

## 前置条件

首先，需要安装 @remotion/media 包。
若尚未安装，请使用以下命令：

```bash
npx remotion add @remotion/media # 如果项目使用 npm
bunx remotion add @remotion/media # 如果项目使用 bun
yarn remotion add @remotion/media # 如果项目使用 yarn
pnpm exec remotion add @remotion/media # 如果项目使用 pnpm
```

使用 `@remotion/media` 中的 `<Video>` 将视频嵌入到你的 composition 中。

```tsx
import { Video } from "@remotion/media";
import { staticFile } from "remotion";

export const MyComposition = () => {
  return <Video src={staticFile("video.mp4")} />;
};
```

也支持远程 URL：

```tsx
<Video src="https://remotion.media/video.mp4" />
```

## 裁剪

使用 `trimBefore` 和 `trimAfter` 来移除视频的部分内容。值以秒为单位。

```tsx
const { fps } = useVideoConfig();

return (
  <Video
    src={staticFile("video.mp4")}
    trimBefore={2 * fps} // 跳过前 2 秒
    trimAfter={10 * fps} // 在第 10 秒处结束
  />
);
```

## 延迟

将视频包裹在 `<Sequence>` 中，以延迟其出现时间：

```tsx
import { Sequence, staticFile } from "remotion";
import { Video } from "@remotion/media";

const { fps } = useVideoConfig();

return (
  <Sequence from={1 * fps}>
    <Video src={staticFile("video.mp4")} />
  </Sequence>
);
```

视频将在 1 秒后出现。

## 尺寸与位置

使用 `style` prop 来控制尺寸和位置：

```tsx
<Video
  src={staticFile("video.mp4")}
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

## 音量

设置静态音量（0 到 1）：

```tsx
<Video src={staticFile("video.mp4")} volume={0.5} />
```

或者使用回调函数，根据当前帧实现动态音量：

```tsx
import { interpolate } from "remotion";

const { fps } = useVideoConfig();

return (
  <Video
    src={staticFile("video.mp4")}
    volume={(f) =>
      interpolate(f, [0, 1 * fps], [0, 1], { extrapolateRight: "clamp" })
    }
  />
);
```

使用 `muted` 可将视频完全静音：

```tsx
<Video src={staticFile("video.mp4")} muted />
```

## 速度

使用 `playbackRate` 来改变播放速度：

```tsx
<Video src={staticFile("video.mp4")} playbackRate={2} /> {/* 2 倍速 */}
<Video src={staticFile("video.mp4")} playbackRate={0.5} /> {/* 半速 */}
```

不支持反向播放。

## 循环

使用 `loop` 可无限循环播放视频：

```tsx
<Video src={staticFile("video.mp4")} loop />
```

使用 `loopVolumeCurveBehavior` 来控制循环时帧计数的行为：

- `"repeat"`：每次循环时帧计数重置为 0（用于 `volume` 回调）
- `"extend"`：帧计数持续递增

```tsx
<Video
  src={staticFile("video.mp4")}
  loop
  loopVolumeCurveBehavior="extend"
  volume={(f) => interpolate(f, [0, 300], [1, 0])} // 在多次循环中淡出
/>
```

## 音调

使用 `toneFrequency` 可在不影响速度的情况下调整音调。取值范围从 0.01 到 2：

```tsx
<Video
  src={staticFile("video.mp4")}
  toneFrequency={1.5} // 更高音调
/>
<Video
  src={staticFile("video.mp4")}
  toneFrequency={0.8} // 更低音调
/>
```

变调仅在服务端渲染时有效，在 Remotion Studio 预览或 `<Player />` 中无效。
