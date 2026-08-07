---
paths:
  - "**/*.rs"
---
# Rust 安全

> 本文件在 [common/security.md](../common/security.md) 的基础上扩展了 Rust 专属内容。

## 机密管理

- 严禁在源代码中硬编码 API 密钥、token 或凭据
- 使用环境变量：`std::env::var("API_KEY")`
- 启动时若缺少必需的 secret，应 fail fast
- 将 `.env` 文件加入 `.gitignore`

```rust
// 反面示例
const API_KEY: &str = "sk-abc123...";

// 正面示例 —— 带早期校验的环境变量
fn load_api_key() -> anyhow::Result<String> {
    std::env::var("PAYMENT_API_KEY")
        .context("PAYMENT_API_KEY must be set")
}
```

## SQL 注入防护

- 始终使用参数化查询——严禁将用户输入格式化进 SQL 字符串
- 使用带绑定参数的查询构建器或 ORM（sqlx、diesel、sea-orm）

```rust
// 反面示例 —— 通过 format 字符串导致的 SQL 注入
let query = format!("SELECT * FROM users WHERE name = '{name}'");
sqlx::query(&query).fetch_one(&pool).await?;

// 正面示例 —— 使用 sqlx 的参数化查询
// 占位符语法因后端而异：Postgres: $1  |  MySQL: ?  |  SQLite: $1
sqlx::query("SELECT * FROM users WHERE name = $1")
    .bind(&name)
    .fetch_one(&pool)
    .await?;
```

## 输入校验

- 在处理前于系统边界处校验所有用户输入
- 利用类型系统强制约束不变式（newtype pattern）
- Parse, don't validate——在边界处将非结构化数据转换为带类型的 struct
- 以清晰的错误信息拒绝非法输入

```rust
// Parse, don't validate —— 非法状态无法被表示
pub struct Email(String);

impl Email {
    pub fn parse(input: &str) -> Result<Self, ValidationError> {
        let trimmed = input.trim();
        let at_pos = trimmed.find('@')
            .filter(|&p| p > 0 && p < trimmed.len() - 1)
            .ok_or_else(|| ValidationError::InvalidEmail(input.to_string()))?;
        let domain = &trimmed[at_pos + 1..];
        if trimmed.len() > 254 || !domain.contains('.') {
            return Err(ValidationError::InvalidEmail(input.to_string()));
        }
        // 生产环境请优先使用经过校验的 email crate（例如 `email_address`）
        Ok(Self(trimmed.to_string()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}
```

## unsafe 代码

- 尽量减少 `unsafe` 块——优先使用安全抽象
- 每个 `unsafe` 块都必须带有 `// SAFETY:` 注释，说明相应的不变式
- 严禁为了图方便而用 `unsafe` 绕过 borrow checker
- review 时审计所有 `unsafe` 代码——无正当理由即视为危险信号
- 优先使用 `safe` 的 FFI wrapper 来封装 C 库

```rust
// 正面示例 —— safety 注释记录了所有必需的不变式
let widget: &Widget = {
    // SAFETY: `ptr` 非空、已对齐、指向一个已初始化的 Widget，
    // 且在其生命周期内不存在对它的可变引用或修改操作。
    unsafe { &*ptr }
};

// 反面示例 —— 缺少 safety 论证
unsafe { &*ptr }
```

## 依赖安全

- 运行 `cargo audit` 扫描依赖中的已知 CVE
- 运行 `cargo deny check` 以检查许可证与安全公告合规性
- 使用 `cargo tree` 审计传递依赖
- 保持依赖更新——配置 Dependabot 或 Renovate
- 尽量减少依赖数量——新增 crate 前先评估

```bash
# 安全审计
cargo audit

# 拒绝安全公告、重复版本与受限许可证
cargo deny check

# 检查依赖树
cargo tree
cargo tree -d  # 仅显示重复项
```

## 错误信息

- 严禁在 API 响应中暴露内部路径、堆栈跟踪或数据库错误
- 在服务端记录详细错误；向客户端返回通用信息
- 使用 `tracing` 或 `log` 进行结构化的服务端日志记录

```rust
// 将错误映射到合适的状态码与通用信息
// （示例使用 axum；请根据你的框架调整响应类型）
match order_service.find_by_id(id) {
    Ok(order) => Ok((StatusCode::OK, Json(order))),
    Err(ServiceError::NotFound(_)) => {
        tracing::info!(order_id = id, "order not found");
        Err((StatusCode::NOT_FOUND, "Resource not found"))
    }
    Err(e) => {
        tracing::error!(order_id = id, error = %e, "unexpected error");
        Err((StatusCode::INTERNAL_SERVER_ERROR, "Internal server error"))
    }
}
```

## 参考资料

参见 skill：`rust-patterns`，了解 unsafe 代码规范与 ownership 模式。
参见 skill：`security-review`，获取通用安全清单。
