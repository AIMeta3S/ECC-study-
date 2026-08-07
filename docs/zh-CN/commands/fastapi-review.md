---
description: 对 FastAPI 应用进行架构、async 正确性、依赖注入、Pydantic schema、安全、性能和可测试性审查。
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
- 数据库 session、认证、分页和配置的依赖注入。
- async 数据库和外部 HTTP 模式。
- CORS、认证、速率限制、日志记录和 secret 处理。
- OpenAPI 元数据和已文档化的响应模型。
- 测试客户端设置和依赖覆盖。

## 预期输出

```text
[SEVERITY] Short issue title
File: path/to/file.py:42
Issue: What is wrong and why it matters.
Fix: Concrete change to make.
```

## 相关

- Agent: `fastapi-reviewer`
- Skill: `fastapi-patterns`
- Command: `/python-review`
- Skill: `security-scan`
