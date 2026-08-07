---
paths:
  - "**/*.java"
---
# Java 安全

> 本文件在 [common/security.md](../common/security.md) 基础上扩展 Java 特定内容。

## 机密管理

- 绝不在源代码中硬编码 API keys、tokens 或 credentials
- 使用环境变量：`System.getenv("API_KEY")`
- 生产环境的 secrets 使用 secret manager（Vault、AWS Secrets Manager）
- 将含 secrets 的本地配置文件加入 `.gitignore`

```java
// 错误做法
private static final String API_KEY = "sk-abc123...";

// 正确做法 — 环境变量
String apiKey = System.getenv("PAYMENT_API_KEY");
Objects.requireNonNull(apiKey, "PAYMENT_API_KEY must be set");
```

## SQL 注入防护

- 始终使用参数化查询 — 绝不将用户输入拼接进 SQL
- 使用 `PreparedStatement` 或所用框架的参数化查询 API
- 对用于 native queries 的任何输入进行校验和清理

```java
// 错误做法 — 字符串拼接导致 SQL 注入
Statement stmt = conn.createStatement();
String sql = "SELECT * FROM orders WHERE name = '" + name + "'";
stmt.executeQuery(sql);

// 正确做法 — 使用 PreparedStatement 进行参数化查询
PreparedStatement ps = conn.prepareStatement("SELECT * FROM orders WHERE name = ?");
ps.setString(1, name);

// 正确做法 — JDBC template
jdbcTemplate.query("SELECT * FROM orders WHERE name = ?", mapper, name);
```

## 输入校验

- 处理前在系统边界校验所有用户输入
- 使用校验框架时，在 DTO 上使用 Bean Validation（`@NotNull`、`@NotBlank`、`@Size`）
- 使用前对文件路径和用户提供的字符串进行清理
- 以清晰的错误信息拒绝未通过校验的输入

```java
// 在纯 Java 中手动校验
public Order createOrder(String customerName, BigDecimal amount) {
    if (customerName == null || customerName.isBlank()) {
        throw new IllegalArgumentException("Customer name is required");
    }
    if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
        throw new IllegalArgumentException("Amount must be positive");
    }
    return new Order(customerName, amount);
}
```

## 认证与授权

- 绝不自行实现认证加密 — 使用成熟的库
- 使用 bcrypt 或 Argon2 存储密码，绝不使用 MD5/SHA1
- 在服务边界强制执行授权检查
- 清除日志中的敏感数据 — 绝不记录 passwords、tokens 或 PII

## 依赖安全

- 运行 `mvn dependency:tree` 或 `./gradlew dependencies` 审计 transitive dependencies
- 使用 OWASP Dependency-Check 或 Snyk 扫描已知 CVE
- 保持依赖更新 — 配置 Dependabot 或 Renovate

## 错误信息

- 绝不在 API 响应中暴露 stack traces、内部路径或 SQL 错误
- 在 handler 边界将异常映射为安全的通用客户端消息
- 在服务端记录详细错误；向客户端返回通用消息

```java
// 记录详情，返回通用消息
try {
    return orderService.findById(id);
} catch (OrderNotFoundException ex) {
    log.warn("Order not found: id={}", id);
    return ApiResponse.error("Resource not found");  // 通用消息，不含内部信息
} catch (Exception ex) {
    log.error("Unexpected error processing order id={}", id, ex);
    return ApiResponse.error("Internal server error");  // 绝不暴露 ex.getMessage()
}
```

## 参考

参见 skill：`springboot-security`，了解 Spring Security 的认证与授权模式。
参见 skill：`quarkus-security`，了解 Quarkus 结合 JWT/OIDC、RBAC 和 CDI 的安全实践。
参见 skill：`security-review`，获取通用安全检查清单。
