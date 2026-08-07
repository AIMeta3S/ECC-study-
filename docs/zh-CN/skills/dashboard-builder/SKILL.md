---
name: dashboard-builder
description: 为 Grafana、SigNoz 及类似平台构建能回答运维人员真实问题的监控 dashboard。当需要将 metrics 转化为真正可用的 dashboard、而非华而不实的 dashboard 时使用。
metadata:
  origin: ECC 直接移植改编
version: "1.0.0"
---

# Dashboard Builder

当任务是构建一个供运维人员实际使用的 dashboard 时使用。

目标不是“展示每一个 metric”。目标是回答以下问题：

- 它健康吗？
- 瓶颈在哪里？
- 什么发生了变化？
- 应该采取什么行动？

## 何时使用

- “构建一个 Kafka 监控 dashboard”
- “为 Elasticsearch 创建一个 Grafana dashboard”
- “为此服务制作一个 SigNoz dashboard”
- “将这个 metrics 列表转化为真正的运维 dashboard”

## 护栏

- 不要从视觉布局开始；要从运维人员的问题开始
- 不要仅仅因为某个 metric 存在就把它纳入
- 不要在没有结构的情况下混杂健康、吞吐量和资源面板
- 不要发布没有标题、单位以及合理 threshold 的面板

## 工作流

### 1. 定义运维问题

围绕以下方面组织：

- 健康 / 可用性
- 延迟 / 性能
- 吞吐量 / 容量
- 饱和度 / 资源
- 服务特定风险

### 2. 研究目标平台的 schema

先查看现有的 dashboard：

- JSON 结构
- 查询语言
- 变量
- threshold 样式
- 区段布局

### 3. 构建最小可用的 dashboard

推荐结构：

1. 概览
2. 性能
3. 资源
4. 服务特定区段

### 4. 删减华而不实的面板

每个面板都应回答一个真实的问题。如果不能，就移除它。

## 示例面板集合

### Elasticsearch

- 集群健康
- shard 分配
- 搜索延迟
- 索引速率
- JVM 堆 / GC

### Kafka

- broker 数量
- under-replicated partitions
- messages in / out
- consumer lag
- 磁盘与网络压力

### API gateway / ingress

- 请求速率
- p50 / p95 / p99 延迟
- 错误率
- upstream 健康
- 活跃连接数

## 质量检查清单

- [ ] 有效的 dashboard JSON
- [ ] 清晰的区段分组
- [ ] 包含标题与单位
- [ ] threshold/状态颜色有意义
- [ ] 为常用过滤器设置了变量
- [ ] 默认时间范围与刷新频率合理
- [ ] 不存在毫无运维价值的华而不实的面板

## 相关 skill

- `research-ops`
- `backend-patterns`
- `terminal-ops`
