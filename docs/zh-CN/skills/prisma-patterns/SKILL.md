---
name: prisma-patterns
description: 适用于 TypeScript 后端的 Prisma ORM 模式 —— 涵盖 schema 设计、查询优化、事务、分页，以及关键陷阱：updateMany 返回计数而非记录、$transaction 超时、migrate dev 重置数据库、@updatedAt 在批量写入时被跳过、serverless 连接耗尽。
metadata:
  origin: ECC
---

# Prisma 模式

适用于 TypeScript 后端的 Prisma ORM 生产级模式与非显而易见的陷阱。

> **应用这些模式前请先检查版本。** Prisma 的 API 在不同主版本间已有演变：
>
> ```bash
> npx prisma --version
> ```
>
> 各版本间值得关注的 API 差异：
> - `relationJoins` 可通过 JOIN 加载关联而非发起独立查询，但在大型 1:N 关联或深层 `include` 时可能引发行膨胀 —— 应对两种方案做基准测试
> - 新增了 `omit` 字段修饰符和 `prisma.$extends` Client Extensions API
> - **较新的安装**：包名可能是 `prisma` 而非 `@prisma/client`；`PrismaClient` 可能需要 driver adapter（例如 `@prisma/adapter-pg`）；`datasource.url` 可能位于 `prisma.config.ts` 而非 `schema.prisma` 中
> - CLI 命令（`migrate dev`、`migrate deploy`、`generate`）在各版本间保持不变

## 何时激活

- 设计或修改 Prisma schema 模型与关联关系
- 编写查询、事务或分页逻辑
- 使用 `updateMany`、`deleteMany` 或任何批量操作
- 运行或规划数据库迁移
- 部署到 serverless 环境（Vercel、Lambda、Cloudflare Workers）
- 实现 soft delete 或多租户行级过滤

## 核心概念

### ID 策略

| 策略 | 适用场景 | 避免场景 |
|---|---|---|
| `@default(cuid())` | 默认选择 —— URL 安全、可排序、无冲突 | 需要供外部系统使用的顺序 ID |
| `@default(uuid())` | 需要与非 Prisma 系统互操作 | 高写入表（随机 UUID 会使 B-tree 索引碎片化） |
| `@default(autoincrement())` | 内部 join 表、审计日志 | 对外暴露的 ID（会暴露记录数量） |

### Schema 默认设置

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique  // @unique 已自动创建索引 —— 无需 @@index
  name      String
  role      Role      @default(USER)
  posts     Post[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([createdAt])
  @@index([deletedAt, createdAt]) // 用于 soft-delete + 排序查询的复合索引
}
```

- 为每个外键以及用于 `WHERE` 或 `ORDER BY` 的列添加 `@@index`。
- 当 soft delete 是可预见的需求时，应预先声明 `deletedAt DateTime?` —— 后续添加需要对正在使用的表执行迁移。
- `updatedAt @updatedAt` 仅在 Prisma 的 `update` 和 `upsert` 时自动设置（批量更新的陷阱见 Anti-Patterns 部分）。

### `include` 与 `select`

| | `include` | `select` |
|---|---|---|
| 返回内容 | 所有标量字段 + 指定关联 | 仅指定字段 |
| 适用场景 | 需要大部分字段外加某个关联 | 热点路径、大表、避免过度获取 |
| 性能 | 在宽表上可能过度获取 | 负载最小，在大型数据集上更快 |
| Prisma 5 说明 | 默认使用 JOIN（`relationJoins`） | 同上 |

```ts
// include —— 所有列 + 关联
const user = await prisma.user.findUnique({
  where: { id },
  include: { posts: { select: { id: true, title: true } } },
});

// select —— 显式白名单
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, email: true, name: true },
});
```

切勿从 API 响应中直接返回原始 Prisma 实体 —— 应映射为响应 DTO 以控制暴露的字段：

```ts
// BAD：会泄露 passwordHash、deletedAt、内部字段
return await prisma.user.findUniqueOrThrow({ where: { id } });

// GOOD：显式 DTO 映射
const user = await prisma.user.findUniqueOrThrow({ where: { id } });
return { id: user.id, name: user.name, email: user.email };
```

### 事务形式选择

| 场景 | 使用形式 |
|---|---|
| 操作相互独立、无依赖 | 数组形式 |
| 后续步骤依赖前面步骤的结果 | 交互式形式 |
| 涉及外部调用（邮件、HTTP） | 完全置于事务之外 |

```ts
// 数组形式 —— 在一次往返中批量执行
const [user, post] = await prisma.$transaction([
  prisma.user.update({ where: { id }, data: { name } }),
  prisma.post.create({ data: { title, authorId: id } }),
]);

// 交互式形式 —— 只使用 tx client，绝不使用外层的 prisma client
const post = await prisma.$transaction(async (tx) => {
  const user = await tx.user.findUniqueOrThrow({ where: { id } });
  if (user.role !== 'ADMIN') throw new Error('Forbidden');
  return tx.post.create({ data: { title, authorId: user.id } });
});
```

### PrismaClient 单例

每个 `PrismaClient` 实例都会打开自己的连接池。只实例化一次。

```ts
// lib/prisma.ts

// 方案 A —— 基于 adapter 的初始化（较新的 Prisma 安装需要）
import { PrismaClient } from '@prisma/client'; // 或你环境中生成的 client 路径
import { PrismaPg } from '@prisma/adapter-pg';

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 方案 B —— 直接初始化（较旧的安装，无需 adapter）
// import { PrismaClient } from '@prisma/client';
// export const prisma = globalForPrisma.prisma ?? new PrismaClient({ ... });
```

如果你的 Prisma 安装在 `PrismaClient` 构造函数中需要 `adapter` 参数，请使用方案 A。
如果 `new PrismaClient()` 无需参数即可工作，则使用方案 B。让编译器告诉你哪个是正确的。

`globalThis` 模式可防止在 hot reload（Next.js、nodemon、ts-node-dev）期间产生重复实例。

### N+1 问题

在循环内加载关联会为每行发起一次查询。

```ts
// BAD：N+1 —— 每个 user 多发起一次查询
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({ where: { authorId: user.id } });
}

// GOOD：单次查询
const users = await prisma.user.findMany({ include: { posts: true } });
```

在 Prisma 5+ 的 `relationJoins` 下，`include` 形式会使用单次 JOIN。在大型 1:N 集合上，这可能会增大结果集大小 —— 如果每个父记录的关联可能返回多行，请对两种方案做基准测试。

## 代码示例

### 游标分页（适用于信息流和大型数据集）

```ts
async function getPosts(cursor?: string, limit = 20) {
  const items = await prisma.post.findMany({
    where: { published: true },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }, // 次级排序可防止在时间戳重复时分页不稳定
    ],
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasNextPage = items.length > limit;
  if (hasNextPage) items.pop();

  return { items, nextCursor: hasNextPage ? items[items.length - 1].id : null };
}
```

获取 `limit + 1` 条然后弹出最后一条 —— 这是在无需额外 count 查询的情况下判断 `hasNextPage` 的惯用做法。始终将唯一字段（例如 `id`）作为次级 `orderBy`，以防止多行时间戳相同时分页不稳定。仅当用户需要跳转到任意页（管理后台表格）时才使用 offset 分页。

### Soft Delete

```ts
// 始终显式过滤 —— 不要依赖 middleware（会隐藏行为、难以调试）
const activeUsers = await prisma.user.findMany({ where: { deletedAt: null } });

await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
await prisma.user.update({ where: { id }, data: { deletedAt: null } }); // 恢复
```

### 错误处理

```ts
import { Prisma } from '@prisma/client'; // 或你环境中生成的 client 路径

try {
  await prisma.user.create({ data: { email } });
} catch (e) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') throw new ConflictError('Email already exists');
    if (e.code === 'P2025') throw new NotFoundError('Record not found');
    if (e.code === 'P2003') throw new BadRequestError('Referenced record does not exist');
  }
  throw e;
}
```

常见错误码：`P2002` 唯一约束冲突 · `P2025` 未找到 · `P2003` 外键约束冲突。

在 service 边界捕获并转换为领域错误。切勿向 API 调用方暴露原始 Prisma 报错信息。

### 连接池 —— Serverless

将连接参数直接嵌入 `DATABASE_URL` —— 如果 URL 已有查询参数（例如 `?schema=public`），字符串拼接会失效：

```bash
# .env —— 推荐：将参数嵌入 URL
DATABASE_URL="postgresql://user:pass@host/db?connection_limit=1&pool_timeout=20"

# 配合外部 pooler（PgBouncer、Supabase pooler）
DATABASE_URL="postgresql://user:pass@host/db?pgbouncer=true&connection_limit=1"
```

```ts
// Vercel、AWS Lambda 及类似 serverless 运行时：
// 每个实例连接池上限为 1；connection_limit 与 pool_timeout 通过 DATABASE_URL 控制

// 基于 adapter 的配置（如果你的 Prisma 安装需要 adapter）：
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// 直接配置（如果你的 Prisma 安装不需要 adapter）：
// const prisma = new PrismaClient();
```

## 反模式

### `updateMany` 返回的是计数，而非记录

```ts
// BAD：结果是 { count: 2 } —— users[0] 为 undefined
const users = await prisma.user.updateMany({ where: { role: 'GUEST' }, data: { role: 'USER' } });

// GOOD：先捕获 ID，再更新，然后只获取受影响的行
const targets = await prisma.user.findMany({
  where: { role: 'GUEST' },
  select: { id: true },
});
const ids = targets.map((u) => u.id);
await prisma.user.updateMany({ where: { id: { in: ids } }, data: { role: 'USER' } });
const updated = await prisma.user.findMany({ where: { id: { in: ids } } });
```

`deleteMany` 同理 —— 返回 `{ count: n }`，绝不会返回被删除的行。

### `$transaction` 交互式形式在 5 秒后超时

```ts
// BAD：事务内外部调用超过默认 5 秒 → "Transaction already closed"
await prisma.$transaction(async (tx) => {
  const user = await tx.user.findUniqueOrThrow({ where: { id } });
  await sendWelcomeEmail(user.email); // 外部调用
  await tx.user.update({ where: { id }, data: { emailSent: true } });
});

// GOOD：外部调用放在事务之外
const user = await prisma.user.findUniqueOrThrow({ where: { id } });
await sendWelcomeEmail(user.email);
await prisma.user.update({ where: { id }, data: { emailSent: true } });

// 仅在批量处理确实需要时才提高超时时间
await prisma.$transaction(async (tx) => { ... }, { timeout: 30_000 });
```

### `migrate dev` 可能重置数据库

`migrate dev` 会检测 schema drift，并可能提示重置数据库，从而丢弃所有数据。

```bash
# 绝不要在共享开发环境、staging 或生产环境使用
npx prisma migrate dev --name add_column

# 除本地独立开发外，在所有环境都安全
npx prisma migrate deploy

# 仅检查 drift，不应用变更
npx prisma migrate diff \
  --from-migrations ./prisma/migrations \
  --to-schema-datamodel ./prisma/schema.prisma \
  --shadow-database-url "$SHADOW_DATABASE_URL"
```

### 手动编辑迁移文件会导致后续部署失败

Prisma 会对每个迁移文件计算 checksum。应用后修改会导致在每个已运行过原文件的环境中出现 `P3006 checksum mismatch`。应改为创建新的迁移。

### 破坏性 schema 变更需要多步迁移

在单个迁移中为现有列添加 `NOT NULL` 或重命名列，会导致锁表或数据丢失。应采用 expand-and-contract（扩展再收缩）：

```bash
# 步骤 1：在本地创建迁移，然后部署
npx prisma migrate dev --name add_new_column   # 仅本地
npx prisma migrate deploy                       # staging / 生产
```

```ts
// 步骤 2：回填数据（在脚本或迁移作业中运行，不要在 shell 中执行）
await prisma.user.updateMany({ data: { newColumn: derivedValue } });
```

```bash
# 步骤 3：在本地创建 NOT NULL 约束迁移，然后部署
npx prisma migrate dev --name make_new_column_required  # 仅本地
npx prisma migrate deploy                               # staging / 生产
```

### `@updatedAt` 在 `updateMany` 时不会触发

`@updatedAt` 仅在 `update` 和 `upsert` 时自动设置。批量写入会让它保留旧值。

```ts
// BAD：updatedAt 保留旧值
await prisma.post.updateMany({ where: { authorId }, data: { published: true } });

// GOOD
await prisma.post.updateMany({
  where: { authorId },
  data: { published: true, updatedAt: new Date() },
});
```

### Soft delete + `findUniqueOrThrow` 会泄露已删除记录

`findUniqueOrThrow` 仅在数据库中不存在该行时抛出 `P2025`。Soft-deleted 的行仍然存在，会被无错返回。

`findUniqueOrThrow` 要求 `where` 中包含唯一约束字段 —— 在 `id` 旁边添加 `deletedAt: null` 会破坏类型，因为 `{ id, deletedAt }` 不是复合唯一约束。请改用 `findFirstOrThrow`。

```ts
// BAD：返回 soft-deleted 的 user
const user = await prisma.user.findUniqueOrThrow({ where: { id } });

// BAD：Prisma 类型错误 —— { id, deletedAt } 不是唯一约束
const user = await prisma.user.findUniqueOrThrow({ where: { id, deletedAt: null } });

// GOOD：findFirstOrThrow 支持任意 where 条件
const user = await prisma.user.findFirstOrThrow({ where: { id, deletedAt: null } });
```

### 不带 `where` 的 `deleteMany` 会删除所有行

```ts
// BAD：静默清空表
await prisma.post.deleteMany();

// GOOD
await prisma.post.deleteMany({ where: { authorId: userId } });
```

## 最佳实践

| 规则 | 原因 |
|---|---|
| CI/CD 中使用 `migrate deploy`，`migrate dev` 仅在本地使用 | `migrate dev` 在检测到 drift 时可能重置数据库 |
| 将实体映射为响应 DTO | 防止泄露内部字段 |
| 在 service 边界捕获 `PrismaClientKnownRequestError` | 转换为领域错误 |
| 优先使用 `*OrThrow` 方法而非手动 null 检查 | 自动抛出 P2025；过滤非唯一字段时使用 `findFirstOrThrow` |
| serverless 环境下 `connection_limit=1` + 外部 pooler | 防止连接耗尽 |
| 始终在 `deleteMany` 上提供 `where` | 防止意外清空表 |
| 在 `updateMany` 中手动设置 `updatedAt: new Date()` | `@updatedAt` 会跳过批量写入 |

## 相关 Skills

- `nestjs-patterns` —— 集成 Prisma 的 NestJS service 层
- `postgres-patterns` —— PostgreSQL 层面的索引与连接调优
- `database-migrations` —— 面向生产环境的多步迁移规划
- `backend-patterns` —— 通用 API 与 service 层设计
