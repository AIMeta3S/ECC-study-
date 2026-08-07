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
# C++ 模式

> 本文件扩展了 [common/patterns.md](../common/patterns.md)，增加了 C++ 特定内容。

## RAII (Resource Acquisition Is Initialization)

将资源的生命周期绑定到对象的生命周期：

```cpp
class FileHandle {
public:
    explicit FileHandle(const std::string& path) : file_(std::fopen(path.c_str(), "r")) {}
    ~FileHandle() { if (file_) std::fclose(file_); }
    FileHandle(const FileHandle&) = delete;
    FileHandle& operator=(const FileHandle&) = delete;
private:
    std::FILE* file_;
};
```

## Rule of Five/Zero

- **Rule of Zero**：优先使用不需要自定义析构函数、拷贝/移动构造函数或赋值运算符的类
- **Rule of Five**：如果定义了析构函数/拷贝构造/拷贝赋值/移动构造/移动赋值中的任意一个，就要全部定义这五个

## Value Semantics

- 按值传递小型/简单类型
- 通过 `const&` 传递大型类型
- 按值返回（依赖 RVO/NRVO）
- 对 sink parameter 使用 move semantics

## Error Handling

- 在异常情况下使用 exception
- 对可能不存在的值使用 `std::optional`
- 对预期内的失败使用 `std::expected`（C++23）或 result type

## Reference

参见 skill：`cpp-coding-standards`，了解全面的 C++ 模式与 anti-pattern。
