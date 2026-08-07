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
# C++ 测试

> 本文件在 [common/testing.md](../common/testing.md) 基础上扩展了 C++ 特定内容。

## 框架

使用 **GoogleTest**（gtest/gmock）与 **CMake/CTest**。

## 运行测试

```bash
cmake --build build && ctest --test-dir build --output-on-failure
```

## 覆盖率

```bash
cmake -DCMAKE_CXX_FLAGS="--coverage" -DCMAKE_EXE_LINKER_FLAGS="--coverage" ..
cmake --build .
ctest --output-on-failure
lcov --capture --directory . --output-file coverage.info
```

## Sanitizers

始终在 CI 中带 sanitizers 运行测试：

```bash
cmake -DCMAKE_CXX_FLAGS="-fsanitize=address,undefined" ..
```

## 参考

参见 skill：`cpp-testing`，了解详细的 C++ 测试模式、TDD 工作流以及 GoogleTest/GMock 用法。
