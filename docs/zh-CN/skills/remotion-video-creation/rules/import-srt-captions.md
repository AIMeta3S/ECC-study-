---
name: import-srt-captions
description: 使用 @remotion/captions 将 .srt 字幕文件导入 Remotion
metadata:
  tags: captions, subtitles, srt, import, parse
---

# 将 .srt 字幕导入 Remotion

如果你已有 `.srt` 字幕文件，可以使用 `@remotion/captions` 中的 `parseSrt()` 将其导入 Remotion。

## 前置条件

首先需要安装 @remotion/captions 包。
如果尚未安装，请使用以下命令：

```bash
npx remotion add @remotion/captions # 如果项目使用 npm
bunx remotion add @remotion/captions # 如果项目使用 bun
yarn remotion add @remotion/captions # 如果项目使用 yarn
pnpm exec remotion add @remotion/captions # 如果项目使用 pnpm
```

## 读取 .srt 文件

使用 `staticFile()` 引用 `public` 文件夹中的 `.srt` 文件，然后获取并解析它：

```tsx
import {useState, useEffect, useCallback} from 'react';
import {AbsoluteFill, staticFile, useDelayRender} from 'remotion';
import {parseSrt} from '@remotion/captions';
import type {Caption} from '@remotion/captions';

export const MyComponent: React.FC = () => {
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const {delayRender, continueRender, cancelRender} = useDelayRender();
  const [handle] = useState(() => delayRender());

  const fetchCaptions = useCallback(async () => {
    try {
      const response = await fetch(staticFile('subtitles.srt'));
      const text = await response.text();
      const {captions: parsed} = parseSrt({input: text});
      setCaptions(parsed);
      continueRender(handle);
    } catch (e) {
      cancelRender(e);
    }
  }, [continueRender, cancelRender, handle]);

  useEffect(() => {
    fetchCaptions();
  }, [fetchCaptions]);

  if (!captions) {
    return null;
  }

  return <AbsoluteFill>{/* 在此处使用 captions */}</AbsoluteFill>;
};
```

也支持远程 URL —— 你可以通过 URL 使用 `fetch()` 获取远程文件，而无需使用 `staticFile()`。

## 使用导入的字幕

解析完成后，字幕将转换为 `Caption` 格式，可与所有 `@remotion/captions` 工具配合使用。
