---
paths:
  - "**/*.rb"
  - "**/*.rake"
  - "**/Gemfile"
  - "**/Gemfile.lock"
  - "**/config/routes.rb"
  - "**/config/credentials*.yml.enc"
---
# Ruby 安全

> 本文件在 [common/security.md](../common/security.md) 基础上扩展了 Ruby 和 Rails 的特定内容。

## Rails 默认配置

- 对会改变状态的浏览器请求保持启用 CSRF 防护。
- 在 mass assignment 前使用 strong parameters 或类型化的边界对象。
- 将 secrets 存放在 Rails credentials、环境变量或 secret manager 中。切勿提交明文密钥、token、私有凭据或复制的 `.env` 值。

## SQL 与 Active Record

- 优先使用 Active Record 查询 API 和参数化 SQL。
- 绝不将 request、cookie、header、job 或 webhook 的值拼接进 SQL 字符串。
- 谨慎界定 model callback 的作用范围；安全敏感的副作用应显式化并由测试覆盖。

## 认证与会话

- 对于简单的会话认证使用 Rails 8 authentication generator；当需要 OAuth、MFA、confirmable、lockable、多 model 认证或已有的 Devise 约定时，使用 Devise。
- 在登录和权限变更后轮换 session。
- 通过过期机制、一次性 token、rate limiting 和 audit logging 保护账户恢复流程。

## 依赖

- 当 lockfile 变更时运行依赖检查：

```bash
bundle exec bundle-audit check --update
bundle exec brakeman --no-progress
```

- 审查新增 gem 的维护者活跃度、native extension 风险、transitive dependency，以及相同行为是否能用 Rails core 实现。

## Web 安全

- 默认对模板输出进行转义。将 `html_safe`、`raw` 和自定义 sanitizer 视为安全敏感代码。
- 按 content type、扩展名、大小和存储位置校验文件上传。
- 将后台 job、webhook、Action Cable 消息和 Turbo Stream 输入视为不可信边界。

## 参考

关于默认安全的审查模式，参见 skill：`security-review`。
