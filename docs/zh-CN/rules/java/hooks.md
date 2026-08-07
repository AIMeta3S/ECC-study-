---
paths:
  - "**/*.java"
  - "**/pom.xml"
  - "**/build.gradle"
  - "**/build.gradle.kts"
---
# Java Hooks

> 本文件扩展了 [common/hooks.md](../common/hooks.md)，增加了 Java 相关内容。

## PostToolUse Hooks

在 `~/.claude/settings.json` 中配置：

- **google-java-format**：编辑后自动格式化 `.java` 文件
- **checkstyle**：编辑 Java 文件后运行风格检查
- **./mvnw compile** 或 **./gradlew compileJava**：修改后验证编译
