---
name: cpp-coding-standards
description: 基于 C++ Core Guidelines (isocpp.github.io) 的 C++ 编码规范。在编写、审查或重构 C++ 代码时使用，以推行现代化、安全且符合惯用法的实践。
metadata:
  origin: ECC
---

# C++ 编码规范（C++ Core Guidelines）

面向现代 C++（C++17/20/23）的完整编码规范，源自 [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)。强制推行类型安全、资源安全、不可变性与清晰性。

## 何时使用

- 编写新的 C++ 代码（类、函数、模板）
- 审查或重构现有 C++ 代码
- 在 C++ 项目中做出架构决策
- 在整个 C++ 代码库中贯彻一致的风格
- 在语言特性之间做选择（例如 `enum` 与 `enum class`、裸指针与智能指针）

### 何时不适用

- 非 C++ 项目
- 无法采用现代 C++ 特性的遗留 C 代码库
- 嵌入式/裸机环境，其中特定准则与硬件约束相冲突（需有选择地取舍）

## 贯穿性原则

这些主题贯穿整套准则，并构成其基础：

1. **RAII 无处不在**（P.8、R.1、E.6、CP.20）：将资源生命周期绑定到对象生命周期
2. **默认不可变**（P.10、Con.1-5、ES.25）：以 `const`/`constexpr` 起步；可变性是例外
3. **类型安全**（P.4、I.4、ES.46-49、Enum.3）：利用类型系统在编译期阻止错误
4. **表达意图**（P.3、F.1、NL.1-2、T.10）：名称、类型与 concepts 应传达用途
5. **最小化复杂度**（F.2-3、ES.5、Per.4-5）：简单的代码就是正确的代码
6. **值语义优于指针语义**（C.10、R.3-5、F.20、CP.31）：优先使用按值返回与作用域对象

## 哲学与接口（P.*、I.*）

### 关键规则

| 规则 | 摘要 |
|------|---------|
| **P.1** | 直接用代码表达想法 |
| **P.3** | 表达意图 |
| **P.4** | 理想情况下，程序应当是静态类型安全的 |
| **P.5** | 优先使用编译期检查而非运行期检查 |
| **P.8** | 不泄漏任何资源 |
| **P.10** | 优先使用不可变数据而非可变数据 |
| **I.1** | 让接口显式化 |
| **I.2** | 避免使用非 const 全局变量 |
| **I.4** | 让接口精确且强类型化 |
| **I.11** | 绝不通过裸指针或引用转移所有权 |
| **I.23** | 保持函数参数数量较少 |

### 推荐

```cpp
// P.10 + I.4：不可变、强类型的接口
struct Temperature {
    double kelvin;
};

Temperature boil(const Temperature& water);
```

### 不推荐

```cpp
// 薄弱的接口：所有权不明、单位不明
double boil(double* temp);

// 非 const 全局变量
int g_counter = 0;  // I.2 违例
```

## 函数（F.*）

### 关键规则

| 规则 | 摘要 |
|------|---------|
| **F.1** | 将有意义的操作封装为精心命名的函数 |
| **F.2** | 一个函数应只执行单一逻辑操作 |
| **F.3** | 保持函数短小简洁 |
| **F.4** | 若函数可能在编译期求值，将其声明为 `constexpr` |
| **F.6** | 若函数绝不能抛出异常，将其声明为 `noexcept` |
| **F.8** | 优先使用纯函数 |
| **F.16** | 对于"in"参数，廉价拷贝类型按值传递，其余按 `const&` 传递 |
| **F.20** | 对于"out"值，优先使用返回值而非输出参数 |
| **F.21** | 返回多个"out"值时，优先返回 struct |
| **F.43** | 绝不返回指向局部对象的指针或引用 |

### 参数传递

```cpp
// F.16：廉价类型按值传递，其余按 const&
void print(int x);                           // 廉价：按值
void analyze(const std::string& data);       // 昂贵：按 const&
void transform(std::string s);               // sink：按值（将 move）

// F.20 + F.21：使用返回值，而非输出参数
struct ParseResult {
    std::string token;
    int position;
};

ParseResult parse(std::string_view input);   // 好：返回 struct

// 坏：输出参数
void parse(std::string_view input,
           std::string& token, int& pos);    // 避免这样做
```

### 纯函数与 constexpr

```cpp
// F.4 + F.8：在可能之处使用纯函数与 constexpr
constexpr int factorial(int n) noexcept {
    return (n <= 1) ? 1 : n * factorial(n - 1);
}

static_assert(factorial(5) == 120);
```

### 反模式

- 从函数返回 `T&&`（F.45）
- 使用 `va_arg` / C 风格的可变参数（F.55）
- 在传递给其他线程的 lambda 中以引用方式捕获（F.53）
- 返回 `const T`，从而阻碍 move 语义（F.49）

## 类与类层次结构（C.*）

### 关键规则

| 规则 | 摘要 |
|------|---------|
| **C.2** | 若存在不变式则使用 `class`；若数据成员各自独立变化则使用 `struct` |
| **C.9** | 最小化成员的暴露 |
| **C.20** | 若能避免定义默认操作，就避免（Rule of Zero） |
| **C.21** | 若定义或 `=delete` 任何一个 copy/move/destructor，就要全部处理（Rule of Five） |
| **C.35** | 基类的析构函数：public virtual 或 protected non-virtual |
| **C.41** | 构造函数应创建一个完全初始化的对象 |
| **C.46** | 将单参数构造函数声明为 `explicit` |
| **C.67** | 多态类应禁止 public 的 copy/move |
| **C.128** | 虚函数：在 `virtual`、`override`、`final` 中精确指定一个 |

### Rule of Zero

```cpp
// C.20：让编译器生成特殊成员
struct Employee {
    std::string name;
    std::string department;
    int id;
    // 无需析构函数、copy/move 构造函数或赋值运算符
};
```

### Rule of Five

```cpp
// C.21：若必须管理资源，则定义全部五个
class Buffer {
public:
    explicit Buffer(std::size_t size)
        : data_(std::make_unique<char[]>(size)), size_(size) {}

    ~Buffer() = default;

    Buffer(const Buffer& other)
        : data_(std::make_unique<char[]>(other.size_)), size_(other.size_) {
        std::copy_n(other.data_.get(), size_, data_.get());
    }

    Buffer& operator=(const Buffer& other) {
        if (this != &other) {
            auto new_data = std::make_unique<char[]>(other.size_);
            std::copy_n(other.data_.get(), other.size_, new_data.get());
            data_ = std::move(new_data);
            size_ = other.size_;
        }
        return *this;
    }

    Buffer(Buffer&&) noexcept = default;
    Buffer& operator=(Buffer&&) noexcept = default;

private:
    std::unique_ptr<char[]> data_;
    std::size_t size_;
};
```

### 类层次结构

```cpp
// C.35 + C.128：虚析构函数，使用 override
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;  // C.121：纯接口
};

class Circle : public Shape {
public:
    explicit Circle(double r) : radius_(r) {}
    double area() const override { return 3.14159 * radius_ * radius_; }

private:
    double radius_;
};
```

### 反模式

- 在构造函数/析构函数中调用虚函数（C.82）
- 对 non-trivial 类型使用 `memset`/`memcpy`（C.90）
- 为虚函数与其覆写函数提供不同的默认参数（C.140）
- 将数据成员设为 `const` 或引用，从而禁止 move/copy（C.12）

## 资源管理（R.*）

### 关键规则

| 规则 | 摘要 |
|------|---------|
| **R.1** | 使用 RAII 自动管理资源 |
| **R.3** | 裸指针（`T*`）是非拥有的 |
| **R.5** | 优先使用作用域对象；不要不必要地在堆上分配 |
| **R.10** | 避免 `malloc()`/`free()` |
| **R.11** | 避免显式调用 `new` 与 `delete` |
| **R.20** | 使用 `unique_ptr` 或 `shared_ptr` 表示所有权 |
| **R.21** | 除非共享所有权，否则优先使用 `unique_ptr` 而非 `shared_ptr` |
| **R.22** | 使用 `make_shared()` 创建 `shared_ptr` |

### 智能指针的使用

```cpp
// R.11 + R.20 + R.21：用智能指针实现 RAII
auto widget = std::make_unique<Widget>("config");  // 独占所有权
auto cache  = std::make_shared<Cache>(1024);        // 共享所有权

// R.3：裸指针 = 非拥有的观察者
void render(const Widget* w) {  // 不拥有 w
    if (w) w->draw();
}

render(widget.get());
```

### RAII 模式

```cpp
// R.1：资源获取即初始化
class FileHandle {
public:
    explicit FileHandle(const std::string& path)
        : handle_(std::fopen(path.c_str(), "r")) {
        if (!handle_) throw std::runtime_error("Failed to open: " + path);
    }

    ~FileHandle() {
        if (handle_) std::fclose(handle_);
    }

    FileHandle(const FileHandle&) = delete;
    FileHandle& operator=(const FileHandle&) = delete;
    FileHandle(FileHandle&& other) noexcept
        : handle_(std::exchange(other.handle_, nullptr)) {}
    FileHandle& operator=(FileHandle&& other) noexcept {
        if (this != &other) {
            if (handle_) std::fclose(handle_);
            handle_ = std::exchange(other.handle_, nullptr);
        }
        return *this;
    }

private:
    std::FILE* handle_;
};
```

### 反模式

- 裸露的 `new`/`delete`（R.11）
- 在 C++ 代码中使用 `malloc()`/`free()`（R.10）
- 在单个表达式中进行多次资源分配（R.13——异常安全隐患）
- 在 `unique_ptr` 足够时使用 `shared_ptr`（R.21）

## 表达式与语句（ES.*）

### 关键规则

| 规则 | 摘要 |
|------|---------|
| **ES.5** | 保持作用域小 |
| **ES.20** | 始终初始化对象 |
| **ES.23** | 优先使用 `{}` 初始化语法 |
| **ES.25** | 除非打算修改，否则将对象声明为 `const` 或 `constexpr` |
| **ES.28** | 对 `const` 变量的复杂初始化使用 lambda |
| **ES.45** | 避免魔法常量；使用具名常量 |
| **ES.46** | 避免窄化/有损的算术转换 |
| **ES.47** | 使用 `nullptr` 而非 `0` 或 `NULL` |
| **ES.48** | 避免类型转换 |
| **ES.50** | 不要 cast 掉 `const` |

### 初始化

```cpp
// ES.20 + ES.23 + ES.25：始终初始化，优先使用 {}，默认为 const
const int max_retries{3};
const std::string name{"widget"};
const std::vector<int> primes{2, 3, 5, 7, 11};

// ES.28：用 lambda 完成复杂的 const 初始化
const auto config = [&] {
    Config c;
    c.timeout = std::chrono::seconds{30};
    c.retries = max_retries;
    c.verbose = debug_mode;
    return c;
}();
```

### 反模式

- 未初始化的变量（ES.20）
- 将 `0` 或 `NULL` 用作指针（ES.47——应使用 `nullptr`）
- C 风格的类型转换（ES.48——应使用 `static_cast`、`const_cast` 等）
- cast 掉 `const`（ES.50）
- 没有具名常量的魔法数字（ES.45）
- 混用有符号与无符号算术（ES.100）
- 在嵌套作用域中重用名字（ES.12）

## 错误处理（E.*）

### 关键规则

| 规则 | 摘要 |
|------|---------|
| **E.1** | 在设计的早期就制定错误处理策略 |
| **E.2** | 抛出异常以表明函数无法完成其被指派的任务 |
| **E.6** | 使用 RAII 防止泄漏 |
| **E.12** | 当不可能或不可接受抛出异常时使用 `noexcept` |
| **E.14** | 使用专门设计的用户自定义类型作为异常 |
| **E.15** | 按值抛出，按引用捕获 |
| **E.16** | 析构函数、deallocation 和 swap 绝不能失败 |
| **E.17** | 不要试图在每个函数中捕获每一个异常 |

### 异常层次结构

```cpp
// E.14 + E.15：自定义异常类型，按值抛出，按引用捕获
class AppError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};

class NetworkError : public AppError {
public:
    NetworkError(const std::string& msg, int code)
        : AppError(msg), status_code(code) {}
    int status_code;
};

void fetch_data(const std::string& url) {
    // E.2：抛出异常以表明失败
    throw NetworkError("connection refused", 503);
}

void run() {
    try {
        fetch_data("https://api.example.com");
    } catch (const NetworkError& e) {
        log_error(e.what(), e.status_code);
    } catch (const AppError& e) {
        log_error(e.what());
    }
    // E.17：不要在此捕获一切——让意外错误向上传播
}
```

### 反模式

- 抛出 `int` 或字符串字面量等内建类型（E.14）
- 按值捕获（有对象切片风险）（E.15）
- 用空的 catch 块静默吞掉错误
- 使用异常进行流程控制（E.3）
- 基于诸如 `errno` 之类的全局状态进行错误处理（E.28）

## 常量与不可变性（Con.*）

### 全部规则

| 规则 | 摘要 |
|------|---------|
| **Con.1** | 默认使对象不可变 |
| **Con.2** | 默认将成员函数设为 `const` |
| **Con.3** | 默认传递指向 `const` 的指针和引用 |
| **Con.4** | 对构造后不再变化的值使用 `const` |
| **Con.5** | 对可在编译期计算的值使用 `constexpr` |

```cpp
// Con.1 至 Con.5：默认不可变
class Sensor {
public:
    explicit Sensor(std::string id) : id_(std::move(id)) {}

    // Con.2：默认使用 const 成员函数
    const std::string& id() const { return id_; }
    double last_reading() const { return reading_; }

    // 仅在需要修改时才使用非 const
    void record(double value) { reading_ = value; }

private:
    const std::string id_;  // Con.4：构造后永不改变
    double reading_{0.0};
};

// Con.3：按 const 引用传递
void display(const Sensor& s) {
    std::cout << s.id() << ": " << s.last_reading() << '\n';
}

// Con.5：编译期常量
constexpr double PI = 3.14159265358979;
constexpr int MAX_SENSORS = 256;
```

## 并发与并行（CP.*）

### 关键规则

| 规则 | 摘要 |
|------|---------|
| **CP.2** | 避免 data race |
| **CP.3** | 最小化可写数据的显式共享 |
| **CP.4** | 以任务而非线程的角度思考 |
| **CP.8** | 不要将 `volatile` 用于同步 |
| **CP.20** | 使用 RAII，绝不使用裸的 `lock()`/`unlock()` |
| **CP.21** | 使用 `std::scoped_lock` 获取多个 mutex |
| **CP.22** | 持有锁时绝不调用未知代码 |
| **CP.42** | 不要无条件地等待 |
| **CP.44** | 记得为你的 `lock_guard` 和 `unique_lock` 命名 |
| **CP.100** | 除非万不得已，不要使用 lock-free 编程 |

### 安全加锁

```cpp
// CP.20 + CP.44：RAII 锁，始终命名
class ThreadSafeQueue {
public:
    void push(int value) {
        std::lock_guard<std::mutex> lock(mutex_);  // CP.44：已命名！
        queue_.push(value);
        cv_.notify_one();
    }

    int pop() {
        std::unique_lock<std::mutex> lock(mutex_);
        // CP.42：始终带条件等待
        cv_.wait(lock, [this] { return !queue_.empty(); });
        const int value = queue_.front();
        queue_.pop();
        return value;
    }

private:
    std::mutex mutex_;             // CP.50：mutex 与其数据放在一起
    std::condition_variable cv_;
    std::queue<int> queue_;
};
```

### 多个 mutex

```cpp
// CP.21：用 std::scoped_lock 处理多个 mutex（无死锁）
void transfer(Account& from, Account& to, double amount) {
    std::scoped_lock lock(from.mutex_, to.mutex_);
    from.balance_ -= amount;
    to.balance_ += amount;
}
```

### 反模式

- 将 `volatile` 用于同步（CP.8——它仅用于硬件 I/O）
- detach 线程（CP.26——生命周期管理几乎无法实现）
- 未命名的 lock guard：`std::lock_guard<std::mutex>(m);` 会立即销毁（CP.44）
- 在调用回调时持有锁（CP.22——有死锁风险）
- 在没有深厚经验的情况下进行 lock-free 编程（CP.100）

## 模板与泛型编程（T.*）

### 关键规则

| 规则 | 摘要 |
|------|---------|
| **T.1** | 使用模板提升抽象层次 |
| **T.2** | 使用模板为多种参数类型表达算法 |
| **T.10** | 为所有模板参数指定 concepts |
| **T.11** | 尽可能使用标准 concepts |
| **T.13** | 对简单的 concepts 优先使用简写语法 |
| **T.43** | 优先使用 `using` 而非 `typedef` |
| **T.120** | 仅在真正需要时才使用模板元编程 |
| **T.144** | 不要特化函数模板（应改用重载） |

### Concepts（C++20）

```cpp
#include <concepts>

// T.10 + T.11：用标准 concepts 约束模板
template<std::integral T>
T gcd(T a, T b) {
    while (b != 0) {
        a = std::exchange(b, a % b);
    }
    return a;
}

// T.13：简写 concept 语法
void sort(std::ranges::random_access_range auto& range) {
    std::ranges::sort(range);
}

// 用于领域专属约束的自定义 concept
template<typename T>
concept Serializable = requires(const T& t) {
    { t.serialize() } -> std::convertible_to<std::string>;
};

template<Serializable T>
void save(const T& obj, const std::string& path);
```

### 反模式

- 可见命名空间中的无约束模板（T.47）
- 特化函数模板而非重载（T.144）
- 在 `constexpr` 足够时使用模板元编程（T.120）
- 使用 `typedef` 而非 `using`（T.43）

## 标准库（SL.*）

### 关键规则

| 规则 | 摘要 |
|------|---------|
| **SL.1** | 尽可能使用库 |
| **SL.2** | 优先使用标准库而非其他库 |
| **SL.con.1** | 优先使用 `std::array` 或 `std::vector` 而非 C 数组 |
| **SL.con.2** | 默认优先使用 `std::vector` |
| **SL.str.1** | 使用 `std::string` 拥有字符序列 |
| **SL.str.2** | 使用 `std::string_view` 引用字符序列 |
| **SL.io.50** | 避免 `endl`（改用 `'\n'`——`endl` 会强制刷新） |

```cpp
// SL.con.1 + SL.con.2：优先使用 vector/array 而非 C 数组
const std::array<int, 4> fixed_data{1, 2, 3, 4};
std::vector<std::string> dynamic_data;

// SL.str.1 + SL.str.2：string 拥有，string_view 观察
std::string build_greeting(std::string_view name) {
    return "Hello, " + std::string(name) + "!";
}

// SL.io.50：使用 '\n' 而非 endl
std::cout << "result: " << value << '\n';
```

## 枚举（Enum.*）

### 关键规则

| 规则 | 摘要 |
|------|---------|
| **Enum.1** | 优先使用枚举而非宏 |
| **Enum.3** | 优先使用 `enum class` 而非普通 `enum` |
| **Enum.5** | 不要对枚举值使用 ALL_CAPS |
| **Enum.6** | 避免使用匿名枚举 |

```cpp
// Enum.3 + Enum.5：限定作用域的 enum，不使用 ALL_CAPS
enum class Color { red, green, blue };
enum class LogLevel { debug, info, warning, error };

// 坏：普通 enum 污染名字空间，ALL_CAPS 与宏冲突
enum { RED, GREEN, BLUE };           // 违反 Enum.3 + Enum.5 + Enum.6
#define MAX_SIZE 100                  // 违反 Enum.1——应使用 constexpr
```

## 源文件与命名（SF.*、NL.*）

### 关键规则

| 规则 | 摘要 |
|------|---------|
| **SF.1** | 代码文件使用 `.cpp`，接口文件使用 `.h` |
| **SF.7** | 不要在头文件的全局作用域中写 `using namespace` |
| **SF.8** | 对所有 `.h` 文件使用 `#include` 保护符 |
| **SF.11** | 头文件应当自包含 |
| **NL.5** | 避免在名称中编码类型信息（不使用 Hungarian notation） |
| **NL.8** | 使用一致的命名风格 |
| **NL.9** | 仅对宏名使用 ALL_CAPS |
| **NL.10** | 优先使用 `underscore_style` 命名 |

### 头文件保护符

```cpp
// SF.8：include 保护符（或 #pragma once）
#ifndef PROJECT_MODULE_WIDGET_H
#define PROJECT_MODULE_WIDGET_H

// SF.11：自包含——包含此头文件所需的一切
#include <string>
#include <vector>

namespace project::module {

class Widget {
public:
    explicit Widget(std::string name);
    const std::string& name() const;

private:
    std::string name_;
};

}  // namespace project::module

#endif  // PROJECT_MODULE_WIDGET_H
```

### 命名约定

```cpp
// NL.8 + NL.10：一致的 underscore_style
namespace my_project {

constexpr int max_buffer_size = 4096;  // NL.9：不使用 ALL_CAPS（它不是宏）

class tcp_connection {                 // underscore_style 的类
public:
    void send_message(std::string_view msg);
    bool is_connected() const;

private:
    std::string host_;                 // 成员以尾随下划线标记
    int port_;
};

}  // namespace my_project
```

### 反模式

- 在头文件全局作用域中写 `using namespace std;`（SF.7）
- 依赖包含顺序的头文件（SF.10、SF.11）
- 诸如 `strName`、`iCount` 的 Hungarian notation（NL.5）
- 对宏以外的任何东西使用 ALL_CAPS（NL.9）

## 性能（Per.*）

### 关键规则

| 规则 | 摘要 |
|------|---------|
| **Per.1** | 不要毫无理由地优化 |
| **Per.2** | 不要过早优化 |
| **Per.6** | 没有测量数据就不要对性能下结论 |
| **Per.7** | 设计要便于优化 |
| **Per.10** | 依赖静态类型系统 |
| **Per.11** | 将计算从运行期移至编译期 |
| **Per.19** | 可预测地访问内存 |

### 指南

```cpp
// Per.11：尽可能在编译期计算
constexpr auto lookup_table = [] {
    std::array<int, 256> table{};
    for (int i = 0; i < 256; ++i) {
        table[i] = i * i;
    }
    return table;
}();

// Per.19：为兼顾缓存友好性，优先使用连续数据
std::vector<Point> points;           // 好：连续
std::vector<std::unique_ptr<Point>> indirect_points; // 坏：指针追逐
```

### 反模式

- 没有 profiling 数据就进行优化（Per.1、Per.6）
- 选择"巧妙"的底层代码而非清晰的抽象（Per.4、Per.5）
- 忽略数据布局与缓存行为（Per.19）

## 快速参考清单

在将 C++ 工作标记为完成之前：

- [ ] 没有裸的 `new`/`delete`——使用智能指针或 RAII（R.11）
- [ ] 对象在声明处初始化（ES.20）
- [ ] 变量默认为 `const`/`constexpr`（Con.1、ES.25）
- [ ] 成员函数在可能之处均为 `const`（Con.2）
- [ ] 使用 `enum class` 而非普通 `enum`（Enum.3）
- [ ] 使用 `nullptr` 而非 `0`/`NULL`（ES.47）
- [ ] 没有窄化转换（ES.46）
- [ ] 没有 C 风格的类型转换（ES.48）
- [ ] 单参数构造函数为 `explicit`（C.46）
- [ ] 已应用 Rule of Zero 或 Rule of Five（C.20、C.21）
- [ ] 基类析构函数为 public virtual 或 protected non-virtual（C.35）
- [ ] 模板已用 concepts 约束（T.10）
- [ ] 头文件全局作用域中没有 `using namespace`（SF.7）
- [ ] 头文件具有 include 保护符且自包含（SF.8、SF.11）
- [ ] 锁使用 RAII（`scoped_lock`/`lock_guard`）（CP.20）
- [ ] 异常为自定义类型，按值抛出，按引用捕获（E.14、E.15）
- [ ] 使用 `'\n'` 而非 `std::endl`（SL.io.50）
- [ ] 没有魔法数字（ES.45）
