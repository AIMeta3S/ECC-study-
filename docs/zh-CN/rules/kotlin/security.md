---
paths:
  - "**/*.kt"
  - "**/*.kts"
---
# Kotlin 安全

> 本文件在 [common/security.md](../common/security.md) 基础上扩展了 Kotlin 及 Android/KMP 特定的内容。

## 密钥管理

- 切勿在源代码中硬编码 API key、token 或凭据
- 使用 `local.properties`（已被 git 忽略）存放本地开发密钥
- 在 release build 中使用由 CI 密钥生成的 `BuildConfig` 字段
- 使用 `EncryptedSharedPreferences`（Android）或 Keychain（iOS）进行运行时密钥存储

```kotlin
// 反例
val apiKey = "sk-abc123..."

// 正例 — 来自 BuildConfig（构建时生成）
val apiKey = BuildConfig.API_KEY

// 正例 — 运行时从安全存储获取
val token = secureStorage.get("auth_token")
```

## 网络安全

- 一律使用 HTTPS — 配置 `network_security_config.xml` 以阻止明文传输
- 对敏感端点使用 OkHttp `CertificatePinner` 或 Ktor 的等效方案进行证书固定
- 为所有 HTTP 客户端设置超时 — 切勿保留默认值（可能为无限）
- 在使用前对所有服务器响应进行验证和净化

```xml
<!-- res/xml/network_security_config.xml -->
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
</network-security-config>
```

## 输入验证

- 在处理或发送至 API 之前，验证所有用户输入
- 对 Room/SQLDelight 使用参数化查询 — 切勿将用户输入拼接进 SQL
- 对来自用户输入的文件路径进行净化，以防止路径遍历

```kotlin
// 反例 — SQL 注入
@Query("SELECT * FROM items WHERE name = '$input'")

// 正例 — 参数化
@Query("SELECT * FROM items WHERE name = :input")
fun findByName(input: String): List<ItemEntity>
```

## 数据保护

- 在 Android 上使用 `EncryptedSharedPreferences` 存储敏感的键值对数据
- 使用 `@Serializable` 并显式指定字段名 — 切勿泄露内部属性名
- 当不再需要时，从内存中清除敏感数据
- 为已序列化的模型使用 `@Keep` 或 ProGuard 规则，以防止 name mangling

## 认证

- 将 token 存储在安全存储中，而非普通的 SharedPreferences
- 实现 token 刷新，并正确处理 401/403
- 在登出时清除所有认证状态（token、缓存的用户数据、cookie）
- 对敏感操作使用生物识别认证（`BiometricPrompt`）

## ProGuard / R8

- 为所有已序列化的模型添加 keep 规则（`@Serializable`、Gson、Moshi）
- 为基于反射的库添加 keep 规则（Koin、Retrofit）
- 测试 release build — 混淆可能会悄无声息地破坏序列化

## WebView 安全

- 除非明确需要，否则禁用 JavaScript：`settings.javaScriptEnabled = false`
- 在加载到 WebView 之前验证 URL
- 切勿暴露访问敏感数据的 `@JavascriptInterface` 方法
- 使用 `WebViewClient.shouldOverrideUrlLoading()` 控制导航
