---
description: 审查 FastAPI 应用的架构、异步正确性、依赖注入、Pydantic schemas、安全性、性能和可测试性。
---

# FastAPI 审查

调用 `fastapi-reviewer` agent 进行专项 FastAPI 审查。

## 用法

```text
/fastapi-review [file-or-directory]
```

## 审查范围

- 应用工厂、路由边界、中间件和异常处理器。
- Pydantic 请求和响应 schema 分离。
- 数据库会话、身份验证、分页和设置的依赖注入。
- 异步数据库和外部 HTTP 模式。
- CORS、认证、速率限制、日志和 secret 处理。
- OpenAPI 元数据和已文档化的响应模型。
- 测试客户端设置和依赖覆盖。

## 预期输出

```text
【严重程度】简短问题标题
文件：path/to/file.py:42
问题：哪里出了问题，以及为什么这个问题很重要。
解决方案：需要做出的具体改变。
```

## 相关

- Agent: `fastapi-reviewer`
- Skill: `fastapi-patterns`
- Command: `/python-review`
- Skill: `security-scan`
