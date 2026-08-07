# Capture 指南

## 概览

VideoDB Capture 支持实时屏幕和音频录制，并配合 AI 处理。桌面端 capture 目前仅支持 **macOS**。

如需代码层面的细节（SDK 方法、event 结构、AI pipeline），请参见 [capture-reference.md](capture-reference.md)。

## 快速开始

1. **启动 WebSocket listener**：`python scripts/ws_listener.py --clear &`
2. **运行 capture 代码**（参见下文的“完整的 Capture 工作流”）
3. **event 写入到**：`/tmp/videodb_events.jsonl`

---

## 完整的 Capture 工作流

无需 webhooks 或轮询。WebSocket 负责投递所有 event，包括 session 的生命周期事件。

> **关键：** `CaptureClient` 必须在整个 capture 期间保持运行。它运行本地的 recorder binary，将屏幕/音频数据流式传输给 VideoDB。如果创建 `CaptureClient` 的 Python 进程退出，recorder binary 会被 kill，capture 会静默停止。务必将 capture 代码作为**长驻后台进程**运行（例如 `nohup python capture_script.py &`），并使用 signal 处理（`asyncio.Event` + `SIGINT`/`SIGTERM`）让其保持存活，直到你显式停止它。

1. 在后台**启动 WebSocket listener**，带上 `--clear` flag 以清除旧的 event。等待其创建 WebSocket ID 文件。

2. **读取 WebSocket ID**。此 ID 是 capture session 和 AI pipeline 所必需的。

3. **创建一个 capture session**，并为桌面端 client 生成 client token。

4. 使用该 token **初始化 CaptureClient**。请求麦克风和屏幕 capture 的权限。

5. **列出并选择 channels**（mic、display、system_audio）。对希望持久化为视频的 channels 设置 `store = True`。

6. 使用选定的 channels **启动 session**。

7. 通过读取 event **等待 session 激活**，直到看到 `capture_session.active`。该 event 包含 `rtstreams` 数组。将 session 信息（session ID、RTStream IDs）保存到文件（例如 `/tmp/videodb_capture_info.json`），以便其他脚本读取。

8. **保持进程存活。** 使用 `asyncio.Event` 配合 `SIGINT`/`SIGTERM` 的 signal handler 进行阻塞，直到被显式停止。写入 PID 文件（例如 `/tmp/videodb_capture_pid`），以便后续可通过 `kill $(cat /tmp/videodb_capture_pid)` 停止该进程。PID 文件应在每次运行时被覆盖，以确保每次重跑都持有正确的 PID。

9. 对每个 RTStream **启动 AI pipeline**（在独立的命令/脚本中），用于 audio indexing 和 visual indexing。从已保存的 session 信息文件中读取 RTStream IDs。

10. **编写自定义的 event 处理逻辑**（在独立的命令/脚本中），根据你的 use case 读取实时 event。示例：
    - 当 `visual_index` 提到 “Slack” 时记录 Slack 活动
    - 当 `audio_index` event 到达时总结讨论
    - 当特定关键词出现在 `transcript` 中时触发告警
    - 根据屏幕描述跟踪应用使用情况

11. 完成后**停止 capture** —— 向 capture 进程发送 SIGTERM。它应在其 signal handler 中调用 `client.stop_capture()` 和 `client.shutdown()`。

12. 通过读取 event **等待导出**，直到看到 `capture_session.exported`。该 event 包含 `exported_video_id`、`stream_url` 和 `player_url`。这可能需要在停止 capture 后等待数秒。

13. 在接收到导出 event 后**停止 WebSocket listener**。使用 `kill $(cat /tmp/videodb_ws_pid)` 来干净地终止它。

---

## 关闭流程

正确的关闭顺序很重要，以确保所有 event 都被捕获：

1. **停止 capture session** —— `client.stop_capture()` 然后 `client.shutdown()`
2. **等待导出 event** —— 轮询 `/tmp/videodb_events.jsonl` 查找 `capture_session.exported`
3. **停止 WebSocket listener** —— `kill $(cat /tmp/videodb_ws_pid)`

在接收到导出 event 之前，请勿 kill WebSocket listener，否则会错过最终的视频 URL。

---

## 脚本

| 脚本 | 说明 |
|--------|-------------|
| `scripts/ws_listener.py` | WebSocket event listener（导出为 JSONL） |

### ws_listener.py 用法

```bash
# 在后台启动 listener（追加到已有 event）
python scripts/ws_listener.py &

# 启动 listener 并清除（新 session，清除旧 event）
python scripts/ws_listener.py --clear &

# 自定义输出目录
python scripts/ws_listener.py --clear /path/to/events &

# 停止 listener
kill $(cat /tmp/videodb_ws_pid)
```

**选项：**
- `--clear`：启动前清除 event 文件。在启动新的 capture session 时使用。

**输出文件：**
- `videodb_events.jsonl` - 所有 WebSocket event
- `videodb_ws_id` - WebSocket connection ID（用于 `ws_connection_id` 参数）
- `videodb_ws_pid` - Process ID（用于停止 listener）

**特性：**
- 连接断开时以 exponential backoff 自动重连
- 收到 SIGINT/SIGTERM 时优雅关闭
- PID 文件，便于进程管理
- 连接状态日志记录
