# tinystruct 系统与使用参考

## 何时使用

使用这些模式来处理请求相关状态、管理 web session、实现 Server-Sent Events (SSE)、处理文件上传，或执行出站 HTTP 网络通信。

## 工作原理

### Context 与 CLI Argument
`Context` 是请求相关状态的主要数据存储。以 `--key value` 形式传递的 CLI flag 在 `Context` 中以 `"--key"` 为键存储。

### Session 管理
可插拔架构。默认为 `MemorySessionRepository`。在 `application.properties` 中配置 Redis：
```properties
default.session.repository=org.tinystruct.http.RedisSessionRepository
redis.host=127.0.0.1
redis.port=6379
```

### Server-Sent Events (SSE)
内置实时推送支持。`HttpServer` 在检测到 `Accept: text/event-stream` 请求头时会自动处理 SSE 生命周期。连接在 `SSEPushManager` 中按 session ID 进行追踪。

### 出站网络
使用 `URLRequest` 和 `HTTPHandler` 向外部服务发起 HTTP 请求。

## 示例

### Context 与 CLI Argument
```java
@Action("echo")
public String echo() {
    // CLI: bin/dispatcher echo --words "Hello World"
    Object words = getContext().getAttribute("--words");
    if (words != null) return words.toString();
    return "No words provided";
}
```

### Session 管理
```java
@Action(value = "login", mode = Mode.HTTP_POST)
public String login(Request<?, ?> request) {
    request.getSession().setAttribute("userId", "42");
    return "Logged in";
}
```

### Server-Sent Events (SSE)
```java
@Action("sse/connect")
public String connect() {
    return "{\"type\":\"connect\",\"message\":\"Connected\"}";
}

// 在另一个方法或事件处理器中：
String sessionId = getContext().getId();
SSEPushManager.getInstance().push(sessionId, new Builder().put("msg", "hello"));
```

### 文件上传
```java
import org.tinystruct.data.FileEntity;

@Action(value = "upload", mode = Mode.HTTP_POST)
public String upload(Request<?, ?> request) throws ApplicationException {
    List<FileEntity> files = request.getAttachments();
    if (files != null) {
        for (FileEntity file : files) {
            // file.getFilename(), file.getContent()
        }
    }
    return "Uploaded";
}
```

### 出站 HTTP
```java
import org.tinystruct.net.URLRequest;
import org.tinystruct.net.handlers.HTTPHandler;

URLRequest request = new URLRequest(new URL("https://api.example.com"));
request.setMethod("POST").setBody("{\"data\":\"val\"}");

HTTPHandler handler = new HTTPHandler();
var response = handler.handleRequest(request);
if (response.getStatusCode() == 200) {
    String body = response.getBody();
}
```

### 事件系统
在 `init()` 中注册处理器，用于异步任务执行。
```java
EventDispatcher.getInstance().registerHandler(MyEvent.class, event -> {
    CompletableFuture.runAsync(() -> doHeavyWork(event.getPayload()));
});
```
