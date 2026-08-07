---
description: 针对 ownership、lifetimes、错误处理、unsafe 使用和 idiomatic 模式的全面 Rust 代码审查。调用 rust-reviewer agent。
---

# Rust 代码审查

本命令调用 **rust-reviewer** agent 进行全面的 Rust 专用代码审查。

## 本命令的功能

1. **验证自动化检查**:运行 `cargo check`、`cargo clippy -- -D warnings`、`cargo fmt --check` 和 `cargo test` —— 任一失败即停止
2. **识别 Rust 变更**:通过 `git diff HEAD~1`(对 PR 使用 `git diff main...HEAD`)查找已修改的 `.rs` 文件
3. **运行安全审计**:如可用,执行 `cargo audit`
4. **安全扫描**:检查 unsafe 使用、command injection、hardcoded secrets
5. **Ownership 审查**:分析不必要的 clone、lifetime 问题、borrowing 模式
6. **生成报告**:按 severity 对 issue 进行分类

## 何时使用

在以下情况使用 `/rust-review`:
- 编写或修改 Rust 代码后
- 提交 Rust 变更前
- 审查包含 Rust 代码的 pull request
- 接手新的 Rust 代码库时
- 学习 idiomatic Rust 模式

## 审查类别

### CRITICAL (必须修复)
- 生产代码路径中未检查的 `unwrap()`/`expect()`
- `unsafe` 没有 `// SAFETY:` 注释记录 invariant
- 查询中通过 string interpolation 导致的 SQL injection
- `std::process::Command` 中通过未验证输入导致的 command injection
- Hardcoded credentials
- 通过 raw pointer 导致的 use-after-free

### HIGH (应修复)
- 为满足 borrow checker 而进行的不必要的 `.clone()`
- 使用 `String` 参数但 `&str` 或 `impl AsRef<str>` 即可
- 在 async 上下文中阻塞(`std::thread::sleep`、`std::fs`)
- 共享类型缺少 `Send`/`Sync` bound
- 对业务关键 enum 使用通配符 `_ =>` match
- 过大的函数(>50 行)

### MEDIUM (考虑)
- hot path 中不必要的内存分配
- 已知大小时缺少 `with_capacity`
- 无正当理由抑制 clippy 警告
- 公共 API 没有 `///` 文档
- 在忽略返回值很可能导致 bug 的 non-`must_use` 返回类型上考虑使用 `#[must_use]`

## 运行的自动化检查

```bash
# 构建门槛(审查前必须通过)
cargo check

# Lint 和建议
cargo clippy -- -D warnings

# 格式化
cargo fmt --check

# 测试
cargo test

# 安全审计(如可用)
if command -v cargo-audit >/dev/null; then cargo audit; else echo "cargo-audit not installed"; fi
```

## 示例用法

````text
User: /rust-review

Agent:
# Rust 代码审查报告

## 已审查的文件
- src/service/user.rs (modified)
- src/handler/api.rs (modified)

## 静态分析结果
- Build: 成功
- Clippy: 无警告
- 格式化: 通过
- 测试: 全部通过

## 发现的 issue

[CRITICAL] 生产路径中未检查的 unwrap
File: src/service/user.rs:28
Issue: 对数据库查询结果使用 `.unwrap()`
```rust
let user = db.find_by_id(id).unwrap();  // 在 user 不存在时 panic
```
Fix: 带 context 传播错误
```rust
let user = db.find_by_id(id)
    .context("failed to fetch user")?;
```

[HIGH] 不必要的 Clone
File: src/handler/api.rs:45
Issue: 为满足 borrow checker 而 clone String
```rust
let name = user.name.clone();
process(&user, &name);
```
Fix: 重构以避免 clone
```rust
let result = process_name(&user.name);
use_user(&user, result);
```

## 总结
- CRITICAL: 1
- HIGH: 1
- MEDIUM: 0

建议: 在 CRITICAL issue 修复前阻止合并
````

## 批准条件

| 状态 | 条件 |
|--------|-----------|
| Approve | 无 CRITICAL 或 HIGH issue |
| Warning | 仅有 MEDIUM issue(谨慎合并) |
| Block | 发现 CRITICAL 或 HIGH issue |

## 与其他命令的集成

- 先使用 `/rust-test` 确保测试通过
- 若出现 build error 则使用 `/rust-build`
- 提交前使用 `/rust-review`
- 对非 Rust 特定的关注点使用 `/code-review`

## 相关

- Agent: `agents/rust-reviewer.md`
- Skills: `skills/rust-patterns/`、`skills/rust-testing/`
