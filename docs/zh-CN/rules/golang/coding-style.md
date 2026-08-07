---
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
---
# Go 编码风格

> 本文件在 [common/coding-style.md](../common/coding-style.md) 基础上扩展了 Go 特定内容。

## 格式化

- **gofmt** 和 **goimports** 是强制使用的——没有风格争议

## 设计原则

- 接收 interfaces，返回 structs
- 保持 interfaces 精简（1-3 个 methods）

## 错误处理

始终为错误附加上下文：

```go
if err != nil {
    return fmt.Errorf("failed to create user: %w", err)
}
```

## 参考

参见 skill：`golang-patterns`，了解全面的 Go 惯用法与模式。
