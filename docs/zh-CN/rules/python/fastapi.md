---
paths:
  - "**/app/**/*.py"
  - "**/fastapi/**/*.py"
  - "**/*_api.py"
---
# FastAPI 规则

针对 FastAPI 项目，请将以下规则与通用 Python 规则配合使用。

## 结构

- 将 app 的构建放在 `create_app()` 中。
- 保持 routers 轻量；将持久化与业务行为移入 services 或 CRUD helpers。
- 保持 request schemas、update schemas 与 response schemas 相互独立。
- 将 database sessions 与 auth 放在 dependencies 中。

## Async

- 对于执行 I/O 的 endpoints，使用 `async def`。
- 在 async endpoints 中使用 async 的 database 与 HTTP clients。
- 不要在 async routes 中调用 `requests`、sync SQLAlchemy sessions 或阻塞性的文件/网络操作。

## Dependency Injection

```python
@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ...
```

不要在 route handlers 内部创建 `SessionLocal()` 或长生命周期的 clients。

## Schemas

- 绝不要在 response models 中包含 passwords、password hashes、access tokens、refresh tokens 或 internal auth state。
- 在返回 application data 的 endpoints 上使用 `response_model`。
- 当 Pydantic 能表达该规则时，使用 field constraints 而非手写 validation。

## Security

- 保持 CORS origins 与具体环境绑定。
- 不要将 wildcard origins 与 credentialed CORS 混用。
- 校验 JWT 的 expiry、issuer、audience 与 algorithm。
- 对 auth 与 write-heavy endpoints 实施限流。
- 将 credentials、cookies、authorization headers 与 tokens 从 logs 中脱敏。

## Testing

- 覆盖 `Depends` 所使用的确切 dependency。
- 测试结束后清除 `app.dependency_overrides`。
- 对于 async applications，优先使用 async test clients。

参见 skill：`fastapi-patterns`。
