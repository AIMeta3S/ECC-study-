---
paths:
  - "**/*.rb"
  - "**/*.rake"
  - "**/Gemfile"
  - "**/app/**/*.erb"
  - "**/config/routes.rb"
---
# Ruby 模式

> 本文件扩展了 [common/patterns.md](../common/patterns.md)，增加了 Ruby 和 Rails 特定的内容。

## Rails 方式优先

- 对于中小型功能，从纯 Rails MVC 和 Active Record 约定开始。
- 当 model/controller 边界承担了多种职责时，引入 service objects、query objects、form objects、decorators 或 presenters。
- 根据提取对象执行的业务操作为其命名，而不是用 `Manager` 或 `Processor` 这样的通用层来命名。

## 持久化

- 对于多主机生产环境的 Rails 应用，优先使用 PostgreSQL，除非现有平台有明确理由选择 MySQL 或 SQLite。
- 将 Rails 8 基于 SQLite 的默认配置视为适用于单主机或小型部署，而非自动适配共享的多服务系统。
- 将原生 SQL 放在 query objects 或 model scopes 之后，并对每个动态值进行参数化。

## 后台作业与运行时服务

- 对于吞吐量适中且部署需求简单的全新 Rails 8 应用，使用 **Solid Queue**。
- 当应用需要成熟的可观测性、高吞吐量、现有的 Redis 基础设施，或 Pro/Enterprise 功能时，使用 **Sidekiq**。
- 当部署模型与应用相匹配时，使用 **Solid Cache** 和 **Solid Cable**；当跨服务共享行为、高扇出或复杂数据结构很重要时，使用 Redis。

## 前端

- 对于服务端渲染的 Rails 应用，优先使用 **Hotwire** 配合 Turbo、Stimulus、Importmap 和 Propshaft。
- 当交互复杂度、现有产品架构或团队归属足以证明额外的客户端开销合理时，使用 React、Vue、Inertia.js 或独立的 SPA。
- 保持 view components、partials 和 presenters 专注于渲染决策；将持久化和授权排除在 templates 之外。

## 认证

- 对于简单的 session 认证和密码重置需求，使用 Rails 8 的认证 generator。
- 当需求包括 OAuth、MFA、confirmable/lockable 流程、多模型认证，或已存在大量 Devise 代码时，使用 Devise 或其他成熟的认证系统。

## 参考

关于 service 边界和 adapter 模式，参见 skill：`backend-patterns`。
