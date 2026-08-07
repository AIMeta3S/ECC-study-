---
name: api-connector-builder
description: 通过精确匹配目标仓库既有的 integration 模式来构建新的 API connector 或 provider。当需要在无需另起一套架构的前提下新增一个 integration 时使用。
metadata:
  origin: ECC direct-port 适配
version: "1.0.0"
---

# API Connector Builder

当任务是添加一个仓库原生的 integration 接入面，而不是一个通用 HTTP client 时，使用本 skill。

核心在于匹配宿主仓库的既有模式：

- connector 目录布局
- config schema
- auth 模型
- 错误处理
- 测试风格
- 注册/发现的装配方式

## 何时使用

- "为本项目构建一个 Jira connector"
- "按既有模式新增一个 Slack provider"
- "为该 API 创建一个新的 integration"
- "构建一个与本仓库 connector 风格一致的 plugin"

## 护栏

- 当仓库已有 integration 架构时，不要另造一套新架构
- 不要仅凭厂商文档开工，应先从仓库内既有的 connector 起步
- 如果仓库要求 registry 接线、测试和文档，不要止步于 transport 代码
- 如果仓库已有更新的现行模式，不要 cargo-cult 旧 connector

## 工作流

### 1. 学习内部风格

至少检视 2 个既有的 connector/provider，并梳理：

- 文件布局
- 抽象边界
- config 模型
- 重试 / 分页约定
- registry 钩子
- 测试 fixture 与命名

### 2. 收窄目标 integration 的范围

只定义仓库实际需要的接入面：

- auth 流程
- 关键实体
- 核心读写操作
- 分页与速率限制
- webhook 或轮询模型

### 3. 按仓库原生分层构建

典型切片：

- config/schema
- client/transport
- 映射层
- connector/provider 入口
- 注册
- 测试

### 4. 对照源模式校验

新的 connector 在代码库中应当显得顺理成章，而不是像从另一个生态系统导入的。

## 参考形态

### Provider 风格

```text
providers/
  existing_provider/
    __init__.py
    provider.py
    config.py
```

### Connector 风格

```text
integrations/
  existing/
    client.py
    models.py
    connector.py
```

### TypeScript plugin 风格

```text
src/integrations/
  existing/
    index.ts
    client.ts
    types.ts
    test.ts
```

## 质量检查清单

- [ ] 匹配仓库内既有的 integration 模式
- [ ] 存在 config 校验
- [ ] auth 与错误处理明确
- [ ] 分页/重试行为遵循仓库规范
- [ ] registry/discovery 接线完整
- [ ] 测试镜像宿主仓库的风格
- [ ] 若仓库有要求，则同步更新文档/示例

## 相关 Skills

- `backend-patterns`
- `mcp-server-patterns`
- `github-ops`
