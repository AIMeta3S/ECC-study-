---
description: 增量修复 Kotlin/Gradle build 错误、编译器警告和依赖问题。调用 kotlin-build-resolver agent 执行最小化的精准修复。
---

# Kotlin Build 与修复

本命令调用 **kotlin-build-resolver** agent，以最小改动增量修复 Kotlin build 错误。

## 本命令的作用

1. **运行诊断**：执行 `./gradlew build`、`detekt`、`ktlintCheck`
2. **解析错误**：按文件分组并按严重程度排序
3. **增量修复**：一次修复一个错误
4. **验证每处修复**：每次改动后重新运行 build
5. **报告总结**：展示已修复内容和剩余问题

## 何时使用

在以下情况使用 `/kotlin-build`：
- `./gradlew build` 报错失败
- Kotlin 编译器报告错误
- `./gradlew detekt` 报告违规
- Gradle 依赖解析失败
- 拉取破坏 build 的改动之后

## 运行的诊断命令

```bash
# 主要 build 检查
./gradlew build 2>&1

# 静态分析
./gradlew detekt 2>&1 || echo "detekt not configured"
./gradlew ktlintCheck 2>&1 || echo "ktlint not configured"

# 依赖问题
./gradlew dependencies --configuration runtimeClasspath 2>&1 | head -100

# 当缓存或依赖元数据可疑时的可选深度刷新
./gradlew build --refresh-dependencies
```

## 示例会话

````text
User: /kotlin-build

Agent:
# Kotlin Build 解决

## 初始诊断

```bash
$ ./gradlew build
e: src/main/kotlin/com/example/service/UserService.kt:25:15 Unresolved reference: UserRepository
e: src/main/kotlin/com/example/routes/UserRoutes.kt:42:9 Type mismatch: inferred type is String but Int was expected
e: src/main/kotlin/com/example/routes/UserRoutes.kt:58:5 'when' expression must be exhaustive
```

发现错误：3

## 修复 1：Unresolved Reference

文件：src/main/kotlin/com/example/service/UserService.kt:25
错误：Unresolved reference: UserRepository
原因：缺少 import

```kotlin
// 添加的 import
import com.example.repository.UserRepository
```

```bash
$ ./gradlew build
# 剩余 2 个错误
```

## 修复 2：Type Mismatch

文件：src/main/kotlin/com/example/routes/UserRoutes.kt:42
错误：Type mismatch: inferred type is String but Int was expected

```kotlin
// 由
val count = call.parameters["count"]
// 改为
val count = call.parameters["count"]?.toIntOrNull()
    ?: return@get call.respond(HttpStatusCode.BadRequest, "Invalid count")
```

```bash
$ ./gradlew build
# 剩余 1 个错误
```

## 修复 3：Non-Exhaustive When

文件：src/main/kotlin/com/example/routes/UserRoutes.kt:58
错误：'when' expression must be exhaustive

```kotlin
// 添加缺失的分支
when (user.role) {
    Role.ADMIN -> handleAdmin(user)
    Role.USER -> handleUser(user)
    Role.MODERATOR -> handleModerator(user) // 已添加
}
```

```bash
$ ./gradlew build
# Build 成功！
```

## 最终验证

```bash
$ ./gradlew detekt
# 无问题

$ ./gradlew test
# 所有测试通过
```

## 总结

| 指标 | 数量 |
|--------|-------|
| 已修复 build 错误 | 3 |
| 已修复 Detekt 问题 | 0 |
| 已修改文件 | 2 |
| 剩余问题 | 0 |

Build 状态：PASS: SUCCESS
````

## 常见已修复错误

| 错误 | 典型修复 |
|-------|-------------|
| `Unresolved reference: X` | 添加 import 或依赖 |
| `Type mismatch` | 修复类型转换或赋值 |
| `'when' must be exhaustive` | 添加缺失的 sealed class 分支 |
| `Suspend function can only be called from coroutine` | 添加 `suspend` 修饰符 |
| `Smart cast impossible` | 使用局部 `val` 或 `let` |
| `None of the following candidates is applicable` | 修复参数类型 |
| `Could not resolve dependency` | 修复版本或添加 repository |

## 修复策略

1. **先修复 build 错误** - 代码必须能编译
2. **其次处理 Detekt 违规** - 修复代码质量问题
3. **再处理 ktlint 警告** - 修复格式问题
4. **一次一处修复** - 验证每次改动
5. **最小改动** - 不重构，只修复

## 停止条件

agent 将在以下情况停止并报告：
- 同一错误在 3 次尝试后仍然存在
- 修复引入了更多错误
- 需要架构层面的改动
- 缺少外部依赖

## 相关命令

- `/kotlin-test` - 在 build 成功后运行测试
- `/kotlin-review` - 审查代码质量
- `verification-loop` skill - 完整的验证循环

## 相关

- Agent：`agents/kotlin-build-resolver.md`
- Skill：`skills/kotlin-patterns/`
