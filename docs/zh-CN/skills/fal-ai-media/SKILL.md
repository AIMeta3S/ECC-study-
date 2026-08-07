---
name: fal-ai-media
description: 通过 fal.ai MCP 统一生成媒体内容——图像、视频和音频。涵盖 text-to-image（Nano Banana）、text/image-to-video（Seedance、Kling、Veo 3）、text-to-speech（CSM-1B）以及 video-to-audio（ThinkSound）。当用户想用 AI 生成图像、视频或音频时使用。
metadata:
  origin: ECC
---

# fal.ai 媒体生成

> **易漂移 skill。** fal.ai 的模型 ID、定价、输入和 MCP tool 名称变化很快。
> 在承诺特定的模型、parameter、输出格式或成本之前，先搜索或获取当前的模型元数据。

通过 MCP 使用 fal.ai 模型生成图像、视频和音频。

## 何时激活

- 用户想从 text prompt 生成图像
- 从文本或图像创建视频
- 生成语音、音乐或音效
- 任何媒体生成任务
- 用户说"生成图像"、"创建视频"、"文本转语音"、"制作缩略图"或类似表达

## MCP 要求

必须配置 fal.ai MCP server。添加到 `~/.claude.json`：

```json
"fal-ai": {
  "command": "npx",
  "args": ["-y", "fal-ai-mcp-server"],
  "env": { "FAL_KEY": "YOUR_FAL_KEY_HERE" }
}
```

在 [fal.ai](https://fal.ai) 获取 API key。

## MCP tool

fal.ai MCP 提供以下 tool：
- `search` — 按关键字查找可用模型
- `find` — 获取模型详情和 parameter
- `generate` — 使用 parameter 运行模型
- `result` — 检查异步生成状态
- `status` — 检查 job 状态
- `cancel` — 取消运行中的 job
- `estimate_cost` — 估算生成成本
- `models` — 列出热门模型
- `upload` — 上传文件用作输入

---

## 图像生成

### Nano Banana 2（快速）
最适合：快速迭代、草稿、text-to-image、图像编辑。

```
generate(
  app_id: "fal-ai/nano-banana-2",
  input_data: {
    "prompt": "a futuristic cityscape at sunset, cyberpunk style",
    "image_size": "landscape_16_9",
    "num_images": 1,
    "seed": 42
  }
)
```

### Nano Banana Pro（高保真）
最适合：产品级图像、写实、字体排版、详细 prompt。

```
generate(
  app_id: "fal-ai/nano-banana-pro",
  input_data: {
    "prompt": "professional product photo of wireless headphones on marble surface, studio lighting",
    "image_size": "square",
    "num_images": 1,
    "guidance_scale": 7.5
  }
)
```

### 常用图像 parameter

| Param | 类型 | 选项 | 说明 |
|-------|------|---------|-------|
| `prompt` | string | required | 描述你想要的内容 |
| `image_size` | string | `square`, `portrait_4_3`, `landscape_16_9`, `portrait_16_9`, `landscape_4_3` | 宽高比 |
| `num_images` | number | 1-4 | 生成多少张 |
| `seed` | number | 任意整数 | 可复现性 |
| `guidance_scale` | number | 1-20 | 跟随 prompt 的紧密程度（越高 = 越字面化） |

### 图像编辑
将 Nano Banana 2 与输入图像一起用于 inpainting、outpainting 或风格迁移：

```
# 首先上传源图像
upload(file_path: "/path/to/image.png")

# 然后使用图像输入生成
generate(
  app_id: "fal-ai/nano-banana-2",
  input_data: {
    "prompt": "same scene but in watercolor style",
    "image_url": "<uploaded_url>",
    "image_size": "landscape_16_9"
  }
)
```

---

## 视频生成

### Seedance 1.0 Pro（ByteDance）
最适合：text-to-video、image-to-video，具有高动态质量。

```
generate(
  app_id: "fal-ai/seedance-1-0-pro",
  input_data: {
    "prompt": "a drone flyover of a mountain lake at golden hour, cinematic",
    "duration": "5s",
    "aspect_ratio": "16:9",
    "seed": 42
  }
)
```

### Kling Video v3 Pro
最适合：text/image-to-video，带原生音频生成。

```
generate(
  app_id: "fal-ai/kling-video/v3/pro",
  input_data: {
    "prompt": "ocean waves crashing on a rocky coast, dramatic clouds",
    "duration": "5s",
    "aspect_ratio": "16:9"
  }
)
```

### Veo 3（Google DeepMind）
最适合：带生成音效的视频，高视觉质量。

```
generate(
  app_id: "fal-ai/veo-3",
  input_data: {
    "prompt": "a bustling Tokyo street market at night, neon signs, crowd noise",
    "aspect_ratio": "16:9"
  }
)
```

### Image-to-Video
从现有图像开始：

```
generate(
  app_id: "fal-ai/seedance-1-0-pro",
  input_data: {
    "prompt": "camera slowly zooms out, gentle wind moves the trees",
    "image_url": "<uploaded_image_url>",
    "duration": "5s"
  }
)
```

### 视频 parameter

| Param | 类型 | 选项 | 说明 |
|-------|------|---------|-------|
| `prompt` | string | required | 描述视频 |
| `duration` | string | `"5s"`, `"10s"` | 视频长度 |
| `aspect_ratio` | string | `"16:9"`, `"9:16"`, `"1:1"` | 画面比例 |
| `seed` | number | 任意整数 | 可复现性 |
| `image_url` | string | URL | image-to-video 的源图像 |

---

## 音频生成

### CSM-1B（对话式语音）
具有自然、对话质量的 text-to-speech。

```
generate(
  app_id: "fal-ai/csm-1b",
  input_data: {
    "text": "Hello, welcome to the demo. Let me show you how this works.",
    "speaker_id": 0
  }
)
```

### ThinkSound（Video-to-Audio）
从视频内容生成匹配的音频。

```
generate(
  app_id: "fal-ai/thinksound",
  input_data: {
    "video_url": "<video_url>",
    "prompt": "ambient forest sounds with birds chirping"
  }
)
```

### ElevenLabs（通过 API，无 MCP）
对于专业语音合成，直接使用 ElevenLabs：

```python
import os
import requests

resp = requests.post(
    "https://api.elevenlabs.io/v1/text-to-speech/<voice_id>",
    headers={
        "xi-api-key": os.environ["ELEVENLABS_API_KEY"],
        "Content-Type": "application/json"
    },
    json={
        "text": "Your text here",
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
    }
)
with open("output.mp3", "wb") as f:
    f.write(resp.content)
```

### VideoDB 生成式音频
如果配置了 VideoDB，使用其生成式音频：

```python
# 语音生成
audio = coll.generate_voice(text="Your narration here", voice="alloy")

# 音乐生成
music = coll.generate_music(prompt="upbeat electronic background music", duration=30)

# 音效
sfx = coll.generate_sound_effect(prompt="thunder crack followed by rain")
```

---

## 成本估算

生成之前，检查估算成本：

```
estimate_cost(
  estimate_type: "unit_price",
  endpoints: {
    "fal-ai/nano-banana-pro": {
      "unit_quantity": 1
    }
  }
)
```

## 模型发现

查找用于特定任务的模型：

```
search(query: "text to video")
find(endpoint_ids: ["fal-ai/seedance-1-0-pro"])
models()
```

## 提示

- 迭代 prompt 时使用 `seed` 获得可复现结果
- prompt 迭代从低成本的模型（Nano Banana 2）开始，最终成品再切换到 Pro
- 对于视频，保持 prompt 具描述性但简洁——聚焦于动态和场景
- image-to-video 比纯 text-to-video 产生更可控的结果
- 运行昂贵的视频生成之前检查 `estimate_cost`

## 相关 skill

- `videodb` — 视频处理、编辑和流式传输
- `video-editing` — AI 驱动的视频编辑工作流
- `content-engine` — 面向社交平台的内容创作
