# RTStream 指南

## 概述

RTStream 支持对直播视频流（RTSP/RTMP）和桌面捕获会话的实时采集。连接后，你可以对直播源的内容进行录制、索引、搜索和导出。

如需代码级细节（SDK 方法、参数、示例），参见 [rtstream-reference.md](rtstream-reference.md)。

## 使用场景

- **安防与监控**：连接 RTSP 摄像头，检测事件，触发告警
- **直播**：接入 RTMP 流，实时索引，支持即时搜索
- **会议录制**：捕获桌面屏幕和音频，实时转录，导出录制内容
- **事件处理**：监控直播源，运行 AI 分析，对检测到的内容做出响应

## 快速开始

1. **连接直播流**（RTSP/RTMP URL）或从捕获会话获取 RTStream

2. **开始采集**以启动对直播内容的录制

3. **启动 AI pipelines** 进行实时索引（音频、视觉、转录）

4. 通过 WebSocket **监控事件**，获取实时 AI 结果和告警

5. 完成后**停止采集**

6. **导出为视频**以永久保存并进一步处理

7. **搜索录制内容**以查找特定时刻

## RTStream 来源

### 来自 RTSP/RTMP 流

直接连接到直播视频源：

```python
rtstream = coll.connect_rtstream(
    url="rtmp://your-stream-server/live/stream-key",
    name="My Live Stream",
)
```

### 来自捕获会话

从桌面捕获中获取 RTStreams（麦克风、屏幕、系统音频）：

```python
session = conn.get_capture_session(session_id)

mics = session.get_rtstream("mic")
displays = session.get_rtstream("screen")
system_audios = session.get_rtstream("system_audio")
```

关于捕获会话的工作流，参见 [capture.md](capture.md)。

---

## 脚本

| 脚本 | 说明 |
|--------|-------------|
| `scripts/ws_listener.py` | 用于实时 AI 结果的 WebSocket 事件监听器 |
