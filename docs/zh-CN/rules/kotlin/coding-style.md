---
paths:
  - "**/*.kt"
  - "**/*.kts"
---
# Kotlin 编码风格

> 本文件在 [common/coding-style.md](../common/coding-style.md) 基础上扩展 Kotlin 专属内容。

## 格式化

- 使用 **ktlint** 或 **Detekt** 强制风格
- 采用官方 Kotlin 代码风格（在 `gradle.properties` 中设置 `kotlin.code.style=official`）

## 不可变性

- 优先使用 `val` 而非 `var` —— 默认使用 `val`，仅在需要修改时才使用 `var`
- 值类型使用 `data class`；在 public API 中使用不可变集合（`List`、`Map`、`Set`）
- 状态更新采用 copy-on-write：`state.copy(field = newValue)`

## 命名

遵循 Kotlin 约定：
- 函数与属性使用 `camelCase`
- 类、接口、object 与 type alias 使用 `PascalCase`
- 常量使用 `SCREAMING_SNAKE_CASE`（`const val` 或 `@JvmStatic`）
- 接口以行为命名，不加 `I` 前缀：使用 `Clickable` 而非 `IClickable`

## Null Safety

- 永远不要使用 `!!` —— 优先使用 `?.`、`?:`、`requireNotNull()` 或 `checkNotNull()`
- 使用 `?.let {}` 执行带作用域的 null 安全操作
- 对于合法情况下可能没有结果的函数，返回 nullable 类型

```kotlin
// 反例
val name = user!!.name

// 正例
val name = user?.name ?: "Unknown"
val name = requireNotNull(user) { "User must be set before accessing name" }.name
```

## Sealed Types

使用 sealed class/interface 建模封闭的状态层次结构：

```kotlin
sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
    data class Error(val message: String) : UiState<Nothing>
}
```

对 sealed type 始终使用穷尽的 `when` —— 不要使用 `else` 分支。

## Extension Functions

使用 extension function 实现工具操作，但需保持其可发现性：
- 放置在以接收者类型命名的文件中（`StringExt.kt`、`FlowExt.kt`）
- 限制作用范围 —— 不要为 `Any` 或过于泛化的类型添加 extension

## Scope Functions

选择正确的 scope function：
- `let` —— null 检查 + 转换：`user?.let { greet(it) }`
- `run` —— 基于接收者计算结果：`service.run { fetch(config) }`
- `apply` —— 配置对象：`builder.apply { timeout = 30 }`
- `also` —— side effect：`result.also { log(it) }`
- 避免 scope function 的深层嵌套（最多 2 层）

## 错误处理

- 使用 `Result<T>` 或自定义 sealed type
- 使用 `runCatching {}` 包装可能抛出异常的代码
- 永远不要捕获 `CancellationException` —— 必须重新抛出
- 避免使用 `try-catch` 进行控制流

```kotlin
// 反例 —— 用异常作为控制流
val user = try { repository.getUser(id) } catch (e: NotFoundException) { null }

// 正例 —— 返回 nullable
val user: User? = repository.findUser(id)
```
