---
description: 为 Rust 强制执行 TDD 工作流。先写测试，再实现代码。使用 cargo-llvm-cov 验证 80%+ 覆盖率。
---

# Rust TDD 命令

本命令使用 `#[test]`、rstest、proptest 和 mockall 为 Rust 代码强制执行测试驱动开发方法论。

## 本命令的功能

1. **定义类型/Trait**：使用 `todo!()` 搭建函数签名
2. **编写测试**：创建完整的测试模块（RED）
3. **运行测试**：验证测试因正确的原因而失败
4. **实现代码**：编写最少量的代码以通过测试（GREEN）
5. **重构**：在保持测试通过（green）的同时改进代码
6. **检查覆盖率**：使用 cargo-llvm-cov 确保 80%+ 覆盖率

## 何时使用

在以下情况使用 `/rust-test`：
- 实现新的 Rust 函数、方法或 trait
- 为现有 Rust 代码添加测试覆盖率
- 修复 bug（先写失败的测试）
- 构建关键业务逻辑
- 学习 Rust 中的 TDD 工作流

## TDD 循环

```
RED     -> Write failing test first
GREEN   -> Implement minimal code to pass
REFACTOR -> Improve code, tests stay green
REPEAT  -> Next test case
```

## 示例会话

````text
User: /rust-test I need a function to validate user registration

Agent:
# TDD Session: Registration Validator

## Step 1: Define Interface

```rust
// src/validator.rs
pub struct RegistrationRequest {
    pub name: String,
    pub email: String,
    pub password: String,
}

pub enum ValidationResult {
    Valid,
    Invalid(Vec<String>),
}

pub fn validate_registration(request: &RegistrationRequest) -> ValidationResult {
    todo!()
}
```

## Step 2: Write Tests (RED)

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_registration_returns_valid() {
        let request = RegistrationRequest {
            name: "Alice".into(),
            email: "alice@example.com".into(),
            password: "SecureP@ss1".into(),
        };
        assert!(matches!(validate_registration(&request), ValidationResult::Valid));
    }

    #[test]
    fn blank_name_returns_invalid() {
        let request = RegistrationRequest {
            name: "".into(),
            email: "alice@example.com".into(),
            password: "SecureP@ss1".into(),
        };
        match validate_registration(&request) {
            ValidationResult::Invalid(errors) => {
                assert!(errors.contains(&"Name is required".to_string()));
            }
            ValidationResult::Valid => panic!("expected Invalid"),
        }
    }

    #[test]
    fn invalid_email_returns_invalid() {
        let request = RegistrationRequest {
            name: "Alice".into(),
            email: "not-an-email".into(),
            password: "SecureP@ss1".into(),
        };
        assert!(matches!(
            validate_registration(&request),
            ValidationResult::Invalid(_)
        ));
    }

    #[test]
    fn short_password_returns_invalid() {
        let request = RegistrationRequest {
            name: "Alice".into(),
            email: "alice@example.com".into(),
            password: "short".into(),
        };
        assert!(matches!(
            validate_registration(&request),
            ValidationResult::Invalid(_)
        ));
    }
}
```

## Step 3: Run Tests — Verify FAIL

```bash
$ cargo test
running 4 tests
test tests::valid_registration_returns_valid ... FAILED (not yet implemented)
test tests::blank_name_returns_invalid ... FAILED
test tests::invalid_email_returns_invalid ... FAILED
test tests::short_password_returns_invalid ... FAILED
```

Tests fail as expected (todo! panic).

## Step 4: Implement Minimal Code (GREEN)

```rust
pub fn validate_registration(request: &RegistrationRequest) -> ValidationResult {
    let mut errors = Vec::new();

    if request.name.trim().is_empty() {
        errors.push("Name is required".into());
    }
    if !request.email.contains('@') {
        errors.push("Invalid email format".into());
    }
    if request.password.len() < 8 {
        errors.push("Password must be at least 8 characters".into());
    }

    if errors.is_empty() {
        ValidationResult::Valid
    } else {
        ValidationResult::Invalid(errors)
    }
}
```

## Step 5: Run Tests — Verify PASS

```bash
$ cargo test
running 4 tests
test tests::valid_registration_returns_valid ... ok
test tests::blank_name_returns_invalid ... ok
test tests::invalid_email_returns_invalid ... ok
test tests::short_password_returns_invalid ... ok

test result: ok. 4 passed; 0 failed
```

All tests passing!

## Step 6: Check Coverage

```bash
$ cargo llvm-cov
Coverage: 100.0% of lines
```

Coverage: 100%

## TDD Complete!
````

## 测试模式

### 单元测试

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adds_two_numbers() {
        assert_eq!(add(2, 3), 5);
    }

    #[test]
    fn handles_error() -> Result<(), Box<dyn std::error::Error>> {
        let result = parse_config(r#"port = 8080"#)?;
        assert_eq!(result.port, 8080);
        Ok(())
    }
}
```

### 使用 rstest 的参数化测试

```rust
use rstest::{rstest, fixture};

#[rstest]
#[case("hello", 5)]
#[case("", 0)]
#[case("rust", 4)]
fn test_string_length(#[case] input: &str, #[case] expected: usize) {
    assert_eq!(input.len(), expected);
}
```

### 异步测试

```rust
#[tokio::test]
async fn fetches_data_successfully() {
    let client = TestClient::new().await;
    let result = client.get("/data").await;
    assert!(result.is_ok());
}
```

### 基于属性的测试

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn encode_decode_roundtrip(input in ".*") {
        let encoded = encode(&input);
        let decoded = decode(&encoded).unwrap();
        assert_eq!(input, decoded);
    }
}
```

## 覆盖率命令

```bash
# 摘要报告
cargo llvm-cov

# HTML 报告
cargo llvm-cov --html

# 低于阈值则失败
cargo llvm-cov --fail-under-lines 80

# 运行指定测试
cargo test test_name

# 运行并显示输出
cargo test -- --nocapture

# 不在首次失败时停止
cargo test --no-fail-fast
```

## 覆盖率目标

| 代码类型 | 目标 |
|-----------|--------|
| 关键业务逻辑 | 100% |
| Public API | 90%+ |
| 通用代码 | 80%+ |
| 生成的代码 / FFI 绑定 | 排除 |

## TDD 最佳实践

**应该：**
- 在编写任何实现之前先写测试
- 每次修改后运行测试
- 使用 `assert_eq!` 而非 `assert!`，以获得更好的错误信息
- 在返回 `Result` 的测试中使用 `?`，以获得更简洁的输出
- 测试行为，而非实现
- 包含边界情况（空值、边界、错误路径）

**不应该：**
- 在编写测试之前编写实现
- 跳过 RED 阶段
- 在 `Result::is_err()` 可用时使用 `#[should_panic]`
- 在测试中使用 `sleep()` —— 应使用 channel 或 `tokio::time::pause()`
- mock 一切 —— 在可行时优先使用集成测试

## 相关命令

- `/rust-build` - 修复构建错误
- `/rust-review` - 在实现完成后审查代码
- `verification-loop` skill - 运行完整验证循环

## 相关资源

- Skill：`skills/rust-testing/`
- Skill：`skills/rust-patterns/`
