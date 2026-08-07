---
paths:
  - "**/*.rb"
  - "**/*.rake"
  - "**/Gemfile"
  - "**/Gemfile.lock"
  - "**/config/routes.rb"
---
# Ruby Hooks

> 本文件在 [common/hooks.md](../common/hooks.md) 基础上扩展了 Ruby 与 Rails 特有的内容。

## PostToolUse Hooks

配置项目本地的 hooks,优先使用 binstubs 与已检入的工具:

- **RuboCop**:在编辑 Ruby 文件后运行 `bundle exec rubocop -A <file>`,或运行项目中更安全的 formatter 命令。
- **Brakeman**:在涉及安全的 Rails 变更后运行 `bundle exec brakeman --no-progress`。
- **Tests**:针对受影响的文件运行最窄匹配的 `bin/rails test ...` 或 `bundle exec rspec ...` 命令。
- **Bundler audit**:当 `Gemfile` 或 `Gemfile.lock` 发生变更且项目已安装 bundler-audit 时,运行 `bundle exec bundle-audit check --update`。

## 警告

- 当应用代码中提交了 `debugger`、`binding.irb`、`binding.pry`、`puts`、`pp` 或 `p` 调用时,发出警告。
- 当某次编辑禁用了 CSRF 防护、扩大了批量赋值(mass-assignment)范围,或添加了未参数化的原生 SQL 时,发出警告。
- 当 migration 以破坏性方式修改数据,且没有可逆路径或文档化的 rollout plan 时,发出警告。

## CI Gate 建议

```bash
bundle exec rubocop
bundle exec brakeman --no-progress
bin/rails test
bundle exec rspec
```

仅使用项目中已存在的命令;未经 maintainer 批准,不要安装新的 hook 依赖。
