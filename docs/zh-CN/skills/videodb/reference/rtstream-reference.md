# RTStream 参考

RTStream 操作的代码级细节。工作流指南见 [rtstream.md](rtstream.md)。
如需使用指南和工作流选择，请从 [../SKILL.md](../SKILL.md) 开始。

基于 [docs.videodb.io](https://docs.videodb.io/pages/ingest/live-streams/realtime-apis.md)。

---

## Collection 的 RTStream 方法

`Collection` 上用于管理 RTStream 的方法：

| Method | Returns | Description |
|--------|---------|-------------|
| `coll.connect_rtstream(url, name, ...)` | `RTStream` | 从 RTSP/RTMP URL 创建新的 RTStream |
| `coll.get_rtstream(id)` | `RTStream` | 按 ID 获取已有的 RTStream |
| `coll.list_rtstreams(limit, offset, status, name, ordering)` | `List[RTStream]` | 列出 collection 中的所有 RTStream |
| `coll.search(query, namespace="rtstream")` | `RTStreamSearchResult` | 在所有 RTStream 中搜索 |

### 连接 RTStream

```python
import videodb

conn = videodb.connect()
coll = conn.get_collection()

rtstream = coll.connect_rtstream(
    url="rtmp://your-stream-server/live/stream-key",
    name="My Live Stream",
    media_types=["video"],  # 或 ["audio", "video"]
    sample_rate=30,         # 可选
    store=True,             # 启用录制存储以供导出
    enable_transcript=True, # 可选
    ws_connection_id=ws_id, # 可选，用于实时事件
)
```

### 获取已有的 RTStream

```python
rtstream = coll.get_rtstream("rts-xxx")
```

### 列出 RTStream

```python
rtstreams = coll.list_rtstreams(
    limit=10,
    offset=0,
    status="connected",  # 可选筛选
    name="meeting",      # 可选筛选
    ordering="-created_at",
)

for rts in rtstreams:
    print(f"{rts.id}: {rts.name} - {rts.status}")
```

### 从采集会话获取

capture session 激活后，可获取 RTStream 对象：

```python
session = conn.get_capture_session(session_id)

mics = session.get_rtstream("mic")
displays = session.get_rtstream("screen")
system_audios = session.get_rtstream("system_audio")
```

或使用 `capture_session.active` WebSocket 事件中的 `rtstreams` 数据：

```python
for rts in rtstreams:
    rtstream = coll.get_rtstream(rts["rtstream_id"])
```

---

## RTStream 方法

| Method | Returns | Description |
|--------|---------|-------------|
| `rtstream.start()` | `None` | 开始接收数据 |
| `rtstream.stop()` | `None` | 停止接收数据 |
| `rtstream.generate_stream(start, end)` | `str` | 推流已录制片段（Unix 时间戳） |
| `rtstream.export(name=None)` | `RTStreamExportResult` | 导出为永久视频 |
| `rtstream.index_visuals(prompt, ...)` | `RTStreamSceneIndex` | 通过 AI 分析创建视觉索引 |
| `rtstream.index_audio(prompt, ...)` | `RTStreamSceneIndex` | 通过 LLM 摘要创建音频索引 |
| `rtstream.list_scene_indexes()` | `List[RTStreamSceneIndex]` | 列出 stream 上的所有场景索引 |
| `rtstream.get_scene_index(index_id)` | `RTStreamSceneIndex` | 获取指定的场景索引 |
| `rtstream.search(query, ...)` | `RTStreamSearchResult` | 搜索已索引的内容 |
| `rtstream.start_transcript(ws_connection_id, engine)` | `dict` | 开始实时转写 |
| `rtstream.get_transcript(page, page_size, start, end, since)` | `dict` | 获取转写分页 |
| `rtstream.stop_transcript(engine)` | `dict` | 停止转写 |

---

## 启动与停止

```python
# 开始接收数据
rtstream.start()

# ... stream 正在录制 ...

# 停止接收数据
rtstream.stop()
```

---

## 生成 stream

使用 Unix 时间戳（而非秒数偏移量）从已录制内容生成播放 stream：

```python
import time

start_ts = time.time()
rtstream.start()

# 让它录制一段时间...
time.sleep(60)

end_ts = time.time()
rtstream.stop()

# 为已录制片段生成 stream URL
stream_url = rtstream.generate_stream(start=start_ts, end=end_ts)
print(f"Recorded stream: {stream_url}")
```

---

## 导出为视频

将已录制的 stream 导出为 collection 中的永久视频：

```python
export_result = rtstream.export(name="Meeting Recording 2024-01-15")

print(f"Video ID: {export_result.video_id}")
print(f"Stream URL: {export_result.stream_url}")
print(f"Player URL: {export_result.player_url}")
print(f"Duration: {export_result.duration}s")
```

### RTStreamExportResult 属性

| Property | Type | Description |
|----------|------|-------------|
| `video_id` | `str` | 导出视频的 ID |
| `stream_url` | `str` | HLS stream URL |
| `player_url` | `str` | Web 播放器 URL |
| `name` | `str` | 视频名称 |
| `duration` | `float` | 时长（秒） |

---

## AI pipeline

AI pipeline 处理直播 stream，并通过 WebSocket 发送结果。

### RTStream AI pipeline 方法

| Method | Returns | Description |
|--------|---------|-------------|
| `rtstream.index_audio(prompt, batch_config, ...)` | `RTStreamSceneIndex` | 启动音频索引（LLM 摘要） |
| `rtstream.index_visuals(prompt, batch_config, ...)` | `RTStreamSceneIndex` | 启动屏幕内容的视觉索引 |

### 音频索引

按一定间隔生成音频内容的 LLM 摘要：

```python
audio_index = rtstream.index_audio(
    prompt="Summarize what is being discussed",
    batch_config={"type": "word", "value": 50},
    model_name=None,       # 可选
    name="meeting_audio",  # 可选
    ws_connection_id=ws_id,
)
```

**音频 batch_config 选项：**

| 类型 | 值 | 描述 |
|------|-------|-------------|
| `"word"` | 数量 | 每 N 个单词分段 |
| `"sentence"` | 数量 | 每 N 个句子分段 |
| `"time"` | 秒数 | 每 N 秒分段 |

示例：
```python
{"type": "word", "value": 50}      # 每 50 个单词
{"type": "sentence", "value": 5}   # 每 5 个句子
{"type": "time", "value": 30}      # 每 30 秒
```

结果会通过 `audio_index` WebSocket channel 到达。

### 视觉索引

生成视觉内容的 AI 描述：

```python
scene_index = rtstream.index_visuals(
    prompt="Describe what is happening on screen",
    batch_config={"type": "time", "value": 2, "frame_count": 5},
    model_name="basic",
    name="screen_monitor",  # 可选
    ws_connection_id=ws_id,
)
```

**参数：**

| 参数 | 类型 | 描述 |
|-----------|------|-------------|
| `prompt` | `str` | 给 AI 模型的指令（支持结构化 JSON 输出） |
| `batch_config` | `dict` | 控制帧采样（见下文） |
| `model_name` | `str` | 模型层级：`"mini"`、`"basic"`、`"pro"`、`"ultra"` |
| `name` | `str` | 索引名称（可选） |
| `ws_connection_id` | `str` | 用于接收结果的 WebSocket 连接 ID |

**视觉 batch_config：**

| 键 | 类型 | 描述 |
|-----|------|-------------|
| `type` | `str` | 视觉索引仅支持 `"time"` |
| `value` | `int` | 窗口大小（秒） |
| `frame_count` | `int` | 每个窗口要提取的帧数 |

示例：`{"type": "time", "value": 2, "frame_count": 5}` 每 2 秒采样 5 帧并发送给模型。

**结构化 JSON 输出：**

使用请求 JSON 格式的 prompt 以获取结构化响应：

```python
scene_index = rtstream.index_visuals(
    prompt="""Analyze the screen and return a JSON object with:
{
  "app_name": "name of the active application",
  "activity": "what the user is doing",
  "ui_elements": ["list of visible UI elements"],
  "contains_text": true/false,
  "dominant_colors": ["list of main colors"]
}
Return only valid JSON.""",
    batch_config={"type": "time", "value": 3, "frame_count": 3},
    model_name="pro",
    ws_connection_id=ws_id,
)
```

结果会通过 `scene_index` WebSocket channel 到达。

---

## batch_config 汇总

| 索引类型 | `type` 选项 | `value` | 额外键 |
|---------------|----------------|---------|------------|
| **音频** | `"word"`、`"sentence"`、`"time"` | 单词/句子/秒 | - |
| **视觉** | 仅 `"time"` | 秒 | `frame_count` |

示例：
```python
# 音频：每 50 个单词
{"type": "word", "value": 50}

# 音频：每 30 秒
{"type": "time", "value": 30}

# 视觉：每 2 秒 5 帧
{"type": "time", "value": 2, "frame_count": 5}
```

---

## 转写

通过 WebSocket 进行实时转写：

```python
# 开始实时转写
rtstream.start_transcript(
    ws_connection_id=ws_id,
    engine=None,  # 可选，默认为 "assemblyai"
)

# 获取转写分页（带可选筛选）
transcript = rtstream.get_transcript(
    page=1,
    page_size=100,
    start=None,   # 可选：起始时间戳筛选
    end=None,     # 可选：结束时间戳筛选
    since=None,   # 可选：用于轮询，获取此时间戳之后的转写
    engine=None,
)

# 停止转写
rtstream.stop_transcript(engine=None)
```

转写结果会通过 `transcript` WebSocket channel 到达。

---

## RTStreamSceneIndex

当你调用 `index_audio()` 或 `index_visuals()` 时，该方法会返回一个 `RTStreamSceneIndex` 对象。该对象代表运行中的索引，并提供管理场景和告警的方法。

```python
# index_visuals 返回一个 RTStreamSceneIndex
scene_index = rtstream.index_visuals(
    prompt="Describe what is on screen",
    ws_connection_id=ws_id,
)

# index_audio 也返回一个 RTStreamSceneIndex
audio_index = rtstream.index_audio(
    prompt="Summarize the discussion",
    ws_connection_id=ws_id,
)
```

### RTStreamSceneIndex 属性

| Property | Type | Description |
|----------|------|-------------|
| `rtstream_index_id` | `str` | 索引的唯一 ID |
| `rtstream_id` | `str` | 父 RTStream 的 ID |
| `extraction_type` | `str` | 提取类型（`time` 或 `transcript`） |
| `extraction_config` | `dict` | 提取配置 |
| `prompt` | `str` | 用于分析的 prompt |
| `name` | `str` | 索引名称 |
| `status` | `str` | 状态（`connected`、`stopped`） |

### RTStreamSceneIndex 方法

| Method | Returns | Description |
|--------|---------|-------------|
| `index.get_scenes(start, end, page, page_size)` | `dict` | 获取已索引的场景 |
| `index.start()` | `None` | 启动/恢复索引 |
| `index.stop()` | `None` | 停止索引 |
| `index.create_alert(event_id, callback_url, ws_connection_id)` | `str` | 为事件检测创建告警 |
| `index.list_alerts()` | `list` | 列出此索引上的所有告警 |
| `index.enable_alert(alert_id)` | `None` | 启用告警 |
| `index.disable_alert(alert_id)` | `None` | 禁用告警 |

### 获取场景

从索引轮询已索引的场景：

```python
result = scene_index.get_scenes(
    start=None,      # 可选：起始时间戳
    end=None,        # 可选：结束时间戳
    page=1,
    page_size=100,
)

for scene in result["scenes"]:
    print(f"[{scene['start']}-{scene['end']}] {scene['text']}")

if result["next_page"]:
    # 获取下一页
    pass
```

### 管理场景索引

```python
# 列出 stream 上的所有索引
indexes = rtstream.list_scene_indexes()

# 按 ID 获取指定索引
scene_index = rtstream.get_scene_index(index_id)

# 停止索引
scene_index.stop()

# 重启索引
scene_index.start()
```

---

## 事件

Event 是可复用的检测规则。创建一次后，可通过 alert 附加到任意索引。

### Connection 的 Event 方法

| Method | Returns | Description |
|--------|---------|-------------|
| `conn.create_event(event_prompt, label)` | `str` (event_id) | 创建检测事件 |
| `conn.list_events()` | `list` | 列出所有 event |

### 创建 Event

```python
event_id = conn.create_event(
    event_prompt="User opened Slack application",
    label="slack_opened",
)
```

### 列出 Event

```python
events = conn.list_events()
for event in events:
    print(f"{event['event_id']}: {event['label']}")
```

---

## 告警

Alert 将 event 连接到索引以实现实时通知。当 AI 检测到与 event 描述匹配的内容时，会发送告警。

### 创建告警

```python
# 从 index_visuals 获取 RTStreamSceneIndex
scene_index = rtstream.index_visuals(
    prompt="Describe what application is open on screen",
    ws_connection_id=ws_id,
)

# 在索引上创建告警
alert_id = scene_index.create_alert(
    event_id=event_id,
    callback_url="https://your-backend.com/alerts",  # 用于 webhook 投递
    ws_connection_id=ws_id,  # 用于 WebSocket 投递（可选）
)
```

**注意：** `callback_url` 是必填项。如果只使用 WebSocket 投递，请传入空字符串 `""`。

### 管理告警

```python
# 列出索引上的所有告警
alerts = scene_index.list_alerts()

# 启用/禁用告警
scene_index.disable_alert(alert_id)
scene_index.enable_alert(alert_id)
```

### 告警投递

| 方式 | 延迟 | 使用场景 |
|--------|---------|----------|
| WebSocket | 实时 | Dashboard、实时 UI |
| Webhook | < 1 秒 | 服务端到服务端、自动化 |

### WebSocket 告警事件

```json
{
  "channel": "alert",
  "rtstream_id": "rts-xxx",
  "data": {
    "event_label": "slack_opened",
    "timestamp": 1710000012340,
    "text": "User opened Slack application"
  }
}
```

### Webhook 负载

```json
{
  "event_id": "event-xxx",
  "label": "slack_opened",
  "confidence": 0.95,
  "explanation": "User opened the Slack application",
  "timestamp": "2024-01-15T10:30:45Z",
  "start_time": 1234.5,
  "end_time": 1238.0,
  "stream_url": "https://stream.videodb.io/v3/...",
  "player_url": "https://console.videodb.io/player?url=..."
}
```

---

## WebSocket 集成

所有实时 AI 结果均通过 WebSocket 投递。将 `ws_connection_id` 传给：
- `rtstream.start_transcript()`
- `rtstream.index_audio()`
- `rtstream.index_visuals()`
- `scene_index.create_alert()`

### WebSocket channel

| Channel | 来源 | 内容 |
|---------|--------|---------|
| `transcript` | `start_transcript()` | 实时语音转文字 |
| `scene_index` | `index_visuals()` | 视觉分析结果 |
| `audio_index` | `index_audio()` | 音频分析结果 |
| `alert` | `create_alert()` | 告警通知 |

WebSocket 事件结构和 ws_listener 用法见 [capture-reference.md](capture-reference.md)。

---

## 完整工作流

```python
import time
import videodb
from videodb.exceptions import InvalidRequestError

conn = videodb.connect()
coll = conn.get_collection()

# 1. 连接并开始录制
rtstream = coll.connect_rtstream(
    url="rtmp://your-stream-server/live/stream-key",
    name="Weekly Standup",
    store=True,
)
rtstream.start()

# 2. 在会议期间持续录制
start_ts = time.time()
time.sleep(1800)  # 30 分钟
end_ts = time.time()
rtstream.stop()

# 为已采集窗口生成即时播放 URL
stream_url = rtstream.generate_stream(start=start_ts, end=end_ts)
print(f"Recorded stream: {stream_url}")

# 3. 导出为永久视频
export_result = rtstream.export(name="Weekly Standup Recording")
print(f"Exported video: {export_result.video_id}")

# 4. 为导出的视频建立索引以供搜索
video = coll.get_video(export_result.video_id)
video.index_spoken_words(force=True)

# 5. 搜索 action items
try:
    results = video.search("action items and next steps")
    stream_url = results.compile()
    print(f"Action items clip: {stream_url}")
except InvalidRequestError as exc:
    if "No results found" in str(exc):
        print("No action items were detected in the recording.")
    else:
        raise
```
