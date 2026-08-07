---
name: videodb
description: 对视频和音频进行观看、理解、行动。观看——从本地文件、URL、RTSP/直播流接入，或实时录制桌面；返回实时上下文与可播放的流链接。理解——提取帧、构建视觉/语义/时间索引，并按时间戳搜索时刻、自动生成片段。行动——转码与归一化（codec、fps、分辨率、宽高比），执行时间轴编辑（字幕、文本/图像叠加、品牌标识、音频叠加、配音、翻译），生成媒体资产（图像、音频、视频），并为直播流或桌面捕获的事件创建实时告警。
metadata:
  origin: ECC
allowed-tools: Read Grep Glob Bash(python:*)
argument-hint: "[task description]"
---

# VideoDB Skill

**对视频、直播流和桌面会话的感知、记忆与行动。**

## 何时使用

### 桌面感知
- 启动/停止捕获**屏幕、麦克风和系统音频**的**桌面会话**
- 串流**实时上下文**并存储**情景式会话记忆**
- 对所说内容与屏幕上发生的事件运行**实时告警/触发器**
- 生成**会话摘要**、可搜索的时间轴以及**可播放的证据链接**

### 视频接入 + 流
- 接入**文件或 URL**并返回**可播放的 web 流链接**
- 转码/归一化：**codec、bitrate、fps、分辨率、宽高比**

### 索引 + 搜索（时间戳 + 证据）
- 构建**视觉**、**语音**和**关键词**索引
- 搜索并返回带**时间戳**和**可播放证据**的精确时刻
- 从搜索结果自动创建**片段**

### 时间轴编辑 + 生成
- 字幕：**生成**、**翻译**、**烧录**
- 叠加：**文本/图像/品牌标识**、动态字幕
- 音频：**背景音乐**、**画外音**、**配音**
- 通过**时间轴操作**进行程序化合成与导出

### 直播流（RTSP）+ 监控
- 连接 **RTSP/直播流**
- 运行**实时视觉与语音理解**，并为监控工作流发出**事件/告警**

## 工作原理

### 常见输入
- 本地**文件路径**、公开**URL** 或 **RTSP URL**
- 桌面捕获请求：**启动 / 停止 / 汇总会话**
- 期望的操作：获取用于理解的上下文、转码规格、索引规格、搜索查询、片段范围、时间轴编辑、告警规则

### 常见输出
- **流 URL**
- 带**时间戳**和**证据链接**的搜索结果
- 生成的资产：字幕、音频、图像、片段
- 用于直播流的**事件/告警 payload**
- 桌面**会话摘要**与记忆条目

### 运行 Python 代码

在运行任何 VideoDB 代码之前，切换到项目目录并加载环境变量：

```python
from dotenv import load_dotenv
load_dotenv(".env")

import videodb
conn = videodb.connect()
```

这会从以下位置读取 `VIDEO_DB_API_KEY`：
1. 环境变量（如果已导出）
2. 当前目录下项目的 `.env` 文件

如果密钥缺失，`videodb.connect()` 会自动抛出 `AuthenticationError`。

当短小的内联命令可行时，不要编写脚本文件。

在编写内联 Python（`python -c "..."`）时，始终使用格式正确的代码——用分号分隔语句并保持可读性。当代码超过约 3 条语句时，改用 heredoc：

```bash
python << 'EOF'
from dotenv import load_dotenv
load_dotenv(".env")

import videodb
conn = videodb.connect()
coll = conn.get_collection()
print(f"Videos: {len(coll.get_videos())}")
EOF
```

### 设置

当用户要求“setup videodb”或类似操作时：

### 1. 安装 SDK

```bash
pip install "videodb[capture]" python-dotenv
```

如果 `videodb[capture]` 在 Linux 上安装失败，请去掉 capture extra 进行安装：

```bash
pip install videodb python-dotenv
```

### 2. 配置 API key

用户必须使用以下方法**之一**设置 `VIDEO_DB_API_KEY`：

- **在终端中导出**（在启动 Claude 之前）：`export VIDEO_DB_API_KEY=your-key`
- **项目 `.env` 文件**：将 `VIDEO_DB_API_KEY=your-key` 保存到项目的 `.env` 文件中

在 [console.videodb.io](https://console.videodb.io) 获取免费 API key（50 次免费上传，无需信用卡）。

**不要**自行读取、写入或处理 API key。始终让用户来设置。

### 快速参考

### 上传媒体

```python
# URL
video = coll.upload(url="https://example.com/video.mp4")

# YouTube
video = coll.upload(url="https://www.youtube.com/watch?v=VIDEO_ID")

# 本地文件
video = coll.upload(file_path="/path/to/video.mp4")
```

### 文本转录 + 字幕

```python
# force=True 会在视频已建立索引时跳过该错误
video.index_spoken_words(force=True)
text = video.get_transcript_text()
stream_url = video.add_subtitle()
```

### 在视频中搜索

```python
from videodb.exceptions import InvalidRequestError

video.index_spoken_words(force=True)

# search() 在未找到结果时会抛出 InvalidRequestError。
# 始终用 try/except 包裹，并将“No results found”视为空结果。
try:
    results = video.search("product demo")
    shots = results.get_shots()
    stream_url = results.compile()
except InvalidRequestError as e:
    if "No results found" in str(e):
        shots = []
    else:
        raise
```

### 场景搜索

```python
import re
from videodb import SearchType, IndexType, SceneExtractionType
from videodb.exceptions import InvalidRequestError

# index_scenes() 没有 force 参数——如果场景索引已存在，它会抛出错误。
# 从错误信息中提取已存在的索引 ID。
try:
    scene_index_id = video.index_scenes(
        extraction_type=SceneExtractionType.shot_based,
        prompt="Describe the visual content in this scene.",
    )
except Exception as e:
    match = re.search(r"id\s+([a-f0-9]+)", str(e))
    if match:
        scene_index_id = match.group(1)
    else:
        raise

# 使用 score_threshold 过滤低相关度的噪声（推荐值：0.3+）
try:
    results = video.search(
        query="person writing on a whiteboard",
        search_type=SearchType.semantic,
        index_type=IndexType.scene,
        scene_index_id=scene_index_id,
        score_threshold=0.3,
    )
    shots = results.get_shots()
    stream_url = results.compile()
except InvalidRequestError as e:
    if "No results found" in str(e):
        shots = []
    else:
        raise
```

### 时间轴编辑

**重要：** 在构建时间轴之前，始终验证时间戳：
- `start` 必须 >= 0（负值会被静默接受，但会产生损坏的输出）
- `start` 必须 < `end`
- `end` 必须 <= `video.length`

```python
from videodb.timeline import Timeline
from videodb.asset import VideoAsset, TextAsset, TextStyle

timeline = Timeline(conn)
timeline.add_inline(VideoAsset(asset_id=video.id, start=10, end=30))
timeline.add_overlay(0, TextAsset(text="The End", duration=3, style=TextStyle(fontsize=36)))
stream_url = timeline.generate_stream()
```

### 转码视频（更改分辨率 / 质量）

```python
from videodb import TranscodeMode, VideoConfig, AudioConfig

# 在服务端更改分辨率、质量或宽高比
job_id = conn.transcode(
    source="https://example.com/video.mp4",
    callback_url="https://example.com/webhook",
    mode=TranscodeMode.economy,
    video_config=VideoConfig(resolution=720, quality=23, aspect_ratio="16:9"),
    audio_config=AudioConfig(mute=False),
)
```

### 调整宽高比（用于社交平台）

**警告：** `reframe()` 是一项缓慢的服务端操作。对于长视频，它可能耗时数分钟并可能超时。最佳实践：
- 尽可能使用 `start`/`end` 将其限制在短片段内
- 对于完整长度的视频，使用 `callback_url` 进行异步处理
- 先在 `Timeline` 上裁剪视频，然后对较短的裁剪结果进行 reframe

```python
from videodb import ReframeMode

# 始终优先对短片段进行 reframe：
reframed = video.reframe(start=0, end=60, target="vertical", mode=ReframeMode.smart)

# 对完整长度的视频进行异步 reframe（返回 None，结果通过 webhook 返回）：
video.reframe(target="vertical", callback_url="https://example.com/webhook")

# 预设值：“vertical” (9:16)、“square” (1:1)、“landscape” (16:9)
reframed = video.reframe(start=0, end=60, target="square")

# 自定义尺寸
reframed = video.reframe(start=0, end=60, target={"width": 1280, "height": 720})
```

### 生成式媒体

```python
image = coll.generate_image(
    prompt="a sunset over mountains",
    aspect_ratio="16:9",
)
```

## 错误处理

```python
from videodb.exceptions import AuthenticationError, InvalidRequestError

try:
    conn = videodb.connect()
except AuthenticationError:
    print("Check your VIDEO_DB_API_KEY")

try:
    video = coll.upload(url="https://example.com/video.mp4")
except InvalidRequestError as e:
    print(f"Upload failed: {e}")
```

### 常见陷阱

| 场景 | 错误信息 | 解决方案 |
|----------|--------------|----------|
| 对已建立索引的视频再次建立索引 | `Spoken word index for video already exists` | 使用 `video.index_spoken_words(force=True)` 在已建立索引时跳过 |
| 场景索引已存在 | `Scene index with id XXXX already exists` | 使用 `re.search(r"id\s+([a-f0-9]+)", str(e))` 从错误信息中提取已存在的 `scene_index_id` |
| 搜索未找到匹配项 | `InvalidRequestError: No results found` | 捕获该异常并视为空结果（`shots = []`） |
| Reframe 超时 | 在长视频上无限阻塞 | 使用 `start`/`end` 限制片段，或传入 `callback_url` 进行异步处理 |
| Timeline 上的负时间戳 | 静默产生损坏的流 | 在创建 `VideoAsset` 之前始终验证 `start >= 0` |
| `generate_video()` / `create_collection()` 失败 | `Operation not allowed` 或 `maximum limit` | 受套餐限制的功能——告知用户相关套餐限制 |

## 示例

### 典型提示词
- “启动桌面捕获，并在出现密码字段时告警。”
- “录制我的会话，并在结束时生成可执行的摘要。”
- “接入此文件并返回可播放的流链接。”
- “对此文件夹建立索引，找出每一个包含人物的场景，并返回时间戳。”
- “生成字幕、将其烧录进去，并添加轻柔的背景音乐。”
- “连接此 RTSP URL，并在有人进入该区域时告警。”

### 屏幕录制（桌面捕获）

使用 `ws_listener.py` 在录制会话期间捕获 WebSocket 事件。桌面捕获仅支持 **macOS**。

#### 快速开始

1. **选择 state 目录**：`STATE_DIR="${VIDEODB_EVENTS_DIR:-$HOME/.local/state/videodb}"`
2. **启动监听器**：`VIDEODB_EVENTS_DIR="$STATE_DIR" python scripts/ws_listener.py --clear "$STATE_DIR" &`
3. **获取 WebSocket ID**：`cat "$STATE_DIR/videodb_ws_id"`
4. **运行捕获代码**（完整工作流参见 reference/capture.md）
5. **事件写入位置**：`$STATE_DIR/videodb_events.jsonl`

在每次开始新的捕获运行时使用 `--clear`，以免陈旧的转录和视觉事件泄漏到新会话中。

#### 查询事件

```python
import json
import os
import time
from pathlib import Path

events_dir = Path(os.environ.get("VIDEODB_EVENTS_DIR", Path.home() / ".local" / "state" / "videodb"))
events_file = events_dir / "videodb_events.jsonl"
events = []

if events_file.exists():
    with events_file.open(encoding="utf-8") as handle:
        for line in handle:
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue

transcripts = [e["data"]["text"] for e in events if e.get("channel") == "transcript"]
cutoff = time.time() - 300
recent_visual = [
    e for e in events
    if e.get("channel") == "visual_index" and e["unix_ts"] > cutoff
]
```

## 额外文档

参考文档位于与本 SKILL.md 文件相邻的 `reference/` 目录中。如果需要，可使用 Glob 工具定位。

- [reference/api-reference.md](reference/api-reference.md) - 完整的 VideoDB Python SDK API 参考
- [reference/search.md](reference/search.md) - 视频搜索深度指南（语音搜索与基于场景的搜索）
- [reference/editor.md](reference/editor.md) - 时间轴编辑、资产与合成
- [reference/streaming.md](reference/streaming.md) - HLS 流媒体与即时播放
- [reference/generative.md](reference/generative.md) - AI 驱动的媒体生成（图像、视频、音频）
- [reference/rtstream.md](reference/rtstream.md) - 直播流接入工作流（RTSP/RTMP）
- [reference/rtstream-reference.md](reference/rtstream-reference.md) - RTStream SDK 方法与 AI 流水线
- [reference/capture.md](reference/capture.md) - 桌面捕获工作流
- [reference/capture-reference.md](reference/capture-reference.md) - 捕获 SDK 与 WebSocket 事件
- [reference/use-cases.md](reference/use-cases.md) - 常见视频处理模式与示例

**当 VideoDB 支持某项操作时，不要使用 ffmpeg、moviepy 或本地编码工具。** 以下操作全部由 VideoDB 在服务端处理——裁剪、合并片段、叠加音频或音乐、添加字幕、文本/图像叠加、转码、分辨率更改、宽高比转换、按平台要求调整尺寸、转录以及媒体生成。只有在 reference/editor.md 中 Limitations 所列的操作（转场、变速、裁剪/缩放、色彩分级、音量混合）才回退到本地工具。

### 何时使用何种方案

| 问题 | VideoDB 解决方案 |
|---------|-----------------|
| 平台拒绝视频的宽高比或分辨率 | 使用带 `VideoConfig` 的 `video.reframe()` 或 `conn.transcode()` |
| 需要为 Twitter/Instagram/TikTok 调整视频尺寸 | `video.reframe(target="vertical")` 或 `target="square"` |
| 需要更改分辨率（例如 1080p → 720p） | 使用 `VideoConfig(resolution=720)` 的 `conn.transcode()` |
| 需要在视频上叠加音频/音乐 | 在 `Timeline` 上使用 `AudioAsset` |
| 需要添加字幕 | `video.add_subtitle()` 或 `CaptionAsset` |
| 需要合并/裁剪片段 | 在 `Timeline` 上使用 `VideoAsset` |
| 需要生成画外音、音乐或 SFX | `coll.generate_voice()`、`generate_music()`、`generate_sound_effect()` |

## 出处

本 skill 的参考材料以 vendored 方式本地存放在 `skills/videodb/reference/` 下。
在运行时请使用上述本地副本，而不要跟随外部仓库链接。
