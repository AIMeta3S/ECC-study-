---
paths:
  - "**/*.cpp"
  - "**/*.hpp"
  - "**/*.cc"
  - "**/*.hh"
  - "**/*.cxx"
  - "**/*.h"
  - "**/CMakeLists.txt"
---
# C++ 安全

> 本文件在 [common/security.md](../common/security.md) 的基础上扩展了 C++ 特定内容。

## 内存安全

- 绝不使用裸 `new`/`delete` —— 使用 smart pointers
- 绝不使用 C 风格数组 —— 使用 `std::array` 或 `std::vector`
- 绝不使用 `malloc`/`free` —— 使用 C++ 的内存分配
- 除非绝对必要，否则避免使用 `reinterpret_cast`

## 缓冲区溢出

- 优先使用 `std::string` 而非 `char*`
- 当安全性至关重要时，使用 `.at()` 进行带边界检查的访问
- 绝不使用 `strcpy`、`strcat`、`sprintf` —— 使用 `std::string` 或 `fmt::format`

## 未定义行为

- 始终初始化变量
- 避免有符号整数溢出
- 绝不解引用空指针或悬垂指针
- 在 CI 中使用 sanitizers：
  ```bash
  cmake -DCMAKE_CXX_FLAGS="-fsanitize=address,undefined" ..
  ```

## 静态分析

- 使用 **clang-tidy** 进行自动化检查：
  ```bash
  clang-tidy --checks='*' src/*.cpp
  ```
- 使用 **cppcheck** 进行补充分析：
  ```bash
  cppcheck --enable=all src/
  ```

## 参考

详细的安全指南请参见 skill：`cpp-coding-standards`。
