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
# C++ Hooks

> 本文件在 [common/hooks.md](../common/hooks.md) 基础上扩展了 C++ 特定内容。

## 构建 Hooks

在提交 C++ 改动前运行以下检查：

```bash
# 格式检查
clang-format --dry-run --Werror src/*.cpp src/*.hpp

# 静态分析
clang-tidy src/*.cpp -- -std=c++17

# 构建
cmake --build build

# 测试
ctest --test-dir build --output-on-failure
```

## 推荐的 CI Pipeline

1. **clang-format** — 格式检查
2. **clang-tidy** — 静态分析
3. **cppcheck** — 额外分析
4. **cmake build** — 编译
5. **ctest** — 带 sanitizers 的测试执行
