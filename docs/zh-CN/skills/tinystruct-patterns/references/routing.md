# tinystruct @Action 路由参考

## 何时使用

在应用程序中使用 `@Action` 注解可为 CLI 命令和 HTTP 端点定义路由。当你需要将逻辑映射到特定路径、处理参数化请求，或将执行限制在特定 HTTP 方法上，同时在不同环境中保持一致的命令结构时，使用该注解是合适的。

## 工作原理

`ActionRegistry` 解析 `@Action` 注解以构建路由表。对于参数化方法，框架会自动将 Java 参数类型映射到对应的 regex 片段。

### regex 生成规则
- `getUser(int id)` → pattern: `^/?user/(-?\d+)$`
- `search(String query)` → pattern: `^/?search/([^/]+)$`

支持的参数类型：`String`、`int/Integer`、`long/Long`、`float/Float`、`double/Double`、`boolean/Boolean`、`char/Character`、`short/Short`、`byte/Byte`、`Date`（解析为 `yyyy-MM-dd HH:mm:ss`）。

### Mode 值

| Mode | 触发时机 |
|---|---|
| `DEFAULT` | CLI 和 HTTP（GET、POST 等） |
| `CLI` | 仅 CLI dispatcher |
| `HTTP_GET` | 仅 HTTP GET |
| `HTTP_POST` | 仅 HTTP POST |
| `HTTP_PUT` | 仅 HTTP PUT |
| `HTTP_DELETE` | 仅 HTTP DELETE |
| `HTTP_PATCH` | 仅 HTTP PATCH |

> **注意：** 可以使用 `Action.Mode.fromName(String methodName)` 将 HTTP 方法名映射到 `Mode`。未知或 null 值返回 `Mode.DEFAULT`。

## 示例

### 基本 Action 声明
```java
@Action(
    value = "path/subpath",          // 必需：URI 片段或 CLI 命令
    description = "What it does",    // 显示在 --help 输出中
    mode = Mode.DEFAULT,             // 默认：Mode.DEFAULT
    example = "bin/dispatcher path/subpath/42"
)
public String myAction(int id) { ... }
```

### 参数化路径
```java
@Action("user/{id}")
public String getUser(int id) { ... }
// → CLI: bin/dispatcher user/42
// → HTTP: /?q=user/42
```

### 依赖注入
如果 `Request` 和/或 `Response` 作为参数，`ActionRegistry` 会自动从 `Context` 中注入它们：

```java
@Action(value = "upload", mode = Mode.HTTP_POST)
public String upload(Request<?, ?> req, Response<?, ?> res) throws ApplicationException {
    // 如需访问原始 request/response
    return "ok";
}
```

### 路径匹配优先级
如果两个方法共享同一路径，框架会使用 `ActionRegistry` 中的第一个匹配项。使用显式的 `Mode` 值来消除歧义（例如，区分表单的 GET 与提交的 POST）。
