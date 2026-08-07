---
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
---
# Go 模式

> 本文件在 [common/patterns.md](../common/patterns.md) 的基础上扩展了 Go 特定内容。

## Functional Options

```go
type Option func(*Server)

func WithPort(port int) Option {
    return func(s *Server) { s.port = port }
}

func NewServer(opts ...Option) *Server {
    s := &Server{port: 8080}
    for _, opt := range opts {
        opt(s)
    }
    return s
}
```

## Small Interfaces

在接口使用处定义接口，而非在实现处定义。

## Dependency Injection

使用构造函数注入依赖：

```go
func NewUserService(repo UserRepository, logger Logger) *UserService {
    return &UserService{repo: repo, logger: logger}
}
```

## 参考

参见 skill：`golang-patterns`，了解涵盖并发、错误处理和包组织的完整 Go 模式。
