---
description: 全面的 Go 代码审查，涵盖 idiomatic patterns、并发安全、错误处理与安全。调用 go-reviewer agent。
---

# Go 代码审查

此命令调用 **go-reviewer** agent 进行全面的 Go 专项代码审查。

## 此命令做什么

1. **识别 Go 变更**：通过 `git diff` 查找修改的 `.go` 文件
2. **运行静态分析**：执行 `go vet`、`staticcheck` 和 `golangci-lint`
3. **安全扫描**：检查 SQL injection、command injection、race condition
4. **并发审查**：分析 goroutine 安全性、channel 用法、mutex 模式
5. **idiomatic Go 检查**：验证代码遵循 Go 惯例与最佳实践
6. **生成报告**：按 severity 分类 issue

## 何时使用

在以下情况下使用 `/go-review`：
- 编写或修改 Go 代码之后
- 提交 Go 变更之前
- 审查包含 Go 代码的 pull request
- 接手新的 Go 代码库时
- 学习 idiomatic Go 模式时

## 审查类别

### CRITICAL（必须修复）
- SQL/Command injection 漏洞
- 缺少同步的 race condition
- goroutine 泄漏
- 硬编码 credentials
- unsafe pointer 使用
- 关键路径上被忽略的 error

### HIGH（应当修复）
- 缺少带 context 的 error wrapping
- 使用 panic 而非 error 返回
- context 未传递
- 无缓冲 channel 导致 deadlock
- interface 未满足的 error
- 缺少 mutex 保护

### MEDIUM（可考虑）
- 非 idiomatic 的代码模式
- 导出项缺少 godoc 注释
- 低效的 string 拼接
- slice 未预分配
- 未使用 table-driven test

## 自动执行的检查

```bash
# 静态分析
go vet ./...

# 高级检查（如已安装）
staticcheck ./...
golangci-lint run

# race 检测
go build -race ./...

# 安全漏洞
govulncheck ./...
```

## 示例用法

```text
User: /go-review

Agent:
# Go 代码审查报告

## 审查文件
- internal/handler/user.go（已修改）
- internal/service/auth.go（已修改）

## 静态分析结果
✓ go vet：无 issue
✓ staticcheck：无 issue

## 发现的 issue

[CRITICAL] Race Condition
文件：internal/service/auth.go:45
问题：共享 map 未同步访问
```go
var cache = map[string]*Session{}  // 并发访问！

func GetSession(id string) *Session {
    return cache[id]  // race condition
}
```
修复：使用 sync.RWMutex 或 sync.Map
```go
var (
    cache   = map[string]*Session{}
    cacheMu sync.RWMutex
)

func GetSession(id string) *Session {
    cacheMu.RLock()
    defer cacheMu.RUnlock()
    return cache[id]
}
```

[HIGH] 缺少 Error Context
文件：internal/handler/user.go:28
问题：返回的 error 缺少 context
```go
return err  // 无 context
```
修复：用 context 包装
```go
return fmt.Errorf("get user %s: %w", userID, err)
```

## 汇总
- CRITICAL：1
- HIGH：1
- MEDIUM：0

建议：FAIL：在 CRITICAL issue 修复前阻止合并
```

## 通过标准

| 状态 | 条件 |
|--------|-----------|
| PASS: Approve | 无 CRITICAL 或 HIGH issue |
| WARNING: Warning | 仅有 MEDIUM issue（谨慎合并） |
| FAIL: Block | 发现 CRITICAL 或 HIGH issue |

## 与其他命令的集成

- 先使用 `/go-test` 确保 test 通过
- 出现 build error 时使用 `/go-build`
- 提交前使用 `/go-review`
- 非 Go 专项问题使用 `/code-review`

## 相关

- Agent：`agents/go-reviewer.md`
- Skill：`skills/golang-patterns/`、`skills/golang-testing/`
