---
name: django-verification
description: "Django 项目的验证循环：在发布或 PR 之前执行 migrations、linting、带 coverage 的测试、安全扫描以及部署就绪检查。"
metadata:
  origin: ECC
---

# Django 验证循环

在 PR 之前、重大变更之后以及部署前运行，以确保 Django 应用的质量与安全。

## 何时启用

- 在为 Django 项目发起 pull request 之前
- 在重大 model 变更、migration 更新或依赖升级之后
- 针对 staging 或 production 环境的部署前验证
- 运行完整的 environment → lint → test → security → 部署就绪 pipeline
- 验证 migration 安全性和测试 coverage

## 阶段 1：Environment Check

```bash
# 验证 Python 版本
python --version  # 应与项目要求一致

# 检查虚拟环境
which python
pip list --outdated

# 验证环境变量
python -c "import os; import environ; print('DJANGO_SECRET_KEY set' if os.environ.get('DJANGO_SECRET_KEY') else 'MISSING: DJANGO_SECRET_KEY')"
```

如果 environment 配置错误，停止并修复。

## 阶段 2：代码质量与格式化

```bash
# 类型检查
mypy . --config-file pyproject.toml

# 使用 ruff 进行 linting
ruff check . --fix

# 使用 black 进行格式化
black . --check
black .  # 自动修复

# import 排序
isort . --check-only
isort .  # 自动修复

# Django 专用检查
python manage.py check --deploy
```

常见问题：
- 公共函数缺少 type hints
- PEP 8 格式化违规
- import 未排序
- production 配置中遗留了 debug 相关设置

## 阶段 3：Migrations

```bash
# 检查未应用的 migrations
python manage.py showmigrations

# 创建缺失的 migrations
python manage.py makemigrations --check

# 干运行 migration 应用
python manage.py migrate --plan

# 应用 migrations（测试环境）
python manage.py migrate

# 检查 migration 冲突
python manage.py makemigrations --merge  # 仅在存在冲突时使用
```

报告：
- 待处理 migrations 的数量
- 任何 migration 冲突
- 没有 migration 的 model 变更

## 阶段 4：测试与 Coverage

```bash
# 使用 pytest 运行所有测试
pytest --cov=apps --cov-report=html --cov-report=term-missing --reuse-db

# 运行特定 app 的测试
pytest apps/users/tests/

# 使用 markers 运行
pytest -m "not slow"  # 跳过慢速测试
pytest -m integration  # 仅运行集成测试

# Coverage 报告
open htmlcov/index.html
```

报告：
- 总测试数：X 通过、Y 失败、Z 跳过
- 总体 coverage：XX%
- 每个 app 的 coverage 明细

Coverage 目标：

| 组件 | 目标 |
|-----------|--------|
| Models | 90%+ |
| Serializers | 85%+ |
| Views | 80%+ |
| Services | 90%+ |
| 总体 | 80%+ |

## 阶段 5：安全扫描

```bash
# 依赖项漏洞
pip-audit
safety check --full-report

# Django 安全检查
python manage.py check --deploy

# Bandit 安全 linter
bandit -r . -f json -o bandit-report.json

# Secret 扫描（如果安装了 gitleaks）
gitleaks detect --source . --verbose

# 环境变量检查
python -c "from django.core.exceptions import ImproperlyConfigured; from django.conf import settings; settings.DEBUG"
```

报告：
- 发现的存在漏洞的依赖项
- 安全配置问题
- 检测到的硬编码 secrets
- DEBUG 模式状态（在 production 中应为 False）

## 阶段 6：Django Management Commands

```bash
# 检查 model 问题
python manage.py check

# 收集静态文件
python manage.py collectstatic --noinput --clear

# 创建 superuser（如果测试需要）
echo "from apps.users.models import User; User.objects.create_superuser('admin@example.com', 'admin')" | python manage.py shell

# 数据库完整性
python manage.py check --database default

# Cache 验证（如果使用 Redis）
python -c "from django.core.cache import cache; cache.set('test', 'value', 10); print(cache.get('test'))"
```

## 阶段 7：性能检查

```bash
# Django Debug Toolbar 输出（检查 N+1 queries）
# 在 dev 模式下以 DEBUG=True 运行并访问某个页面
# 在 SQL 面板中查找重复的 queries

# Query 数量分析
django-admin debugsqlshell  # 如果安装了 django-debug-sqlshell

# 检查缺失的 indexes
python manage.py shell << EOF
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("SELECT table_name, index_name FROM information_schema.statistics WHERE table_schema = 'public'")
    print(cursor.fetchall())
EOF
```

报告：
- 每页的 query 数量（典型页面应 < 50）
- 缺失的数据库 indexes
- 检测到的重复 queries

## 阶段 8：静态资源

```bash
# 检查 npm 依赖（如果使用 npm）
npm audit
npm audit fix

# 构建静态文件（如果使用 webpack/vite）
npm run build

# 验证静态文件
ls -la staticfiles/
python manage.py findstatic css/style.css
```

## 阶段 9：配置审查

```python
# 在 Python shell 中运行以验证设置
python manage.py shell << EOF
from django.conf import settings
import os

# 关键检查
checks = {
    'DEBUG is False': not settings.DEBUG,
    'SECRET_KEY set': bool(settings.SECRET_KEY and len(settings.SECRET_KEY) > 30),
    'ALLOWED_HOSTS set': len(settings.ALLOWED_HOSTS) > 0,
    'HTTPS enabled': getattr(settings, 'SECURE_SSL_REDIRECT', False),
    'HSTS enabled': getattr(settings, 'SECURE_HSTS_SECONDS', 0) > 0,
    'Database configured': settings.DATABASES['default']['ENGINE'] != 'django.db.backends.sqlite3',
}

for check, result in checks.items():
    status = '✓' if result else '✗'
    print(f"{status} {check}")
EOF
```

## 阶段 10：日志配置

```bash
# 测试日志输出
python manage.py shell << EOF
import logging
logger = logging.getLogger('django')
logger.warning('Test warning message')
logger.error('Test error message')
EOF

# 检查日志文件（如果已配置）
tail -f /var/log/django/django.log
```

## 阶段 11：API 文档（如果使用 DRF）

```bash
# 生成 schema
python manage.py generateschema --format openapi-json > schema.json

# 验证 schema
# 检查 schema.json 是否为有效的 JSON
python -c "import json; json.load(open('schema.json'))"

# 访问 Swagger UI（如果使用 drf-yasg）
# 在浏览器中访问 http://localhost:8000/swagger/
```

## 阶段 12：Diff 审查

```bash
# 显示 diff 统计信息
git diff --stat

# 显示实际变更
git diff

# 显示已变更的文件
git diff --name-only

# 检查常见问题
git diff | grep -i "todo\|fixme\|hack\|xxx"
git diff | grep "print("  # Debug 语句
git diff | grep "DEBUG = True"  # Debug 模式
git diff | grep "import pdb"  # 调试器
```

检查清单：
- 无 debug 语句（print、pdb、breakpoint()）
- 关键代码中无 TODO/FIXME 注释
- 无硬编码的 secrets 或凭据
- model 变更已包含数据库 migrations
- 配置变更已记录
- 外部调用已包含错误处理
- 需要处已包含事务管理

## 输出模板

```
DJANGO VERIFICATION REPORT
==========================

Phase 1: Environment Check
  ✓ Python 3.11.5
  ✓ Virtual environment active
  ✓ All environment variables set

Phase 2: Code Quality
  ✓ mypy: No type errors
  ✗ ruff: 3 issues found (auto-fixed)
  ✓ black: No formatting issues
  ✓ isort: Imports properly sorted
  ✓ manage.py check: No issues

Phase 3: Migrations
  ✓ No unapplied migrations
  ✓ No migration conflicts
  ✓ All models have migrations

Phase 4: Tests + Coverage
  Tests: 247 passed, 0 failed, 5 skipped
  Coverage:
    Overall: 87%
    users: 92%
    products: 89%
    orders: 85%
    payments: 91%

Phase 5: Security Scan
  ✗ pip-audit: 2 vulnerabilities found (fix required)
  ✓ safety check: No issues
  ✓ bandit: No security issues
  ✓ No secrets detected
  ✓ DEBUG = False

Phase 6: Django Commands
  ✓ collectstatic completed
  ✓ Database integrity OK
  ✓ Cache backend reachable

Phase 7: Performance
  ✓ No N+1 queries detected
  ✓ Database indexes configured
  ✓ Query count acceptable

Phase 8: Static Assets
  ✓ npm audit: No vulnerabilities
  ✓ Assets built successfully
  ✓ Static files collected

Phase 9: Configuration
  ✓ DEBUG = False
  ✓ SECRET_KEY configured
  ✓ ALLOWED_HOSTS set
  ✓ HTTPS enabled
  ✓ HSTS enabled
  ✓ Database configured

Phase 10: Logging
  ✓ Logging configured
  ✓ Log files writable

Phase 11: API Documentation
  ✓ Schema generated
  ✓ Swagger UI accessible

Phase 12: Diff Review
  Files changed: 12
  +450, -120 lines
  ✓ No debug statements
  ✓ No hardcoded secrets
  ✓ Migrations included

RECOMMENDATION: WARNING: Fix pip-audit vulnerabilities before deploying

NEXT STEPS:
1. Update vulnerable dependencies
2. Re-run security scan
3. Deploy to staging for final testing
```

## 部署前检查清单

- [ ] 所有测试通过
- [ ] Coverage ≥ 80%
- [ ] 无安全漏洞
- [ ] 无未应用的 migrations
- [ ] production 设置中 DEBUG = False
- [ ] SECRET_KEY 已正确配置
- [ ] ALLOWED_HOSTS 设置正确
- [ ] 已启用数据库备份
- [ ] 静态文件已收集并提供服务
- [ ] 日志已配置且正常工作
- [ ] 错误监控（Sentry 等）已配置
- [ ] CDN 已配置（如适用）
- [ ] Redis/cache 后端已配置
- [ ] Celery workers 正在运行（如适用）
- [ ] HTTPS/SSL 已配置
- [ ] 环境变量已记录

## 持续集成

### GitHub Actions 示例

```yaml
# .github/workflows/django-verification.yml
name: Django Verification

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Cache pip
        uses: actions/cache@v3
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install ruff black mypy pytest pytest-django pytest-cov bandit safety pip-audit

      - name: Code quality checks
        run: |
          ruff check .
          black . --check
          isort . --check-only
          mypy .

      - name: Security scan
        run: |
          bandit -r . -f json -o bandit-report.json
          safety check --full-report
          pip-audit

      - name: Run tests
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test
          DJANGO_SECRET_KEY: test-secret-key
        run: |
          pytest --cov=apps --cov-report=xml --cov-report=term-missing

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## 快速参考

| 检查项 | 命令 |
|-------|---------|
| Environment | `python --version` |
| Type checking | `mypy .` |
| Linting | `ruff check .` |
| 格式化 | `black . --check` |
| Migrations | `python manage.py makemigrations --check` |
| 测试 | `pytest --cov=apps` |
| 安全 | `pip-audit && bandit -r .` |
| Django check | `python manage.py check --deploy` |
| Collectstatic | `python manage.py collectstatic --noinput` |
| Diff 统计 | `git diff --stat` |

切记：自动化验证能捕获常见问题，但不能替代手动 code review 和 staging 环境中的测试。
