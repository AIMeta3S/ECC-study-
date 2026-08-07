---
description: 全面的 Kotlin 代码审查，覆盖惯用模式、null 安全、coroutine 安全与安全性。调用 kotlin-reviewer agent。
---

# Kotlin 代码审查

该命令调用 **kotlin-reviewer** agent，进行全面的 Kotlin 专属代码审查。

## 该命令的功能

1. **识别 Kotlin 变更**：通过 `git diff` 查找已修改的 `.kt` 与 `.kts` 文件
2. **运行 build 与静态分析**：执行 `./gradlew build`、`detekt`、`ktlintCheck`
3. **安全扫描**：检查 SQL injection、command injection、硬编码 secrets
4. **null 安全审查**：分析 `!!` 用法、platform type 处理、不安全的类型转换
5. **coroutine 审查**：检查 structured concurrency、dispatcher 用法、cancellation
6. **生成报告**：按 severity 归类 issue

## 何时使用

在以下情况使用 `/kotlin-review`：
- 编写或修改 Kotlin 代码之后
- 提交 Kotlin 变更之前
- 审查包含 Kotlin 代码的 pull request
- 上手新的 Kotlin 代码库
- 学习惯用的 Kotlin 模式

## 审查类别

### CRITICAL（必须修复）
- SQL/Command injection 漏洞
- 无正当理由使用 force-unwrap `!!`
- platform type 的 null safety 违规
- 使用 GlobalScope（违反 structured concurrency）
- 硬编码 credentials
- 不安全的反序列化

### HIGH（应当修复）
- 能用 immutable 却使用了 mutable state
- 在 coroutine context 中执行阻塞调用
- 长循环中缺少 cancellation 检查
- 对 sealed type 的 `when` 未做到 exhaustive
- 过大的函数（>50 行）
- 过深的嵌套（>4 层）

### MEDIUM（可考虑）
- 非惯用的 Kotlin（Java 风格的模式）
- 缺少 trailing comma
- scope function 误用或嵌套
- 大型 collection chain 缺少 sequence
- 冗余的显式类型标注

## 自动执行的检查

```bash
# Build 检查
./gradlew build

# 静态分析
./gradlew detekt

# 格式检查
./gradlew ktlintCheck

# 测试
./gradlew test
```

## 示例用法

````text
User: /kotlin-review

Agent:
# Kotlin 代码审查报告

## 已审查的文件
- src/main/kotlin/com/example/service/UserService.kt（已修改）
- src/main/kotlin/com/example/routes/UserRoutes.kt（已修改）

## 静态分析结果
✓ Build：成功
✓ detekt：无 issue
WARNING: ktlint：2 个格式警告

## 发现的 issue

[CRITICAL] Force-Unwrap null 安全
File: src/main/kotlin/com/example/service/UserService.kt:28
Issue: 对可空的 repository 结果使用 !!
```kotlin
val user = repository.findById(id)!!  // NPE 风险
```
Fix: 使用 safe call 配合错误处理
```kotlin
val user = repository.findById(id)
    ?: throw UserNotFoundException("User $id not found")
```

[HIGH] GlobalScope 使用
File: src/main/kotlin/com/example/routes/UserRoutes.kt:45
Issue: 使用 GlobalScope 会破坏 structured concurrency
```kotlin
GlobalScope.launch {
    notificationService.sendWelcome(user)
}
```
Fix: 使用调用方的 coroutine scope
```kotlin
launch {
    notificationService.sendWelcome(user)
}
```

## 总结
- CRITICAL：1
- HIGH：1
- MEDIUM：0

建议：FAIL：在 CRITICAL issue 修复前阻止合并
````

## 审批标准

| 状态 | 条件 |
|--------|-----------|
| PASS：通过 | 无 CRITICAL 或 HIGH issue |
| WARNING：警告 | 仅有 MEDIUM issue（谨慎合并） |
| FAIL：阻止 | 发现 CRITICAL 或 HIGH issue |

## 与其他命令的配合使用

- 先使用 `/kotlin-test` 确保测试通过
- 出现 build 错误时使用 `/kotlin-build`
- 提交前使用 `/kotlin-review`
- 针对非 Kotlin 专属的问题使用 `/code-review`

## 相关资源

- Agent：`agents/kotlin-reviewer.md`
- Skills：`skills/kotlin-patterns/`、`skills/kotlin-testing/`
