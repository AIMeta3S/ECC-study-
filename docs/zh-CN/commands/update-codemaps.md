---
description: 扫描项目结构并生成 token 精简的架构 codemaps。
---

# 更新 Codemaps

分析代码库结构，生成 token 精简的架构文档。

## 步骤 1：扫描项目结构

1. 识别项目类型（monorepo、single app、library、microservice）
2. 查找所有源代码目录（src/、lib/、app/、packages/）
3. 映射入口点（main.ts、index.ts、app.py、main.go 等）

## 步骤 2：生成 Codemaps

在 `docs/CODEMAPS/`（或 `.reports/codemaps/`）中创建或更新 codemaps：

| 文件 | 内容 |
|------|----------|
| `architecture.md` | 高层系统图、service 边界、数据流 |
| `backend.md` | API routes、middleware chain、service → repository 映射 |
| `frontend.md` | 页面树、component 层级、state management 流 |
| `data.md` | 数据库表、关系、migration 历史 |
| `dependencies.md` | 外部 service、第三方集成、共享 library |

### Codemap 格式

每个 codemap 应当 token 精简——针对 AI context 消耗进行优化：

```markdown
# Backend Architecture

## Routes
POST /api/users → UserController.create → UserService.create → UserRepo.insert
GET  /api/users/:id → UserController.get → UserService.findById → UserRepo.findById

## Key Files
src/services/user.ts（业务逻辑，120 行）
src/repos/user.ts（数据库访问，80 行）

## Dependencies
- PostgreSQL（主数据存储）
- Redis（会话缓存、速率限制）
- Stripe（支付处理）
```

## 步骤 3：Diff 检测

1. 若存在先前的 codemaps，计算 diff 百分比
2. 若变更 > 30%，展示 diff 并在覆盖前请求用户批准
3. 若变更 <= 30%，原地更新

## 步骤 4：添加元数据

为每个 codemap 添加 freshness header：

```markdown
<!-- 生成时间：2026-02-11 | 扫描文件数：142 | Token 估算：~800 -->
```

## 步骤 5：保存分析报告

将摘要写入 `.reports/codemap-diff.txt`：
- 自上次扫描以来新增/移除/修改的文件
- 检测到的新依赖
- 架构变更（新 routes、新 services 等）
- 对 90 天以上未更新的文档发出过时警告

## 提示

- 关注**高层结构**，而非实现细节
- 优先使用**文件路径和 function signatures**，而非完整代码块
- 将每个 codemap 保持在 **1000 tokens** 以下，以高效加载 context
- 使用 ASCII 图表表达数据流，而非冗长描述
- 在重大功能新增或 refactoring 之后运行
