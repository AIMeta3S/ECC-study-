---
name: django-celery
description: Django + Celery 异步任务模式——涵盖配置、任务设计、Beat 调度、重试、Canvas 工作流、监控与测试。在为 Django 应用添加后台作业、计划任务或异步处理时使用。
metadata:
  origin: ECC
---

# Django + Celery 异步任务模式

使用 Celery 配合 Redis 或 RabbitMQ 在 Django 中处理后台任务的生产级模式。

## 何时激活

- 为 Django 应用添加后台作业或异步处理
- 实现周期性/计划任务
- 将耗时操作（邮件、PDF 生成、API 调用）从请求周期中剥离
- 设置 Celery Beat 以实现类 cron 的调度
- 调试任务失败、重试或队列积压
- 为 Celery 任务编写测试

## 项目初始化

### 安装

```bash
pip install 'celery[redis]' django-celery-results django-celery-beat
```

### `celery.py` — 应用入口

```python
# config/celery.py
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('myproject')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()  # 发现每个 INSTALLED_APP 中的 tasks.py

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
```

```python
# config/__init__.py
from .celery import app as celery_app

__all__ = ('celery_app',)
```

### Django 设置

```python
# config/settings/base.py

# Broker（生产环境推荐使用 Redis）
CELERY_BROKER_URL = env('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default='django-db')

# 序列化
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'

# 任务行为
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60        # 硬性限制：30 分钟
CELERY_TASK_SOFT_TIME_LIMIT = 25 * 60   # 软性限制：发送 SoftTimeLimitExceeded
CELERY_WORKER_PREFETCH_MULTIPLIER = 1   # 防止 worker 囤积长任务
CELERY_TASK_ACKS_LATE = True            # worker 崩溃时重新入队

# 结果持久化
CELERY_RESULT_EXPIRES = 60 * 60 * 24   # 保留结果 24 小时

# Beat 调度器（用于周期性任务）
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# 已安装应用
INSTALLED_APPS += [
    'django_celery_results',
    'django_celery_beat',
]
```

### 运行 Worker

```bash
# 启动 worker（开发环境）
celery -A config worker --loglevel=info

# 启动 beat 调度器（周期性任务）
celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler

# worker + beat 合并运行（仅限开发环境，生产环境禁止）
celery -A config worker --beat --loglevel=info

# 生产环境：并发运行多个 worker
celery -A config worker --loglevel=warning --concurrency=4 -Q default,high_priority
```

## 任务设计模式

### 基础任务

```python
# apps/notifications/tasks.py
from celery import shared_task
import logging

logger = logging.getLogger(__name__)

@shared_task(name='notifications.send_welcome_email')
def send_welcome_email(user_id: int) -> None:
    """向新注册用户发送欢迎邮件。"""
    from apps.users.models import User
    from apps.notifications.services import EmailService

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.warning('send_welcome_email: user %s not found', user_id)
        return  # 幂等——不抛出异常，任务已无法完成

    EmailService.send_welcome(user)
    logger.info('Welcome email sent to user %s', user_id)
```

### 可重试任务

```python
@shared_task(
    bind=True,
    name='integrations.sync_to_crm',
    max_retries=5,
    default_retry_delay=60,       # 首次重试前的秒数
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,           # 指数退避
    retry_backoff_max=600,        # 上限 10 分钟
    retry_jitter=True,            # 随机化以避免惊群效应
)
def sync_contact_to_crm(self, contact_id: int) -> dict:
    """同步 contact 到外部 CRM，遇到瞬时失败时重试。"""
    from apps.crm.services import CRMClient

    try:
        result = CRMClient().sync(contact_id)
        return result
    except CRMClient.RateLimitError as exc:
        # 从响应头获取特定的重试延迟
        raise self.retry(exc=exc, countdown=int(exc.retry_after))
```

### 幂等任务模式

设计任务时应确保其在相同输入下能安全地多次运行：

```python
@shared_task(name='orders.mark_shipped')
def mark_order_shipped(order_id: int, tracking_number: str) -> None:
    """标记订单为已发货——可安全多次运行。"""
    from apps.orders.models import Order

    updated = Order.objects.filter(
        pk=order_id,
        status=Order.Status.PROCESSING,    # 守卫：仅在未发货时更新
    ).update(
        status=Order.Status.SHIPPED,
        tracking_number=tracking_number,
    )

    if not updated:
        logger.info('mark_order_shipped: order %s already shipped or not found', order_id)
```

### 带软性时间限制的任务

```python
from celery.exceptions import SoftTimeLimitExceeded

@shared_task(
    bind=True,
    name='reports.generate_pdf',
    soft_time_limit=120,
    time_limit=150,
)
def generate_pdf_report(self, report_id: int) -> str:
    """生成 PDF 报告，带优雅的超时处理。"""
    from apps.reports.services import PDFGenerator

    try:
        path = PDFGenerator.build(report_id)
        return path
    except SoftTimeLimitExceeded:
        # 在硬终止前清理未完成的文件
        PDFGenerator.cleanup(report_id)
        raise
```

## 调用任务

```python
from datetime import timedelta
from django.utils import timezone

# 发后即忘（异步）
send_welcome_email.delay(user.pk)

# 调度到未来执行
send_reminder.apply_async(args=[user.pk], countdown=3600)  # 1 小时后
send_reminder.apply_async(args=[user.pk], eta=timezone.now() + timedelta(days=1))

# 通过队列路由 apply
sync_contact_to_crm.apply_async(args=[contact.pk], queue='high_priority')

# 同步运行（仅用于测试/调试）
result = generate_pdf_report.apply(args=[report.pk])
```

## Beat 调度（周期性任务）

### 代码定义的调度

```python
# config/settings/base.py
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'cleanup-expired-sessions': {
        'task': 'users.cleanup_expired_sessions',
        'schedule': crontab(hour=2, minute=0),   # 每天凌晨 2 点
    },
    'sync-inventory': {
        'task': 'products.sync_inventory',
        'schedule': 60.0,                         # 每 60 秒
    },
    'weekly-digest': {
        'task': 'notifications.send_weekly_digest',
        'schedule': crontab(day_of_week='monday', hour=8, minute=0),
    },
}
```

### 数据库定义的调度（通过 django-celery-beat）

```python
# 通过 Django admin 或代码管理周期性任务
from django_celery_beat.models import PeriodicTask, CrontabSchedule
import json

schedule, _ = CrontabSchedule.objects.get_or_create(
    hour='*/6', minute='0',
    timezone='UTC',
)

PeriodicTask.objects.update_or_create(
    name='Sync inventory every 6 hours',
    defaults={
        'crontab': schedule,
        'task': 'products.sync_inventory',
        'args': json.dumps([]),
        'enabled': True,
    }
)
```

## Canvas：链式与分组任务

```python
from celery import chain, group, chord

# Chain：顺序运行任务，传递结果
pipeline = chain(
    fetch_data.s(source_id),
    transform_data.s(),          # 接收 fetch_data 的结果作为第一个参数
    load_to_warehouse.s(),
)
pipeline.delay()

# Group：并行运行任务
parallel = group(
    send_welcome_email.s(user_id)
    for user_id in new_user_ids
)
parallel.delay()

# Chord：并行任务 + 全部完成后的回调
result = chord(
    group(process_chunk.s(chunk) for chunk in data_chunks),
    aggregate_results.s(),       # 以 chunk 结果列表为参数调用
)
result.delay()
```

## 错误处理与死信队列

```python
# apps/core/tasks.py
from celery.signals import task_failure

@task_failure.connect
def on_task_failure(sender, task_id, exception, args, kwargs, traceback, einfo, **kw):
    """将所有任务失败记录到 Sentry / 告警系统。"""
    import sentry_sdk
    with sentry_sdk.new_scope() as scope:
        scope.set_context('celery', {
            'task': sender.name,
            'task_id': task_id,
            'args': args,
            'kwargs': kwargs,
        })
        sentry_sdk.capture_exception(exception)
```

```python
# 在达到最大重试次数后，将失败任务路由到死信队列
@shared_task(
    bind=True,
    max_retries=3,
    name='payments.charge_card',
)
def charge_card(self, order_id: int) -> None:
    from apps.payments.models import Order, FailedCharge

    try:
        _do_charge(order_id)
    except Exception as exc:
        if self.request.retries >= self.max_retries:
            # 持久化到死信表以便人工审查
            FailedCharge.objects.create(
                order_id=order_id,
                error=str(exc),
                task_id=self.request.id,
            )
            return  # 不抛出异常——任务已永久失败
        raise self.retry(exc=exc)
```

## 测试 Celery 任务

### 单元测试（无 Broker）

```python
# tests/test_tasks.py
import pytest
from unittest.mock import patch, MagicMock
from apps.notifications.tasks import send_welcome_email

class TestSendWelcomeEmail:

    @pytest.mark.django_db
    def test_sends_email_to_existing_user(self, user):
        with patch('apps.notifications.services.EmailService') as mock_email:
            send_welcome_email(user.pk)
            mock_email.send_welcome.assert_called_once_with(user)

    @pytest.mark.django_db
    def test_skips_missing_user_gracefully(self):
        """当用户在入队和执行之间被删除时不应抛出异常。"""
        send_welcome_email(99999)  # 不存在的用户——必须不抛出异常
```

### 使用 CELERY_TASK_ALWAYS_EAGER 进行集成测试

```python
# config/settings/test.py
CELERY_TASK_ALWAYS_EAGER = True      # 在测试中同步运行任务
CELERY_TASK_EAGER_PROPAGATES = True  # 重新抛出任务中的异常

# tests/test_integration.py
@pytest.mark.django_db
def test_registration_triggers_welcome_email(client):
    with patch('apps.notifications.services.EmailService') as mock_email:
        response = client.post('/api/users/', {
            'email': 'new@example.com',
            'password': 'strongpass123',
        })

    assert response.status_code == 201
    mock_email.send_welcome.assert_called_once()
```

### 测试重试

```python
@pytest.mark.django_db
def test_task_retries_on_connection_error():
    with patch('apps.crm.services.CRMClient.sync') as mock_sync:
        mock_sync.side_effect = ConnectionError('timeout')

        with pytest.raises(ConnectionError):
            sync_contact_to_crm.apply(args=[1], throw=True)

        assert mock_sync.call_count == 1  # eager 模式下仅首次尝试
```

## 监控

```bash
# 检查活跃 worker 和队列
celery -A config inspect active
celery -A config inspect stats
celery -A config inspect reserved

# 检查队列长度（Redis）
redis-cli llen celery

# Flower：基于 Web 的实时监控
pip install flower
celery -A config flower --port=5555
```

## 反模式

```python
# 反例：传递 model 实例——执行时可能已过期
send_welcome_email.delay(user)        # 永远不要传递 ORM 对象
send_welcome_email.delay(user.pk)     # 始终传递 PK

# 反例：在生产 view 中同步调用任务
result = generate_report.apply()      # 阻塞请求线程

# 反例：无守卫的非幂等任务
@shared_task
def charge_and_fulfill(order_id):
    order.charge()     # 任务重试时可能重复扣款！
    order.fulfill()

# 正例：带状态守卫的幂等任务
@shared_task
def charge_and_fulfill(order_id):
    order = Order.objects.select_for_update().get(pk=order_id)
    if order.status != Order.Status.PENDING:
        return  # 已处理
    order.charge()
    order.fulfill()
```

## 生产环境清单

| 检查项 | 设置 |
|-------|---------|
| Worker 崩溃时自动重启 | `supervisord` 或 `systemd` unit |
| `CELERY_TASK_ACKS_LATE = True` | worker 崩溃时重新入队任务 |
| `CELERY_WORKER_PREFETCH_MULTIPLIER = 1` | 长任务的公平分配 |
| 按优先级分离队列 | `-Q default,high_priority,low_priority` |
| 设置 `CELERY_TASK_SOFT_TIME_LIMIT` | 硬终止前的优雅超时 |
| Sentry 集成 | 捕获所有 `task_failure` 信号 |
| Flower 或其他监控工具 | 可见队列深度 |
| Beat 仅在单节点运行 | 防止重复执行计划任务 |

## 相关 skill

- `django-patterns` — ORM、service layer 和项目结构
- `django-tdd` — 测试 Django model、view 和 service
- `python-testing` — pytest 配置与 fixture
