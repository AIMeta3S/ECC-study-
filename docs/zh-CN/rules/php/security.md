---
paths:
  - "**/*.php"
  - "**/composer.lock"
  - "**/composer.json"
---
# PHP 安全

> 本文件扩展了 [common/security.md](../common/security.md)，补充 PHP 特定内容。

## 输入与输出

- 在 framework 边界（`FormRequest`、Symfony Validator 或显式的 DTO 校验）对请求输入进行校验。
- 默认在模板中对输出进行转义；将 raw HTML 渲染视为必须说明理由的例外。
- 未经校验，绝不信任 query params、cookies、headers 或上传文件的元数据。

## 数据库安全

- 对所有动态查询使用预处理语句（`PDO`、Doctrine、Eloquent query builder）。
- 避免在控制器/视图中拼接 SQL 字符串。
- 谨慎限定 ORM 的批量赋值范围，并将可写字段加入白名单。

## 机密信息与依赖

- 从环境变量或 secret manager 加载机密信息，绝不要从已提交的配置文件中加载。
- 在 CI 中运行 `composer audit`，并在添加依赖前审查新包维护者的可信度。
- 有意识地锁定 major version，并尽快移除已废弃的包。

## 认证与会话安全

- 使用 `password_hash()` / `password_verify()` 存储密码。
- 在认证和权限变更后重新生成 session 标识符。
- 对改变状态的 web 请求强制执行 CSRF 防护。

## 参考

关于 Laravel 特定的安全指南，参见 skill：`laravel-security`。
