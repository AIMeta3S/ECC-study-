---
name: calculate-metadata
description: 动态设置 composition 的时长、尺寸和 props
metadata:
  tags: calculateMetadata, duration, dimensions, props, dynamic
---

# 使用 calculateMetadata

在 `<Composition>` 上使用 `calculateMetadata`，以便在渲染前动态设置时长、尺寸，并转换 props。

```tsx
<Composition id="MyComp" component={MyComponent} durationInFrames={300} fps={30} width={1920} height={1080} defaultProps={{videoSrc: 'https://remotion.media/video.mp4'}} calculateMetadata={calculateMetadata} />
```

## 根据视频设置时长

使用 mediabunny/metadata skill 中的 `getMediaMetadata()` 函数获取视频时长：

```tsx
import {CalculateMetadataFunction} from 'remotion';
import {getMediaMetadata} from '../get-media-metadata';

const calculateMetadata: CalculateMetadataFunction<Props> = async ({props}) => {
  const {durationInSeconds} = await getMediaMetadata(props.videoSrc);

  return {
    durationInFrames: Math.ceil(durationInSeconds * 30),
  };
};
```

## 匹配视频的尺寸

```tsx
const calculateMetadata: CalculateMetadataFunction<Props> = async ({props}) => {
  const {durationInSeconds, dimensions} = await getMediaMetadata(props.videoSrc);

  return {
    durationInFrames: Math.ceil(durationInSeconds * 30),
    width: dimensions?.width ?? 1920,
    height: dimensions?.height ?? 1080,
  };
};
```

## 根据多个视频设置时长

```tsx
const calculateMetadata: CalculateMetadataFunction<Props> = async ({props}) => {
  const metadataPromises = props.videos.map((video) => getMediaMetadata(video.src));
  const allMetadata = await Promise.all(metadataPromises);

  const totalDuration = allMetadata.reduce((sum, meta) => sum + meta.durationInSeconds, 0);

  return {
    durationInFrames: Math.ceil(totalDuration * 30),
  };
};
```

## 设置默认的 outName

根据 props 设置默认的输出文件名：

```tsx
const calculateMetadata: CalculateMetadataFunction<Props> = async ({props}) => {
  return {
    defaultOutName: `video-${props.id}.mp4`,
  };
};
```

## 转换 props

在渲染前获取数据或转换 props：

```tsx
const calculateMetadata: CalculateMetadataFunction<Props> = async ({props, abortSignal}) => {
  const response = await fetch(props.dataUrl, {signal: abortSignal});
  const data = await response.json();

  return {
    props: {
      ...props,
      fetchedData: data,
    },
  };
};
```

当 props 在 Studio 中发生变化时，`abortSignal` 会取消过时的请求。

## 返回值

所有字段都是可选的。返回的值会覆盖 `<Composition>` 的 props：

- `durationInFrames`：帧数
- `width`：Composition 的宽度（以像素为单位）
- `height`：Composition 的高度（以像素为单位）
- `fps`：每秒帧数
- `props`：传递给组件的已转换 props
- `defaultOutName`：默认输出文件名
- `defaultCodec`：渲染的默认 codec
