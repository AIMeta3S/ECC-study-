---
name: kotlin-patterns
description: 地道的 Kotlin 模式、最佳实践和约定，用于构建健壮、高效、可维护的 Kotlin 应用，涵盖 coroutines、null safety 和 DSL builder。
metadata:
  origin: ECC
---

# Kotlin 开发模式

地道的 Kotlin 模式与最佳实践，用于构建健壮、高效、可维护的应用。

## 何时使用

- 编写新的 Kotlin 代码
- 审查 Kotlin 代码
- 重构现有 Kotlin 代码
- 设计 Kotlin module 或 library
- 配置 Gradle Kotlin DSL 构建

## 工作原理

本 skill 在七个关键领域强制执行地道的 Kotlin 约定：使用 type system 和 safe-call operator 实现的 null safety、通过 data class 上的 `val` 和 `copy()` 实现的 immutability、用于 exhaustive type 层级的 sealed class 和 sealed interface、使用 coroutines 和 `Flow` 的 structured concurrency、无需 inheritance 即可添加行为的 extension function、使用 `@DslMarker` 和 lambda receiver 的类型安全的 DSL builder，以及用于构建配置的 Gradle Kotlin DSL。

## 示例

**使用 Elvis operator 实现 null safety：**
```kotlin
fun getUserEmail(userId: String): String {
    val user = userRepository.findById(userId)
    return user?.email ?: "unknown@example.com"
}
```

**用于 exhaustive 结果的 sealed class：**
```kotlin
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Failure(val error: AppError) : Result<Nothing>()
    data object Loading : Result<Nothing>()
}
```

**使用 async/await 的 structured concurrency：**
```kotlin
suspend fun fetchUserWithPosts(userId: String): UserProfile =
    coroutineScope {
        val user = async { userService.getUser(userId) }
        val posts = async { postService.getUserPosts(userId) }
        UserProfile(user = user.await(), posts = posts.await())
    }
```

## 核心原则

### 1. Null Safety

Kotlin 的 type system 区分 nullable 和 non-nullable 类型。充分利用这一点。

```kotlin
// Good: 默认使用 non-nullable 类型
fun getUser(id: String): User {
    return userRepository.findById(id)
        ?: throw UserNotFoundException("User $id not found")
}

// Good: Safe call 和 Elvis operator
fun getUserEmail(userId: String): String {
    val user = userRepository.findById(userId)
    return user?.email ?: "unknown@example.com"
}

// Bad: 强制解包 nullable 类型
fun getUserEmail(userId: String): String {
    val user = userRepository.findById(userId)
    return user!!.email // 如果为 null 则抛出 NPE
}
```

### 2. 默认 Immutability

优先使用 `val` 而非 `var`，优先使用 immutable 集合而非 mutable 集合。

```kotlin
// Good: Immutable 数据
data class User(
    val id: String,
    val name: String,
    val email: String,
)

// Good: 使用 copy() 转换
fun updateEmail(user: User, newEmail: String): User =
    user.copy(email = newEmail)

// Good: Immutable 集合
val users: List<User> = listOf(user1, user2)
val filtered = users.filter { it.email.isNotBlank() }

// Bad: Mutable 状态
var currentUser: User? = null // 避免 mutable 全局状态
val mutableUsers = mutableListOf<User>() // 除非确实需要，否则避免使用
```

### 3. Expression Body 和 Single-Expression Function

使用 expression body 编写简洁、可读的 function。

```kotlin
// Good: Expression body
fun isAdult(age: Int): Boolean = age >= 18

fun formatFullName(first: String, last: String): String =
    "$first $last".trim()

fun User.displayName(): String =
    name.ifBlank { email.substringBefore('@') }

// Good: when 作为 expression
fun statusMessage(code: Int): String = when (code) {
    200 -> "OK"
    404 -> "Not Found"
    500 -> "Internal Server Error"
    else -> "Unknown status: $code"
}

// Bad: 不必要的 block body
fun isAdult(age: Int): Boolean {
    return age >= 18
}
```

### 4. 用于 Value Object 的 Data Class

对于主要承载数据的类型，使用 data class。

```kotlin
// Good: 带有 copy、equals、hashCode、toString 的 data class
data class CreateUserRequest(
    val name: String,
    val email: String,
    val role: Role = Role.USER,
)

// Good: 用于 type safety 的 value class（运行时零开销）
@JvmInline
value class UserId(val value: String) {
    init {
        require(value.isNotBlank()) { "UserId cannot be blank" }
    }
}

@JvmInline
value class Email(val value: String) {
    init {
        require('@' in value) { "Invalid email: $value" }
    }
}

fun getUser(id: UserId): User = userRepository.findById(id)
```

## Sealed Class 和 Sealed Interface

### 建模受限的层级

```kotlin
// Good: 用于 exhaustive when 的 sealed class
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Failure(val error: AppError) : Result<Nothing>()
    data object Loading : Result<Nothing>()
}

fun <T> Result<T>.getOrNull(): T? = when (this) {
    is Result.Success -> data
    is Result.Failure -> null
    is Result.Loading -> null
}

fun <T> Result<T>.getOrThrow(): T = when (this) {
    is Result.Success -> data
    is Result.Failure -> throw error.toException()
    is Result.Loading -> throw IllegalStateException("Still loading")
}
```

### 用于 API 响应的 Sealed Interface

```kotlin
sealed interface ApiError {
    val message: String

    data class NotFound(override val message: String) : ApiError
    data class Unauthorized(override val message: String) : ApiError
    data class Validation(
        override val message: String,
        val field: String,
    ) : ApiError
    data class Internal(
        override val message: String,
        val cause: Throwable? = null,
    ) : ApiError
}

fun ApiError.toStatusCode(): Int = when (this) {
    is ApiError.NotFound -> 404
    is ApiError.Unauthorized -> 401
    is ApiError.Validation -> 422
    is ApiError.Internal -> 500
}
```

## Scope Function

### 各自的使用场景

```kotlin
// let: 转换 nullable 或带作用域的结果
val length: Int? = name?.let { it.trim().length }

// apply: 配置一个对象（返回该对象）
val user = User().apply {
    name = "Alice"
    email = "alice@example.com"
}

// also: Side effect（返回该对象）
val user = createUser(request).also { logger.info("Created user: ${it.id}") }

// run: 使用 receiver 执行一个 block（返回结果）
val result = connection.run {
    prepareStatement(sql)
    executeQuery()
}

// with: run 的非 extension 形式
val csv = with(StringBuilder()) {
    appendLine("name,email")
    users.forEach { appendLine("${it.name},${it.email}") }
    toString()
}
```

### Anti-Pattern

```kotlin
// Bad: 嵌套 scope function
user?.let { u ->
    u.address?.let { addr ->
        addr.city?.let { city ->
            println(city) // 难以阅读
        }
    }
}

// Good: 改为链式 safe call
val city = user?.address?.city
city?.let { println(it) }
```

## Extension Function

### 无需 Inheritance 即可添加功能

```kotlin
// Good: 领域相关的 extension
fun String.toSlug(): String =
    lowercase()
        .replace(Regex("[^a-z0-9\\s-]"), "")
        .replace(Regex("\\s+"), "-")
        .trim('-')

fun Instant.toLocalDate(zone: ZoneId = ZoneId.systemDefault()): LocalDate =
    atZone(zone).toLocalDate()

// Good: 集合相关的 extension
fun <T> List<T>.second(): T = this[1]

fun <T> List<T>.secondOrNull(): T? = getOrNull(1)

// Good: 带作用域的 extension（不污染全局 namespace）
class UserService {
    private fun User.isActive(): Boolean =
        status == Status.ACTIVE && lastLogin.isAfter(Instant.now().minus(30, ChronoUnit.DAYS))

    fun getActiveUsers(): List<User> = userRepository.findAll().filter { it.isActive() }
}
```

## Coroutines

### Structured Concurrency

```kotlin
// Good: 使用 coroutineScope 的 structured concurrency
suspend fun fetchUserWithPosts(userId: String): UserProfile =
    coroutineScope {
        val userDeferred = async { userService.getUser(userId) }
        val postsDeferred = async { postService.getUserPosts(userId) }

        UserProfile(
            user = userDeferred.await(),
            posts = postsDeferred.await(),
        )
    }

// Good: 当子 coroutine 可能独立失败时使用 supervisorScope
suspend fun fetchDashboard(userId: String): Dashboard =
    supervisorScope {
        val user = async { userService.getUser(userId) }
        val notifications = async { notificationService.getRecent(userId) }
        val recommendations = async { recommendationService.getFor(userId) }

        Dashboard(
            user = user.await(),
            notifications = try {
                notifications.await()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                emptyList()
            },
            recommendations = try {
                recommendations.await()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                emptyList()
            },
        )
    }
```

### 用于 Reactive Stream 的 Flow

```kotlin
// Good: 带有正确错误处理的 cold flow
fun observeUsers(): Flow<List<User>> = flow {
    while (currentCoroutineContext().isActive) {
        val users = userRepository.findAll()
        emit(users)
        delay(5.seconds)
    }
}.catch { e ->
    logger.error("Error observing users", e)
    emit(emptyList())
}

// Good: Flow operator
fun searchUsers(query: Flow<String>): Flow<List<User>> =
    query
        .debounce(300.milliseconds)
        .distinctUntilChanged()
        .filter { it.length >= 2 }
        .mapLatest { q -> userRepository.search(q) }
        .catch { emit(emptyList()) }
```

### 取消与清理

```kotlin
// Good: 响应取消
suspend fun processItems(items: List<Item>) {
    items.forEach { item ->
        ensureActive() // 在耗时操作前检查取消状态
        processItem(item)
    }
}

// Good: 使用 try/finally 进行清理
suspend fun acquireAndProcess() {
    val resource = acquireResource()
    try {
        resource.process()
    } finally {
        withContext(NonCancellable) {
            resource.release() // 总是释放，即使在取消时
        }
    }
}
```

## Delegation

### Property Delegation

```kotlin
// Lazy 初始化
val expensiveData: List<User> by lazy {
    userRepository.findAll()
}

// Observable property
var name: String by Delegates.observable("initial") { _, old, new ->
    logger.info("Name changed from '$old' to '$new'")
}

// Map-backed property
class Config(private val map: Map<String, Any?>) {
    val host: String by map
    val port: Int by map
    val debug: Boolean by map
}

val config = Config(mapOf("host" to "localhost", "port" to 8080, "debug" to true))
```

### Interface Delegation

```kotlin
// Good: Delegate interface 实现
class LoggingUserRepository(
    private val delegate: UserRepository,
    private val logger: Logger,
) : UserRepository by delegate {
    // 只重写需要添加日志的方法
    override suspend fun findById(id: String): User? {
        logger.info("Finding user by id: $id")
        return delegate.findById(id).also {
            logger.info("Found user: ${it?.name ?: "null"}")
        }
    }
}
```

## DSL Builder

### Type-Safe Builder

```kotlin
// Good: 使用 @DslMarker 的 DSL
@DslMarker
annotation class HtmlDsl

@HtmlDsl
class HTML {
    private val children = mutableListOf<Element>()

    fun head(init: Head.() -> Unit) {
        children += Head().apply(init)
    }

    fun body(init: Body.() -> Unit) {
        children += Body().apply(init)
    }

    override fun toString(): String = children.joinToString("\n")
}

fun html(init: HTML.() -> Unit): HTML = HTML().apply(init)

// 使用示例
val page = html {
    head { title("My Page") }
    body {
        h1("Welcome")
        p("Hello, World!")
    }
}
```

### Configuration DSL

```kotlin
data class ServerConfig(
    val host: String = "0.0.0.0",
    val port: Int = 8080,
    val ssl: SslConfig? = null,
    val database: DatabaseConfig? = null,
)

data class SslConfig(val certPath: String, val keyPath: String)
data class DatabaseConfig(val url: String, val maxPoolSize: Int = 10)

class ServerConfigBuilder {
    var host: String = "0.0.0.0"
    var port: Int = 8080
    private var ssl: SslConfig? = null
    private var database: DatabaseConfig? = null

    fun ssl(certPath: String, keyPath: String) {
        ssl = SslConfig(certPath, keyPath)
    }

    fun database(url: String, maxPoolSize: Int = 10) {
        database = DatabaseConfig(url, maxPoolSize)
    }

    fun build(): ServerConfig = ServerConfig(host, port, ssl, database)
}

fun serverConfig(init: ServerConfigBuilder.() -> Unit): ServerConfig =
    ServerConfigBuilder().apply(init).build()

// 使用示例
val config = serverConfig {
    host = "0.0.0.0"
    port = 443
    ssl("/certs/cert.pem", "/certs/key.pem")
    database("jdbc:postgresql://localhost:5432/mydb", maxPoolSize = 20)
}
```

## 用于 Lazy Evaluation 的 Sequence

```kotlin
// Good: 对有多个操作的大型集合使用 sequence
val result = users.asSequence()
    .filter { it.isActive }
    .map { it.email }
    .filter { it.endsWith("@company.com") }
    .take(10)
    .toList()

// Good: 生成无限 sequence
val fibonacci: Sequence<Long> = sequence {
    var a = 0L
    var b = 1L
    while (true) {
        yield(a)
        val next = a + b
        a = b
        b = next
    }
}

val first20 = fibonacci.take(20).toList()
```

## Gradle Kotlin DSL

### build.gradle.kts 配置

```kotlin
// 检查最新版本：https://kotlinlang.org/docs/releases.html
plugins {
    kotlin("jvm") version "2.3.10"
    kotlin("plugin.serialization") version "2.3.10"
    id("io.ktor.plugin") version "3.4.0"
    id("org.jetbrains.kotlinx.kover") version "0.9.7"
    id("io.gitlab.arturbosch.detekt") version "1.23.8"
}

group = "com.example"
version = "1.0.0"

kotlin {
    jvmToolchain(21)
}

dependencies {
    // Ktor
    implementation("io.ktor:ktor-server-core:3.4.0")
    implementation("io.ktor:ktor-server-netty:3.4.0")
    implementation("io.ktor:ktor-server-content-negotiation:3.4.0")
    implementation("io.ktor:ktor-serialization-kotlinx-json:3.4.0")

    // Exposed
    implementation("org.jetbrains.exposed:exposed-core:1.0.0")
    implementation("org.jetbrains.exposed:exposed-dao:1.0.0")
    implementation("org.jetbrains.exposed:exposed-jdbc:1.0.0")
    implementation("org.jetbrains.exposed:exposed-kotlin-datetime:1.0.0")

    // Koin
    implementation("io.insert-koin:koin-ktor:4.2.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.2")

    // 测试
    testImplementation("io.kotest:kotest-runner-junit5:6.1.4")
    testImplementation("io.kotest:kotest-assertions-core:6.1.4")
    testImplementation("io.kotest:kotest-property:6.1.4")
    testImplementation("io.mockk:mockk:1.14.9")
    testImplementation("io.ktor:ktor-server-test-host:3.4.0")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

detekt {
    config.setFrom(files("config/detekt/detekt.yml"))
    buildUponDefaultConfig = true
}
```

## 错误处理模式

### 用于 Domain Operation 的 Result 类型

```kotlin
// Good: 使用 Kotlin 的 Result 或自定义 sealed class
suspend fun createUser(request: CreateUserRequest): Result<User> = runCatching {
    require(request.name.isNotBlank()) { "Name cannot be blank" }
    require('@' in request.email) { "Invalid email format" }

    val user = User(
        id = UserId(UUID.randomUUID().toString()),
        name = request.name,
        email = Email(request.email),
    )
    userRepository.save(user)
    user
}

// Good: 链式处理 result
val displayName = createUser(request)
    .map { it.name }
    .getOrElse { "Unknown" }
```

### require, check, error

```kotlin
// Good: 带清晰消息的前置条件
fun withdraw(account: Account, amount: Money): Account {
    require(amount.value > 0) { "Amount must be positive: $amount" }
    check(account.balance >= amount) { "Insufficient balance: ${account.balance} < $amount" }

    return account.copy(balance = account.balance - amount)
}
```

## 集合操作

### 地道的集合处理

```kotlin
// Good: 链式操作
val activeAdminEmails: List<String> = users
    .filter { it.role == Role.ADMIN && it.isActive }
    .sortedBy { it.name }
    .map { it.email }

// Good: 分组与聚合
val usersByRole: Map<Role, List<User>> = users.groupBy { it.role }

val oldestByRole: Map<Role, User?> = users.groupBy { it.role }
    .mapValues { (_, users) -> users.minByOrNull { it.createdAt } }

// Good: 使用 associate 创建 map
val usersById: Map<UserId, User> = users.associateBy { it.id }

// Good: 使用 partition 进行拆分
val (active, inactive) = users.partition { it.isActive }
```

## 快速参考：Kotlin 惯用法

| 惯用法 | 描述 |
|-------|-------------|
| `val` 优于 `var` | 优先使用 immutable 变量 |
| `data class` | 用于带 equals/hashCode/copy 的 value object |
| `sealed class/interface` | 用于受限的 type 层级 |
| `value class` | 用于零开销的 type-safe wrapper |
| Expression `when` | Exhaustive pattern matching |
| Safe call `?.` | Null-safe 成员访问 |
| Elvis `?:` | nullable 的默认值 |
| `let`/`apply`/`also`/`run`/`with` | 用于编写整洁代码的 scope function |
| Extension function | 无需 inheritance 即可添加行为 |
| `copy()` | 对 data class 进行 immutable 更新 |
| `require`/`check` | Precondition 断言 |
| Coroutine `async`/`await` | Structured 并发执行 |
| `Flow` | Cold reactive stream |
| `sequence` | Lazy evaluation |
| Delegation `by` | 无需 inheritance 即可复用实现 |

## 需要避免的 Anti-Pattern

```kotlin
// Bad: 强制解包 nullable 类型
val name = user!!.name

// Bad: 来自 Java 的 platform type 泄漏
fun getLength(s: String) = s.length // 安全
fun getLength(s: String?) = s?.length ?: 0 // 处理来自 Java 的 null

// Bad: Mutable data class
data class MutableUser(var name: String, var email: String)

// Bad: 使用 exception 进行控制流
try {
    val user = findUser(id)
} catch (e: NotFoundException) {
    // 不要对预期情况使用 exception
}

// Good: 使用 nullable 返回值或 Result
val user: User? = findUserOrNull(id)

// Bad: 忽略 coroutine scope
GlobalScope.launch { /* 避免 GlobalScope */ }

// Good: 使用 structured concurrency
coroutineScope {
    launch { /* 作用域正确 */ }
}

// Bad: 深度嵌套的 scope function
user?.let { u ->
    u.address?.let { a ->
        a.city?.let { c -> process(c) }
    }
}

// Good: 直接使用 null-safe 链式调用
user?.address?.city?.let { process(it) }
```

**记住**：Kotlin 代码应当简洁但可读。利用 type system 获取安全性，优先使用 immutability，并使用 coroutines 处理并发。如有疑问，让编译器帮助你。
