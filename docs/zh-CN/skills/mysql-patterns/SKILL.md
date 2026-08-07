---
name: mysql-patterns
description: 面向生产后端的 MySQL 与 MariaDB schema、查询、索引、事务、复制与连接池模式。
metadata:
  origin: ECC
---

# MySQL 模式

当处理 MySQL 或 MariaDB 的 schema 设计、迁移、慢查询排查、队列式事务、连接池或生产数据库配置时，使用此 skill。在应用某项特性相关的模式之前，优先进行精确的版本检查，因为 MySQL 与 MariaDB 在多处 SQL 细节上已出现分歧。

## 适用场景

- 设计 MySQL 或 MariaDB 的表、索引与约束
- 在迁移应用到大型生产表之前进行评审
- 排查慢查询、锁等待、死锁或连接耗尽
- 新增 keyset pagination、upsert、全文搜索、JSON 列或队列
- 配置应用连接池、read replica、TLS 或慢查询日志

## 版本检查

首先识别存储引擎与版本：

```sql
SELECT VERSION();
SHOW VARIABLES LIKE 'version_comment';
```

当语法存在差异时，将 MySQL 与 MariaDB 的指导分别处理：

- MySQL 文档将 row alias 记录为 `ON DUPLICATE KEY UPDATE` 中 `VALUES(col)` 的替代方案；`VALUES(col)` 在 MySQL 中已被废弃。
- MariaDB 文档将 `VALUES(col)` 记录为在 `ON DUPLICATE KEY UPDATE` 中引用插入值的受支持方式；在需要跨引擎兼容时使用。
- `SKIP LOCKED` 仅适用于类队列任务。它会跳过被锁定的行并可能返回不一致的视图，因此不要用于常规账目或对完整性敏感的读取。

## Schema 默认值

```sql
CREATE TABLE orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    account_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(32) NOT NULL,
    total DECIMAL(15, 2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_orders_account_status_created (account_id, status, created_at),
    KEY idx_orders_active (account_id, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

默认选择：

| 场景 | 推荐 | 避免 |
| --- | --- | --- |
| 代理主键 | `BIGINT UNSIGNED AUTO_INCREMENT` | 在可能突破 20 亿行的表上使用 `INT` |
| UUID 查找键 | `BINARY(16)` 配合转换辅助函数 | 在热点表上使用 `VARCHAR(36)` 作为主键 |
| 货币与精确计量 | `DECIMAL(p, s)` | `FLOAT` 或 `DOUBLE` |
| 面向用户的文本 | `utf8mb4` 表与索引 | MySQL 的 `utf8` / `utf8mb3` 默认值 |
| 应用时间戳 | 由应用管理 UTC 的 `DATETIME` | 假定 `DATETIME` 存储时区元数据 |
| 软删除 | `deleted_at DATETIME NULL` 加上限定范围的索引 | 在没有索引的情况下过滤软删除行 |
| 可扩展的状态值 | lookup table 或受约束的 `VARCHAR` | 在取值频繁变动时使用 `ENUM` |

## 索引

复合索引的顺序通常先遵循等值谓词，然后是范围或排序列：

```sql
CREATE INDEX idx_orders_account_status_created
    ON orders (account_id, status, created_at);

SELECT id, total
FROM orders
WHERE account_id = ?
  AND status = 'pending'
  AND created_at >= ?
ORDER BY created_at DESC
LIMIT 50;
```

在新增或修改索引之前使用 `EXPLAIN`：

```sql
EXPLAIN
SELECT id, total
FROM orders
WHERE account_id = 123 AND status = 'pending'
ORDER BY created_at DESC
LIMIT 50;
```

需要关注的信号：

| 字段 | 风险信号 |
| --- | --- |
| `type` | 在大型表上出现 `ALL` |
| `key` | 存在选择性谓词时却为 `NULL` |
| `rows` | 交互式访问路径上估算行数极高 |
| `Extra` | `Using temporary`、`Using filesort` 或宽泛的 `Using where` |

避免盲目添加索引。每个索引都会增加写入开销、迁移耗时、备份体积以及 buffer pool 压力。

## 查询模式

### Upsert

跨引擎兼容的形式：

```sql
INSERT INTO user_settings (user_id, setting_key, setting_value)
VALUES (?, ?, ?)
ON DUPLICATE KEY UPDATE
    setting_value = VALUES(setting_value),
    updated_at = CURRENT_TIMESTAMP;
```

MySQL row alias 形式：

```sql
INSERT INTO user_settings (user_id, setting_key, setting_value)
VALUES (?, ?, ?) AS new
ON DUPLICATE KEY UPDATE
    setting_value = new.setting_value,
    updated_at = CURRENT_TIMESTAMP;
```

仅在确认目标是 MySQL 后才使用 row alias 形式。对于 MariaDB 或 MySQL/MariaDB 混合部署，使用 `VALUES(col)`。

### Keyset Pagination

```sql
SELECT id, name, created_at
FROM products
WHERE (created_at, id) < (?, ?)
ORDER BY created_at DESC, id DESC
LIMIT 50;
```

用与游标匹配的索引支撑该查询：

```sql
CREATE INDEX idx_products_created_id ON products (created_at, id);
```

不要在大型表上使用深层的 `OFFSET` 分页；这会让服务器在返回页之前扫描并丢弃前面的行。

### JSON 字段

将 JSON 列用于扩展数据，而不是用于需要重度关系过滤或约束的字段。

```sql
CREATE TABLE events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payload JSON NOT NULL,
    event_type VARCHAR(64)
        GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(payload, '$.type'))) STORED,
    KEY idx_events_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

对于频繁查询的 JSON 路径，提取一个 generated column 并为该列建立索引。外键、归属、租户以及生命周期字段应保持为关系型字段。

### 全文搜索

```sql
ALTER TABLE articles ADD FULLTEXT KEY ft_articles_title_body (title, body);

SELECT id, title, MATCH(title, body) AGAINST (? IN NATURAL LANGUAGE MODE) AS score
FROM articles
WHERE MATCH(title, body) AGAINST (? IN NATURAL LANGUAGE MODE)
ORDER BY score DESC
LIMIT 20;
```

当需要拼写容错、复杂排序、跨表分面或超出内置全文搜索行为的语言特定分析时，使用外部搜索。

## 事务

保持事务简短，并按一致的顺序锁定行：

```sql
START TRANSACTION;

SELECT id, balance
FROM accounts
WHERE id IN (?, ?)
ORDER BY id
FOR UPDATE;

UPDATE accounts SET balance = balance - ? WHERE id = ?;
UPDATE accounts SET balance = balance + ? WHERE id = ?;

COMMIT;
```

死锁与锁等待检查清单：

- 在所有代码路径中以确定性顺序锁定行。
- 在开启事务之前完成外部 API 调用，不要在事务内部调用。
- 为 `UPDATE`、`DELETE` 以及锁定读取中使用的谓词添加索引。
- 遇到死锁时，回滚并以有限的 retry budget 重试整个事务。
- 在死锁后尽快捕获 `SHOW ENGINE INNODB STATUS\G`；它会被后续事件覆盖。

队列式 worker 认领：

```sql
START TRANSACTION;

SELECT id
FROM jobs
WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;

UPDATE jobs
SET status = 'processing', started_at = CURRENT_TIMESTAMP
WHERE id = ?;

COMMIT;
```

仅在跳过被锁定行可接受的类队列负载下使用 `SKIP LOCKED`。它不能替代常规的事务一致性。

## 连接池

SQLAlchemy 示例：

```python
from sqlalchemy import create_engine

engine = create_engine(
    "mysql+mysqlconnector://app:secret@db.internal/app",
    pool_size=10,
    max_overflow=5,
    pool_timeout=30,
    pool_recycle=240,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 5},
)
```

Node.js `mysql2` 示例：

```javascript
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
});

const [rows] = await pool.execute(
  'SELECT id, total FROM orders WHERE account_id = ? LIMIT 50',
  [accountId],
);
```

将应用连接池的回收时间保持在服务器 `wait_timeout` 以下。若服务器使用 `wait_timeout = 300`，则 `pool_recycle` 设为 240 秒左右较为合理；`pool_pre_ping` 仍有助于从网络与 failover 事件中恢复。

## 诊断

实用的初步排查命令：

```sql
SHOW FULL PROCESSLIST;
SHOW ENGINE INNODB STATUS\G;
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';
```

在受控环境中启用慢查询日志：

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
SET GLOBAL log_queries_not_using_indexes = 'ON';
```

仅在执行该查询安全时才使用 `EXPLAIN ANALYZE`。它会实际执行该语句，在生产规模的数据上可能开销很大。

## 复制

read replica 可能存在延迟。在写入之后，不要立即将 read-your-own-write 路径、结账流程、权限校验或幂等键读取路由到 replica。

```sql
-- MySQL 旧术语，在现有部署中仍常见
SHOW SLAVE STATUS\G;

-- 在支持新术语时使用
SHOW REPLICA STATUS\G;
```

在统一选用某个命令之前先检查引擎/版本。监控 replica 的 SQL 线程健康、IO 线程健康与延迟，而不仅仅是 TCP 连接是否存活。

## 安全

```sql
CREATE USER 'app'@'%' IDENTIFIED BY 'use-a-secret-manager';
GRANT SELECT, INSERT, UPDATE, DELETE ON appdb.* TO 'app'@'%';

ALTER USER 'app'@'%' REQUIRE SSL;

SELECT user, host
FROM mysql.user
WHERE user = '';

DROP USER IF EXISTS ''@'localhost';
DROP USER IF EXISTS ''@'%';
```

安全评审要点：

- 不要向应用用户授予 `ALL PRIVILEGES` 或 `*.*`。
- 当流量跨越主机或网络时，要求应用用户使用 TLS。
- 将凭据存放在平台 secret manager 中，而不是示例、脚本或仓库文件里。
- 将迁移/管理员用户与运行时应用用户分开。
- 在调优性能之前，先审计公网暴露面与绑定地址。

## 配置

专用数据库主机的示例起点：

```ini
[mysqld]
innodb_buffer_pool_size = 4G
innodb_flush_log_at_trx_commit = 1
sync_binlog = 1

max_connections = 300
thread_cache_size = 50

wait_timeout = 300
interactive_timeout = 300
innodb_lock_wait_timeout = 10

slow_query_log = ON
long_query_time = 1
log_queries_not_using_indexes = ON

log_bin = mysql-bin
binlog_format = ROW
binlog_expire_logs_seconds = 604800
```

将配置值视为供评审的提示，而非通用预设。应根据负载、硬件、备份策略与恢复目标来规划内存、连接数、日志保留与持久化设置。

## 反模式

| 反模式 | 风险 | 更优模式 |
| --- | --- | --- |
| 热点路径中使用 `SELECT *` | 过度取数与客户端脆弱 | 显式选择列 |
| 深层 `OFFSET` 分页 | 线性扫描与缓慢的分页 | keyset pagination |
| 外键 JOIN 上没有索引 | 慢 JOIN 与高锁开销的删除 | 有意地为 FK 列建立索引 |
| 长事务 | 锁等待与庞大的 undo history | 提交小的工作单元 |
| 直接对 `mysql.user` 执行 DML | grant table 损坏风险 | 使用 `CREATE USER`、`ALTER USER`、`DROP USER` |
| 应用用户被授予 admin 权限 | 影响面极大 | 最小权限的运行时用户 |
| 连接池回收时间超过 `wait_timeout` | 池中连接过期 | 回收时间低于 timeout 并启用 pre-ping |
| 写入后立即读 replica | 面向用户的状态过期 | 将 read-after-write 流程固定到 primary |

## 输出预期

当此 skill 用于评审时，返回：

1. 引擎/版本假设。
2. 风险最高的正确性、锁、安全与迁移问题。
3. 针对安全路径的具体 SQL 或代码改动。
4. 验证计划：`EXPLAIN`、迁移 dry run、锁/死锁检查以及回滚标准。
5. 任何影响建议的 MySQL/MariaDB 语法差异。

## 相关资源

- Skill：`postgres-patterns` — PostgreSQL 特定的 schema 与查询模式
- Skill：`database-migrations` — 迁移规划与 rollout 安全
- Skill：`backend-patterns` — API 与 service layer 模式
- Skill：`security-review` — 密钥处理、auth 与最小权限
- Agent：`database-reviewer` — 更广义的数据库评审工作流
