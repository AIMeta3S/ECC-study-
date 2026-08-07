---
name: tinystruct-patterns
description: 使用 tinystruct Java 框架进行开发的专家指南。当在 tinystruct codebase 或任何基于 tinystruct 构建的项目上工作时使用——包括创建 Application class、@Action 映射的路由、单元测试、ActionRegistry、HTTP/CLI dual-mode 处理、内置 HTTP 服务器、事件系统、配合 Builder/Builders 的 JSON、基于 AbstractData 的数据库持久化、POJO 生成、Server-Sent Events (SSE)、文件上传以及出站 HTTP 网络通信。
metadata:
  origin: ECC
---

# tinystruct 开发模式

使用 **tinystruct** Java 框架构建 module 的架构与实现模式——这是一个轻量级、高性能的框架，将 CLI 和 HTTP 视为同等重要的入口，无需 `main()` 方法，配置极简。

## 核心原则

**CLI 与 HTTP 是同等重要的入口。** 每个用 `@Action` 标注的 method 理想情况下都应能在终端和浏览器中无需修改即可运行。这种“dual-mode”能力是 tinystruct 的核心设计哲学。

## 何时激活

### 何时使用

- 通过继承 `AbstractApplication` 创建新的 `Application` module。
- 使用 `@Action` 定义路由和命令行 action。
- 通过 `Context` 处理每个请求的状态。
- 使用原生 `Builder` 和 `Builders` 组件执行 JSON 序列化。
- 通过 `AbstractData` POJO 处理数据库持久化。
- 使用 `generate` 命令从数据库表生成 POJO。
- 实现 Server-Sent Events (SSE) 以进行实时推送。
- 通过 multipart 数据处理文件上传。
- 使用 `URLRequest` 和 `HTTPHandler` 发起出站 HTTP 请求。
- 在 `application.properties` 中配置数据库连接或系统设置。
- 调试路由冲突（Action）或 CLI argument 解析。

## 工作原理

tinystruct 框架将任何用 `@Action` 标注的 method 视为可路由的 endpoint，同时适用于终端和 web 环境。Application 通过继承 `AbstractApplication` 创建，后者提供 `init()` 等核心 lifecycle hook 以及对请求 `Context` 的访问。

路由由 `ActionRegistry` 处理，它会自动将 path segment 映射到 method argument 并注入依赖。对于纯数据服务，应使用原生 `Builder` 和 `Builders` 组件进行 JSON 序列化，以保持零依赖。数据库层使用 `AbstractData` POJO 配合 XML mapping 文件，无需外部 ORM library 即可完成 CRUD 操作。

## 示例

### 基础 Application（MyService）
```java
public class MyService extends AbstractApplication {
    @Override
    public void init() {
        this.setTemplateRequired(false); // 为数据/API 应用禁用 .view 查找
    }

    @Override public String version() { return "1.0.0"; }

    @Action("greet")
    public String greet() {
        return "Hello from tinystruct!";
    }

    // Path parameter：GET /?q=greet/James  或  bin/dispatcher greet/James
    @Action("greet")
    public String greet(String name) {
        return "Hello, " + name + "!";
    }
}
```

### HTTP 模式消歧（login）
```java
@Action(value = "login", mode = Mode.HTTP_POST)
public String doLogin(Request<?, ?> request) throws ApplicationException {
    request.getSession().setAttribute("userId", "42");
    return "Logged in";
}
```

### 原生 JSON 数据处理（Builder + Builders）
```java
import org.tinystruct.data.component.Builder;
import org.tinystruct.data.component.Builders;

@Action("api/data")
public String getData() throws ApplicationException {
    Builders dataList = new Builders();
    Builder item = new Builder();
    item.put("id", 1);
    item.put("name", "James");
    dataList.add(item);

    Builder response = new Builder();
    response.put("status", "success");
    response.put("data", dataList);
    return response.toString(); // {"status":"success","data":[{"id":1,"name":"James"}]}
}
```

### SSE（Server-Sent Events）
```java
import org.tinystruct.http.SSEPushManager;

@Action("sse/connect")
public String connect() {
    return "{\"type\":\"connect\",\"message\":\"Connected to SSE\"}";
}

// 推送到特定客户端
String sessionId = getContext().getId();
Builder msg = new Builder();
msg.put("text", "Hello, user!");
SSEPushManager.getInstance().push(sessionId, msg);

// 广播给所有客户端
// 广播给所有客户端
SSEPushManager.getInstance().broadcast(msg);
```

### 文件上传
```java
import org.tinystruct.data.FileEntity;

@Action(value = "upload", mode = Mode.HTTP_POST)
public String upload(Request<?, ?> request) throws ApplicationException {
    List<FileEntity> files = request.getAttachments();
    if (files != null) {
        for (FileEntity file : files) {
            System.out.println("Uploaded: " + file.getFilename());
        }
    }
    return "Upload OK";
}
```

## MCP Server 与 Tools 集成

自 SDK 版本 **`1.7.26`** 起，tinystruct 原生支持 Model Context Protocol (MCP)。
MCP API（例如 `org.tinystruct.mcp.MCPTool`、`org.tinystruct.mcp.MCPServer`、`org.tinystruct.mcp.MCPException`）直接包含在核心依赖中：
```xml
<dependency>
    <groupId>org.tinystruct</groupId>
    <artifactId>tinystruct</artifactId>
    <version>1.7.26</version>
</dependency>
```

> **安全警告（Prompt Injection）：**
> Tool 的返回值会直接送回 AI 模型的 context window。在将调用方提供的 argument 纳入 tool 的返回字符串之前，你**必须**对其进行校验和 sanitize。未能对输入进行 sanitize 可能会让攻击者注入对抗性指令（Prompt Injection），从而覆盖模型行为。务必校验长度、字符集和 null 性。

**创建 MCP Tool：**
1. 继承 `org.tinystruct.mcp.MCPTool`。
2. 用 `@Action` 标注操作，并在 `arguments` 数组内使用 `@Argument` 声明 parameter。
3. 以显式 method argument 的形式接收 parameter，与 `@Argument` 中的 key 一一对应。（**不要**使用 `getContext().getAttribute(...)` 来获取 tool argument。）

```java
import org.tinystruct.mcp.MCPTool;
import org.tinystruct.mcp.MCPException;
import org.tinystruct.system.annotation.Action;
import org.tinystruct.system.annotation.Argument;

public class MyCustomTool extends MCPTool {
    public MyCustomTool() {
        super("custom", "A custom tool for demonstrating MCP");
    }

    @Action(
        value = "custom/hello",
        description = "Say hello to someone",
        arguments = {
            @Argument(key = "name", description = "The name to greet", type = "string", optional = false)
        }
    )
    public String hello(String name) throws MCPException {
        // 安全：在返回给模型之前，校验/sanitize tool 的输入
        // 以防止 prompt injection 漏洞。
        if (name == null || name.length() > 50 || !name.matches("^[a-zA-Z0-9 ]+$")) {
            throw new MCPException("Invalid name provided");
        }
        return "Hello, " + name + "!";
    }
}
```

**部署 MCP Server：**
1. 继承 `org.tinystruct.mcp.MCPServer`。
2. 重写 `init()` 并使用 `this.registerTool()` 注册你的 tool。框架会自动扫描并映射 `@Action` method。

```java
import org.tinystruct.mcp.MCPServer;

public class MyMCPServer extends MCPServer {
    @Override
    public void init() {
        super.init();
        this.registerTool(new MyCustomTool());
    }

    @Override
    public String version() {
        return "1.0.0";
    }
}
```

通过 dispatcher 运行服务器：
```bash
bin/dispatcher start --import org.tinystruct.system.HttpServer --import com.example.MyMCPServer
```

## 配置

设置在 `src/main/resources/application.properties` 中管理。

```properties
# 数据库
driver=org.h2.Driver
database.url=jdbc:h2:~/mydb
database.user=sa
database.password=

# 服务器
default.home.page=hello
server.port=8080

# 区域设置
default.language=en_US

# Session（用于集群环境的 Redis）
# default.session.repository=org.tinystruct.http.RedisSessionRepository
# redis.host=127.0.0.1
# redis.port=6379
```

在你的 application 中访问配置值：
```java
String port = this.getConfiguration("server.port");
```

## 危险信号与 anti-pattern

| 症状 | 正确 Pattern |
|---|---|
| 导入 `com.google.gson` 或 `com.fasterxml.jackson` | 使用 `org.tinystruct.data.component.Builder` / `Builders`。 |
| 对 JSON array 使用 `List<Builder>` | 使用 `Builders` 以避免 generic type erasure 问题。 |
| `ApplicationRuntimeException: template not found` | 对于纯 API 应用，在 `init()` 中调用 `setTemplateRequired(false)`。 |
| 用 `@Action` 标注 `private` method | Action 必须为 `public` 才能被框架注册。 |
| 在应用中硬编码 `main(String[] args)` | 使用 `bin/dispatcher` 作为所有 module 的入口。 |
| 手动注册 `ActionRegistry` | 优先使用 `@Action` 注解以实现自动发现。 |
| 运行时找不到 Action | 确保通过 `--import` 导入 class，或在 `application.properties` 中列出。 |
| CLI arg 不可见 | 使用 `--key value` 传入；通过 `getContext().getAttribute("--key")` 访问。 |
| 两个 method 同一路径，触发了错误的那个 | 设置显式 `mode`（例如 `HTTP_GET` 对 `HTTP_POST`）以消歧。 |

## 最佳实践

1. **细粒度的 Application**：将逻辑拆分为更小、更聚焦的 application，而不是单一庞大的 class。
2. **在 `init()` 中设置**：利用 `init()` 进行设置（config、DB），而不是在 constructor 中。不要调用 `setAction()`——使用 `@Action` 注解。
3. **Mode 意识**：在 `@Action` 中使用 `Mode` parameter，将敏感操作限制为仅 `CLI` 或特定 HTTP 方法。
4. **Context 优先于 parameter**：对于可选的 CLI flag，使用 `getContext().getAttribute("--flag")`，而不是向 method 签名添加 parameter。
5. **异步事件**：对于由事件触发的繁重任务，在事件处理器内使用 `CompletableFuture.runAsync()`。

## 技术参考

详细指南可在 `references/` 目录中找到：

- [架构与配置](references/architecture.md) — 抽象、Package Map、Properties
- [路由与 @Action](references/routing.md) — 注解细节、Mode、parameter
- [数据处理](references/data-handling.md) — Builder、Builders、JSON 序列化与解析
- [数据库持久化](references/database.md) — AbstractData POJO、CRUD、mapping XML、POJO 生成
- [系统与用法](references/system-usage.md) — Context、Session、SSE、文件上传、事件、网络
- [测试模式](references/testing.md) — JUnit 5 单元测试与 HTTP 集成测试

## 参考源文件（内部）

- `src/main/java/org/tinystruct/AbstractApplication.java` — 核心 base class，含 lifecycle hook
- `src/main/java/org/tinystruct/system/annotation/Action.java` — 注解与 Mode
- `src/main/java/org/tinystruct/application/ActionRegistry.java` — 路由引擎
- `src/main/java/org/tinystruct/data/component/Builder.java` — JSON object 序列化器
- `src/main/java/org/tinystruct/data/component/Builders.java` — JSON array 序列化器
- `src/main/java/org/tinystruct/data/component/AbstractData.java` — 基础 POJO class，含 CRUD
- `src/main/java/org/tinystruct/data/Mapping.java` — Mapping XML 解析器
- `src/main/java/org/tinystruct/data/tools/MySQLGenerator.java` — POJO 生成器参考
- `src/main/java/org/tinystruct/data/component/FieldType.java` — SQL 到 Java 的类型映射
- `src/main/java/org/tinystruct/data/component/Condition.java` — Fluent SQL query 构造器
- `src/main/java/org/tinystruct/http/SSEPushManager.java` — SSE 连接管理
- `src/test/java/org/tinystruct/application/ActionRegistryTest.java` — Registry 测试示例
- `src/test/java/org/tinystruct/system/HttpServerHttpModeTest.java` — HTTP 集成测试模式
