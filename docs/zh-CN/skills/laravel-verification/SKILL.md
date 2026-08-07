---
name: laravel-verification
<<<<<<< HEAD
description: "用于 Laravel 项目的验证循环：环境检查、linting、static analysis、带 coverage 的测试、安全扫描，以及 deploy 就绪。"
metadata:
  origin: ECC
=======
description: "Verification loop for Laravel projects: env checks, linting, static analysis, tests with coverage, security scans, and deployment readiness."
origin: ECC
>>>>>>> upstream/main
---

# Laravel 验证循环

在提交 PR 前、重大变更后，以及 deploy 前运行。

## 何时使用

- 在为 Laravel 项目提交 pull request 之前
- 在重大 refactor 或 dependency 升级之后
- 针对 staging 或生产环境的 deploy 前验证
- 运行完整的 lint -> 测试 -> 安全 -> deploy 就绪 pipeline

## 工作原理

- 按顺序从环境检查依次执行到 deploy 就绪，使每一层都建立在前一层之上。
- 环境与 Composer 检查是其他所有阶段的前置 gate；若失败则立即停止。
- 在运行完整的测试与 coverage 之前，linting/static analysis 应当通过。
- 安全与 migration 审查在测试之后进行，以便在数据或 release 步骤之前先验证行为。
- Build/deploy 就绪检查以及 queue/scheduler 检查是最终的 gate；任何失败都会阻止 release。

## Phase 1：环境检查

```bash
php -v
composer --version
php artisan --version
```

- 验证 `.env` 存在且包含必需的 key
- 确认生产环境中 `APP_DEBUG=false`
- 确认 `APP_ENV` 与目标 deploy 匹配（`production`、`staging`）

如果本地使用 Laravel Sail：

```bash
./vendor/bin/sail php -v
./vendor/bin/sail artisan --version
```

## Phase 1.5：Composer 与 Autoload

```bash
composer validate
composer dump-autoload -o
```

## Phase 2：Linting 与 Static Analysis

```bash
vendor/bin/pint --test
vendor/bin/phpstan analyse
```

如果你的项目使用 Psalm 而非 PHPStan：

```bash
vendor/bin/psalm
```

## Phase 3：测试与 Coverage

```bash
php artisan test
```

Coverage（CI）：

```bash
XDEBUG_MODE=coverage php artisan test --coverage
```

CI 示例（format -> static analysis -> 测试）：

```bash
vendor/bin/pint --test
vendor/bin/phpstan analyse
XDEBUG_MODE=coverage php artisan test --coverage
```

## Phase 4：安全与 Dependency 检查

```bash
composer audit
```

## Phase 5：数据库与 Migration

```bash
php artisan migrate --pretend
php artisan migrate:status
```

- 仔细审查破坏性的 migration
- 确保 migration 文件名遵循 `Y_m_d_His_*`（例如 `2025_03_14_154210_create_orders_table.php`），并清晰描述变更
- 确保 rollback 可行
- 验证 `down()` 方法，并避免在没有显式备份的情况下产生不可逆的数据丢失

## Phase 6：Build 与 deploy 就绪

```bash
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

- 确保 cache 预热在生产配置下能够成功
- 验证 queue worker 与 scheduler 已配置
- 确认 `storage/` 和 `bootstrap/cache/` 在目标环境中可写

## Phase 7：Queue 与 Scheduler 检查

```bash
php artisan schedule:list
php artisan queue:failed
```

如果使用 Horizon：

```bash
php artisan horizon:status
```

如果 `queue:monitor` 可用，可用它在不处理 job 的情况下检查 backlog：

```bash
php artisan queue:monitor default --max=100
```

主动验证（仅限 staging）：向专用 queue 派发一个 no-op job，并运行单个 worker 来处理它（确保配置了非 `sync` 的 queue connection）。

```bash
php artisan tinker --execute="dispatch((new App\\Jobs\\QueueHealthcheck())->onQueue('healthcheck'))"
php artisan queue:work --once --queue=healthcheck
```

验证该 job 是否产生了预期的副作用（log 条目、healthcheck 表行或 metric）。

仅在处理测试 job 安全的非生产环境中执行此操作。

## 示例

最小流程：

```bash
php -v
composer --version
php artisan --version
composer validate
vendor/bin/pint --test
vendor/bin/phpstan analyse
php artisan test
composer audit
php artisan migrate --pretend
php artisan config:cache
php artisan queue:failed
```

CI 风格 pipeline：

```bash
composer validate
composer dump-autoload -o
vendor/bin/pint --test
vendor/bin/phpstan analyse
XDEBUG_MODE=coverage php artisan test --coverage
composer audit
php artisan migrate --pretend
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan schedule:list
```
