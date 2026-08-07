---
name: database-migrations
description: Database migration 最佳实践，适用于 PostgreSQL、MySQL 及常见 ORM（Prisma、Drizzle、Kysely、Django、TypeORM、golang-migrate）的 schema changes、data migrations、rollbacks 与 zero-downtime deployments。
metadata:
  origin: ECC
---

# Database Migration Patterns

为生产系统提供安全、可逆的 database schema 变更。

## 何时激活

- 创建或修改 数据库表
- 添加/删除 列或索引
- 运行 data migrations（backfill、transform）
- 规划 zero-downtime 的 schema 变更
- 为新项目设置 migration 工具

## 核心原则

1. **每一次变更都是一次 migration** —— 绝不手动修改生产数据库
2. **生产环境仅允许前向的 migration** —— 所有回滚必须通过创建新的正向 migration 完成
3. **Schema changes 与 data migrations 相互独立** —— 同一个 migration 中绝不混用 DDL 和 DML
4. **以生产规模的数据测试 migrations** —— 在 100 行数据上能正常运行的 migration，在 1000 万行上可能会锁表
5. **Migration 一旦部署即不可变** —— 切勿编辑已在生产环境中运行的 migration

## Migration 安全检查清单

在应用任何 migration 之前：

- [ ] Migration 需同时包含正操作（UP）与逆操作（DOWN），或显式声明为不可逆。
- [ ] Large table 上不存在全表锁（使用并发操作）
- [ ] 新 columns 必须有默认值或允许为空（切勿在没有默认值的情况下添加 NOT NULL）
- [ ] 并发创建的索引（与现有表的 CREATE TABLE 语句不同步创建）
- [ ] data backfill 与 schema change 拆分为独立的 migration
- [ ] 已基于生产数据副本进行测试
- [ ] 已记录回滚计划

## PostgreSQL Patterns

### 安全地添加 Column

```sql
-- GOOD：nullable column，无锁
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- GOOD：带 default 的 column（Postgres 11+ 为即时操作，无需重写）
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- BAD：在已存在的 table 上添加不带 default 的 NOT NULL（需要全表重写）
ALTER TABLE users ADD COLUMN role TEXT NOT NULL;
-- 这会锁表并重写每一行
```

### 无需停机即可添加索引

```sql
-- BAD：Blocks writes on large tables
CREATE INDEX idx_users_email ON users (email);

-- GOOD: Non-blocking, allows concurrent writes
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);

-- Note: CONCURRENTLY cannot run inside a transaction block
-- Most migration tools need special handling for this
```

### 重命名 Column（Zero-Downtime）

绝不直接在生产环境中重命名。采用 expand-contract 模式：

```sql
-- 第 1 步：添加新 column（migration 001）
ALTER TABLE users ADD COLUMN display_name TEXT;

-- 第 2 步：backfill 数据（migration 002，data migration）
UPDATE users SET display_name = username WHERE display_name IS NULL;

-- 第 3 步：更新应用代码，同时 读/写 两个 column
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
-- BAD：在单个事务中更新所有行（会导致锁表）
UPDATE users SET normalized_email = LOWER(email);

-- GOOD：带进度的批量更新
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
# Create migration from schema changes
npx prisma migrate dev --name add_user_avatar

# Apply pending migrations in production
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset

# Generate client after schema changes
npx prisma generate
```

### Schema Example

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

### Custom SQL Migration

对于 Prisma 无法表达的操作（concurrent index、data backfill）：

```bash
# Create empty migration, then edit the SQL manually
npx prisma migrate dev --create-only --name add_email_index
```

```sql
-- migrations/20240115_add_email_index/migration.sql
-- Prisma cannot generate CONCURRENTLY, so we write it manually
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
```

## Drizzle（TypeScript/Node.js）

### 工作流

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Push schema directly (dev only, no migration file)
npx drizzle-kit push
```

### Schema Example

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

### Workflow (kysely-ctl)

```bash
# Initialize config file (kysely.config.ts)
kysely init

# Create a new migration file
kysely migrate make add_user_avatar

# Apply all pending migrations
kysely migrate latest

# Rollback last migration
kysely migrate down

# Show migration status
kysely migrate list
```

### Migration File

```typescript
// migrations/2024_01_15_001_create_user_profile.ts
import { type Kysely, sql } from 'kysely'

// IMPORTANT: Always use Kysely<any>, not your typed DB interface.
// Migrations are frozen in time and must not depend on current schema types.
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

### Programmatic Migrator

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

// `db` 是你的 Kysely<any> 数据库实例
const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder,
  }),
  // 警告：仅在开发环境中启用。会关闭基于时间戳顺序的校验，
  // 可能导致不同环境之间的 schema 漂移。
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

### Workflow

```bash
# Generate migration from model changes
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Show migration status
python manage.py showmigrations

# Generate empty migration for custom SQL
python manage.py makemigrations --empty app_name -n description
```

### Data Migration

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
    pass  # Data migration，不需要反向操作

class Migration(migrations.Migration):
    dependencies = [("accounts", "0015_add_display_name")]

    operations = [
        migrations.RunPython(backfill_display_names, reverse_backfill),
    ]
```

### SeparateDatabaseAndState

从 Django 模型中移除列，但不立即从数据库删除：

```python
class Migration(migrations.Migration):
    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(model_name="user", name="legacy_field"),
            ],
            database_operations=[],  # 暂不操作数据库
        ),
    ]
```

## golang-migrate（Go）

### Workflow

```bash
# Create migration pair
migrate create -ext sql -dir migrations -seq add_user_avatar

# Apply all pending migrations
migrate -path migrations -database "$DATABASE_URL" up

# Rollback last migration
migrate -path migrations -database "$DATABASE_URL" down 1

# Force version (fix dirty state)
migrate -path migrations -database "$DATABASE_URL" force VERSION
```

### Migration File

```sql
-- migrations/000003_add_user_avatar.up.sql
ALTER TABLE users ADD COLUMN avatar_url TEXT;
CREATE INDEX CONCURRENTLY idx_users_avatar ON users (avatar_url) WHERE avatar_url IS NOT NULL;

-- migrations/000003_add_user_avatar.down.sql
DROP INDEX IF EXISTS idx_users_avatar;
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
```

## Zero-Downtime Migration Strategy

对于关键的生产环境变更，遵循 expand-contract 模式：

```
第一阶段：扩展
  - 添加新列/表（可为空或带默认值）
  - 部署：应用同时写入旧结构与新结构
  - 回填已有数据

第二阶段：迁移
  - 部署：应用从新结构读取，写入时新旧结构同时写入
  - 验证数据一致性

第三阶段：收缩
  - 部署：应用仅使用新结构
  - 在独立的迁移中删除旧列/表
```

### 时间线示例

```
第 1 天：Migration —— 添加 new_status 列（可为空）
第 1 天：部署应用 v2 —— 同时写入 status 和 new_status
第 2 天：为现有数据运行 backfill migration
第 3 天：部署应用 v3 —— 仅从 new_status 读取
第 7 天：Migration —— 删除旧的 status 列
```

## Anti-Patterns

| 反模式 | 为何失败 | 更好的做法 |
|-------------|-------------|-----------------|
| 在生产环境手动执行 SQL | 无审计追踪，不可重复 | 始终使用迁移文件 |
| 编辑已部署的迁移 | 导致环境间 schema 漂移 | 创建新迁移来代替 |
| 无默认值的 NOT NULL | 锁表，重写所有行 | 先添加可空列，回填，再添加约束 |
| 在 large table 上内联创建索引 | 构建索引时阻塞写入 | 使用 CREATE INDEX CONCURRENTLY |
| 同一迁移中包含 schema 和 data 变更 | 难以回滚，长事务 | 分离迁移 |
| 在移除代码前删除列 | 缺失列导致应用错误 | 先移除代码，下次部署再删除列 |
