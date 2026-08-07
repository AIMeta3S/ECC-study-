---
name: django-security
description: Django 安全最佳实践、认证、授权、CSRF 防护、SQL 注入防御、XSS 防御以及安全部署配置。
metadata:
  origin: ECC
---

# Django 安全最佳实践

为 Django 应用提供全面的安全指南，以防御常见漏洞。

## 何时启用

- 设置 Django 认证与授权
- 实现用户权限与角色
- 配置生产环境安全设置
- 审查 Django 应用的安全问题
- 将 Django 应用部署到生产环境

## 核心安全设置

### 生产环境配置

```python
# settings/production.py
import os

DEBUG = False  # 关键：生产环境中绝不可设为 True

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# 安全响应头
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 年
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'

# HTTPS 与 Cookies
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

# 密钥（必须通过环境变量设置）
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    raise ImproperlyConfigured('DJANGO_SECRET_KEY environment variable is required')

# 密码校验
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 12,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]
```

## 认证

### 自定义用户模型

```python
# apps/users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """自定义用户模型以提升安全性。"""

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)

    USERNAME_FIELD = 'email'  # 以 email 作为用户名
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email

# settings/base.py
AUTH_USER_MODEL = 'users.User'
```

### 密码哈希

```python
# Django 默认使用 PBKDF2。如需更强的安全性：
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]
```

### Session 管理

```python
# Session 配置
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'  # 或 'db'
SESSION_CACHE_ALIAS = 'default'
SESSION_COOKIE_AGE = 3600 * 24 * 7  # 1 周
SESSION_SAVE_EVERY_REQUEST = False
SESSION_EXPIRE_AT_BROWSER_CLOSE = False  # 用户体验更好，但安全性更低
```

## 授权

### 权限

```python
# models.py
from django.db import models
from django.contrib.auth.models import Permission

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        permissions = [
            ('can_publish', 'Can publish posts'),
            ('can_edit_others', 'Can edit posts of others'),
        ]

    def user_can_edit(self, user):
        """检查用户能否编辑该 post。"""
        return self.author == user or user.has_perm('app.can_edit_others')

# views.py
from django.contrib.auth.mixins import LoginRequiredMixin, PermissionRequiredMixin
from django.views.generic import UpdateView

class PostUpdateView(LoginRequiredMixin, PermissionRequiredMixin, UpdateView):
    model = Post
    permission_required = 'app.can_edit_others'
    raise_exception = True  # 返回 403 而非重定向

    def get_queryset(self):
        """仅允许用户编辑自己的 posts。"""
        return Post.objects.filter(author=self.request.user)
```

### 自定义权限

```python
# permissions.py
from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """仅允许所有者编辑对象。"""

    def has_object_permission(self, request, view, obj):
        # 对任意请求允许读权限
        if request.method in permissions.SAFE_METHODS:
            return True

        # 写权限仅限所有者
        return obj.author == request.user

class IsAdminOrReadOnly(permissions.BasePermission):
    """管理员可执行所有操作，其他用户只读。"""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

class IsVerifiedUser(permissions.BasePermission):
    """仅允许已验证用户。"""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_verified
```

### 基于角色的访问控制（RBAC）

```python
# models.py
from django.contrib.auth.models import AbstractUser, Group

class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('moderator', 'Moderator'),
        ('user', 'Regular User'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')

    def is_admin(self):
        return self.role == 'admin' or self.is_superuser

    def is_moderator(self):
        return self.role in ['admin', 'moderator']

# Mixin
class AdminRequiredMixin:
    """要求 admin 角色的 mixin。"""

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated or not request.user.is_admin():
            from django.core.exceptions import PermissionDenied
            raise PermissionDenied
        return super().dispatch(request, *args, **kwargs)
```

## SQL 注入防御

### Django ORM 防护

```python
# 推荐：Django ORM 会自动对参数进行转义
def get_user(username):
    return User.objects.get(username=username)  # 安全

# 推荐：在 raw() 中使用参数
def search_users(query):
    return User.objects.raw('SELECT * FROM users WHERE username = %s', [query])

# 禁忌：切勿直接拼接用户输入
def get_user_bad(username):
    return User.objects.raw(f'SELECT * FROM users WHERE username = {username}')  # 存在漏洞！

# 推荐：使用 filter 并正确转义
def get_users_by_email(email):
    return User.objects.filter(email__iexact=email)  # 安全

# 推荐：使用 Q 对象构造复杂查询
from django.db.models import Q
def search_users_complex(query):
    return User.objects.filter(
        Q(username__icontains=query) |
        Q(email__icontains=query)
    )  # 安全
```

### raw() 的额外安全措施

```python
# 若必须使用原生 SQL，请始终使用参数
User.objects.raw(
    'SELECT * FROM users WHERE email = %s AND status = %s',
    [user_input_email, status]
)
```

## XSS 防御

### 模板转义

```django
{# Django 默认对变量自动转义 - 安全 #}
{{ user_input }}  {# 已转义的 HTML #}

{# 仅对可信内容显式标记为安全 #}
{{ trusted_html|safe }}  {# 未转义 #}

{# 使用模板过滤器生成安全 HTML #}
{{ user_input|escape }}  {# 与默认行为相同 #}
{{ user_input|striptags }}  {# 移除所有 HTML 标签 #}

{# JavaScript 转义 #}
<script>
    var username = {{ username|escapejs }};
</script>
```

### 安全字符串处理

```python
from django.utils.safestring import mark_safe
from django.utils.html import escape

# 禁忌：切勿在未转义的情况下将用户输入标记为安全
def render_bad(user_input):
    return mark_safe(user_input)  # 存在漏洞！

# 推荐：先转义，再标记为安全
def render_good(user_input):
    return mark_safe(escape(user_input))

# 推荐：对含变量的 HTML 使用 format_html
from django.utils.html import format_html

def greet_user(username):
    return format_html('<span class="user">{}</span>', escape(username))
```

### HTTP 响应头

```python
# settings.py
SECURE_CONTENT_TYPE_NOSNIFF = True  # 防止 MIME 嗅探
SECURE_BROWSER_XSS_FILTER = True  # 启用 XSS 过滤器
X_FRAME_OPTIONS = 'DENY'  # 防止 clickjacking

# 自定义中间件
from django.conf import settings

class SecurityHeaderMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Content-Security-Policy'] = "default-src 'self'"
        return response
```

## CSRF 防护

### 默认 CSRF 防护

```python
# settings.py - CSRF 默认启用
CSRF_COOKIE_SECURE = True  # 仅通过 HTTPS 发送
CSRF_COOKIE_HTTPONLY = True  # 阻止 JavaScript 访问
CSRF_COOKIE_SAMESITE = 'Lax'  # 在某些场景下防止 CSRF
CSRF_TRUSTED_ORIGINS = ['https://example.com']  # 受信任的域名

# 模板用法
<form method="post">
    {% csrf_token %}
    {{ form.as_p }}
    <button type="submit">Submit</button>
</form>

# AJAX 请求
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

fetch('/api/endpoint/', {
    method: 'POST',
    headers: {
        'X-CSRFToken': getCookie('csrftoken'),
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
});
```

### 豁免视图（谨慎使用）

```python
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt  # 仅在绝对必要时使用！
def webhook_view(request):
    # 来自外部服务的 Webhook
    pass
```

## 文件上传安全

### 文件校验

```python
import os
import magic  # pip install python-magic
from django.core.exceptions import ValidationError

ALLOWED_MIMES = {
    'image/jpeg', 'image/png', 'image/gif', 'application/pdf',
}

MIME_TO_EXTENSIONS = {
    'image/jpeg': {'.jpg', '.jpeg'},
    'image/png': {'.png'},
    'image/gif': {'.gif'},
    'application/pdf': {'.pdf'},
}

def validate_file_type(value):
    """使用 magic bytes 校验文件类型，并交叉检查扩展名。"""
    mime = magic.from_buffer(value.read(2048), mime=True)
    value.seek(0)

    if mime not in ALLOWED_MIMES:
        raise ValidationError('Unsupported file type.')

    ext = os.path.splitext(value.name)[1].lower()
    if ext not in MIME_TO_EXTENSIONS.get(mime, set()):
        raise ValidationError('File extension does not match file content.')

def validate_file_size(value):
    """校验文件大小（最大 5MB）。"""
    if value.size > 5 * 1024 * 1024:
        raise ValidationError('File too large. Max size is 5MB.')

# models.py
class Document(models.Model):
    file = models.FileField(
        upload_to='documents/',
        validators=[validate_file_type, validate_file_size]
    )

```

在安装 libmagic 困难的环境中（例如精简容器），可使用纯 Python 的 `filetype` 包作为替代方案：

```python
import os
from django.core.exceptions import ValidationError

import filetype  # pip install filetype

ALLOWED_MIMES = {
    'image/jpeg', 'image/png', 'image/gif', 'application/pdf',
}

MIME_TO_EXTENSIONS = {
    'image/jpeg': {'.jpg', '.jpeg'},
    'image/png': {'.png'},
    'image/gif': {'.gif'},
    'application/pdf': {'.pdf'},
}

def validate_file_type(value):
    """使用 magic bytes 校验文件类型。"""
    kind = filetype.guess(value.read(2048))
    value.seek(0)

    if kind is None or kind.mime not in ALLOWED_MIMES:
        raise ValidationError('Unsupported file type.')

    ext = os.path.splitext(value.name)[1].lower()
    if ext not in MIME_TO_EXTENSIONS.get(kind.mime, set()):
        raise ValidationError('File extension does not match file content.')
```

### 安全的文件存储

```python
# settings.py
MEDIA_ROOT = '/var/www/media/'
MEDIA_URL = '/media/'

# 在生产环境中为 media 使用独立域名
MEDIA_DOMAIN = 'https://media.example.com'

# 不要直接提供用户上传的文件
# 使用 whitenoise 或 CDN 托管静态文件
# 使用独立的服务器或 S3 存储 media 文件
```

## API 安全

### 限流

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day',
        'upload': '10/hour',
    }
}

# 自定义 throttle
from rest_framework.throttling import UserRateThrottle

class BurstRateThrottle(UserRateThrottle):
    scope = 'burst'
    rate = '60/min'

class SustainedRateThrottle(UserRateThrottle):
    scope = 'sustained'
    rate = '1000/day'
```

### API 认证

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def protected_view(request):
    return Response({'message': 'You are authenticated'})
```

## 安全响应头

### Content Security Policy

```python
# settings.py
CSP_DEFAULT_SRC = "'self'"
CSP_SCRIPT_SRC = "'self' https://cdn.example.com"
CSP_STYLE_SRC = "'self' 'unsafe-inline'"
CSP_IMG_SRC = "'self' data: https:"
CSP_CONNECT_SRC = "'self' https://api.example.com"

# 中间件
class CSPMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['Content-Security-Policy'] = (
            f"default-src {CSP_DEFAULT_SRC}; "
            f"script-src {CSP_SCRIPT_SRC}; "
            f"style-src {CSP_STYLE_SRC}; "
            f"img-src {CSP_IMG_SRC}; "
            f"connect-src {CSP_CONNECT_SRC}"
        )
        return response
```

## 环境变量

### 密钥管理

```python
# 使用 python-decouple 或 django-environ
import environ

env = environ.Env(
    # 设置类型转换和默认值
    DEBUG=(bool, False)
)

# 读取 .env 文件
environ.Env.read_env()

SECRET_KEY = env('DJANGO_SECRET_KEY')
DATABASE_URL = env('DATABASE_URL')
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS')

# .env 文件（切勿提交到版本库）
DEBUG=False
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
ALLOWED_HOSTS=example.com,www.example.com
```

## 记录安全事件

```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/security.log',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django.security': {
            'handlers': ['file', 'console'],
            'level': 'WARNING',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['file'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}
```

## 安全速查表

| 检查项 | 说明 |
|-------|-------------|
| `DEBUG = False` | 生产环境绝不以 DEBUG 模式运行 |
| 仅使用 HTTPS | 强制 SSL，使用安全 cookie |
| 强壮的密钥 | 通过环境变量设置 SECRET_KEY |
| 密码校验 | 启用全部密码校验器 |
| CSRF 防护 | 默认启用，不要禁用 |
| XSS 防御 | Django 自动转义，切勿对用户输入使用 `&#124;safe` |
| SQL 注入 | 使用 ORM，切勿在查询中拼接字符串 |
| 文件上传 | 校验文件类型和大小 |
| 限流 | 对 API 端点进行限流 |
| 安全响应头 | CSP、X-Frame-Options、HSTS |
| 日志 | 记录安全事件 |
| 更新 | 保持 Django 与依赖项更新 |

切记：安全是一个持续的过程，而非一款产品。请定期审查并更新你的安全实践。
