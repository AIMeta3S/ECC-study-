# 完整 API 参考

VideoDB skill 的参考材料。如需使用指南和工作流选择，请从 [../SKILL.md](../SKILL.md) 开始。

## Connection

```python
import videodb

conn = videodb.connect(
    api_key="your-api-key",      # 或设置 VIDEO_DB_API_KEY 环境变量
    base_url=None,                # 自定义 API 端点（可选）
)
```

**返回：** `Connection` 对象

### Connection Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `conn.get_collection(collection_id="default")` | `Collection` | 获取 collection（无 ID 时使用默认值） |
| `conn.get_collections()` | `list[Collection]` | 列出所有 collection |
| `conn.create_collection(name, description, is_public=False)` | `Collection` | 创建新 collection |
| `conn.update_collection(id, name, description)` | `Collection` | 更新 collection |
| `conn.check_usage()` | `dict` | 获取账户使用统计 |
| `conn.upload(source, media_type, name, ...)` | `Video\|Audio\|Image` | 上传到默认 collection |
| `conn.record_meeting(meeting_url, bot_name, ...)` | `Meeting` | 录制会议 |
| `conn.create_capture_session(...)` | `CaptureSession` | 创建 capture session（见 [capture-reference.md](capture-reference.md)） |
| `conn.youtube_search(query, result_threshold, duration)` | `list[dict]` | 搜索 YouTube |
| `conn.transcode(source, callback_url, mode, ...)` | `str` | 转码视频（返回 job ID） |
| `conn.get_transcode_details(job_id)` | `dict` | 获取转码 job 状态和详情 |
| `conn.connect_websocket(collection_id)` | `WebSocketConnection` | 连接 WebSocket（见 [capture-reference.md](capture-reference.md)） |

### Transcode

从 URL 转码视频，可自定义分辨率、质量和音频设置。处理在服务端完成——无需本地 ffmpeg。

```python
from videodb import TranscodeMode, VideoConfig, AudioConfig

job_id = conn.transcode(
    source="https://example.com/video.mp4",
    callback_url="https://example.com/webhook",
    mode=TranscodeMode.economy,
    video_config=VideoConfig(resolution=720, quality=23),
    audio_config=AudioConfig(mute=False),
)
```

#### transcode Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `source` | `str` | required | 要转码的视频 URL（最好是可下载的 URL） |
| `callback_url` | `str` | required | 转码完成时接收 callback 的 URL |
| `mode` | `TranscodeMode` | `TranscodeMode.economy` | 转码速度：`economy` 或 `lightning` |
| `video_config` | `VideoConfig` | `VideoConfig()` | 视频编码设置 |
| `audio_config` | `AudioConfig` | `AudioConfig()` | 音频编码设置 |

返回 job ID（`str`）。使用 `conn.get_transcode_details(job_id)` 查看 job 状态。

```python
details = conn.get_transcode_details(job_id)
```

#### VideoConfig

```python
from videodb import VideoConfig, ResizeMode

config = VideoConfig(
    resolution=720,              # 目标分辨率高度（如 480、720、1080）
    quality=23,                  # 编码质量（数值越低越好，默认 23）
    framerate=30,                # 目标帧率
    aspect_ratio="16:9",         # 目标宽高比
    resize_mode=ResizeMode.crop, # 适配方式：crop、fit 或 pad
)
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `resolution` | `int\|None` | `None` | 目标分辨率高度（像素） |
| `quality` | `int` | `23` | 编码质量（数值越低质量越高） |
| `framerate` | `int\|None` | `None` | 目标帧率 |
| `aspect_ratio` | `str\|None` | `None` | 目标宽高比（如 `"16:9"`、`"9:16"`） |
| `resize_mode` | `str` | `ResizeMode.crop` | 缩放策略：`crop`、`fit` 或 `pad` |

#### AudioConfig

```python
from videodb import AudioConfig

config = AudioConfig(mute=False)
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mute` | `bool` | `False` | 静音音频轨道 |

## Collections

```python
coll = conn.get_collection()
```

### Collection Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `coll.get_videos()` | `list[Video]` | 列出所有视频 |
| `coll.get_video(video_id)` | `Video` | 获取指定视频 |
| `coll.get_audios()` | `list[Audio]` | 列出所有音频 |
| `coll.get_audio(audio_id)` | `Audio` | 获取指定音频 |
| `coll.get_images()` | `list[Image]` | 列出所有图像 |
| `coll.get_image(image_id)` | `Image` | 获取指定图像 |
| `coll.upload(url=None, file_path=None, media_type=None, name=None)` | `Video\|Audio\|Image` | 上传媒体 |
| `coll.search(query, search_type, index_type, score_threshold, namespace, scene_index_id, ...)` | `SearchResult` | 在 collection 内搜索（仅支持 semantic；keyword 和 scene 搜索会抛出 `NotImplementedError`） |
| `coll.generate_image(prompt, aspect_ratio="1:1")` | `Image` | 使用 AI 生成图像 |
| `coll.generate_video(prompt, duration=5)` | `Video` | 使用 AI 生成视频 |
| `coll.generate_music(prompt, duration=5)` | `Audio` | 使用 AI 生成音乐 |
| `coll.generate_sound_effect(prompt, duration=2)` | `Audio` | 生成音效 |
| `coll.generate_voice(text, voice_name="Default")` | `Audio` | 从文本生成语音 |
| `coll.generate_text(prompt, model_name="basic", response_type="text")` | `dict` | LLM 文本生成——通过 `["output"]` 访问结果 |
| `coll.dub_video(video_id, language_code)` | `Video` | 将视频配音为另一种语言 |
| `coll.record_meeting(meeting_url, bot_name, ...)` | `Meeting` | 录制实时会议 |
| `coll.create_capture_session(...)` | `CaptureSession` | 创建 capture session（见 [capture-reference.md](capture-reference.md)） |
| `coll.get_capture_session(...)` | `CaptureSession` | 获取 capture session（见 [capture-reference.md](capture-reference.md)） |
| `coll.connect_rtstream(url, name, ...)` | `RTStream` | 连接直播流（见 [rtstream-reference.md](rtstream-reference.md)） |
| `coll.make_public()` | `None` | 将 collection 设为公开 |
| `coll.make_private()` | `None` | 将 collection 设为私有 |
| `coll.delete_video(video_id)` | `None` | 删除视频 |
| `coll.delete_audio(audio_id)` | `None` | 删除音频 |
| `coll.delete_image(image_id)` | `None` | 删除图像 |
| `coll.delete()` | `None` | 删除 collection |

### Upload Parameters

```python
video = coll.upload(
    url=None,            # 远程 URL（HTTP、YouTube）
    file_path=None,      # 本地文件路径
    media_type=None,     # "video"、"audio" 或 "image"（省略时自动检测）
    name=None,           # 媒体的自定义名称
    description=None,    # 描述
    callback_url=None,   # 用于异步通知的 webhook URL
)
```

## Video Object

```python
video = coll.get_video(video_id)
```

### Video Properties

| Property | Type | Description |
|----------|------|-------------|
| `video.id` | `str` | 唯一视频 ID |
| `video.collection_id` | `str` | 所属 collection ID |
| `video.name` | `str` | 视频名称 |
| `video.description` | `str` | 视频描述 |
| `video.length` | `float` | 时长（秒） |
| `video.stream_url` | `str` | 默认 stream URL |
| `video.player_url` | `str` | 播放器嵌入 URL |
| `video.thumbnail_url` | `str` | 缩略图 URL |

### Video Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `video.generate_stream(timeline=None)` | `str` | 生成 stream URL（可选的 `[(start, end)]` 元组 timeline） |
| `video.play()` | `str` | 在浏览器中打开 stream，返回播放器 URL |
| `video.index_spoken_words(language_code=None, force=False)` | `None` | 为搜索索引语音。如已索引，使用 `force=True` 可跳过。 |
| `video.index_scenes(extraction_type, prompt, extraction_config, metadata, model_name, name, scenes, callback_url)` | `str` | 索引视觉场景（返回 scene_index_id） |
| `video.index_visuals(prompt, batch_config, ...)` | `str` | 索引视觉内容（返回 scene_index_id） |
| `video.index_audio(prompt, model_name, ...)` | `str` | 使用 LLM 索引音频（返回 scene_index_id） |
| `video.get_transcript(start=None, end=None)` | `list[dict]` | 获取带时间戳的 transcript |
| `video.get_transcript_text(start=None, end=None)` | `str` | 获取完整 transcript 文本 |
| `video.generate_transcript(force=None)` | `dict` | 生成 transcript |
| `video.translate_transcript(language, additional_notes)` | `list[dict]` | 翻译 transcript |
| `video.search(query, search_type, index_type, filter, **kwargs)` | `SearchResult` | 在视频内搜索 |
| `video.add_subtitle(style=SubtitleStyle())` | `str` | 添加字幕（返回 stream URL） |
| `video.generate_thumbnail(time=None)` | `str\|Image` | 生成缩略图 |
| `video.get_thumbnails()` | `list[Image]` | 获取所有缩略图 |
| `video.extract_scenes(extraction_type, extraction_config)` | `SceneCollection` | 提取场景 |
| `video.reframe(start, end, target, mode, callback_url)` | `Video\|None` | 调整视频宽高比 |
| `video.clip(prompt, content_type, model_name)` | `str` | 根据 prompt 生成片段（返回 stream URL） |
| `video.insert_video(video, timestamp)` | `str` | 在指定时间戳插入视频 |
| `video.download(name=None)` | `dict` | 下载视频 |
| `video.delete()` | `None` | 删除视频 |

### Reframe

将视频转换为不同宽高比，可选智能对象跟踪。处理在服务端完成。

> **警告：** Reframe 是缓慢的服务端操作。长视频可能需要数分钟并可能超时。始终使用 `start`/`end` 限制片段，或传入 `callback_url` 进行异步处理。

```python
from videodb import ReframeMode

# 始终优先使用短片段以避免超时：
reframed = video.reframe(start=0, end=60, target="vertical", mode=ReframeMode.smart)

# 对完整长度视频进行异步 reframe（返回 None，结果通过 webhook 返回）：
video.reframe(target="vertical", callback_url="https://example.com/webhook")

# 自定义尺寸
reframed = video.reframe(start=0, end=60, target={"width": 1080, "height": 1080})
```

#### reframe Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start` | `float\|None` | `None` | 开始时间（秒）（None = 开头） |
| `end` | `float\|None` | `None` | 结束时间（秒）（None = 视频结尾） |
| `target` | `str\|dict` | `"vertical"` | 预设字符串（`"vertical"`、`"square"`、`"landscape"`）或 `{"width": int, "height": int}` |
| `mode` | `str` | `ReframeMode.smart` | `"simple"`（中心裁剪）或 `"smart"`（对象跟踪） |
| `callback_url` | `str\|None` | `None` | 用于异步通知的 webhook URL |

未提供 `callback_url` 时返回 `Video` 对象，否则返回 `None`。

## Audio Object

```python
audio = coll.get_audio(audio_id)
```

### Audio Properties

| Property | Type | Description |
|----------|------|-------------|
| `audio.id` | `str` | 唯一音频 ID |
| `audio.collection_id` | `str` | 所属 collection ID |
| `audio.name` | `str` | 音频名称 |
| `audio.length` | `float` | 时长（秒） |

### Audio Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `audio.generate_url()` | `str` | 生成用于播放的签名 URL |
| `audio.get_transcript(start=None, end=None)` | `list[dict]` | 获取带时间戳的 transcript |
| `audio.get_transcript_text(start=None, end=None)` | `str` | 获取完整 transcript 文本 |
| `audio.generate_transcript(force=None)` | `dict` | 生成 transcript |
| `audio.delete()` | `None` | 删除音频 |

## Image Object

```python
image = coll.get_image(image_id)
```

### Image Properties

| Property | Type | Description |
|----------|------|-------------|
| `image.id` | `str` | 唯一图像 ID |
| `image.collection_id` | `str` | 所属 collection ID |
| `image.name` | `str` | 图像名称 |
| `image.url` | `str\|None` | 图像 URL（生成的图像可能为 `None`——改用 `generate_url()`） |

### Image Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `image.generate_url()` | `str` | 生成签名 URL |
| `image.delete()` | `None` | 删除图像 |

## Timeline & Editor

### Timeline

```python
from videodb.timeline import Timeline

timeline = Timeline(conn)
```

| Method | Returns | Description |
|--------|---------|-------------|
| `timeline.add_inline(asset)` | `None` | 在主轨道上按顺序添加 `VideoAsset` |
| `timeline.add_overlay(start, asset)` | `None` | 在指定时间戳叠加 `AudioAsset`、`ImageAsset` 或 `TextAsset` |
| `timeline.generate_stream()` | `str` | 编译并获取 stream URL |

### Asset Types

#### VideoAsset

```python
from videodb.asset import VideoAsset

asset = VideoAsset(
    asset_id=video.id,
    start=0,              # 裁剪起点（秒）
    end=None,             # 裁剪终点（秒，None = 完整）
)
```

#### AudioAsset

```python
from videodb.asset import AudioAsset

asset = AudioAsset(
    asset_id=audio.id,
    start=0,
    end=None,
    disable_other_tracks=True,   # 为 True 时静音原始音频
    fade_in_duration=0,          # 秒（最大 5）
    fade_out_duration=0,         # 秒（最大 5）
)
```

#### ImageAsset

```python
from videodb.asset import ImageAsset

asset = ImageAsset(
    asset_id=image.id,
    duration=None,        # 显示时长（秒）
    width=100,            # 显示宽度
    height=100,           # 显示高度
    x=80,                 # 水平位置（距左侧像素）
    y=20,                 # 垂直位置（距顶部像素）
)
```

#### TextAsset

```python
from videodb.asset import TextAsset, TextStyle

asset = TextAsset(
    text="Hello World",
    duration=5,
    style=TextStyle(
        fontsize=24,
        fontcolor="black",
        boxcolor="white",       # 背景框颜色
        alpha=1.0,
        font="Sans",
        text_align="T",         # 框内文本对齐方式
    ),
)
```

#### CaptionAsset (Editor API)

CaptionAsset 属于 Editor API，后者有自己独立的 Timeline、Track 和 Clip 系统：

```python
from videodb.editor import CaptionAsset, FontStyling

asset = CaptionAsset(
    src="auto",                    # "auto" 或 base64 ASS 字符串
    font=FontStyling(name="Clear Sans", size=30),
    primary_color="&H00FFFFFF",
)
```

关于 Editor API 中 CaptionAsset 的完整用法，请参见 [editor.md](editor.md#caption-overlays)。

## Video Search Parameters

```python
results = video.search(
    query="your query",
    search_type=SearchType.semantic,       # semantic、keyword 或 scene
    index_type=IndexType.spoken_word,      # spoken_word 或 scene
    result_threshold=None,                 # 最大结果数
    score_threshold=None,                  # 最小相关度分数
    dynamic_score_percentage=None,         # 动态分数百分比
    scene_index_id=None,                   # 指定目标 scene index（通过 **kwargs 传递）
    filter=[],                             # 用于 scene 搜索的元数据过滤器
)
```

> **注意：** `filter` 是 `video.search()` 中的显式命名参数。`scene_index_id` 通过 `**kwargs` 传递给 API。
>
> **重要：** 当没有匹配结果时，`video.search()` 会抛出 `InvalidRequestError`，消息为 `"No results found"`。始终将搜索调用放在 try/except 中。对于 scene 搜索，使用 `score_threshold=0.3` 或更高以过滤低相关度噪声。

对于 scene 搜索，使用 `search_type=SearchType.semantic` 配合 `index_type=IndexType.scene`。指定目标 scene index 时传入 `scene_index_id`。详情参见 [search.md](search.md)。

## SearchResult Object

```python
results = video.search("query", search_type=SearchType.semantic)
```

| Method | Returns | Description |
|--------|---------|-------------|
| `results.get_shots()` | `list[Shot]` | 获取匹配片段列表 |
| `results.compile()` | `str` | 将所有 shot 编译为 stream URL |
| `results.play()` | `str` | 在浏览器中打开编译后的 stream |

### Shot Properties

| Property | Type | Description |
|----------|------|-------------|
| `shot.video_id` | `str` | 源视频 ID |
| `shot.video_length` | `float` | 源视频时长 |
| `shot.video_title` | `str` | 源视频标题 |
| `shot.start` | `float` | 开始时间（秒） |
| `shot.end` | `float` | 结束时间（秒） |
| `shot.text` | `str` | 匹配的文本内容 |
| `shot.search_score` | `float` | 搜索相关度分数 |

| Method | Returns | Description |
|--------|---------|-------------|
| `shot.generate_stream()` | `str` | 播放此特定 shot |
| `shot.play()` | `str` | 在浏览器中打开 shot stream |

## Meeting Object

```python
meeting = coll.record_meeting(
    meeting_url="https://meet.google.com/...",
    bot_name="Bot",
    callback_url=None,          # 用于状态更新的 webhook URL
    callback_data=None,         # 可选 dict，传递给 callback
    time_zone="UTC",            # 会议时区
)
```

### Meeting Properties

| Property | Type | Description |
|----------|------|-------------|
| `meeting.id` | `str` | 唯一会议 ID |
| `meeting.collection_id` | `str` | 所属 collection ID |
| `meeting.status` | `str` | 当前状态 |
| `meeting.video_id` | `str` | 录制视频 ID（完成后） |
| `meeting.bot_name` | `str` | Bot 名称 |
| `meeting.meeting_title` | `str` | 会议标题 |
| `meeting.meeting_url` | `str` | 会议 URL |
| `meeting.speaker_timeline` | `dict` | 发言人 timeline 数据 |
| `meeting.is_active` | `bool` | 初始化或处理中时为 True |
| `meeting.is_completed` | `bool` | 完成时为 True |

### Meeting Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `meeting.refresh()` | `Meeting` | 从服务器刷新数据 |
| `meeting.wait_for_status(target_status, timeout=14400, interval=120)` | `bool` | 轮询直到达到目标状态 |

## RTStream & Capture

关于 RTStream（直播接入、索引、转录），请参见 [rtstream-reference.md](rtstream-reference.md)。

关于 capture session（桌面录制、CaptureClient、频道），请参见 [capture-reference.md](capture-reference.md)。

## Enums & Constants

### SearchType

```python
from videodb import SearchType

SearchType.semantic    # 自然语言 semantic 搜索
SearchType.keyword     # 精确 keyword 匹配
SearchType.scene       # 视觉 scene 搜索（可能需要付费套餐）
SearchType.llm         # 由 LLM 驱动的搜索
```

### SceneExtractionType

```python
from videodb import SceneExtractionType

SceneExtractionType.shot_based   # 自动 shot 边界检测
SceneExtractionType.time_based   # 固定时间间隔提取
SceneExtractionType.transcript   # 基于 transcript 的 scene 提取
```

### SubtitleStyle

```python
from videodb import SubtitleStyle

style = SubtitleStyle(
    font_name="Arial",
    font_size=18,
    primary_colour="&H00FFFFFF",
    bold=False,
    # ... 所有选项见 SubtitleStyle
)
video.add_subtitle(style=style)
```

### SubtitleAlignment & SubtitleBorderStyle

```python
from videodb import SubtitleAlignment, SubtitleBorderStyle
```

### TextStyle

```python
from videodb import TextStyle
# 或：from videodb.asset import TextStyle

style = TextStyle(
    fontsize=24,
    fontcolor="black",
    boxcolor="white",
    font="Sans",
    text_align="T",
    alpha=1.0,
)
```

### Other Constants

```python
from videodb import (
    IndexType,          # spoken_word, scene
    MediaType,          # video, audio, image
    Segmenter,          # word, sentence, time
    SegmentationType,   # sentence, llm
    TranscodeMode,      # economy, lightning
    ResizeMode,         # crop, fit, pad
    ReframeMode,        # simple, smart
    RTStreamChannelType,
)
```

## Exceptions

```python
from videodb.exceptions import (
    AuthenticationError,     # 无效或缺失 API key
    InvalidRequestError,     # 参数错误或请求格式错误
    RequestTimeoutError,     # 请求超时
    SearchError,             # 搜索操作失败（如未索引）
    VideodbError,            # 所有 VideoDB 错误的基类异常
)
```

| Exception | Common Cause |
|-----------|-------------|
| `AuthenticationError` | 缺失或无效的 `VIDEO_DB_API_KEY` |
| `InvalidRequestError` | 无效 URL、不支持的格式、参数错误 |
| `RequestTimeoutError` | 服务器响应时间过长 |
| `SearchError` | 索引前搜索、无效的 search type |
| `VideodbError` | 服务器错误、网络问题、一般性失败 |
