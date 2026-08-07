---
name: redis-patterns
description: Redis 数据结构模式、缓存策略、分布式锁、限流、Pub/Sub 以及生产级应用的连接管理。
metadata:
  origin: ECC
---

# Redis 模式

Redis 最佳实践速查，覆盖常见后端使用场景。

## 工作原理

Redis 是一种内存型数据结构存储，支持 strings、hashes、lists、sets、sorted sets、streams 等类型。单条 Redis 命令在单实例上是原子的；多步骤工作流需要 Lua 脚本、MULTI/EXEC 事务或显式同步才能保持原子性。数据可通过 RDB 快照或 AOF 日志选择性地持久化。客户端使用 RESP 协议通过 TCP 通信；连接池是必不可少的，可避免每个请求的握手开销。

## 何时启用

- 为应用添加缓存
- 实现限流或节流
- 构建分布式锁或协调机制
- 设置 session 或 token 存储
- 使用 Pub/Sub 或 Redis Streams 进行消息传递
- 在生产环境中配置 Redis（连接池、驱逐策略、集群）

## 数据结构速查表

| 使用场景 | 结构 | 示例 Key |
|----------|-----------|-------------|
| 简单缓存 | String | `product:123` |
| 用户 session | Hash | `session:abc` |
| 排行榜 | Sorted Set | `scores:weekly` |
| 独立访客 | Set | `visitors:2024-01-01` |
| 活动流 | List | `feed:user:456` |
| 事件流 | Stream | `events:orders` |
| 计数器 / 限流 | String (INCR) | `ratelimit:user:123` |
| Bloom filter / HLL | HyperLogLog | `hll:pageviews` |

## 核心模式

### Cache-Aside（懒加载）

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_product(product_id: int):
    cache_key = f"product:{product_id}"
    cached = r.get(cache_key)

    if cached:
        return json.loads(cached)

    product = db.query("SELECT * FROM products WHERE id = %s", product_id)
    r.setex(cache_key, 3600, json.dumps(product))  # TTL：1 小时
    return product
```

### Write-Through 缓存

```python
def update_product(product_id: int, data: dict):
    # 先写入数据库
    db.execute("UPDATE products SET ... WHERE id = %s", product_id)

    # 立即更新缓存
    cache_key = f"product:{product_id}"
    r.setex(cache_key, 3600, json.dumps(data))
```

### 缓存失效

```python
# 基于标签的失效——将相关 key 归组到一个 set 下
def cache_product(product_id: int, category_id: int, data: dict):
    key = f"product:{product_id}"
    tag = f"tag:category:{category_id}"
    pipe = r.pipeline(transaction=True)
    pipe.setex(key, 3600, json.dumps(data))
    pipe.sadd(tag, key)
    pipe.expire(tag, 3600)
    pipe.execute()

def invalidate_category(category_id: int):
    tag = f"tag:category:{category_id}"
    keys = r.smembers(tag)
    if keys:
        r.delete(*keys)
    r.delete(tag)
```

### Session 存储

```python
import time
import uuid

def create_session(user_id: int, ttl: int = 86400) -> str:
    session_id = str(uuid.uuid4())
    key = f"session:{session_id}"
    pipe = r.pipeline(transaction=True)
    pipe.hset(key, mapping={
        "user_id": user_id,
        "created_at": int(time.time()),
    })
    pipe.expire(key, ttl)
    pipe.execute()
    return session_id

def get_session(session_id: str) -> dict | None:
    data = r.hgetall(f"session:{session_id}")
    return data if data else None

def delete_session(session_id: str):
    r.delete(f"session:{session_id}")
```

## 限流

### 固定窗口（简单）

```python
def is_rate_limited(user_id: int, limit: int = 100, window: int = 60) -> bool:
    key = f"ratelimit:{user_id}:{int(time.time()) // window}"
    pipe = r.pipeline(transaction=True)
    pipe.incr(key)
    pipe.expire(key, window)
    count, _ = pipe.execute()
    return count > limit
```

### 滑动窗口（Lua——原子）

```lua
-- sliding_window.lua
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)

if count < limit then
    -- 使用唯一成员（now + sequence）以避免同一毫秒内的冲突
    local seq_key = key .. ':seq'
    local seq = redis.call('INCR', seq_key)
    redis.call('EXPIRE', seq_key, math.ceil(window / 1000))
    redis.call('ZADD', key, now, now .. '-' .. seq)
    redis.call('EXPIRE', key, math.ceil(window / 1000))
    return 1
end
return 0
```

```python
sliding_window = r.register_script(open('sliding_window.lua').read())

def allow_request(user_id: int) -> bool:
    key = f"ratelimit:sliding:{user_id}"
    now = int(time.time() * 1000)
    return bool(sliding_window(keys=[key], args=[now, 60000, 100]))
```

## 分布式锁

### 分布式锁（单节点——SET NX PX）

```python
import uuid

def acquire_lock(resource: str, ttl_ms: int = 5000) -> str | None:
    lock_key = f"lock:{resource}"
    token = str(uuid.uuid4())
    acquired = r.set(lock_key, token, px=ttl_ms, nx=True)
    return token if acquired else None

def release_lock(resource: str, token: str) -> bool:
    release_script = """
    if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
    else
        return 0
    end
    """
    result = r.eval(release_script, 1, f"lock:{resource}", token)
    return bool(result)

# 用法
token = acquire_lock("order:payment:123")
if token:
    try:
        process_payment()
    finally:
        release_lock("order:payment:123", token)
```

> 对于多节点部署，请使用 `redlock-py` 库，它实现了完整的 Redlock 算法。

## Pub/Sub 与 Streams

### Pub/Sub（Fire-and-Forget）

```python
# 发布者
def publish_event(channel: str, payload: dict):
    r.publish(channel, json.dumps(payload))

# 订阅者（阻塞——在单独的 thread/process 中运行）
def subscribe_events(channel: str):
    pubsub = r.pubsub()
    pubsub.subscribe(channel)
    for message in pubsub.listen():
        if message['type'] == 'message':
            handle(json.loads(message['data']))
```

### Redis Streams（持久化队列）

```python
# 生产者
def emit(stream: str, event: dict):
    r.xadd(stream, event, maxlen=10000)  # 限制 stream 长度

# consumer group —— 保证至少一次投递
try:
    r.xgroup_create('events:orders', 'processor', id='0', mkstream=True)
except Exception:
    pass  # group 已存在

def consume(stream: str, group: str, consumer: str):
    while True:
        messages = r.xreadgroup(group, consumer, {stream: '>'}, count=10, block=2000)
        for _, entries in (messages or []):
            for msg_id, data in entries:
                process(data)
                r.xack(stream, group, msg_id)
```

> 当你需要投递保证、consumer group 或重放（replay）时，优先使用 **Streams** 而非 Pub/Sub。

## Key 设计

### 命名约定

```
# 模式：resource:id:field
user:123:profile
order:456:status
cache:product:789

# 模式：namespace:resource:id
myapp:session:abc123
myapp:ratelimit:user:123

# 模式：resource:date（有时限的 key）
stats:pageviews:2024-01-01
```

### TTL 策略

| 数据类型 | 建议 TTL |
|-----------|--------------|
| 用户 session | 24h（`86400`） |
| API 响应缓存 | 5–15 分钟 |
| 限流窗口 | 与窗口大小一致 |
| 短时效 token | 5–10 分钟 |
| 排行榜 | 1h–24h |
| 静态 / 参考数据 | 1h–1 周 |

始终设置 TTL。没有 TTL 的 key 会无限累积，造成内存压力。

## 连接管理

### 连接池

```python
from redis import ConnectionPool, Redis

pool = ConnectionPool(
    host='localhost',
    port=6379,
    db=0,
    max_connections=20,
    decode_responses=True,
    socket_connect_timeout=2,
    socket_timeout=2,
)

r = Redis(connection_pool=pool)
```

### Cluster 模式

```python
from redis.cluster import RedisCluster

r = RedisCluster(
    startup_nodes=[{"host": "redis-1", "port": 6379}],
    decode_responses=True,
    skip_full_coverage_check=True,
)
```

### Sentinel（高可用）

```python
from redis.sentinel import Sentinel

sentinel = Sentinel(
    [('sentinel-1', 26379), ('sentinel-2', 26379)],
    socket_timeout=0.5,
)
master = sentinel.master_for('mymaster', decode_responses=True)
replica = sentinel.slave_for('mymaster', decode_responses=True)
```

## 驱逐策略

| 策略 | 行为 | 最适用于 |
|--------|----------|----------|
| `noeviction` | 满时写入报错 | 队列 / 关键数据 |
| `allkeys-lru` | 驱逐最近最少使用 | 通用缓存 |
| `volatile-lru` | 仅在有 TTL 的 key 中执行 LRU | 混合数据存储 |
| `allkeys-lfu` | 驱逐最少使用 | 倾斜访问模式 |
| `volatile-ttl` | 驱逐最快将过期的 | 优先保留长期数据 |

通过 `redis.conf` 设置：`maxmemory-policy allkeys-lru`

## 反模式

| 反模式 | 问题 | 修复 |
|---|---|---|
| 没有 TTL 的 key | 内存无限增长 | 始终设置 TTL |
| 在生产环境使用 `KEYS *` | 阻塞服务器（O(N)） | 使用 `SCAN` 游标 |
| 存储大 blob（>100KB） | 序列化慢，内存压力 | 存储引用，从 object store 获取 |
| 单个 Redis 用于一切 | 缓存与队列之间无隔离 | 使用独立的 DB 或实例 |
| 忽视连接池上限 | 负载下连接耗尽 | 按工作负载配置连接池大小 |
| 未处理缓存未命中雪崩 | 冷启动时惊群效应 | 使用锁或 probabilistic early expiry |
| 不假思索地 `FLUSHALL` | 清空整个实例 | 按 key 模式限定删除范围 |

### 缓存未命中雪崩防护

```python
import threading

_locks: dict[str, threading.Lock] = {}
_locks_mutex = threading.Lock()

def get_with_lock(key: str, fetch_fn, ttl: int = 300):
    cached = r.get(key)
    if cached:
        return json.loads(cached)

    with _locks_mutex:
        if key not in _locks:
            _locks[key] = threading.Lock()
        lock = _locks[key]
    with lock:
        cached = r.get(key)  # 获取锁后再次检查
        if cached:
            return json.loads(cached)
        value = fetch_fn()
        r.setex(key, ttl, json.dumps(value))
        return value
```

> 注意：对于多进程部署，请用上文「分布式锁」一节中的 `acquire_lock`/`release_lock` 替换进程内锁。

## 示例

**为 Django/Flask API 端点添加缓存：**
对响应使用 cache-aside 配合 `setex` 和 5 分钟 TTL。以请求参数作为 key。

**按用户对 API 限流：**
低流量端点使用固定窗口配合 `pipeline(transaction=True)`；精确的按用户节流使用滑动窗口 Lua。

**跨 worker 协调后台作业：**
使用 `acquire_lock`，TTL 需超过预期作业时长。务必在 `finally` 块中释放。

**向多个订阅者扇出通知：**
使用 Pub/Sub 实现 fire-and-forget。如果需要保证投递或为迟到的 consumer 提供重放，则切换到 Streams。

## 速查表

| 模式 | 何时使用 |
|---------|-------------|
| Cache-aside | 读密集型，容忍轻微陈旧 |
| Write-through | 需要强一致性 |
| 分布式锁 | 防止对资源的并发访问 |
| 滑动窗口限流 | 精确的按用户节流 |
| Redis Streams | 带 consumer group 的持久化事件队列 |
| Pub/Sub | 无需投递保证的广播 |
| Sorted Set 排行榜 | 排名评分、分页 |
| HyperLogLog | 低内存下的近似去重计数 |

## 相关资源

- Skill：`postgres-patterns` —— 关系型数据模式
- Skill：`backend-patterns` —— API 与服务层模式
- Skill：`database-migrations` —— schema 版本管理
- Skill：`django-patterns` —— Django 缓存框架集成
- Agent：`database-reviewer` —— 完整的数据库审查工作流
