---
name: database-migrations
description: Database migration 最佳实践：覆盖 PostgreSQL、MySQL 及常见 ORM（Prisma、Drizzle、Kysely、Django、TypeORM、golang-migrate）下的 schema 变更、数据 migration、rollback 与 zero-downtime deployment。
metadata:
  origin: ECC
---

# Database Migration 模式

面向生产系统的安全、可逆的 database schema 变更。

## 何时启用

- 创建或修改 database table
- 添加/删除 column 或 index
- 运行数据 migration（backfill、transform）
- 规划 zero-downtime 的 schema 变更
- 为新项目配置 migration 工具链

## 核心原则

1. **每一次变更都是一次 migration** —— 绝不手动修改生产 database
2. **生产环境中 migration 仅向前（forward-only）** —— rollback 通过新的前向 migration 完成
3. **Schema migration 与数据 migration 相互独立** —— 绝不在同一个 migration 中混用 DDL 与 DML
4. **以生产规模的数据测试 migration** —— 在 100 行上跑通的 migration，在 1000 万行时可能发生锁表
5. **Migration 一旦部署即不可变** —— 绝不修改已在生产环境中执行过的 migration

## Migration 安全检查清单

在应用任何 migration 之前：

- [ ] Migration 同时具备 UP 和 DOWN（或明确标记为不可逆）
- [ ] 大 table 上不存在全表锁（使用 concurrent 操作）
- [ ] 新 column 拥有 default 或为 nullable（绝不添加不带 default 的 NOT NULL）
- [ ] Index 以 concurrent 方式创建（对已存在的 table 不要内联在 CREATE TABLE 中）
- [ ] 数据 backfill 与 schema 变更拆分为独立的 migration
- [ ] 已在生产数据副本上完成测试
- [ ] 已记录 rollback 方案

## PostgreSQL 模式

### 安全地添加 Column

```sql
-- 优秀：nullable column，无锁
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- 优秀：带 default 的 column（Postgres 11+ 为即时操作，无需重写）
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- 糟糕：在已存在的 table 上添加不带 default 的 NOT NULL（需要全表重写）
ALTER TABLE users ADD COLUMN role TEXT NOT NULL;
-- 这会锁表并重写每一行
```

### 无 Downtime 添加 Index

```sql
-- 糟糕：在大 table 上会阻塞写操作
CREATE INDEX idx_users_email ON users (email);

-- 优秀：非阻塞，允许 concurrent 写入
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);

-- 注意：CONCURRENTLY 无法在 transaction block 内运行
-- 大多数 migration 工具对此需要特殊处理
```

### 重命名 Column（Zero-Downtime）

绝不直接在生产环境中重命名。采用 expand-contract 模式：

```sql
-- 第 1 步：添加新 column（migration 001）
ALTER TABLE users ADD COLUMN display_name TEXT;

-- 第 2 步：backfill 数据（migration 002，数据 migration）
UPDATE users SET display_name = username WHERE display_name IS NULL;

-- 第 3 步：更新应用代码，同时读写两个 column
-- 部署应用变更

-- 第 4 步：停止向旧 column 写入，并将其删除（migration 003）
ALTER TABLE users DROP COLUMN username;
```

### 安全地删除 Column

```sql
-- 第 1 步：移除应用中所有对该 column 的引用
-- 第 2 步：部署不引用该 column 的应用
-- 第 3 步：在下一次 migration 中删除 column
ALTER TABLE orders DROP COLUMN legacy_status;

-- 对于 Django：使用 SeparateDatabaseAndState 从 model 中移除该字段，
-- 而不生成 DROP COLUMN（然后在下一次 migration 中删除）
```

### 大规模数据 Migration

```sql
-- 糟糕：在单个 transaction 中更新所有行（会导致锁表）
UPDATE users SET normalized_email = LOWER(email);

-- 优秀：分 batch 更新并跟踪进度
DO $$
DECLARE
  batch_size INT := 10000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE users
    SET normalized_email = LOWER(email)
    WHERE id IN (
      SELECT id FROM users
      WHERE normalized_email IS NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % rows', rows_updated;
    EXIT WHEN rows_updated = 0;
    COMMIT;
  END LOOP;
END $$;
```

## Prisma（TypeScript/Node.js）

### 工作流

```bash
# 根据 schema 变更创建 migration
npx prisma migrate dev --name add_user_avatar

# 在生产环境中应用待执行的 migration
npx prisma migrate deploy

# 重置 database（仅用于开发）
npx prisma migrate reset

# schema 变更后生成 client
npx prisma generate
```

### Schema 示例

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  avatarUrl String?  @map("avatar_url")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  orders    Order[]

  @@map("users")
  @@index([email])
}
```

### 自定义 SQL Migration

对于 Prisma 无法表达的操作（concurrent index、数据 backfill）：

```bash
# 创建空的 migration，然后手动编辑 SQL
npx prisma migrate dev --create-only --name add_email_index
```

```sql
-- migrations/20240115_add_email_index/migration.sql
-- Prisma 无法生成 CONCURRENTLY，因此手动编写
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
```

## Drizzle（TypeScript/Node.js）

### 工作流

```bash
# 根据 schema 变更生成 migration
npx drizzle-kit generate

# 应用 migration
npx drizzle-kit migrate

# 直接推送 schema（仅用于开发，不生成 migration 文件）
npx drizzle-kit push
```

### Schema 示例

```typescript
import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

## Kysely（TypeScript/Node.js）

### 工作流（kysely-ctl）

```bash
# 初始化配置文件（kysely.config.ts）
kysely init

# 创建新的 migration 文件
kysely migrate make add_user_avatar

# 应用所有待执行的 migration
kysely migrate latest

# rollback 上一次 migration
kysely migrate down

# 查看 migration 状态
kysely migrate list
```

### Migration 文件

```typescript
// migrations/2024_01_15_001_create_user_profile.ts
import { type Kysely, sql } from 'kysely'

// 重要：始终使用 Kysely<any>，而不是你已定义类型的 DB interface。
// Migration 在时间上是冻结的，不得依赖当前的 schema 类型。
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('user_profile')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('avatar_url', 'text')
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute()

  await db.schema
    .createIndex('idx_user_profile_avatar')
    .on('user_profile')
    .column('avatar_url')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('user_profile').execute()
}
```

### 编程式 Migrator

```typescript
import { Migrator, FileMigrationProvider } from 'kysely'
import { promises as fs } from 'fs'
import * as path from 'path'
// 仅限 ESM —— CJS 可以直接使用 __dirname
import { fileURLToPath } from 'url'
const migrationFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  './migrations',
)

// `db` 是你的 Kysely<any> database 实例
const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder,
  }),
  // 警告：仅在开发环境中启用。会关闭基于时间戳顺序的校验，
  // 可能导致不同环境之间的 schema drift。
  // allowUnorderedMigrations: true,
})

const { error, results } = await migrator.migrateToLatest()

results?.forEach((it) => {
  if (it.status === 'Success') {
    console.log(`migration "${it.migrationName}" executed successfully`)
  } else if (it.status === 'Error') {
    console.error(`failed to execute migration "${it.migrationName}"`)
  }
})

if (error) {
  console.error('migration failed', error)
  process.exit(1)
}
```

## Django（Python）

### 工作流

```bash
# 根据 model 变更生成 migration
python manage.py makemigrations

# 应用 migration
python manage.py migrate

# 查看 migration 状态
python manage.py showmigrations

# 生成用于自定义 SQL 的空 migration
python manage.py makemigrations --empty app_name -n description
```

### 数据 Migration

```python
from django.db import migrations

def backfill_display_names(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    batch_size = 5000
    users = User.objects.filter(display_name="")
    while users.exists():
        batch = list(users[:batch_size])
        for user in batch:
            user.display_name = user.username
        User.objects.bulk_update(batch, ["display_name"], batch_size=batch_size)

def reverse_backfill(apps, schema_editor):
    pass  # 数据 migration，不需要反向操作

class Migration(migrations.Migration):
    dependencies = [("accounts", "0015_add_display_name")]

    operations = [
        migrations.RunPython(backfill_display_names, reverse_backfill),
    ]
```

### SeparateDatabaseAndState

从 Django model 中移除某个 column，但不立即从 database 中删除它：

```python
class Migration(migrations.Migration):
    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(model_name="user", name="legacy_field"),
            ],
            database_operations=[],  # 暂不动 DB
        ),
    ]
```

## golang-migrate（Go）

### 工作流

```bash
# 创建成对的 migration 文件
migrate create -ext sql -dir migrations -seq add_user_avatar

# 应用所有待执行的 migration
migrate -path migrations -database "$DATABASE_URL" up

# rollback 上一次 migration
migrate -path migrations -database "$DATABASE_URL" down 1

# 强制指定版本（修复 dirty 状态）
migrate -path migrations -database "$DATABASE_URL" force VERSION
```

### Migration 文件

```sql
-- migrations/000003_add_user_avatar.up.sql
ALTER TABLE users ADD COLUMN avatar_url TEXT;
CREATE INDEX CONCURRENTLY idx_users_avatar ON users (avatar_url) WHERE avatar_url IS NOT NULL;

-- migrations/000003_add_user_avatar.down.sql
DROP INDEX IF EXISTS idx_users_avatar;
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
```

## Zero-Downtime Migration 策略

对于关键的生产环境变更，遵循 expand-contract 模式：

```
阶段 1：EXPAND
  - 添加新的 column/table（nullable 或带 default）
  - Deploy：应用同时写入新旧两处
  - backfill 现有数据

阶段 2：MIGRATE
  - Deploy：应用从新位置读取，同时写入新旧两处
  - 校验数据一致性

阶段 3：CONTRACT
  - Deploy：应用仅使用新位置
  - 在单独的 migration 中删除旧 column/table
```

### 时间线示例

```
第 1 天：Migration 添加 new_status column（nullable）
第 1 天：Deploy 应用 v2 —— 同时写入 status 和 new_status
第 2 天：为现有 row 运行 backfill migration
第 3 天：Deploy 应用 v3 —— 仅从 new_status 读取
第 7 天：Migration 删除旧的 status column
```

## Anti-Patterns

| Anti-Pattern | 失败原因 | 更优做法 |
|-------------|----------|----------|
| 在生产环境中执行手动 SQL | 没有 audit trail，无法重复执行 | 始终使用 migration 文件 |
| 修改已部署的 migration | 导致环境之间的 drift | 改为创建新的 migration |
| 不带 default 的 NOT NULL | 会锁表并重写所有行 | 先添加 nullable column，backfill 后再加 constraint |
| 在大 table 上内联创建 index | 构建期间会阻塞写操作 | 使用 CREATE INDEX CONCURRENTLY |
| 在同一个 migration 中混合 schema 与数据 | 难以 rollback，transaction 过长 | 拆分为独立的 migration |
| 在删除代码之前删除 column | 应用会因 column 缺失而报错 | 先删除代码，下一次 deploy 时再删除 column |
