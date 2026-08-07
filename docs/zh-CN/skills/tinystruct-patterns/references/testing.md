# tinystruct 测试模式

## 何时使用

当使用 **JUnit 5** 为你的应用编写单元测试时，请使用这些模式。它们对于验证 action 逻辑、路由注册以及 HTTP 模式行为至关重要。

## 工作原理

### 单元测试应用
ActionRegistry 是一个单例。要测试一个应用：
1. 实例化该应用。
2. 提供一个 `Settings` 对象（触发 `init()` 和注解处理）。
3. 使用 `app.invoke(path, args)` 直接测试逻辑。

### HTTP 集成测试
对于涉及内置 HTTP 服务器的测试：
1. 在后台 thread 中启动 `HttpServer`。
2. 使用 `ApplicationManager.call("start", context, Action.Mode.CLI)` 来启动。
3. 使用 `Socket` 等待端口开放。
4. 使用 `URLRequest` 和 `HTTPHandler` 执行实际的请求。

## 示例

### 单元测试
```java
import org.junit.jupiter.api.*;
import org.tinystruct.system.Settings;

class MyAppTest {
    private MyApp app;

    @BeforeEach
    void setUp() {
        app = new MyApp();
        app.setConfiguration(new Settings());
        app.init(); // 触发 @Action 注解处理并注册所有 action
    }

    @Test
    void testHello() throws Exception {
        Object result = app.invoke("hello");
        Assertions.assertEquals("Hello!", result);
    }

    @Test
    void testGreet() throws Exception {
        Object result = app.invoke("greet", new Object[]{"James"});
        Assertions.assertEquals("Hello, James!", result);
    }
}
```

### ActionRegistry 匹配测试
```java
@Test
void testRouting() {
    ActionRegistry registry = ActionRegistry.getInstance();
    Action action = registry.getAction("greet/James");
    Assertions.assertNotNull(action);
}
```

### HTTP 集成模式
参考：`src/test/java/org/tinystruct/system/HttpServerHttpModeTest.java`

```java
// 模式：
// 1. 在 thread 中启动服务器
// 2. 轮询端口可用性
// 3. 通过 HTTPHandler 发送 HTTP 请求
// 4. 断言响应体/状态
```
