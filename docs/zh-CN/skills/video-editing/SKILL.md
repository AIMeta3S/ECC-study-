---
name: video-editing
description: 用于裁切、整理和增强真实素材的 AI 辅助视频剪辑工作流。覆盖从原始采集到 FFmpeg、Remotion、ElevenLabs、fal.ai，再到 Descript 或 CapCut 最终打磨的完整流水线。当用户想要剪辑视频、裁切素材、制作 vlog 或构建视频内容时使用。
metadata:
  origin: ECC
---

# 视频编辑

针对真实素材的 AI 辅助剪辑。不是从 prompt 生成。是快速剪辑已有视频。

## 何时激活

- 用户想要剪辑、裁切或整理视频素材
- 将长录像转换为短视频内容
- 从原始采集素材制作 vlog、教程或演示视频
- 为已有视频添加 overlay、字幕、音乐或配音
- 为不同平台（YouTube、TikTok、Instagram）重新取景
- 用户说“剪辑视频”、“裁切这段素材”、“做个 vlog”或“视频工作流”

## 核心论点

当你不再让 AI 创建整段视频，而是开始用它来压缩、整理和增强真实素材时，AI 视频剪辑就变得有用。价值不在于生成。价值在于压缩。

## 流水线

```
Screen Studio / raw footage
  → Claude / Codex
  → FFmpeg
  → Remotion
  → ElevenLabs / fal.ai
  → Descript or CapCut
```

每一层都有特定职责。不要跳过任何层。不要试图让一个工具做完所有事。

## 第 1 层：采集（Screen Studio / 原始素材）

收集源素材：
- **Screen Studio**：用于 app 演示、编码会话、浏览器工作流的精美屏幕录制
- **原始摄像机素材**：vlog 素材、访谈、活动录像
- **通过 VideoDB 桌面采集**：带有实时上下文的会话录制（见 `videodb` skill）

输出：准备好用于整理的原始文件。

## 第 2 层：整理（Claude / Codex）

使用 Claude Code 或 Codex 来：
- **转录并标注**：生成 transcript、识别主题和话题
- **规划结构**：决定保留什么、裁切什么、什么顺序合适
- **识别无效片段**：找到停顿、跑题、重复镜头
- **生成 edit decision list**：裁切的时间戳、要保留的片段
- **搭建 FFmpeg 和 Remotion 代码**：生成命令和合成

```
示例 prompt：
"这是一份 4 小时录像的 transcript。为一个 24 分钟的 vlog 找出 8 个最有力的片段。
为每个片段给出 FFmpeg 裁切命令。"
```

这一层关注的是结构，不是最终的创意品味。

## 第 3 层：确定性裁切（FFmpeg）

FFmpeg 处理枯燥但关键的工作：拆分、修剪、拼接和预处理。

### 按时间戳提取片段

```bash
ffmpeg -i raw.mp4 -ss 00:12:30 -to 00:15:45 -c copy segment_01.mp4
```

### 从 edit decision list 批量裁切

```bash
#!/bin/bash
# cuts.txt: start,end,label
while IFS=, read -r start end label; do
  ffmpeg -i raw.mp4 -ss "$start" -to "$end" -c copy "segments/${label}.mp4"
done < cuts.txt
```

### 拼接片段

```bash
# 创建文件列表
for f in segments/*.mp4; do echo "file '$f'"; done > concat.txt
ffmpeg -f concat -safe 0 -i concat.txt -c copy assembled.mp4
```

### 创建 proxy 以加快剪辑

```bash
ffmpeg -i raw.mp4 -vf "scale=960:-2" -c:v libx264 -preset ultrafast -crf 28 proxy.mp4
```

### 提取音频用于转录

```bash
ffmpeg -i raw.mp4 -vn -acodec pcm_s16le -ar 16000 audio.wav
```

### 归一化音频电平

```bash
ffmpeg -i segment.mp4 -af loudnorm=I=-16:TP=-1.5:LRA=11 -c:v copy normalized.mp4
```

## 第 4 层：可编程合成（Remotion）

Remotion 将剪辑难题转化为可组合的代码。用它处理那些传统编辑器做起来很痛苦的事情：

### 何时使用 Remotion

- Overlay：文字、图片、品牌标识、lower third
- 数据可视化：图表、统计、动画数字
- 动态图形：转场、讲解动画
- 可组合场景：跨视频复用的模板
- 产品演示：带标注的截图、UI 高亮

### 基本 Remotion 合成

```tsx
import { AbsoluteFill, Sequence, Video, useCurrentFrame } from "remotion";

export const VlogComposition: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      {/* 主要素材 */}
      <Sequence from={0} durationInFrames={300}>
        <Video src="/segments/intro.mp4" />
      </Sequence>

      {/* 标题 overlay */}
      <Sequence from={30} durationInFrames={90}>
        <AbsoluteFill style={{
          justifyContent: "center",
          alignItems: "center",
        }}>
          <h1 style={{
            fontSize: 72,
            color: "white",
            textShadow: "2px 2px 8px rgba(0,0,0,0.8)",
          }}>
            The AI Editing Stack
          </h1>
        </AbsoluteFill>
      </Sequence>

      {/* 下一个片段 */}
      <Sequence from={300} durationInFrames={450}>
        <Video src="/segments/demo.mp4" />
      </Sequence>
    </AbsoluteFill>
  );
};
```

### 渲染输出

```bash
npx remotion render src/index.ts VlogComposition output.mp4
```

详见 [Remotion 文档](https://www.remotion.dev/docs) 获取详细模式和 API 参考。

## 第 5 层：生成素材（ElevenLabs / fal.ai）

只生成你需要的内容。不要生成整段视频。

### 使用 ElevenLabs 配音

```python
import os
import requests

resp = requests.post(
    f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
    headers={
        "xi-api-key": os.environ["ELEVENLABS_API_KEY"],
        "Content-Type": "application/json"
    },
    json={
        "text": "Your narration text here",
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
    }
)
with open("voiceover.mp3", "wb") as f:
    f.write(resp.content)
```

### 使用 fal.ai 生成音乐和 SFX

使用 `fal-ai-media` skill 来：
- 背景音乐生成
- SFX（ThinkSound 模型用于 video-to-audio）
- 转场音效

### 使用 fal.ai 生成视觉素材

用于不存在的插入镜头、缩略图或 b-roll：
```
generate(app_id: "fal-ai/nano-banana-pro", input_data: {
  "prompt": "professional thumbnail for tech vlog, dark background, code on screen",
  "image_size": "landscape_16_9"
})
```

### VideoDB 生成式音频

如果已配置 VideoDB：
```python
voiceover = coll.generate_voice(text="Narration here", voice="alloy")
music = coll.generate_music(prompt="lo-fi background for coding vlog", duration=120)
sfx = coll.generate_sound_effect(prompt="subtle whoosh transition")
```

## 第 6 层：最终打磨（Descript / CapCut）

最后一层是人。使用传统编辑器来：
- **节奏**：调整感觉过快或过慢的剪切
- **字幕**：自动生成后手动清理
- **调色**：基础校正和氛围
- **最终混音**：平衡人声、音乐和 SFX 电平
- **导出**：平台专属的格式和质量设置

品味就在这里。AI 清除重复性工作。最终决定由你做出。

## 社交媒体重新取景

不同平台需要不同的宽高比：

| 平台 | 宽高比 | 分辨率 |
|----------|-------------|------------|
| YouTube | 16:9 | 1920x1080 |
| TikTok / Reels | 9:16 | 1080x1920 |
| Instagram Feed | 1:1 | 1080x1080 |
| X / Twitter | 16:9 or 1:1 | 1280x720 or 720x720 |

### 用 FFmpeg 重新取景

```bash
# 16:9 转 9:16（中心裁剪）
ffmpeg -i input.mp4 -vf "crop=ih*9/16:ih,scale=1080:1920" vertical.mp4

# 16:9 转 1:1（中心裁剪）
ffmpeg -i input.mp4 -vf "crop=ih:ih,scale=1080:1080" square.mp4
```

### 用 VideoDB 重新取景

```python
from videodb import ReframeMode

# 智能重新取景（AI 引导的主体追踪）
reframed = video.reframe(start=0, end=60, target="vertical", mode=ReframeMode.smart)
```

## 场景检测与自动裁切

### FFmpeg 场景检测

```bash
# 检测场景变化（阈值 0.3 = 中等灵敏度）
ffmpeg -i input.mp4 -vf "select='gt(scene,0.3)',showinfo" -vsync vfr -f null - 2>&1 | grep showinfo
```

### 用于自动裁切的静音检测

```bash
# 查找静音片段（用于裁切空白）
ffmpeg -i input.mp4 -af silencedetect=noise=-30dB:d=2 -f null - 2>&1 | grep silence
```

### 高光提取

使用 Claude 分析 transcript + 场景时间戳：
```
"给定这份带时间戳的 transcript 以及这些场景变化点，
为社交媒体找出 5 个最吸引人的 30 秒片段。"
```

## 各工具最擅长的事

| 工具 | 优势 | 劣势 |
|------|----------|----------|
| Claude / Codex | 整理、规划、代码生成 | 不是创意品味层 |
| FFmpeg | 确定性裁切、批量处理、格式转换 | 没有可视化编辑 UI |
| Remotion | 可编程 overlay、可组合场景、可复用模板 | 对非开发者有学习曲线 |
| Screen Studio | 即时精美的屏幕录制 | 仅限屏幕采集 |
| ElevenLabs | 语音、旁白、音乐、SFX | 不是工作流的中心 |
| Descript / CapCut | 最终节奏、字幕、打磨 | 手动，无法自动化 |

## 关键原则

1. **剪辑，而不是生成。** 这个工作流用于裁切真实素材，而不是从 prompt 创建。
2. **先结构后风格。** 在触碰任何视觉内容之前，先在第 2 层把故事理顺。
3. **FFmpeg 是骨干。** 枯燥但关键。让长素材变得可管理。
4. **用 Remotion 实现可复用。** 如果你不止做一次，就把它做成 Remotion 组件。
5. **有选择地生成。** 只对不存在的素材使用 AI 生成，不要对所有内容都生成。
6. **品味是最后一层。** AI 清除重复性工作。最终的创意决定由你做出。

## 相关 skill

- `fal-ai-media` — AI 图像、视频和音频生成
- `videodb` — 服务端视频处理、索引和流式传输
- `content-engine` — 平台原生内容分发
