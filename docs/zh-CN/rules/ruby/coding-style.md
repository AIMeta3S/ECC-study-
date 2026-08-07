---
paths:
  - "**/*.rb"
  - "**/*.rake"
  - "**/Gemfile"
  - "**/*.gemspec"
  - "**/config.ru"
---
# Ruby 编码风格

> 本文件在 [common/coding-style.md](../common/coding-style.md) 基础上扩展了 Ruby 与 Rails 相关内容。

## 标准

- 新的 Rails 项目以 **Ruby 3.3+** 为目标运行时，除非项目已锁定某个更旧的受支持运行时。
- 仅在测量过启动时间、内存占用以及请求/作业吞吐量之后，再在生产环境中启用 **YJIT**。
- 当项目采用该约定时，为新 Ruby 文件添加 `# frozen_string_literal: true`。
- 优先选择清晰的 Ruby 写法而非花哨的 metaprogramming；将重度依赖 DSL 的代码隔离在狭窄且有测试覆盖的边界之后。

## 格式化与 Lint

- 使用项目已提交的 RuboCop 配置。对于 Rails 8+ 应用，从 `rubocop-rails-omakase` 起步，仅在实际有代码库约定之处进行定制。
- 将 formatter/linter 命令放在 binstub 或脚本之后，以便 CI 与本地运行保持一致：

```bash
bundle exec rubocop
bundle exec rubocop -A
```

- 除非该例外范围狭窄、有文档记录且难以用代码清晰地表达，否则不要在行内禁用 cops。

## Rails 风格

- 在添加自定义结构之前，先遵循 Rails 的命名与目录约定。
- 保持 controller 聚焦于传输职责：认证、授权、参数处理、响应结构。
- 根据实际复杂度，将可复用的领域行为放入 model、concern、service object、query object 或 form object 中，而非作为默认的仪式性套路。
- 优先使用 `bin/rails`、`bin/rake` 以及已提交的 binstub，而非全局安装的命令。

## 错误处理

- rescue 具体的异常。避免宽泛的 `rescue StandardError` 块，除非它会重新抛出或为运维人员保留足够的上下文。
- 使用 `ActiveSupport::Notifications` 或应用的 logger 记录运维事件；不要在已提交的应用代码中遗留 `puts`、`pp` 或 `debugger`。

## 参考

参见 skill：`backend-patterns`，以获取更广泛的服务/Repository 分层指导。
