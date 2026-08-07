---
description: 增量修复 C++ build 错误、CMake 问题和 linker 问题。调用 cpp-build-resolver agent 执行最小化的精准修复。
---

# C++ Build 修复

此命令调用 **cpp-build-resolver** agent，以最小改动增量修复 C++ build 错误。

## 此命令的功能

1. **运行诊断**：执行 `cmake --build`、`clang-tidy`、`cppcheck`
2. **解析错误**：按文件分组并按严重程度排序
3. **增量修复**：一次修复一个错误
4. **验证每个修复**：每次改动后重新运行 build
5. **汇报总结**：展示已修复的内容和剩余 issue

## 何时使用

在以下情况使用 `/cpp-build`：
- `cmake --build build` 失败并报错
- linker 错误（undefined references、multiple definitions）
- 模板实例化失败
- Include/依赖问题
- 拉取改动后破坏了 build

## 运行的诊断命令

```bash
# CMake 配置
cmake -B build -S .

# 构建
cmake --build build 2>&1 | head -100

# 静态分析（如果可用）
clang-tidy src/*.cpp -- -std=c++17
cppcheck --enable=all src/
```

## 示例会话

```text
User: /cpp-build

Agent:
# C++ Build 修复

## 初始诊断

```bash
$ cmake --build build
src/service/user.cpp:25:15: error: use of undeclared identifier 'UserRepository'
src/handler/api.cpp:42:9: error: no matching function for call to 'process'
src/handler/api.cpp:58:1: error: non-void function does not return a value
```

发现错误：3

## 修复 1：未声明的标识符

文件：src/service/user.cpp:25
错误：use of undeclared identifier 'UserRepository'
原因：缺少 include

```cpp
// 添加了 include
#include "repository/user_repository.hpp"
```

```bash
$ cmake --build build
# 剩余 2 个错误
```

## 修复 2：无匹配函数

文件：src/handler/api.cpp:42
错误：no matching function for call to 'process'

```cpp
// 将
process(params.get("count"));
// 改为
process(std::stoi(params.get("count")));
```

```bash
$ cmake --build build
# 剩余 1 个错误
```

## 修复 3：缺少返回值

文件：src/handler/api.cpp:58
错误：non-void function does not return a value

```cpp
std::optional<User> getUser(const std::string& id) {
    if (id.empty()) {
        return std::nullopt;
    }
    auto user = findUser(id);
    // 添加了缺少的 return
    return user;
}
```

```bash
$ cmake --build build
# 构建成功！
```

## 最终验证

```bash
$ ctest --test-dir build --output-on-failure
Test project build
    1/5 Test #1: unit_tests ........   Passed    0.02 sec
    2/5 Test #2: integration_tests    Passed    0.15 sec
All tests passed.
```

## 汇总

| 指标 | 数量 |
|--------|-------|
| 已修复的 build 错误 | 3 |
| 已修复的 linker 错误 | 0 |
| 修改的文件 | 2 |
| 剩余 issue | 0 |

Build 状态：PASS: SUCCESS
```

## 常见错误修复

| 错误 | 典型修复 |
|-------|-------------|
| `undeclared identifier` | 添加 `#include` 或修正拼写 |
| `no matching function` | 修正参数类型或添加重载 |
| `undefined reference` | 链接库或添加实现 |
| `multiple definition` | 使用 `inline` 或移至 .cpp |
| `incomplete type` | 用 `#include` 替换前向声明 |
| `no member named X` | 修正成员名或 include |
| `cannot convert X to Y` | 添加合适的 cast |
| `CMake Error` | 修正 CMakeLists.txt 配置 |

## 修复策略

1. **编译错误优先** - 代码必须能编译
2. **linker 错误其次** - 解决 undefined references
3. **警告第三** - 用 `-Wall -Wextra` 修复
4. **逐个修复** - 验证每次改动
5. **最小改动** - 不 refactor，只修复

## 停止条件

agent 将在以下情况下停止并汇报：
- 同一错误在 3 次尝试后仍然存在
- 修复引入了更多错误
- 需要架构层面的改动
- 缺少外部依赖

## 相关命令

- `/cpp-test` - build 成功后运行测试
- `/cpp-review` - 审查代码质量
- `verification-loop` skill - 完整的验证循环

## 相关

- Agent：`agents/cpp-build-resolver.md`
- Skill：`skills/cpp-coding-standards/`
