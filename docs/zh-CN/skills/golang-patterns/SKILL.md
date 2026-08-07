---
name: golang-patterns
description: 地道的 Go 模式、最佳实践与约定，用于构建健壮、高效且可维护的 Go 应用程序。
metadata:
  origin: ECC
---

# Go 开发模式

地道的 Go 模式与最佳实践，用于构建健壮、高效且可维护的应用程序。

## 何时启用

- 编写新的 Go 代码
- 审查 Go 代码
- 重构现有 Go 代码
- 设计 Go package/module

## 核心原则

### 1. 简洁与清晰

Go 崇尚简洁而非取巧。代码应当直观且易于阅读。

```go
// 良好：清晰直接
func GetUser(id string) (*User, error) {
    user, err := db.FindUser(id)
    if err != nil {
        return nil, fmt.Errorf("get user %s: %w", id, err)
    }
    return user, nil
}

// 糟糕：过度取巧
func GetUser(id string) (*User, error) {
    return func() (*User, error) {
        if u, e := db.FindUser(id); e == nil {
            return u, nil
        } else {
            return nil, e
        }
    }()
}
```

### 2. 让 Zero Value 有用

设计类型时，让其 zero value 无需初始化即可直接使用。

```go
// 良好：zero value 有用
type Counter struct {
    mu    sync.Mutex
    count int // zero value 为 0，可直接使用
}

func (c *Counter) Inc() {
    c.mu.Lock()
    c.count++
    c.mu.Unlock()
}

// 良好：bytes.Buffer 在 zero value 下可用
var buf bytes.Buffer
buf.WriteString("hello")

// 糟糕：需要初始化
type BadCounter struct {
    counts map[string]int // nil map 会 panic
}
```

### 3. 接收 Interface，返回 Struct

函数应当接收 interface 参数并返回具体类型。

```go
// 良好：接收 interface，返回具体类型
func ProcessData(r io.Reader) (*Result, error) {
    data, err := io.ReadAll(r)
    if err != nil {
        return nil, err
    }
    return &Result{Data: data}, nil
}

// 糟糕：返回 interface（不必要地隐藏了实现细节）
func ProcessData(r io.Reader) (io.Reader, error) {
    // ...
}
```

## Error 处理模式

### 带上下文的 Error 包装

```go
// 良好：用上下文包装 error
func LoadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("load config %s: %w", path, err)
    }

    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("parse config %s: %w", path, err)
    }

    return &cfg, nil
}
```

### 自定义 Error 类型

```go
// 定义领域相关的 error
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}

// 常见场景的 sentinel error
var (
    ErrNotFound     = errors.New("resource not found")
    ErrUnauthorized = errors.New("unauthorized")
    ErrInvalidInput = errors.New("invalid input")
)
```

### 使用 errors.Is 和 errors.As 检查 Error

```go
func HandleError(err error) {
    // 检查特定 error
    if errors.Is(err, sql.ErrNoRows) {
        log.Println("No records found")
        return
    }

    // 检查 error 类型
    var validationErr *ValidationError
    if errors.As(err, &validationErr) {
        log.Printf("Validation error on field %s: %s",
            validationErr.Field, validationErr.Message)
        return
    }

    // 未知 error
    log.Printf("Unexpected error: %v", err)
}
```

### 永远不要忽略 Error

```go
// 糟糕：用 blank identifier 忽略 error
result, _ := doSomething()

// 良好：处理 error，或明确文档说明为何可安全忽略
result, err := doSomething()
if err != nil {
    return err
}

// 可接受：当 error 确实无关紧要时（罕见）
_ = writer.Close() // 尽力清理，error 在别处记录
```

## 并发模式

### Worker Pool

```go
func WorkerPool(jobs <-chan Job, results chan<- Result, numWorkers int) {
    var wg sync.WaitGroup

    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                results <- process(job)
            }
        }()
    }

    wg.Wait()
    close(results)
}
```

### 用于取消和超时的 Context

```go
func FetchWithTimeout(ctx context.Context, url string) ([]byte, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, fmt.Errorf("create request: %w", err)
    }

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("fetch %s: %w", url, err)
    }
    defer resp.Body.Close()

    return io.ReadAll(resp.Body)
}
```

### Graceful Shutdown

```go
func GracefulShutdown(server *http.Server) {
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

    <-quit
    log.Println("Shutting down server...")

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := server.Shutdown(ctx); err != nil {
        log.Fatalf("Server forced to shutdown: %v", err)
    }

    log.Println("Server exited")
}
```

### 用于协调 Goroutine 的 errgroup

```go
import "golang.org/x/sync/errgroup"

func FetchAll(ctx context.Context, urls []string) ([][]byte, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([][]byte, len(urls))

    for i, url := range urls {
        i, url := i, url // 捕获循环变量
        g.Go(func() error {
            data, err := FetchWithTimeout(ctx, url)
            if err != nil {
                return err
            }
            results[i] = data
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

### 避免 Goroutine 泄漏

```go
// 糟糕：context 取消时会发生 goroutine 泄漏
func leakyFetch(ctx context.Context, url string) <-chan []byte {
    ch := make(chan []byte)
    go func() {
        data, _ := fetch(url)
        ch <- data // 若无接收者将永久阻塞
    }()
    return ch
}

// 良好：正确处理取消
func safeFetch(ctx context.Context, url string) <-chan []byte {
    ch := make(chan []byte, 1) // 带缓冲的 channel
    go func() {
        data, err := fetch(url)
        if err != nil {
            return
        }
        select {
        case ch <- data:
        case <-ctx.Done():
        }
    }()
    return ch
}
```

## Interface 设计

### 小而聚焦的 Interface

```go
// 良好：单方法 interface
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type Closer interface {
    Close() error
}

// 按需组合 interface
type ReadWriteCloser interface {
    Reader
    Writer
    Closer
}
```

### 在使用处定义 Interface

```go
// 在消费方 package 中，而非提供方
package service

// UserStore 定义了此 service 所需
type UserStore interface {
    GetUser(id string) (*User, error)
    SaveUser(user *User) error
}

type Service struct {
    store UserStore
}

// 具体实现可以在另一个 package 中
// 它不需要知道此 interface 的存在
```

### 通过 Type Assertion 实现可选行为

```go
type Flusher interface {
    Flush() error
}

func WriteAndFlush(w io.Writer, data []byte) error {
    if _, err := w.Write(data); err != nil {
        return err
    }

    // 若支持则 Flush
    if f, ok := w.(Flusher); ok {
        return f.Flush()
    }
    return nil
}
```

## Package 组织

### 标准项目布局

```text
myproject/
├── cmd/
│   └── myapp/
│       └── main.go           # 入口
├── internal/
│   ├── handler/              # HTTP handler
│   ├── service/              # 业务逻辑
│   ├── repository/           # 数据访问
│   └── config/               # 配置
├── pkg/
│   └── client/               # 公共 API client
├── api/
│   └── v1/                   # API 定义（proto、OpenAPI）
├── testdata/                 # 测试 fixture
├── go.mod
├── go.sum
└── Makefile
```

### Package 命名

```go
// 良好：简短、小写、无下划线
package http
package json
package user

// 糟糕：冗长、大小写混用或冗余
package httpHandler
package json_parser
package userService // 冗余的 'Service' 后缀
```

### 避免 Package 级状态

```go
// 糟糕：全局可变状态
var db *sql.DB

func init() {
    db, _ = sql.Open("postgres", os.Getenv("DATABASE_URL"))
}

// 良好：Dependency Injection
type Server struct {
    db *sql.DB
}

func NewServer(db *sql.DB) *Server {
    return &Server{db: db}
}
```

## Struct 设计

### Functional Options 模式

```go
type Server struct {
    addr    string
    timeout time.Duration
    logger  *log.Logger
}

type Option func(*Server)

func WithTimeout(d time.Duration) Option {
    return func(s *Server) {
        s.timeout = d
    }
}

func WithLogger(l *log.Logger) Option {
    return func(s *Server) {
        s.logger = l
    }
}

func NewServer(addr string, opts ...Option) *Server {
    s := &Server{
        addr:    addr,
        timeout: 30 * time.Second, // 默认值
        logger:  log.Default(),    // 默认值
    }
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// 用法
server := NewServer(":8080",
    WithTimeout(60*time.Second),
    WithLogger(customLogger),
)
```

### 通过 Embedding 实现组合

```go
type Logger struct {
    prefix string
}

func (l *Logger) Log(msg string) {
    fmt.Printf("[%s] %s\n", l.prefix, msg)
}

type Server struct {
    *Logger // Embedding —— Server 获得 Log 方法
    addr    string
}

func NewServer(addr string) *Server {
    return &Server{
        Logger: &Logger{prefix: "SERVER"},
        addr:   addr,
    }
}

// 用法
s := NewServer(":8080")
s.Log("Starting...") // 调用内嵌的 Logger.Log
```

## 内存与性能

### 已知大小时预分配 Slice

```go
// 糟糕：slice 多次扩容
func processItems(items []Item) []Result {
    var results []Result
    for _, item := range items {
        results = append(results, process(item))
    }
    return results
}

// 良好：单次分配
func processItems(items []Item) []Result {
    results := make([]Result, 0, len(items))
    for _, item := range items {
        results = append(results, process(item))
    }
    return results
}
```

### 对频繁分配使用 sync.Pool

```go
var bufferPool = sync.Pool{
    New: func() interface{} {
        return new(bytes.Buffer)
    },
}

func ProcessRequest(data []byte) []byte {
    buf := bufferPool.Get().(*bytes.Buffer)
    defer func() {
        buf.Reset()
        bufferPool.Put(buf)
    }()

    buf.Write(data)
    // 处理...
    return buf.Bytes()
}
```

### 避免在循环中拼接字符串

```go
// 糟糕：产生多次字符串分配
func join(parts []string) string {
    var result string
    for _, p := range parts {
        result += p + ","
    }
    return result
}

// 良好：用 strings.Builder 单次分配
func join(parts []string) string {
    var sb strings.Builder
    for i, p := range parts {
        if i > 0 {
            sb.WriteString(",")
        }
        sb.WriteString(p)
    }
    return sb.String()
}

// 最佳：使用标准库
func join(parts []string) string {
    return strings.Join(parts, ",")
}
```

## Go 工具链集成

### 常用命令

```bash
# 构建并运行
go build ./...
go run ./cmd/myapp

# 测试
go test ./...
go test -race ./...
go test -cover ./...

# 静态分析
go vet ./...
staticcheck ./...
golangci-lint run

# Module 管理
go mod tidy
go mod verify

# 格式化
gofmt -w .
goimports -w .
```

### 推荐的 Linter 配置（.golangci.yml）

```yaml
linters:
  enable:
    - errcheck
    - gosimple
    - govet
    - ineffassign
    - staticcheck
    - unused
    - gofmt
    - goimports
    - misspell
    - unconvert
    - unparam

linters-settings:
  errcheck:
    check-type-assertions: true
  govet:
    enable:
      - shadow

issues:
  exclude-use-default: false
```

## 快速参考：Go 惯用法

| 惯用法 | 描述 |
|-------|-------------|
| Accept interfaces, return structs | 函数接收 interface 参数，返回具体类型 |
| Errors are values | 把 error 当作一等值对待，而非异常 |
| Don't communicate by sharing memory | 用 channel 在 goroutine 之间协调 |
| Make the zero value useful | 类型无需显式初始化即可工作 |
| A little copying is better than a little dependency | 避免不必要的外部依赖 |
| Clear is better than clever | 优先考虑可读性而非取巧 |
| gofmt is no one's favorite but everyone's friend | 始终用 gofmt/goimports 格式化 |
| Return early | 先处理 error，保持 happy path 不缩进 |

## 要避免的 Anti-Pattern

```go
// 糟糕：在长函数中使用 naked return
func process() (result int, err error) {
    // ... 50 行 ...
    return // 返回的是什么？
}

// 糟糕：用 panic 做控制流
func GetUser(id string) *User {
    user, err := db.Find(id)
    if err != nil {
        panic(err) // 不要这样做
    }
    return user
}

// 糟糕：在 struct 中传递 context
type Request struct {
    ctx context.Context // context 应当作为首个参数
    ID  string
}

// 良好：context 作为首个参数
func ProcessRequest(ctx context.Context, id string) error {
    // ...
}

// 糟糕：混用 value receiver 和 pointer receiver
type Counter struct{ n int }
func (c Counter) Value() int { return c.n }    // value receiver
func (c *Counter) Increment() { c.n++ }        // pointer receiver
// 选择一种风格并保持一致
```

**记住**：Go 代码应当以最好的方式显得乏味——可预测、一致且易于理解。拿不准时，保持简单。
