---
description: 审查 Flutter/Dart 代码的惯用模式、widget 最佳实践、状态管理、性能、可访问性与安全性。调用 flutter-reviewer agent。
---

# Flutter 代码审查

本命令调用 **flutter-reviewer** agent 来审查 Flutter/Dart 代码变更。

## 本命令的功能

1. **收集上下文**：审查 `git diff --staged` 与 `git diff`
2. **检查项目**：检查 `pubspec.yaml`、`analysis_options.yaml`、状态管理方案
3. **安全预扫描**：检查硬编码 secret 与关键安全问题
4. **全面审查**：应用完整的审查清单
5. **报告发现**：按严重程度分组输出问题并提供修复指引

## 前置条件

在运行 `/flutter-review` 之前，请确保：
1. **构建通过** — 先运行 `/flutter-build`；对构建失败的代码进行审查是不完整的
2. **测试通过** — 运行 `/flutter-test` 确认无回归
3. **无合并冲突** — 解决所有冲突，确保 diff 仅反映有意为之的变更
4. **`flutter analyze` 输出干净** — 在审查前修复 analyzer 警告

## 何时使用

在以下情况使用 `/flutter-review`：
- 在提交包含 Flutter/Dart 变更的 PR 之前（在构建与测试通过之后）
- 在实现新功能之后，以便尽早发现问题
- 在审查他人的 Flutter 代码时
- 用于审计 widget、状态管理组件或 service class
- 在生产发布之前

## 审查领域

| 领域 | 严重程度 |
|------|----------|
| 硬编码 secret、明文 HTTP | CRITICAL |
| 架构违规、状态管理 anti-pattern | CRITICAL |
| widget 重建问题、资源泄漏 | HIGH |
| 缺失 `dispose()`、await 之后使用 `BuildContext` | HIGH |
| Dart null safety、缺失错误/加载状态 | HIGH |
| const 传播、widget 组合 | HIGH |
| 性能：`build()` 中的高开销操作 | HIGH |
| 可访问性、semantic label | MEDIUM |
| 状态转换缺失测试 | HIGH |
| 硬编码字符串（l10n） | MEDIUM |
| Pub 依赖卫生 | LOW |

## 示例会话

````text
User: /flutter-review

Agent:
# Flutter 代码审查

## 上下文

变更的文件：
- lib/features/auth/presentation/login_page.dart
- lib/features/auth/data/auth_repository_impl.dart

状态管理：Riverpod（从 pubspec.yaml 检测到）
架构：feature-first

## 安全预扫描

✓ 未检测到硬编码 secret
✓ 无明文 HTTP 调用

## 审查发现

[HIGH] 在 async gap 之后使用 BuildContext 而未做 mounted 检查
文件：lib/features/auth/presentation/login_page.dart:67
问题：`context.go('/home')` 在 `await auth.login(...)` 之后调用，未做 `mounted` 检查。
修复：在任何 await 之后的导航前添加 `if (!context.mounted) return;`（Flutter 3.7+）。

[HIGH] 未处理 AsyncValue 的 error 状态
文件：lib/features/auth/presentation/login_page.dart:42
问题：`ref.watch(authProvider)` 对 loading/data 进行 switch，但没有 `error` 分支。
修复：在 switch 表达式或 `when()` 调用中添加 error 分支，以展示面向用户的错误信息。

[MEDIUM] 硬编码字符串未本地化
文件：lib/features/auth/presentation/login_page.dart:89
问题：`Text('Login')` — 面向用户的字符串未使用本地化系统。
修复：使用项目的 l10n 访问器：`Text(context.l10n.loginButton)`。

## 审查汇总

| 严重程度 | 数量 | 状态 |
|----------|-------|--------|
| CRITICAL | 0     | pass   |
| HIGH     | 2     | block  |
| MEDIUM   | 1     | info   |
| LOW      | 0     | note   |

结论：BLOCK — HIGH 问题必须在合并前修复。
````

## 通过标准

- **Approve**：无 CRITICAL 或 HIGH 问题
- **Block**：任何 CRITICAL 或 HIGH 问题必须在合并前修复

## 相关命令

- `/flutter-build` — 先修复构建错误
- `/flutter-test` — 在审查前运行测试
- `/code-review` — 通用代码审查（与语言无关）

## 相关资源

- Agent：`agents/flutter-reviewer.md`
- Skill：`skills/flutter-dart-code-review/`
- Rules：`rules/dart/`
