---
description: 增量修复 Rust 构建错误、borrow checker 问题与依赖问题。调用 rust-build-resolver agent 执行最小化、精准的修复。
---

# Rust 构建与修复

此命令调用 **rust-build-resolver** agent，以最小改动增量修复 Rust 构建错误。

## 此命令的作用

1. **运行诊断**：执行 `cargo check`、`cargo clippy`、`cargo fmt --check`
2. **解析错误**：识别错误码与受影响的文件
3. **增量修复**：一次修复一个错误
4. **验证每处修复**：每次改动后重新运行 `cargo check`
5. **汇报总结**：展示已修复与遗留的内容

## 何时使用

在以下情况使用 `/rust-build`：
- `cargo build` 或 `cargo check` 因报错失败
- `cargo clippy` 报告警告
- borrow checker 或 lifetime 错误阻塞编译
- Cargo 依赖解析失败
- 拉取的改动破坏了构建之后

## 运行的诊断命令

```bash
# 主要构建检查
cargo check 2>&1

# lint 与建议
cargo clippy -- -D warnings 2>&1

# 格式化检查
cargo fmt --check 2>&1

# 依赖问题
cargo tree --duplicates

# 安全审计（若已安装）
if command -v cargo-audit >/dev/null; then cargo audit; else echo "cargo-audit not installed"; fi
```

## 示例会话

````text
用户：/rust-build

Agent：
# Rust 构建修复

## 初始诊断

```bash
$ cargo check
error[E0502]: cannot borrow `map` as mutable because it is also borrowed as immutable
  --> src/service/cache.rs:25:5
error[E0308]: mismatched types
  --> src/handler/api.rs:42:12
error[E0425]: cannot find value `db` in this scope
  --> src/handler/api.rs:58:9
```

发现错误：3

## 修复 1：borrow checker 错误

文件：src/service/cache.rs:25
错误：E0502 — cannot borrow `map` as mutable because also borrowed as immutable
原因：在可变插入期间，不可变借用仍然活跃

```rust
// 改动：重构为在可变访问前结束不可变借用
if !map.contains_key("key") {
    map.insert("key".into(), default);
}
```

```bash
$ cargo check
# 剩余 2 个错误
```

## 修复 2：类型不匹配

文件：src/handler/api.rs:42
错误：E0308 — mismatched types: expected `usize`, found `&str`

```rust
// 原代码
let count = params.get("count");
// 改为
let count: usize = params.get("count")
    .and_then(|s| s.parse().ok())
    .unwrap_or(0);
```

```bash
$ cargo check
# 剩余 1 个错误
```

## 修复 3：未解析的名称

文件：src/handler/api.rs:58
错误：E0425 — cannot find value `db` in this scope
原因：缺少 import

```rust
// 新增
use crate::db;
```

```bash
$ cargo check
# 构建成功！
```

## 最终验证

```bash
$ cargo clippy -- -D warnings
# 无警告

$ cargo test
running 6 tests
test service::cache::tests::test_insert ... ok
test service::cache::tests::test_get ... ok
test handler::api::tests::test_parse_count ... ok
test handler::api::tests::test_missing_count ... ok
test handler::api::tests::test_db_import ... ok
test handler::api::tests::test_response ... ok

test result: ok. 6 passed; 0 failed; 0 ignored
```

## 总结

| 指标 | 数量 |
|--------|-------|
| 已修复构建错误 | 3 |
| 已修复 Clippy 警告 | 0 |
| 已修改文件 | 2 |
| 遗留问题 | 0 |

构建状态：SUCCESS
````

## 常见错误修复

| 错误 | 典型修复 |
|-------|-------------|
| `cannot borrow as mutable` | 重构以先结束不可变借用；仅在确有理由时 clone |
| `does not live long enough` | 使用 owned type 或添加 lifetime annotation |
| `cannot move out of` | 重构以获取所有权；clone 仅作为最后手段 |
| `mismatched types` | 添加 `.into()`、`as` 或显式转换 |
| `trait X not implemented` | 添加 `#[derive(Trait)]` 或手动实现 |
| `unresolved import` | 添加到 Cargo.toml 或修复 `use` 路径 |
| `cannot find value` | 添加 import 或修复路径 |

## 修复策略

1. **构建错误优先** - 代码必须能编译
2. **Clippy 警告其次** - 修复可疑的代码构造
3. **格式化最后** - 符合 `cargo fmt` 规范
4. **一次一处修复** - 验证每处改动
5. **最小改动** - 只修复，不重构

## 停止条件

在以下情况下，agent 将停止并汇报：
- 同一错误在 3 次尝试后仍然存在
- 修复引入了更多错误
- 需要进行架构层面的改动
- borrow checker 错误需要重新设计数据 ownership

## 相关命令

- `/rust-test` - 在构建成功后运行测试
- `/rust-review` - 审查代码质量
- `verification-loop` skill - 完整的验证循环

## 相关资源

- Agent: `agents/rust-build-resolver.md`
- Skill: `skills/rust-patterns/`
