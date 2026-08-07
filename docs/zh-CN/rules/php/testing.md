---
paths:
  - "**/*.php"
  - "**/phpunit.xml"
  - "**/phpunit.xml.dist"
  - "**/composer.json"
---
# PHP 测试

> 本文件扩展了 [common/testing.md](../common/testing.md)，补充 PHP 特定内容。

## 框架

使用 **PHPUnit** 作为默认测试框架。如果项目中已配置 **Pest**，新测试优先使用 Pest，避免混用框架。

## 覆盖率

```bash
vendor/bin/phpunit --coverage-text
# 或
vendor/bin/pest --coverage
```

在 CI 中优先使用 **pcov** 或 **Xdebug**，并将覆盖率阈值配置在 CI 中，而非作为团队隐性知识。

## 测试组织

- 将快速单元测试与框架/数据库集成测试分开。
- 使用 factory/builder 构建 fixture，而非大型手写数组。
- 保持 HTTP/控制器测试聚焦于传输与验证；将业务规则移入服务层测试。

## Inertia

如果项目使用 Inertia.js，优先使用 `assertInertia` 配合 `AssertableInertia` 来验证组件名和 props，而非原始 JSON 断言。

## 参考

关于全仓库范围的 RED -> GREEN -> REFACTOR 循环，参见 skill：`tdd-workflow`。
关于 Laravel 专属的测试模式（PHPUnit 和 Pest），参见 skill：`laravel-tdd`。
