---
name: nanoclaw-repl
description: 操作并扩展 NanoClaw v2，ECC 的基于 claude -p 构建的零依赖、会话感知 REPL。
metadata:
  origin: ECC
---

# NanoClaw REPL

当需要运行或扩展 `scripts/claw.js` 时使用此 skill。

## 功能特性

- 持久的基于 markdown 的会话
- 使用 `/model` 切换 model
- 使用 `/load` 动态加载 skill
- 使用 `/branch` 进行会话分支
- 使用 `/search` 跨会话搜索
- 使用 `/compact` 压缩历史
- 使用 `/export` 导出为 md/json/txt
- 使用 `/metrics` 查看会话指标

## 操作指南

1. 保持会话聚焦于任务。
2. 在进行高风险变更前先创建分支。
3. 在主要里程碑之后进行压缩。
4. 在分享或归档前先导出。

## 扩展规则

- 保持零外部运行时依赖
- 保持 markdown 作为数据库的兼容性
- 保持命令处理器确定且本地化
