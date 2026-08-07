---
description: 从脚本、schema、路由和 exports 等 source-of-truth 文件同步文档。
---

# 更新文档

从 source-of-truth 文件生成，保持文档与代码库同步。

## 步骤 1：识别 source of truth

| 来源 | 生成内容 |
|--------|-----------|
| `package.json` 脚本 | 可用命令参考 |
| `.env.example` | 环境变量文档 |
| `openapi.yaml` / 路由文件 | API endpoint 参考 |
| 源码 exports | 公共 API 文档 |
| `Dockerfile` / `docker-compose.yml` | 基础设施搭建文档 |

## 步骤 2：生成脚本参考

1. 读取 `package.json`（或 `Makefile`、`Cargo.toml`、`pyproject.toml`）
2. 提取所有脚本/命令及其描述
3. 生成参考表格：

```markdown
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Production build with type checking |
| `npm test` | Run test suite with coverage |
```

## 步骤 3：生成环境文档

1. 读取 `.env.example`（或 `.env.template`、`.env.sample`）
2. 提取所有变量及其用途
3. 按必填与可选分类
4. 记录预期格式和有效值

```markdown
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgres://user:pass@host:5432/db` |
| `LOG_LEVEL` | No | Logging verbosity (default: info) | `debug`, `info`, `warn`, `error` |
```

## 步骤 4：更新贡献指南

生成或更新 `docs/CONTRIBUTING.md`，包含以下内容：
- 开发环境搭建（前置条件、安装步骤）
- 可用脚本及其用途
- 测试流程（如何运行、如何编写新测试）
- 代码风格强制执行（linter、formatter、pre-commit hooks）
- PR 提交清单

## 步骤 5：更新 runbook

生成或更新 `docs/RUNBOOK.md`，包含以下内容：
- 部署流程（逐步）
- Health check endpoint 和监控
- 常见 issue 及其修复
- 回滚流程
- 告警和升级路径

## 步骤 6：过时检查

1. 查找 90 天以上未修改的文档文件
2. 与最近的源码变更交叉核对
3. 标记可能过时的文档以供人工审查

## 步骤 7：显示摘要

```
Documentation Update
──────────────────────────────
Updated:  docs/CONTRIBUTING.md (scripts table)
Updated:  docs/ENV.md (3 new variables)
Flagged:  docs/DEPLOY.md (142 days stale)
Skipped:  docs/API.md (no changes detected)
──────────────────────────────
```

## 规则

- **单一 source of truth**：始终从代码生成，绝不手动编辑生成的部分
- **保留手动编写的部分**：仅更新生成的部分；保持手写文本不变
- **标记生成内容**：在生成的部分周围使用 `<!-- AUTO-GENERATED -->` 标记
- **不要未经指示创建文档**：仅当命令明确要求时才创建新的文档文件
