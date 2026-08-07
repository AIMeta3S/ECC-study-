---
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
---
# Go 测试

> 本文件在 [common/testing.md](../common/testing.md) 基础上扩展了 Go 特定内容。

## 框架

使用标准的 `go test` 配合 **table-driven tests**。

## 竞争检测

始终使用 `-race` flag 运行：

```bash
go test -race ./...
```

## 覆盖率

```bash
go test -cover ./...
```

## 参考

参见 skill：`golang-testing`，获取详细的 Go 测试模式与辅助函数。
