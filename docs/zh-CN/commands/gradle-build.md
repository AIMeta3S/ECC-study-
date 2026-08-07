---
description: 修复 Android 和 KMP 项目的 Gradle 构建错误
---

# Gradle Build Fix

增量修复 Android 和 Kotlin Multiplatform 项目的 Gradle 构建与编译错误。

## 第 1 步：检测构建配置

识别项目类型并运行相应的构建：

| 判断指标 | 构建命令 |
|----------|----------|
| `build.gradle.kts` + `composeApp/`（KMP） | `./gradlew composeApp:compileKotlinMetadata 2>&1` |
| `build.gradle.kts` + `app/`（Android） | `./gradlew app:compileDebugKotlin 2>&1` |
| `settings.gradle.kts` 含多个 module | `./gradlew assemble 2>&1` |
| 已配置 Detekt | `./gradlew detekt 2>&1` |

同时检查 `gradle.properties` 和 `local.properties` 中的配置。

## 第 2 步：解析并分组错误

1. 运行构建命令并捕获输出
2. 将 Kotlin 编译错误与 Gradle 配置错误区分开
3. 按 module 和文件路径分组
4. 排序：配置错误优先，然后按依赖顺序排列编译错误

## 第 3 步：修复循环

对每个错误：

1. **读取文件** —— 错误行周围的完整上下文
2. **诊断** —— 常见类别：
   - 缺少 import 或未解析的 reference
   - 类型不匹配或不兼容的类型
   - `build.gradle.kts` 中缺少依赖
   - expect/actual 不匹配（KMP）
   - Compose compiler 错误
3. **最小化修复** —— 能解决错误的最小改动
4. **重新运行构建** —— 验证修复并检查新错误
5. **继续** —— 处理下一个错误

## 第 4 步：Guardrails

满足以下条件时停止并询问用户：
- 修复引入的错误多于解决的错误
- 同一错误在 3 次尝试后仍然存在
- 错误需要添加新的依赖或更改 module 结构
- Gradle sync 本身失败（配置阶段错误）
- 错误位于生成的代码中（Room、SQLDelight、KSP）

## 第 5 步：总结

报告：
- 已修复的错误（module、文件、描述）
- 剩余错误
- 新引入的错误（应为零）
- 建议的下一步

## 常见 Gradle/KMP 修复

| 错误 | 修复 |
|------|------|
| `commonMain` 中未解析的 reference | 检查依赖是否在 `commonMain.dependencies {}` 中 |
| expect 声明缺少 actual | 在每个平台 source set 中添加 `actual` 实现 |
| Compose compiler 版本不匹配 | 在 `libs.versions.toml` 中对齐 Kotlin 和 Compose compiler 版本 |
| 重复的 class | 使用 `./gradlew dependencies` 检查冲突的依赖 |
| KSP 错误 | 运行 `./gradlew kspCommonMainKotlinMetadata` 重新生成 |
| Configuration cache 问题 | 检查是否存在不可序列化的 task 输入 |
