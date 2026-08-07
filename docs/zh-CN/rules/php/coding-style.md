---
paths:
  - "**/*.php"
  - "**/composer.json"
---
# PHP 编码风格

> 本文件在 [common/coding-style.md](../common/coding-style.md) 基础上扩展了 PHP 特定内容。

## 标准

- 遵循 **PSR-12** 的格式化与命名约定。
- 在应用程序代码中优先使用 `declare(strict_types=1);`。
- 在所有新代码允许的地方使用 scalar type hints、return types 和 typed properties。

## Immutability

- 对于跨服务边界传递的数据，优先使用 immutable 的 DTO 和 value object。
- 尽可能对 request/response payload 使用 `readonly` 属性或 immutable 构造函数。
- 对简单的映射保留 array；将业务关键结构提升为显式的 class。

## 格式化

- 使用 **PHP-CS-Fixer** 或 **Laravel Pint** 进行格式化。
- 使用 **PHPStan** 或 **Psalm** 进行静态分析。
- 将 Composer 脚本提交到版本控制，以确保本地和 CI 中运行相同的命令。

## 导入

- 为所有引用的 class、interface 和 trait 添加 `use` 语句。

## 错误处理

- 对异常状态抛出 exception；在新代码中避免以 `false`/`null` 作为隐式的错误通道。
- 在框架/请求输入进入 domain logic 之前，将其转换为经过校验的 DTO。

## 参考

参见 skill：`backend-patterns`，获取更通用的 service/repository 分层指导。
