---
name: rust-patterns
description: 地道的 Rust 模式，涵盖所有权、错误处理、trait、并发，以及构建安全、高性能应用程序的最佳实践。
metadata:
  origin: ECC
---

# Rust 开发模式

构建安全、高性能、可维护应用程序的地道 Rust 模式与最佳实践。

## 何时使用

- 编写新的 Rust 代码
- 审查 Rust 代码
- 重构现有 Rust 代码
- 设计 crate 结构与模块布局

## 工作原理

此 skill 在六个关键领域贯彻地道的 Rust 规范：通过所有权与借用在编译期防止数据竞争；使用 `Result`/`?` 进行错误传播，库采用 `thiserror`，应用采用 `anyhow`；通过 enum 与穷尽模式匹配使非法状态不可表达；用 trait 与泛型实现零成本抽象；通过 `Arc<Mutex<T>>`、channel 与 async/await 实现安全并发；以及按领域组织、最小化的 `pub` 暴露面。

## 核心原则

### 1. 所有权与借用

Rust 的所有权系统在编译期防止数据竞争与内存缺陷。

```rust
// 优良：不需要所有权时传递引用
fn process(data: &[u8]) -> usize {
    data.len()
}

// 优良：仅在需要存储或消费时才获取所有权
fn store(data: Vec<u8>) -> Record {
    Record { payload: data }
}

// 糟糕：为绕过 borrow checker 而不必要地 clone
fn process_bad(data: &Vec<u8>) -> usize {
    let cloned = data.clone(); // 浪费——直接借用即可
    cloned.len()
}
```

### 使用 `Cow` 实现灵活的所有权

```rust
use std::borrow::Cow;

fn normalize(input: &str) -> Cow<'_, str> {
    if input.contains(' ') {
        Cow::Owned(input.replace(' ', "_"))
    } else {
        Cow::Borrowed(input) // 无需修改时零开销
    }
}
```

## 错误处理

### 使用 `Result` 与 `?`——生产环境绝不使用 `unwrap()`

```rust
// 优良：带上下文地传播错误
use anyhow::{Context, Result};

fn load_config(path: &str) -> Result<Config> {
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("failed to read config from {path}"))?;
    let config: Config = toml::from_str(&content)
        .with_context(|| format!("failed to parse config from {path}"))?;
    Ok(config)
}

// 糟糕：出错即 panic
fn load_config_bad(path: &str) -> Config {
    let content = std::fs::read_to_string(path).unwrap(); // 会 panic！
    toml::from_str(&content).unwrap()
}
```

### 库错误用 `thiserror`，应用错误用 `anyhow`

```rust
// 库代码：结构化的、有类型的错误
use thiserror::Error;

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("record not found: {id}")]
    NotFound { id: String },
    #[error("connection failed")]
    Connection(#[from] std::io::Error),
    #[error("invalid data: {0}")]
    InvalidData(String),
}

// 应用代码：灵活的错误处理
use anyhow::{bail, Result};

fn run() -> Result<()> {
    let config = load_config("app.toml")?;
    if config.workers == 0 {
        bail!("worker count must be > 0");
    }
    Ok(())
}
```

### 优先使用 `Option` 组合子而非嵌套匹配

```rust
// 优良：组合子链
fn find_user_email(users: &[User], id: u64) -> Option<String> {
    users.iter()
        .find(|u| u.id == id)
        .map(|u| u.email.clone())
}

// 糟糕：深度嵌套的匹配
fn find_user_email_bad(users: &[User], id: u64) -> Option<String> {
    match users.iter().find(|u| u.id == id) {
        Some(user) => match &user.email {
            email => Some(email.clone()),
        },
        None => None,
    }
}
```

## Enum 与模式匹配

### 将状态建模为 Enum

```rust
// 优良：非法状态不可表达
enum ConnectionState {
    Disconnected,
    Connecting { attempt: u32 },
    Connected { session_id: String },
    Failed { reason: String, retries: u32 },
}

fn handle(state: &ConnectionState) {
    match state {
        ConnectionState::Disconnected => connect(),
        ConnectionState::Connecting { attempt } if *attempt > 3 => abort(),
        ConnectionState::Connecting { .. } => wait(),
        ConnectionState::Connected { session_id } => use_session(session_id),
        ConnectionState::Failed { retries, .. } if *retries < 5 => retry(),
        ConnectionState::Failed { reason, .. } => log_failure(reason),
    }
}
```

### 穷尽匹配——业务逻辑不使用通配符

```rust
// 优良：显式处理每一个变体
match command {
    Command::Start => start_service(),
    Command::Stop => stop_service(),
    Command::Restart => restart_service(),
    // 新增变体会强制在此处处理
}

// 糟糕：通配符掩盖了新变体
match command {
    Command::Start => start_service(),
    _ => {} // 静默忽略 Stop、Restart 及未来新增的变体
}
```

## Trait 与泛型

### 接受泛型，返回具体类型

```rust
// 优良：泛型输入，具体类型输出
fn read_all(reader: &mut impl Read) -> std::io::Result<Vec<u8>> {
    let mut buf = Vec::new();
    reader.read_to_end(&mut buf)?;
    Ok(buf)
}

// 优良：多个约束时使用 trait bound
fn process<T: Display + Send + 'static>(item: T) -> String {
    format!("processed: {item}")
}
```

### 动态分发的 Trait Object

```rust
// 需要异构集合或插件系统时使用
trait Handler: Send + Sync {
    fn handle(&self, request: &Request) -> Response;
}

struct Router {
    handlers: Vec<Box<dyn Handler>>,
}

// 需要性能时使用泛型（单态化）
fn fast_process<H: Handler>(handler: &H, request: &Request) -> Response {
    handler.handle(request)
}
```

### 为类型安全使用 Newtype 模式

```rust
// 优良：不同类型可防止参数混淆
struct UserId(u64);
struct OrderId(u64);

fn get_order(user: UserId, order: OrderId) -> Result<Order> {
    // 不会意外交换 user 与 order 的 ID
    todo!()
}

// 糟糕：参数容易传反
fn get_order_bad(user_id: u64, order_id: u64) -> Result<Order> {
    todo!()
}
```

## Struct 与数据建模

### 复杂构造使用 Builder 模式

```rust
struct ServerConfig {
    host: String,
    port: u16,
    max_connections: usize,
}

impl ServerConfig {
    fn builder(host: impl Into<String>, port: u16) -> ServerConfigBuilder {
        ServerConfigBuilder { host: host.into(), port, max_connections: 100 }
    }
}

struct ServerConfigBuilder { host: String, port: u16, max_connections: usize }

impl ServerConfigBuilder {
    fn max_connections(mut self, n: usize) -> Self { self.max_connections = n; self }
    fn build(self) -> ServerConfig {
        ServerConfig { host: self.host, port: self.port, max_connections: self.max_connections }
    }
}

// 用法：ServerConfig::builder("localhost", 8080).max_connections(200).build()
```

## 迭代器与闭包

### 优先使用迭代器链而非手动循环

```rust
// 优良：声明式、惰性、可组合
let active_emails: Vec<String> = users.iter()
    .filter(|u| u.is_active)
    .map(|u| u.email.clone())
    .collect();

// 糟糕：命令式累积
let mut active_emails = Vec::new();
for user in &users {
    if user.is_active {
        active_emails.push(user.email.clone());
    }
}
```

### 使用 `collect()` 配合类型标注

```rust
// 收集为不同类型
let names: Vec<_> = items.iter().map(|i| &i.name).collect();
let lookup: HashMap<_, _> = items.iter().map(|i| (i.id, i)).collect();
let combined: String = parts.iter().copied().collect();

// 收集 Result——遇到第一个错误即短路
let parsed: Result<Vec<i32>, _> = strings.iter().map(|s| s.parse()).collect();
```

## 并发

### 使用 `Arc<Mutex<T>>` 共享可变状态

```rust
use std::sync::{Arc, Mutex};

let counter = Arc::new(Mutex::new(0));
let handles: Vec<_> = (0..10).map(|_| {
    let counter = Arc::clone(&counter);
    std::thread::spawn(move || {
        let mut num = counter.lock().expect("mutex poisoned");
        *num += 1;
    })
}).collect();

for handle in handles {
    handle.join().expect("worker thread panicked");
}
```

### 使用 Channel 进行消息传递

```rust
use std::sync::mpsc;

let (tx, rx) = mpsc::sync_channel(16); // 带 backpressure 的有界 channel

for i in 0..5 {
    let tx = tx.clone();
    std::thread::spawn(move || {
        tx.send(format!("message {i}")).expect("receiver disconnected");
    });
}
drop(tx); // 关闭 sender，使 rx 迭代器终止

for msg in rx {
    println!("{msg}");
}
```

### 使用 Tokio 的 Async

```rust
use tokio::time::Duration;

async fn fetch_with_timeout(url: &str) -> Result<String> {
    let response = tokio::time::timeout(
        Duration::from_secs(5),
        reqwest::get(url),
    )
    .await
    .context("request timed out")?
    .context("request failed")?;

    response.text().await.context("failed to read body")
}

// 并发生成多个 task
async fn fetch_all(urls: Vec<String>) -> Vec<Result<String>> {
    let handles: Vec<_> = urls.into_iter()
        .map(|url| tokio::spawn(async move {
            fetch_with_timeout(&url).await
        }))
        .collect();

    let mut results = Vec::with_capacity(handles.len());
    for handle in handles {
        results.push(handle.await.unwrap_or_else(|e| panic!("spawned task panicked: {e}")));
    }
    results
}
```

## Unsafe 代码

### 何时可以使用 Unsafe

```rust
// 可接受：带文档化不变量的 FFI 边界（Rust 2024+）
/// # Safety
/// `ptr` 必须是指向已初始化 `Widget` 的有效、对齐的指针。
unsafe fn widget_from_raw<'a>(ptr: *const Widget) -> &'a Widget {
    // SAFETY: 调用方保证 ptr 有效且对齐
    unsafe { &*ptr }
}

// 可接受：性能关键路径且有正确性证明
// SAFETY: 由于循环边界，index 始终 < len
unsafe { slice.get_unchecked(index) }
```

### 何时不应使用 Unsafe

```rust
// 糟糕：使用 unsafe 绕过 borrow checker
// 糟糕：为图方便而使用 unsafe
// 糟糕：使用 unsafe 却没有 Safety 注释
// 糟糕：在不相关的类型之间 transmute
```

## 模块系统与 Crate 结构

### 按领域组织，而非按类型

```text
my_app/
├── src/
│   ├── main.rs
│   ├── lib.rs
│   ├── auth/          # 领域模块
│   │   ├── mod.rs
│   │   ├── token.rs
│   │   └── middleware.rs
│   ├── orders/        # 领域模块
│   │   ├── mod.rs
│   │   ├── model.rs
│   │   └── service.rs
│   └── db/            # 基础设施
│       ├── mod.rs
│       └── pool.rs
├── tests/             # 集成测试
├── benches/           # 基准测试
└── Cargo.toml
```

### 可见性——最小化暴露

```rust
// 优良：内部共享使用 pub(crate)
pub(crate) fn validate_input(input: &str) -> bool {
    !input.is_empty()
}

// 优良：从 lib.rs 再导出公开 API
pub mod auth;
pub use auth::AuthMiddleware;

// 糟糕：把所有东西都设为 pub
pub fn internal_helper() {} // 应该是 pub(crate) 或私有
```

## 工具链集成

### 常用命令

```bash
# 构建与检查
cargo build
cargo check              # 无代码生成的快速类型检查
cargo clippy             # lint 与建议
cargo fmt                # 格式化代码

# 测试
cargo test
cargo test -- --nocapture    # 显示 println 输出
cargo test --lib             # 仅单元测试
cargo test --test integration # 仅集成测试

# 依赖
cargo audit              # 安全审计
cargo tree               # 依赖树
cargo update             # 更新依赖

# 性能
cargo bench              # 运行基准测试
```

## 速查：Rust 惯用法

| 惯用法 | 说明 |
|-------|-------------|
| 借用而非 clone | 除非需要所有权，否则传递 `&T` 而非 clone |
| 使非法状态不可表达 | 仅用 enum 建模合法状态 |
| 用 `?` 而非 `unwrap()` | 传播错误，库/生产代码中绝不 panic |
| 解析而非校验 | 在边界处将非结构化数据转换为有类型的 struct |
| 为类型安全使用 Newtype | 用 newtype 包装原始类型以防参数传反 |
| 优先用迭代器而非循环 | 声明式链更清晰，且通常更快 |
| 对 Result 标注 `#[must_use]` | 确保调用方处理返回值 |
| 用 `Cow` 实现灵活的所有权 | 当借用即可时避免内存分配 |
| 穷尽匹配 | 业务关键的 enum 不使用通配符 `_` |
| 最小化 `pub` 暴露面 | 内部 API 使用 `pub(crate)` |

## 需避免的反模式

```rust
// 糟糕：生产代码中使用 .unwrap()
let value = map.get("key").unwrap();

// 糟糕：不理解原因就用 .clone() 应付 borrow checker
let data = expensive_data.clone();
process(&original, &data);

// 糟糕：用 &str 即足够时却使用 String
fn greet(name: String) { /* 应该是 &str */ }

// 糟糕：库中使用 Box<dyn Error>（应使用 thiserror）
fn parse(input: &str) -> Result<Data, Box<dyn std::error::Error>> { todo!() }

// 糟糕：忽略 must_use 警告
let _ = validate(input); // 静默丢弃 Result

// 糟糕：在 async 上下文中执行阻塞操作
async fn bad_async() {
    std::thread::sleep(Duration::from_secs(1)); // 阻塞 executor！
    // 应使用：tokio::time::sleep(Duration::from_secs(1)).await;
}
```

**记住**：只要能编译，大概率就是正确的——但前提是你避免了 `unwrap()`、尽量少用 `unsafe`，并让类型系统为你工作。
