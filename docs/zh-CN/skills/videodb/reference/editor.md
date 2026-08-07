# 时间线编辑指南

VideoDB 提供了一个非破坏性的时间线编辑器，用于从多个 asset 组合视频、添加文本和图像 overlay、混合音频轨道以及裁剪 clip —— 全部在服务端完成，无需重新编码或本地工具。可用于裁剪、合并 clip、在视频上 overlay 音频/音乐、添加字幕，以及叠加文本或图像。

## 前置条件

视频、音频和图像**必须先上传**到 collection，然后才能作为时间线 asset 使用。对于字幕 overlay，视频还必须**已索引 spoken words**。

## 核心概念

### Timeline

`Timeline` 是一个虚拟组合层。Asset 以 **inline**（按顺序放在主轨道上）或 **overlay**（在特定时间戳上分层放置）的方式放置其上。它不会修改原始媒体；最终流按需编译。

```python
from videodb.timeline import Timeline

timeline = Timeline(conn)
```

### Asset

时间线上的每个元素都是一个 **asset**。VideoDB 提供五种 asset 类型：

| Asset | 导入 | 主要用途 |
|-------|--------|-------------|
| `VideoAsset` | `from videodb.asset import VideoAsset` | 视频 clip（裁剪、排序） |
| `AudioAsset` | `from videodb.asset import AudioAsset` | 音乐、SFX、旁白 |
| `ImageAsset` | `from videodb.asset import ImageAsset` | Logo、缩略图、overlay |
| `TextAsset` | `from videodb.asset import TextAsset, TextStyle` | 标题、字幕、lower-thirds |
| `CaptionAsset` | `from videodb.editor import CaptionAsset` | 自动渲染的字幕（Editor API） |

## 构建时间线

### 以 inline 方式添加视频 clip

Inline asset 在主视频轨道上依次播放。`add_inline` 方法只接受 `VideoAsset`：

```python
from videodb.asset import VideoAsset

video_a = coll.get_video(video_id_a)
video_b = coll.get_video(video_id_b)

timeline = Timeline(conn)
timeline.add_inline(VideoAsset(asset_id=video_a.id))
timeline.add_inline(VideoAsset(asset_id=video_b.id))

stream_url = timeline.generate_stream()
```

### 裁剪 / 子 clip

在 `VideoAsset` 上使用 `start` 和 `end` 来提取片段：

```python
# 仅截取源视频的第 10–30 秒
clip = VideoAsset(asset_id=video.id, start=10, end=30)
timeline.add_inline(clip)
```

### VideoAsset 参数

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `asset_id` | `str` | required | 视频媒体 ID |
| `start` | `float` | `0` | 裁剪起始（秒） |
| `end` | `float\|None` | `None` | 裁剪结束（`None` = 完整） |

> **警告：** SDK 不会校验负数时间戳。传入 `start=-5` 会被静默接受，但会产生损坏或意外的输出。在创建 `VideoAsset` 之前，务必确保 `start >= 0`、`start < end` 且 `end <= video.length`。

## 文本 Overlay

在时间线上的任意位置添加标题、lower-thirds 或字幕：

```python
from videodb.asset import TextAsset, TextStyle

title = TextAsset(
    text="Welcome to the Demo",
    duration=5,
    style=TextStyle(
        fontsize=36,
        fontcolor="white",
        boxcolor="black",
        alpha=0.8,
        font="Sans",
    ),
)

# 将标题 overlay 在最开头 (t=0)
timeline.add_overlay(0, title)
```

### TextStyle 参数

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `fontsize` | `int` | `24` | 字体大小（像素） |
| `fontcolor` | `str` | `"black"` | CSS 颜色名或十六进制值 |
| `fontcolor_expr` | `str` | `""` | 动态字体颜色表达式 |
| `alpha` | `float` | `1.0` | 文本不透明度 (0.0–1.0) |
| `font` | `str` | `"Sans"` | 字体族 |
| `box` | `bool` | `True` | 启用背景框 |
| `boxcolor` | `str` | `"white"` | 背景框颜色 |
| `boxborderw` | `str` | `"10"` | 框边框宽度 |
| `boxw` | `int` | `0` | 框宽度覆盖 |
| `boxh` | `int` | `0` | 框高度覆盖 |
| `line_spacing` | `int` | `0` | 行间距 |
| `text_align` | `str` | `"T"` | 框内文本对齐方式 |
| `y_align` | `str` | `"text"` | 垂直对齐参考 |
| `borderw` | `int` | `0` | 文本边框宽度 |
| `bordercolor` | `str` | `"black"` | 文本边框颜色 |
| `expansion` | `str` | `"normal"` | 文本展开模式 |
| `basetime` | `int` | `0` | 基于时间的表达式的基础时间 |
| `fix_bounds` | `bool` | `False` | 修复文本边界 |
| `text_shaping` | `bool` | `True` | 启用文本整形 |
| `shadowcolor` | `str` | `"black"` | 阴影颜色 |
| `shadowx` | `int` | `0` | 阴影 X 偏移 |
| `shadowy` | `int` | `0` | 阴影 Y 偏移 |
| `tabsize` | `int` | `4` | 制表符大小（空格数） |
| `x` | `str` | `"(main_w-text_w)/2"` | 水平位置表达式 |
| `y` | `str` | `"(main_h-text_h)/2"` | 垂直位置表达式 |

## 音频 Overlay

在视频轨道之上叠加背景音乐、音效或旁白：

```python
from videodb.asset import AudioAsset

music = coll.get_audio(music_id)

audio_layer = AudioAsset(
    asset_id=music.id,
    disable_other_tracks=False,
    fade_in_duration=2,
    fade_out_duration=2,
)

# 从 t=0 开始播放音乐，overlay 在视频轨道上
timeline.add_overlay(0, audio_layer)
```

### AudioAsset 参数

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `asset_id` | `str` | required | 音频媒体 ID |
| `start` | `float` | `0` | 裁剪起始（秒） |
| `end` | `float\|None` | `None` | 裁剪结束（`None` = 完整） |
| `disable_other_tracks` | `bool` | `True` | 为 True 时，静音其他音频轨道 |
| `fade_in_duration` | `float` | `0` | 淡入秒数（最大 5） |
| `fade_out_duration` | `float` | `0` | 淡出秒数（最大 5） |

## 图像 Overlay

将 logo、水印或生成的图像作为 overlay 添加：

```python
from videodb.asset import ImageAsset

logo = coll.get_image(logo_id)

logo_overlay = ImageAsset(
    asset_id=logo.id,
    duration=10,
    width=120,
    height=60,
    x=20,
    y=20,
)

timeline.add_overlay(0, logo_overlay)
```

### ImageAsset 参数

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `asset_id` | `str` | required | 图像媒体 ID |
| `width` | `int\|str` | `100` | 显示宽度 |
| `height` | `int\|str` | `100` | 显示高度 |
| `x` | `int` | `80` | 水平位置（距左侧像素数） |
| `y` | `int` | `20` | 垂直位置（距顶部像素数） |
| `duration` | `float\|None` | `None` | 显示时长（秒） |

## 字幕 Overlay

有两种方式可以为视频添加字幕。

### 方法一：字幕工作流（最简单）

使用 `video.add_subtitle()` 将字幕直接烧录到视频流上。该方法内部使用 `videodb.timeline.Timeline`：

```python
from videodb import SubtitleStyle

# 视频必须先索引 spoken words（force=True 表示如已完成则跳过）
video.index_spoken_words(force=True)

# 使用默认样式添加字幕
stream_url = video.add_subtitle()

# 或自定义字幕样式
stream_url = video.add_subtitle(style=SubtitleStyle(
    font_name="Arial",
    font_size=22,
    primary_colour="&H00FFFFFF",
    bold=True,
))
```

### 方法二：Editor API（高级）

Editor API（`videodb.editor`）提供了一套基于轨道的组合系统，包含 `CaptionAsset`、`Clip`、`Track` 以及它自己的 `Timeline`。这是一个与上面使用的 `videodb.timeline.Timeline` 不同的独立 API。

```python
from videodb.editor import (
    CaptionAsset,
    Clip,
    Track,
    Timeline as EditorTimeline,
    FontStyling,
    BorderAndShadow,
    Positioning,
    CaptionAnimation,
)

# 视频必须先索引 spoken words（force=True 表示如已完成则跳过）
video.index_spoken_words(force=True)

# 创建字幕 asset
caption = CaptionAsset(
    src="auto",
    font=FontStyling(name="Clear Sans", size=30),
    primary_color="&H00FFFFFF",
    back_color="&H00000000",
    border=BorderAndShadow(outline=1),
    position=Positioning(margin_v=30),
    animation=CaptionAnimation.box_highlight,
)

# 用轨道和 clip 构建一个 editor 时间线
editor_tl = EditorTimeline(conn)
track = Track()
track.add_clip(start=0, clip=Clip(asset=caption, duration=video.length))
editor_tl.add_track(track)
stream_url = editor_tl.generate_stream()
```

### CaptionAsset 参数

| 参数 | 类型 | 默认值 | 描述 |
|-----------|------|---------|-------------|
| `src` | `str` | `"auto"` | 字幕来源（`"auto"` 或 base64 ASS 字符串） |
| `font` | `FontStyling\|None` | `FontStyling()` | 字体样式（名称、大小、粗体、斜体等） |
| `primary_color` | `str` | `"&H00FFFFFF"` | 主要文本颜色（ASS 格式） |
| `secondary_color` | `str` | `"&H000000FF"` | 次要文本颜色（ASS 格式） |
| `back_color` | `str` | `"&H00000000"` | 背景颜色（ASS 格式） |
| `border` | `BorderAndShadow\|None` | `BorderAndShadow()` | 边框和阴影样式 |
| `position` | `Positioning\|None` | `Positioning()` | 字幕对齐和边距 |
| `animation` | `CaptionAnimation\|None` | `None` | 动画效果（例如 `box_highlight`、`reveal`、`karaoke`） |

## 编译与流式传输

组装好时间线后，将其编译为可流式传输的 URL。流即时生成 —— 无需等待渲染。

```python
stream_url = timeline.generate_stream()
print(f"Stream: {stream_url}")
```

如需更多流式传输选项（分片流、search-to-stream、音频播放），请参见 [streaming.md](streaming.md)。

## 完整工作流示例

### 带标题卡的精彩集锦

```python
import videodb
from videodb import SearchType
from videodb.exceptions import InvalidRequestError
from videodb.timeline import Timeline
from videodb.asset import VideoAsset, TextAsset, TextStyle

conn = videodb.connect()
coll = conn.get_collection()
video = coll.get_video("your-video-id")

# 1. 搜索关键时刻
video.index_spoken_words(force=True)
try:
    results = video.search("product announcement", search_type=SearchType.semantic)
    shots = results.get_shots()
except InvalidRequestError as exc:
    if "No results found" in str(exc):
        shots = []
    else:
        raise

# 2. 构建时间线
timeline = Timeline(conn)

# 标题卡
title = TextAsset(
    text="Product Launch Highlights",
    duration=4,
    style=TextStyle(fontsize=48, fontcolor="white", boxcolor="#1a1a2e", alpha=0.95),
)
timeline.add_overlay(0, title)

# 追加每个匹配的 clip
for shot in shots:
    asset = VideoAsset(asset_id=shot.video_id, start=shot.start, end=shot.end)
    timeline.add_inline(asset)

# 3. 生成流
stream_url = timeline.generate_stream()
print(f"Highlight reel: {stream_url}")
```

### 带背景音乐的 Logo Overlay

```python
import videodb
from videodb.timeline import Timeline
from videodb.asset import VideoAsset, AudioAsset, ImageAsset

conn = videodb.connect()
coll = conn.get_collection()

main_video = coll.get_video(main_video_id)
music = coll.get_audio(music_id)
logo = coll.get_image(logo_id)

timeline = Timeline(conn)

# 主视频轨道
timeline.add_inline(VideoAsset(asset_id=main_video.id))

# 背景音乐 —— disable_other_tracks=False 表示与视频音频混合
timeline.add_overlay(
    0,
    AudioAsset(asset_id=music.id, disable_other_tracks=False, fade_in_duration=3),
)

# 前 10 秒在右上角放置 Logo
timeline.add_overlay(
    0,
    ImageAsset(asset_id=logo.id, duration=10, x=1140, y=20, width=120, height=60),
)

stream_url = timeline.generate_stream()
print(f"Final video: {stream_url}")
```

### 来自多个视频的多 Clip 蒙太奇

```python
import videodb
from videodb.timeline import Timeline
from videodb.asset import VideoAsset, TextAsset, TextStyle

conn = videodb.connect()
coll = conn.get_collection()

clips = [
    {"video_id": "vid_001", "start": 5, "end": 15, "label": "Scene 1"},
    {"video_id": "vid_002", "start": 0, "end": 20, "label": "Scene 2"},
    {"video_id": "vid_003", "start": 30, "end": 45, "label": "Scene 3"},
]

timeline = Timeline(conn)
timeline_offset = 0.0

for clip in clips:
    # 在每个 clip 上添加一个标签作为 overlay
    label = TextAsset(
        text=clip["label"],
        duration=2,
        style=TextStyle(fontsize=32, fontcolor="white", boxcolor="#333333"),
    )
    timeline.add_inline(
        VideoAsset(asset_id=clip["video_id"], start=clip["start"], end=clip["end"])
    )
    timeline.add_overlay(timeline_offset, label)
    timeline_offset += clip["end"] - clip["start"]

stream_url = timeline.generate_stream()
print(f"Montage: {stream_url}")
```

## 两套 Timeline API

VideoDB 有两套独立的时间线系统。它们**不可互换**：

| | `videodb.timeline.Timeline` | `videodb.editor.Timeline`（Editor API） |
|---|---|---|
| **导入** | `from videodb.timeline import Timeline` | `from videodb.editor import Timeline as EditorTimeline` |
| **Asset** | `VideoAsset`、`AudioAsset`、`ImageAsset`、`TextAsset` | `CaptionAsset`、`Clip`、`Track` |
| **方法** | `add_inline()`、`add_overlay()` | 带有 `Track` / `Clip` 的 `add_track()` |
| **最适用于** | 视频组合、overlay、多 clip 编辑 | 带动画的字幕/字幕样式 |

不要把一个 API 的 asset 混用到另一个中。`CaptionAsset` 仅适用于 Editor API。`VideoAsset` / `AudioAsset` / `ImageAsset` / `TextAsset` 仅适用于 `videodb.timeline.Timeline`。

## 限制与约束

时间线编辑器专为**非破坏性线性组合**而设计。以下操作**不受支持**：

### 不可实现

| 限制 | 详情 |
|---|---|
| **无转场或特效** | 不支持 clip 之间的交叉淡化、擦除、溶解或转场。所有切换均为硬切。 |
| **不支持视频叠视频（画中画）** | `add_inline()` 只接受 `VideoAsset`。无法将一个视频流 overlay 到另一个视频流之上。图像 overlay 可以近似实现静态画中画，但无法用于实时视频。 |
| **无速度或播放控制** | 不支持慢动作、快进、倒放或时间重映射。`VideoAsset` 没有 `speed` 参数。 |
| **不支持裁剪、缩放或平移** | 无法裁剪视频画面的某个区域、应用缩放特效或在一个画面上平移。`video.reframe()` 仅用于宽高比转换。 |
| **无视频滤镜或调色** | 不支持亮度、对比度、饱和度、色调或颜色校正调整。 |
| **不支持动画文本** | `TextAsset` 在其整个时长内是静态的。没有淡入/淡出、移动或动画。如需动画字幕，请使用 `CaptionAsset` 配合 Editor API。 |
| **不支持混合文本样式** | 单个 `TextAsset` 只能有一个 `TextStyle`。无法在单个文本块内混合粗体、斜体或多种颜色。 |
| **不支持空白或纯色 clip** | 无法创建纯色画面、黑屏或独立的标题卡。文本和图像 overlay 需要在 inline 轨道下方有一个 `VideoAsset`。 |
| **不支持音频音量控制** | `AudioAsset` 没有 `volume` 参数。音频要么为全音量，要么通过 `disable_other_tracks` 静音。无法以降低的音量混合。 |
| **不支持关键帧动画** | 无法随时间改变 overlay 属性（例如，将图像从位置 A 移动到 B）。 |

### 约束

| 约束 | 详情 |
|---|---|
| **音频淡入淡出最大 5 秒** | `fade_in_duration` 和 `fade_out_duration` 各自上限为 5 秒。 |
| **Overlay 定位是绝对的** | Overlay 使用相对于时间线起点的绝对时间戳。重新排列 inline clip 不会移动其 overlay。 |
| **Inline 轨道仅支持视频** | `add_inline()` 只接受 `VideoAsset`。音频、图像和文本必须使用 `add_overlay()`。 |
| **无法将 overlay 绑定到 clip** | Overlay 放置在固定的时间线时间戳上。无法将 overlay 附加到特定 inline clip 使其随之移动。 |

## 提示

- **非破坏性**：时间线从不修改源媒体。可以从相同的 asset 创建多个时间线。
- **Overlay 堆叠**：多个 overlay 可以从同一时间戳开始。音频 overlay 会混合在一起；图像/文本 overlay 按添加顺序分层。
- **Inline 仅限 VideoAsset**：`add_inline()` 只接受 `VideoAsset`。对于 `AudioAsset`、`ImageAsset` 和 `TextAsset`，请使用 `add_overlay()`。
- **裁剪精度**：`VideoAsset` 和 `AudioAsset` 上的 `start`/`end` 单位为秒。
- **静音视频音频**：在 overlay 音乐或旁白时，在 `AudioAsset` 上设置 `disable_other_tracks=True` 可静音原始视频音频。
- **淡入淡出上限**：`AudioAsset` 上的 `fade_in_duration` 和 `fade_out_duration` 最大为 5 秒。
- **生成的媒体**：使用 `coll.generate_music()`、`coll.generate_sound_effect()`、`coll.generate_voice()` 和 `coll.generate_image()` 可创建立即用作时间线 asset 的媒体。
