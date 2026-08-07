---
paths:
  - "**/*.php"
  - "**/composer.json"
  - "**/phpstan.neon"
  - "**/phpstan.neon.dist"
  - "**/psalm.xml"
---
# PHP Hooks

> 本文件在 [common/hooks.md](../common/hooks.md) 的基础上扩展了 PHP 特定内容。

## PostToolUse Hooks

在 `~/.claude/settings.json` 中配置：

- **Pint / PHP-CS-Fixer**：自动格式化已编辑的 `.php` 文件。
- **PHPStan / Psalm**：在启用类型的代码库中编辑 PHP 后运行 static analysis。
- **PHPUnit / Pest**：当改动影响行为时，对改动过的文件或模块运行针对性测试。

## 警告

- 当已编辑的文件中遗留 `var_dump`、`dd`、`dump` 或 `die()` 时发出警告。
- 当已编辑的 PHP 文件新增原生 SQL 或禁用 CSRF/session 保护时发出警告。
