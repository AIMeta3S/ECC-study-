# Capture 参考

VideoDB capture session 的代码级细节。工作流指南见 [capture.md](capture.md)。

---

## WebSocket 事件

来自 capture session 和 AI pipeline 的实时事件。无需 webhook 或 polling。

使用 [scripts/ws_listener.py](../scripts/ws_listener.py) 连接并将事件输出到 `${VIDEODB_EVENTS_DIR:-$HOME/.local/state/videodb}/videodb_events.jsonl`。

### 事件 Channel

| Channel | 来源 | 内容 |
|---------|--------|---------|
| `capture_session` | Session 生命周期 | 状态变更 |
| `transcript` | `start_transcript()` | 语音转文字 |
| `visual_index` / `scene_index` | `index_visuals()` | 视觉分析 |
| `audio_index` | `index_audio()` | 音频分析 |
| `alert` | `create_alert()` | Alert 通知 |

### Session 生命周期事件

| Event | Status | 关键数据 |
|-------|--------|----------|
| `capture_session.created` | `created` | — |
| `capture_session.starting` | `starting` | — |
| `capture_session.active` | `active` | `rtstreams[]` |
| `capture_session.stopping` | `stopping` | — |
| `capture_session.stopped` | `stopped` | — |
| `capture_session.exported` | `exported` | `exported_video_id`, `stream_url`, `player_url` |
| `capture_session.failed` | `failed` | `error` |

### 事件结构

**Transcript 事件：**
```json
{
  "channel": "transcript",
  "rtstream_id": "rts-xxx",
  "rtstream_name": "mic:default",
  "data": {
    "text": "Let's schedule the meeting for Thursday",
    "is_final": true,
    "start": 1710000001234,
    "end": 1710000002345
  }
}
```

**Visual index 事件：**
```json
{
  "channel": "visual_index",
  "rtstream_id": "rts-xxx",
  "rtstream_name": "display:1",
  "data": {
    "text": "User is viewing a Slack conversation with 3 unread messages",
    "start": 1710000012340,
    "end": 1710000018900
  }
}
```

**Audio index 事件：**
```json
{
  "channel": "audio_index",
  "rtstream_id": "rts-xxx",
  "rtstream_name": "mic:default",
  "data": {
    "text": "Discussion about scheduling a team meeting",
    "start": 1710000021500,
    "end": 1710000029200
  }
}
```

**Session active 事件：**
```json
{
  "event": "capture_session.active",
  "capture_session_id": "cap-xxx",
  "status": "active",
  "data": {
    "rtstreams": [
      { "rtstream_id": "rts-1", "name": "mic:default", "media_types": ["audio"] },
      { "rtstream_id": "rts-2", "name": "system_audio:default", "media_types": ["audio"] },
      { "rtstream_id": "rts-3", "name": "display:1", "media_types": ["video"] }
    ]
  }
}
```

**Session exported 事件：**
```json
{
  "event": "capture_session.exported",
  "capture_session_id": "cap-xxx",
  "status": "exported",
  "data": {
    "exported_video_id": "v_xyz789",
    "stream_url": "https://stream.videodb.io/...",
    "player_url": "https://console.videodb.io/player?url=..."
  }
}
```

> 最新详情见 [VideoDB Realtime Context 文档](https://docs.videodb.io/pages/ingest/capture-sdks/realtime-context.md)。

---

## 事件持久化

使用 `ws_listener.py` 将所有 WebSocket 事件输出到 JSONL 文件，供后续分析。

### 启动 listener 并获取 WebSocket ID

```bash
# 使用 --clear 启动以清除旧事件（推荐用于新 session）
python scripts/ws_listener.py --clear &

# 追加到现有事件（用于重连）
python scripts/ws_listener.py &
```

或指定自定义输出目录：

```bash
python scripts/ws_listener.py --clear /path/to/output &
# 或通过环境变量：
VIDEODB_EVENTS_DIR=/path/to/output python scripts/ws_listener.py --clear &
```

脚本在第一行输出 `WS_ID=<connection_id>`，随后无限监听。

**获取 ws_id：**
```bash
cat "${VIDEODB_EVENTS_DIR:-$HOME/.local/state/videodb}/videodb_ws_id"
```

**停止 listener：**
```bash
kill "$(cat "${VIDEODB_EVENTS_DIR:-$HOME/.local/state/videodb}/videodb_ws_pid")"
```

**接受 `ws_connection_id` 的函数：**

| 函数 | 用途 |
|----------|---------|
| `conn.create_capture_session()` | Session 生命周期事件 |
| RTStream 方法 | 见 [rtstream-reference.md](rtstream-reference.md) |

**输出文件**（位于输出目录，默认为 `${XDG_STATE_HOME:-$HOME/.local/state}/videodb`）：
- `videodb_ws_id` - WebSocket 连接 ID
- `videodb_events.jsonl` - 所有事件
- `videodb_ws_pid` - 进程 ID，便于终止

**特性：**
- `--clear` flag 在启动时清除事件文件（用于新 session）
- 连接断开时自动重连，采用 exponential backoff
- 在 SIGINT/SIGTERM 上优雅关闭
- 连接状态日志记录

### JSONL 格式

每行是一个 JSON 对象，附带时间戳：

```json
{"ts": "2026-03-02T10:15:30.123Z", "unix_ts": 1772446530.123, "channel": "visual_index", "data": {"text": "..."}}
{"ts": "2026-03-02T10:15:31.456Z", "unix_ts": 1772446531.456, "event": "capture_session.active", "capture_session_id": "cap-xxx"}
```

### 读取事件

```python
import json
import time
from pathlib import Path

events_path = Path.home() / ".local" / "state" / "videodb" / "videodb_events.jsonl"
transcripts = []
recent = []
visual = []

cutoff = time.time() - 600
with events_path.open(encoding="utf-8") as handle:
    for line in handle:
        event = json.loads(line)
        if event.get("channel") == "transcript":
            transcripts.append(event)
        if event.get("unix_ts", 0) > cutoff:
            recent.append(event)
        if (
            event.get("channel") == "visual_index"
            and "code" in event.get("data", {}).get("text", "").lower()
        ):
            visual.append(event)
```

---

## WebSocket 连接

连接以接收来自 transcription 和 indexing pipeline 的实时 AI 结果。

```python
ws_wrapper = conn.connect_websocket()
ws = await ws_wrapper.connect()
ws_id = ws.connection_id
```

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `ws.connection_id` | `str` | 唯一连接 ID（传递给 AI pipeline 方法） |
| `ws.receive()` | `AsyncIterator[dict]` | 产出实时消息的 async iterator |

---

## CaptureSession

### 连接方法

| Method | Returns | Description |
|--------|---------|-------------|
| `conn.create_capture_session(end_user_id, collection_id, ws_connection_id, metadata)` | `CaptureSession` | 创建新的 capture session |
| `conn.get_capture_session(capture_session_id)` | `CaptureSession` | 获取已有的 capture session |
| `conn.generate_client_token()` | `str` | 生成客户端 authentication token |

### 创建 Capture Session

```python
from pathlib import Path

ws_id = (Path.home() / ".local" / "state" / "videodb" / "videodb_ws_id").read_text().strip()

session = conn.create_capture_session(
    end_user_id="user-123",  # 必填
    collection_id="default",
    ws_connection_id=ws_id,
    metadata={"app": "my-app"},
)
print(f"Session ID: {session.id}")
```

> **注意：** `end_user_id` 为必填，用于标识发起 capture 的用户。用于测试或 demo 时，任意唯一字符串标识符均可（例如 `"demo-user"`、`"test-123"`）。

### CaptureSession 属性

| Property | Type | Description |
|----------|------|-------------|
| `session.id` | `str` | 唯一 capture session ID |

### CaptureSession 方法

| Method | Returns | Description |
|--------|---------|-------------|
| `session.get_rtstream(type)` | `list[RTStream]` | 按 type 获取 RTStream：`"mic"`、`"screen"` 或 `"system_audio"` |

### 生成 Client Token

```python
token = conn.generate_client_token()
```

---

## CaptureClient

client 运行在用户机器上，处理权限、channel 发现和 streaming。

```python
from videodb.capture import CaptureClient

client = CaptureClient(client_token=token)
```

### CaptureClient 方法

| Method | Returns | Description |
|--------|---------|-------------|
| `await client.request_permission(type)` | `None` | 请求设备权限（`"microphone"`、`"screen_capture"`） |
| `await client.list_channels()` | `Channels` | 发现可用的 audio/video channel |
| `await client.start_capture_session(capture_session_id, channels, primary_video_channel_id)` | `None` | 开始 streaming 选定的 channel |
| `await client.stop_capture()` | `None` | 优雅停止 capture session |
| `await client.shutdown()` | `None` | 清理 client 资源 |

### 请求权限

```python
await client.request_permission("microphone")
await client.request_permission("screen_capture")
```

### 启动 Session

```python
selected_channels = [c for c in [mic, display, system_audio] if c]
await client.start_capture_session(
    capture_session_id=session.id,
    channels=selected_channels,
    primary_video_channel_id=display.id if display else None,
)
```

### 停止 Session

```python
await client.stop_capture()
await client.shutdown()
```

---

## Channels

由 `client.list_channels()` 返回。按 type 分组可用设备。

```python
channels = await client.list_channels()
for ch in channels.all():
    print(f"  {ch.id} ({ch.type}): {ch.name}")

mic = channels.mics.default
display = channels.displays.default
system_audio = channels.system_audio.default
```

### Channel 分组

| Property | Type | Description |
|----------|------|-------------|
| `channels.mics` | `ChannelGroup` | 可用麦克风 |
| `channels.displays` | `ChannelGroup` | 可用屏幕显示 |
| `channels.system_audio` | `ChannelGroup` | 可用系统 audio 源 |

### ChannelGroup 方法与属性

| Member | Type | Description |
|--------|------|-------------|
| `group.default` | `Channel` | group 中的默认 channel（或 `None`） |
| `group.all()` | `list[Channel]` | group 中的所有 channel |

### Channel 属性

| Property | Type | Description |
|----------|------|-------------|
| `ch.id` | `str` | 唯一 channel ID |
| `ch.type` | `str` | Channel type（`"mic"`、`"display"`、`"system_audio"`） |
| `ch.name` | `str` | 人类可读的 channel 名称 |
| `ch.store` | `bool` | 是否持久化录制（设为 `True` 以保存） |

若不设置 `store = True`，stream 将被实时处理但不保存。

---

## RTStream 与 AI Pipeline

session 进入 active 后，通过 `session.get_rtstream()` 获取 RTStream 对象。

RTStream 方法（indexing、transcription、alert、batch 配置）见 [rtstream-reference.md](rtstream-reference.md)。

---

## Session 生命周期

```
  create_capture_session()
          │
          v
  ┌───────────────┐
  │    created     │
  └───────┬───────┘
          │  client.start_capture_session()
          v
  ┌───────────────┐     WebSocket: capture_session.starting
  │   starting     │ ──> Capture channel 连接
  └───────┬───────┘
          │
          v
  ┌───────────────┐     WebSocket: capture_session.active
  │    active      │ ──> 启动 AI pipeline
  └───────┬──────────────┐
          │              │
          │              v
          │      ┌───────────────┐     WebSocket: capture_session.failed
          │      │    failed      │ ──> 检查 error payload 并重试 setup
          │      └───────────────┘
          │      不可恢复的 capture 错误
          │
          │  client.stop_capture()
          v
  ┌───────────────┐     WebSocket: capture_session.stopping
  │   stopping     │ ──> 完成 stream 收尾
  └───────┬───────┘
          │
          v
  ┌───────────────┐     WebSocket: capture_session.stopped
  │   stopped      │ ──> 所有 stream 已收尾
  └───────┬───────┘
          │  (if store=True)
          v
  ┌───────────────┐     WebSocket: capture_session.exported
  │   exported     │ ──> 访问 video_id、stream_url、player_url
  └───────────────┘
```
