---
description: 增量修复 Go build 错误、go vet 警告和 linter 问题。调用 go-build-resolver agent 进行最小化的精准修复。
---

# Go Build 与修复

本命令调用 **go-build-resolver** agent，以最小化的改动增量修复 Go build 错误。

## 本命令的功能

1. **运行诊断**：执行 `go build`、`go vet`、`staticcheck`
2. **解析错误**：按文件分组并按 severity 排序
3. **增量修复**：一次修复一个错误
4. **验证每处修复**：每次修改后重新运行 build
5. **报告总结**：展示已修复的内容和剩余问题

## 适用场景

在以下情况使用 `/go-build`：
- `go build ./...` 失败并报错
- `go vet ./...` 报告了 issue
- `golangci-lint run` 显示警告
- 模块依赖损坏
- 拉取改动后导致 build 失败

## 运行的诊断命令

```bash
# 主要 build 检查
go build ./...

# 静态分析
go vet ./...

# 扩展 lint（如果可用）
staticcheck ./...
golangci-lint run

# 模块问题
go mod verify
go mod tidy -v
```

## 示例会话

```text
User: /go-build

Agent:
# Go Build 解决过程

## 初始诊断

```bash
$ go build ./...
internal/service/user.go:25:15: undefined: UserRepository
internal/handler/api.go:42:9: cannot use x (type string) as type int
internal/handler/api.go:58:2: missing return at end of function
```

发现错误：3

## 修复 1：未定义标识符

File: internal/service/user.go:25
Error: undefined: UserRepository
Cause: Missing import

```go
// 添加了 import
import "project/internal/repository"

// 修改前
var repo UserRepository
// 修改后
var repo repository.UserRepository
```

```bash
$ go build ./...
# 剩余 2 个错误
```

## 修复 2：类型不匹配

File: internal/handler/api.go:42
Error: cannot use x (type string) as type int

```go
// 修改前
count := params.Get("count")
// 修改后
countStr := params.Get("count")
count, _ := strconv.Atoi(countStr)
```

```bash
$ go build ./...
# 剩余 1 个错误
```

## 修复 3：缺少 return

File: internal/handler/api.go:58
Error: missing return at end of function

```go
func GetUser(id string) (*User, error) {
    if id == "" {
        return nil, ErrInvalidID
    }
    user := findUser(id)
    // 添加了缺失的 return
    return user, nil
}
```

```bash
$ go build ./...
# build 成功！
```

## 最终验证

```bash
$ go vet ./...
# 无 issue

$ go test ./...
ok      project/internal/service   0.015s
ok      project/internal/handler   0.023s
```

## 总结

| 指标 | 数量 |
|--------|-------|
| 已修复的 build 错误 | 3 |
| 已修复的 vet 警告 | 0 |
| 已修改的文件 | 2 |
| 剩余 issue | 0 |

Build Status: PASS: SUCCESS
```

## 常见错误修复

| 错误 | 典型修复 |
|-------|-------------|
| `undefined: X` | 添加 import 或修正拼写 |
| `cannot use X as Y` | 类型转换或修正赋值 |
| `missing return` | 添加 return 语句 |
| `X does not implement Y` | 添加缺失的方法 |
| `import cycle` | 重组 package |
| `declared but not used` | 删除或使用该变量 |
| `cannot find package` | `go get` 或 `go mod tidy` |

## 修复策略

1. **先修复 build 错误** - 代码必须能编译
2. **再修复 vet 警告** - 修正可疑的构造
3. **最后修复 lint 警告** - 风格与最佳实践
4. **一次只修复一处** - 验证每处改动
5. **最小化改动** - 不 refactor，只修复

## 停止条件

agent 将在以下情况下停止并报告：
- 同一错误尝试 3 次后仍然存在
- 修复引入了更多错误
- 需要架构层面的改动
- 缺少外部依赖

## 相关命令

- `/go-test` - 在 build 成功后运行测试
- `/go-review` - 审查代码质量
- `verification-loop` skill - 完整的验证循环

## 相关资源

- Agent：`agents/go-build-resolver.md`
- Skill：`skills/golang-patterns/`
