---
description: 针对内存安全、现代 C++ 惯用法、并发与安全的全面 C++ 代码审查。调用 cpp-reviewer agent。
---

# C++ 代码审查

该命令调用 **cpp-reviewer** agent，执行针对 C++ 的全面代码审查。

## 此命令的功能

1. **识别 C++ 改动**：通过 `git diff` 查找已修改的 `.cpp`、`.hpp`、`.cc`、`.h` 文件
2. **运行静态分析**：执行 `clang-tidy` 和 `cppcheck`
3. **内存安全扫描**：检查裸 new/delete、缓冲区溢出、use-after-free
4. **并发审查**：分析线程安全、mutex 用法、data race
5. **现代 C++ 检查**：验证代码是否遵循 C++17/20 约定与最佳实践
6. **生成报告**：按严重程度对 issue 分级

## 何时使用

在以下情况使用 `/cpp-review`：
- 编写或修改 C++ 代码后
- 提交 C++ 改动前
- 审查包含 C++ 代码的 Pull Request
- 接手新的 C++ 代码库时
- 检查内存安全 issue 时

## 审查类别

### CRITICAL（必须修复）
- 不使用 RAII 的裸 `new`/`delete`
- 缓冲区溢出与 use-after-free
- 无同步机制的 data race
- 通过 `system()` 的命令注入
- 读取未初始化变量
- 空指针解引用

### HIGH（应当修复）
- 违反 Rule of Five
- 缺少 `std::lock_guard` / `std::scoped_lock`
- 缺少正确生命周期管理的 detached thread
- 使用 C 风格转换而非 `static_cast`/`dynamic_cast`
- 缺少 const correctness

### MEDIUM（建议考虑）
- 不必要的拷贝（按值传递而非 `const&`）
- 已知大小的容器未调用 `reserve()`
- 在头文件中使用 `using namespace std;`
- 重要的返回值缺少 `[[nodiscard]]`
- 过于复杂的 template metaprogramming

## 自动化检查

```bash
# 静态分析
clang-tidy --checks='*,-llvmlibc-*' src/*.cpp -- -std=c++17

# 额外分析
cppcheck --enable=all --suppress=missingIncludeSystem src/

# 带警告构建
cmake --build build -- -Wall -Wextra -Wpedantic
```

## 使用示例

```text
User: /cpp-review

Agent:
# C++ 代码审查报告

## 已审查文件
- src/handler/user.cpp（已修改）
- src/service/auth.cpp（已修改）

## 静态分析结果
✓ clang-tidy: 2 个警告
✓ cppcheck: 无 issue

## 发现的 issue

[CRITICAL] 内存泄漏
文件：src/service/auth.cpp:45
问题：裸 `new` 没有匹配的 `delete`
```cpp
auto* session = new Session(userId);  // 内存泄漏！
cache[userId] = session;
```
修复：使用 `std::unique_ptr`
```cpp
auto session = std::make_unique<Session>(userId);
cache[userId] = std::move(session);
```

[HIGH] 缺少 const 引用
文件：src/handler/user.cpp:28
问题：大对象按值传递
```cpp
void processUser(User user) {  // 不必要的拷贝
```
修复：按 const 引用传递
```cpp
void processUser(const User& user) {
```

## 汇总
- CRITICAL: 1
- HIGH: 1
- MEDIUM: 0

建议：FAIL：阻止合并，直至修复 CRITICAL issue
```

## 通过标准

| 状态 | 条件 |
|--------|-----------|
| PASS: Approve | 无 CRITICAL 或 HIGH issue |
| WARNING: Warning | 仅有 MEDIUM issue（谨慎合并） |
| FAIL: Block | 发现 CRITICAL 或 HIGH issue |

## 与其他命令的配合

- 先使用 `/cpp-test` 确保测试通过
- 出现 build 错误时使用 `/cpp-build`
- 提交前使用 `/cpp-review`
- 针对 C++ 专属之外的关注点使用 `/code-review`

## 相关资源

- Agent：`agents/cpp-reviewer.md`
- Skills：`skills/cpp-coding-standards/`、`skills/cpp-testing/`
