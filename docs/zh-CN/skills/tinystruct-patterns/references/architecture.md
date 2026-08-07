# tinystruct 架构与配置

## 何时使用

当你需要一个将 CLI 和 HTTP 作为同等一等公民对待的轻量级、高性能 Java 框架时，请选择 **tinystruct**。它非常适合 microservices、CLI 工具，以及具有小内存占用和零依赖 JSON 处理能力的数据驱动应用。

## 工作原理

### 核心架构

框架运行于一个 singleton `ActionRegistry` 之上，它将 URL 模式（或命令字符串）映射到 `Action` 对象。当请求到达时，系统会解析路径并调用相应的方法句柄。

#### 关键抽象

| 类/接口 | 职责 |
|---|---|
| `AbstractApplication` | 所有 tinystruct 应用的基类。继承此类。 |
| `@Action` annotation | 将方法映射到 URI 路径（web）或命令名（CLI）。它是唯一的路由原语。 |
| `ActionRegistry` | 通过 regex 将 URL 模式映射到 `Action` 对象的 singleton。切勿直接实例化。 |
| `Action` | 封装 `MethodHandle` + regex 模式 + 优先级 + `Mode`，用于分发。 |
| `Context` | 每个请求的状态存储。通过 `getContext()` 访问。持有 CLI 参数和 HTTP 请求/响应。 |
| `Dispatcher` | CLI 入口点（`bin/dispatcher`）。读取 `--import` 以加载应用。 |
| `HttpServer` | 内置 HTTP 服务器。通过 `bin/dispatcher start --import org.tinystruct.system.HttpServer` 启动。 |

### 包映射

```
org.tinystruct/
├── AbstractApplication.java      ← 继承此类
├── Application.java              ← 接口
├── ApplicationException.java     ← checked exception
├── ApplicationRuntimeException.java ← unchecked exception
├── application/
│   ├── Action.java               ← 运行时 action 包装
│   ├── ActionRegistry.java       ← singleton 路由注册表
│   └── Context.java              ← 请求 context
├── system/
│   ├── annotation/Action.java    ← @Action 注解 + Mode 枚举
│   ├── Dispatcher.java           ← CLI 分发器
│   ├── HttpServer.java           ← 内置 HTTP 服务器
│   ├── EventDispatcher.java      ← 事件总线
│   └── Settings.java             ← 读取 application.properties
├── data/
│   ├── component/Builder.java    ← JSON 对象（使用它代替 Gson/Jackson）
│   ├── component/Builders.java   ← JSON 数组
│   ├── component/AbstractData.java ← 用于 DB 持久化的基类 POJO
│   ├── component/Condition.java  ← fluent SQL 查询构建器
│   ├── component/FieldType.java  ← SQL 到 Java 的类型映射
│   ├── Mapping.java              ← 读取 .map.xml 元数据
│   ├── DatabaseOperator.java     ← 底层 JDBC 封装
│   └── FileEntity.java           ← 文件上传表示
├── http/                         ← Request、Response、Constants
│   └── SSEPushManager.java       ← Server-Sent Events 管理
└── net/                          ← URLRequest、HTTPHandler（出站 HTTP）
```

### 模板行为与分发流程

默认情况下，框架假定需要视图模板。如果 `templateRequired` 为 `true`，`toString()` 会在 `src/main/resources/themes/<ClassName>.view` 中查找 `.view` 文件。使用 `setVariable("name", value)` 向模板传递数据，模板使用 `{%name%}` 进行插值。

## 示例

### 最小应用初始化
```java
@Override
public void init() {
    this.setTemplateRequired(false); // 对于仅数据应用，跳过 .view 模板查找
    // 不要在此处调用 setAction() —— 改用 @Action 注解
}
```

### Action 定义与 CLI 调用
```java
@Action("hello")
public String hello() {
    return "Hello, tinystruct!";
}
```
**通过 Dispatcher 执行：**
```bash
bin/dispatcher hello
bin/dispatcher greet/James
bin/dispatcher echo --words "Hello" --import com.example.HelloApp
```

### 配置访问
位于 `src/main/resources/application.properties`：
```java
String port = this.getConfiguration("server.port");
```
