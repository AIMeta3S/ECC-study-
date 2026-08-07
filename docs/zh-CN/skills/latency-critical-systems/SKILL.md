---
name: latency-critical-systems
description: 用于延迟敏感型系统，例如实时 dashboard、行情数据、流式 agent、执行网关、队列、cache 或类 HFT 基础设施等关注新鲜度与 p95 latency 的场景。
metadata:
  origin: ECC
tools: Read, Write, Edit, Bash, Grep, Glob
---

# 延迟关键系统

当用户关注实时行为、热路径、流式新鲜度或执行速度时使用此 skill。这包括类 HFT 基础设施，但该 skill 聚焦于工程层面，不授权实盘交易或提供财务建议。

## 拆分指标

不要把一切都简化为“快”。应跟踪：

- p50、p95 和 p99 latency；
- 吞吐量；
- 新鲜度时延；
- 队列深度；
- cache 命中率；
- provider/API 响应时间；
- 浏览器渲染时间；
- 负载下的正确性；
- 失败与重试行为。

## 梳理热路径

写出从用户/事件到最终可见状态的路径：

```text
source event -> provider API -> ingest worker -> queue -> cache -> edge route
-> client stream -> browser render -> user-visible state
```

然后分别测量每一段。

## 优化顺序

1. 移除不必要的往返。
2. 用新鲜度元数据缓存稳定的读取。
3. 批量处理小的调用和写入。
4. 将计算移近数据或用户。
5. 拆分热路径与冷路径。
6. 在队列无限增长之前施加 backpressure。
7. 仅在能改善新鲜度或用户体验时使用流式传输。
8. 为陈旧数据、降级的 provider 和错误的 cache 状态添加 canary。

## 验证

当存在已部署界面时，使用实时读数：

- HTTP 时序与响应头；
- provider 新鲜度时间戳；
- 队列或作业状态；
- edge/cache 状态；
- 针对实际 UI 新鲜度的浏览器验证；
- 围绕重试与降级模式的 log。

对于行情数据或邻近执行的路径，在认定路径就绪之前，还要验证 orderbook 时效、VWAP 假设、provider 状态以及 kill-switch 行为。

## 护栏

- 不要通过丢弃必要的验证来优化 latency。
- 不要用快速的 cache 命中掩盖陈旧数据。
- 不要在没有测量的情况下，凭客户端标签声称毫秒级行为。
- 没有明确的审批 gate，不得运行实盘订单、破坏性 migration 或影响客户的 deploy。
- 将 secret 和私有 payload 排除在 log 与 benchmark artifact 之外。
