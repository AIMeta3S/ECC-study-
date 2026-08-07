---
paths:
  - "**/*.rb"
  - "**/*.rake"
  - "**/Gemfile"
  - "**/test/**/*.rb"
  - "**/spec/**/*.rb"
  - "**/config/routes.rb"
---
# Ruby 测试

> 本文件在 [common/testing.md](../common/testing.md) 基础上扩展了 Ruby 和 Rails 特定内容。

## 框架

- 当 Rails 应用遵循默认的 Rails 测试栈时，使用 **Minitest**。
- 当 RSpec 已在项目中确立使用，或团队对其有明确的生产约定时，使用 **RSpec**。
- 若无迁移原因，不要在同一功能区域内混用 Minitest 和 RSpec。

## 测试金字塔

- 将快速的领域行为放入 model、service、query、policy 和 job 测试中。
- 使用 request/controller 测试覆盖 HTTP 契约、认证行为、重定向、状态码和响应结构。
- 仅对浏览器关键流程使用 Capybara 进行 system 测试；保持其聚焦且稳定。
- 对后台 job，用 unit test 覆盖行为，用 integration test 覆盖队列/入队契约。

## Fixtures 与 Factories

- 当 fixtures 是项目默认且数据图较小时，使用 Rails fixtures。
- 当场景需要显式构造对象或复杂 traits 时，使用 `factory_bot`。
- 让测试数据靠近被断言的行为；避免使用会隐藏 setup 成本的全局 fixtures。

## 命令

优先使用项目本地命令：

```bash
bin/rails test
bin/rails test test/models/user_test.rb
bundle exec rspec
bundle exec rspec spec/models/user_spec.rb
```

## 覆盖率

- 当强制要求覆盖率时使用 SimpleCov；在 CI 中保持 threshold，并避免用低价值测试刷 branch coverage。
- 在修改生产代码之前，为 bug 修复添加 regression test。

## 参考

参见 skill：`tdd-workflow` 了解仓库级别的 RED -> GREEN -> REFACTOR 循环。
