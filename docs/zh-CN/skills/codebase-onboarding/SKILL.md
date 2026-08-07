---
name: codebase-onboarding
description: 分析陌生的代码库并生成结构化的上手指南，包含架构图、关键入口点、约定以及一个初始 CLAUDE.md。适用于加入新项目或首次在某个 repo 中配置 Claude Code 时使用。
metadata:
  origin: ECC
---

# Codebase Onboarding

系统地分析陌生的代码库，产出结构化的上手指南。面向加入新项目的开发者，或在现有 repo 中首次配置 Claude Code 的开发者。

## 何时使用

- 首次用 Claude Code 打开一个项目
- 加入新团队或新 repo
- 用户请求"帮我理解这个代码库"
- 用户请求为某个项目生成 CLAUDE.md
- 用户说"带我上手"或"带我走一遍这个 repo"

## 工作原理

### 阶段 1：侦察

在不逐个读取文件的前提下，收集项目的原始信号。并行执行以下检查：

```
1. Package manifest detection
   → package.json, go.mod, Cargo.toml, pyproject.toml, pom.xml, build.gradle,
     Gemfile, composer.json, mix.exs, pubspec.yaml

2. Framework fingerprinting
   → next.config.*, nuxt.config.*, angular.json, vite.config.*,
     django settings, flask app factory, fastapi main, rails config

3. Entry point identification
   → main.*, index.*, app.*, server.*, cmd/, src/main/

4. Directory structure snapshot
   → Top 2 levels of the directory tree, ignoring node_modules, vendor,
     .git, dist, build, __pycache__, .next

5. Config and tooling detection
   → .eslintrc*, .prettierrc*, tsconfig.json, Makefile, Dockerfile,
     docker-compose*, .github/workflows/, .env.example, CI configs

6. Test structure detection
   → tests/, test/, __tests__/, *_test.go, *.spec.ts, *.test.js,
     pytest.ini, jest.config.*, vitest.config.*
```

### 阶段 2：架构梳理

基于侦察阶段的数据，识别以下内容：

**技术栈**
- 语言及版本约束
- 框架与主要 library
- 数据库与 ORM
- 构建工具与打包器
- CI/CD 平台

**架构模式**
- Monolith、monorepo、microservices 或 serverless
- 前端/后端分离或全栈
- API 风格：REST、GraphQL、gRPC、tRPC

**关键目录**
将顶层目录映射到其用途：

<!-- React 项目示例 — 替换为检测到的目录 -->
```
src/components/  → React UI components
src/api/         → API route handlers
src/lib/         → Shared utilities
src/db/          → Database models and migrations
tests/           → Test suites
scripts/         → Build and deployment scripts
```

**数据流**
追踪一个请求从入口到响应的完整流程：
- 请求从哪里进入？（router、handler、controller）
- 如何进行校验？（middleware、schema、guard）
- 业务逻辑在哪里？（service、model、use case）
- 如何到达数据库？（ORM、原生查询、repository）

### 阶段 3：约定识别

识别代码库当前已遵循的模式：

**命名约定**
- 文件命名：kebab-case、camelCase、PascalCase、snake_case
- 组件/类命名模式
- 测试文件命名：`*.test.ts`、`*.spec.ts`、`*_test.go`

**代码模式**
- 错误处理风格：try/catch、Result 类型、错误码
- 依赖注入或直接 import
- 状态管理方式
- 异步模式：callback、promise、async/await、channel

**Git 约定**
- 从近期分支识别分支命名
- 从近期 commit 识别 commit message 风格
- PR 工作流（squash、merge、rebase）
- 如果 repo 还没有任何 commit，或只有浅历史（例如 `git clone --depth 1`），跳过这一部分并注明"Git 历史不可用或太浅，无法识别约定"

### 阶段 4：生成上手产物

生成两份输出：

#### 输出 1：上手指南

```markdown
# Onboarding Guide: [Project Name]

## Overview
[2-3 sentences: what this project does and who it serves]

## Tech Stack
<!-- Example for a Next.js project — replace with detected stack -->
| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript | 5.x |
| Framework | Next.js | 14.x |
| Database | PostgreSQL | 16 |
| ORM | Prisma | 5.x |
| Testing | Jest + Playwright | - |

## Architecture
[Diagram or description of how components connect]

## Key Entry Points
<!-- Example for a Next.js project — replace with detected paths -->
- **API routes**: `src/app/api/` — Next.js route handlers
- **UI pages**: `src/app/(dashboard)/` — authenticated pages
- **Database**: `prisma/schema.prisma` — data model source of truth
- **Config**: `next.config.ts` — build and runtime config

## Directory Map
[Top-level directory → purpose mapping]

## Request Lifecycle
[Trace one API request from entry to response]

## Conventions
- [File naming pattern]
- [Error handling approach]
- [Testing patterns]
- [Git workflow]

## Common Tasks
<!-- Example for a Node.js project — replace with detected commands -->
- **Run dev server**: `npm run dev`
- **Run tests**: `npm test`
- **Run linter**: `npm run lint`
- **Database migrations**: `npx prisma migrate dev`
- **Build for production**: `npm run build`

## Where to Look
<!-- Example for a Next.js project — replace with detected paths -->
| I want to... | Look at... |
|--------------|-----------|
| Add an API endpoint | `src/app/api/` |
| Add a UI page | `src/app/(dashboard)/` |
| Add a database table | `prisma/schema.prisma` |
| Add a test | `tests/` matching the source path |
| Change build config | `next.config.ts` |
```

#### 输出 2：初始 CLAUDE.md

根据检测到的约定，生成或更新项目专用的 CLAUDE.md。如果 `CLAUDE.md` 已存在，先读取它再进行增强——保留已有的项目专用指令，并清楚标明哪些是新增或修改的内容。

```markdown
# Project Instructions

## Tech Stack
[Detected stack summary]

## Code Style
- [Detected naming conventions]
- [Detected patterns to follow]

## Testing
- Run tests: `[detected test command]`
- Test pattern: [detected test file convention]
- Coverage: [if configured, the coverage command]

## Build & Run
- Dev: `[detected dev command]`
- Build: `[detected build command]`
- Lint: `[detected lint command]`

## Project Structure
[Key directory → purpose map]

## Conventions
- [Commit style if detectable]
- [PR workflow if detectable]
- [Error handling patterns]
```

## 最佳实践

1. **不要读取所有内容**——侦察阶段应使用 Glob 和 Grep，而不是对每个文件都用 Read。只在信号模糊时才有选择性地读取。
2. **验证而非猜测**——如果从配置检测到某个框架，但实际代码用的是别的，以代码为准。
3. **尊重已有的 CLAUDE.md**——如果已存在，增强它而不是替换它。明确标注哪些是新增的、哪些是已有的。
4. **保持简洁**——上手指南应能在 2 分钟内扫读完毕。细节应留在代码里，而不是指南里。
5. **标记未知项**——如果某项约定无法有把握地识别出来，如实说明而不是猜测。'无法确定测试运行器'好过一个错误答案。

## 应避免的反模式

- 生成超过 100 行的 CLAUDE.md——应保持聚焦
- 列出每一个依赖——只应突出那些会影响写代码方式的依赖
- 描述一目了然的目录名——`src/` 不需要解释
- 照抄 README——上手指南应补充 README 所缺乏的结构性洞察

## 示例

### 示例 1：首次进入一个新 repo
**用户**："带我上手这个代码库"
**动作**：运行完整的 4 阶段工作流 → 产出上手指南 + 初始 CLAUDE.md
**输出**：上手指南直接打印到对话中，另外在项目根目录写入一个 `CLAUDE.md`

### 示例 2：为现有项目生成 CLAUDE.md
**用户**："为这个项目生成一个 CLAUDE.md"
**动作**：运行阶段 1-3，跳过上手指南，只产出 CLAUDE.md
**输出**：项目专用的 `CLAUDE.md`，包含检测到的约定

### 示例 3：增强已有的 CLAUDE.md
**用户**："用当前项目约定更新 CLAUDE.md"
**动作**：读取已有的 CLAUDE.md，运行阶段 1-3，合并新发现
**输出**：更新后的 `CLAUDE.md`，并清楚标注新增内容
