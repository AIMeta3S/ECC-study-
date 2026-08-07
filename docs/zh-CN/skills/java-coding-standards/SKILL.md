---
name: java-coding-standards
description: "适用于 Spring Boot 和 Quarkus 服务的 Java 编码规范：涵盖命名、不可变性、Optional 使用、streams、异常、generics、CDI、reactive patterns 以及项目结构。自动应用框架专属约定。"
metadata:
  origin: ECC
---

# Java 编码规范

适用于 Spring Boot 和 Quarkus 服务中可读、可维护的 Java (17+) 代码的规范。

## 适用场景

- 在 Spring Boot 或 Quarkus 项目中编写或评审 Java 代码
- 强制执行命名、不可变性或异常处理约定
- 使用 records、sealed classes 或 pattern matching（Java 17+）
- 评审 Optional、streams 或 generics 的使用
- 组织 package 与项目结构
- **[QUARKUS]**：使用 CDI scopes、Panache entities 或 reactive pipelines

## 工作原理

### 框架检测

在应用规范之前，根据构建文件判断使用的框架：

- 构建文件包含 `quarkus` → 应用 **[QUARKUS]** 约定
- 构建文件包含 `spring-boot` → 应用 **[SPRING]** 约定
- 两者都未检测到 → 只应用通用约定

## 核心原则

- 优先追求清晰而非花哨
- 默认不可变；尽量减少共享的可变状态
- 通过有意义的异常快速失败（fail fast）
- 一致的命名与 package 结构
- **[QUARKUS]**：优先使用构建时处理而非运行时处理；尽量避免 runtime reflection

## 示例

以下各节展示了 Spring Boot、Quarkus 以及通用 Java 的具体示例，涵盖命名、不可变性、dependency injection、reactive 代码、异常、项目结构、日志、配置和测试。

## 命名

```java
// PASS：类/Records 使用 PascalCase
public class MarketService {}
public record Money(BigDecimal amount, Currency currency) {}

// PASS：方法/字段使用 camelCase
private final MarketRepository marketRepository;
public Market findBySlug(String slug) {}

// PASS：常量使用 UPPER_SNAKE_CASE
private static final int MAX_PAGE_SIZE = 100;

// PASS：[QUARKUS] JAX-RS resources 命名为 *Resource，而非 *Controller
public class MarketResource {}

// PASS：[SPRING] REST controllers 命名为 *Controller
public class MarketController {}
```

## 不可变性

```java
// PASS：优先使用 records 和 final 字段
public record MarketDto(Long id, String name, MarketStatus status) {}

public class Market {
  private final Long id;
  private final String name;
  // 只有 getters，没有 setters
}

// PASS：[QUARKUS] Panache active-record entities 使用 public 字段（Quarkus 约定）
@Entity
public class Market extends PanacheEntity {
  public String name;
  public MarketStatus status;
  // Panache 在构建时生成 accessors；此处 public 字段是惯用写法
}

// PASS：[QUARKUS] Panache MongoDB entities
@MongoEntity(collection = "markets")
public class Market extends PanacheMongoEntity {
  public String name;
  public MarketStatus status;
}
```

## Optional 使用

```java
// PASS：从 find* 方法返回 Optional
// [SPRING]
Optional<Market> market = marketRepository.findBySlug(slug);

// [QUARKUS] Panache
Optional<Market> market = Market.find("slug", slug).firstResultOptional();

// PASS：使用 map/flatMap 而非 get()
return market
    .map(MarketResponse::from)
    .orElseThrow(() -> new EntityNotFoundException("Market not found"));
```

## Streams 最佳实践

```java
// PASS：使用 streams 进行转换，保持 pipelines 简短
List<String> names = markets.stream()
    .map(Market::name)
    .filter(Objects::nonNull)
    .toList();

// FAIL：避免复杂的嵌套 streams；为清晰起见优先使用循环
```

## Dependency Injection

```java
// PASS：[SPRING] Constructor injection（优先于字段上的 @Autowired）
@Service
public class MarketService {
  private final MarketRepository marketRepository;

  public MarketService(MarketRepository marketRepository) {
    this.marketRepository = marketRepository;
  }
}

// PASS：[QUARKUS] Constructor injection
@ApplicationScoped
public class MarketService {
  private final MarketRepository marketRepository;

  @Inject
  public MarketService(MarketRepository marketRepository) {
    this.marketRepository = marketRepository;
  }
}

// PASS：[QUARKUS] Package-private field injection（在 Quarkus 中可接受——避免 proxy 问题）
@ApplicationScoped
public class MarketService {
  @Inject
  MarketRepository marketRepository;
}

// FAIL：[SPRING] 使用 @Autowired 的 field injection
@Autowired
private MarketRepository marketRepository; // 改用 constructor injection

// FAIL：[QUARKUS] 需要 interception 或 lazy init 时却使用 @Singleton
@Singleton // 不可 proxy —— 改用 @ApplicationScoped
public class MarketService {}
```

## Reactive Patterns [QUARKUS]

```java
// PASS：从 reactive endpoints 返回 Uni/Multi
@GET
@Path("/{slug}")
public Uni<Market> findBySlug(@PathParam("slug") String slug) {
  return Market.find("slug", slug)
      .<Market>firstResult()
      .onItem().ifNull().failWith(() -> new MarketNotFoundException(slug));
}

// PASS：非阻塞的 pipeline 组合
public Uni<OrderConfirmation> placeOrder(OrderRequest req) {
  return validateOrder(req)
      .chain(valid -> persistOrder(valid))
      .chain(order -> notifyFulfillment(order));
}

// FAIL：在 Uni/Multi pipeline 中进行阻塞调用
public Uni<Market> find(String slug) {
  Market m = Market.find("slug", slug).firstResult(); // 阻塞 —— 会破坏 event loop
  return Uni.createFrom().item(m);
}

// FAIL：对共享的 Uni 多次 subscribe
Uni<Market> shared = fetchMarket(slug);
shared.subscribe().with(m -> log(m));
shared.subscribe().with(m -> cache(m)); // 重复 subscribe —— 使用 Uni.memoize()
```

## 异常

- 对 domain errors 使用 unchecked exceptions；为技术性异常附加上下文
- 创建领域专用的异常（如 `MarketNotFoundException`）
- 避免宽泛的 `catch (Exception ex)`，除非用于集中 rethrow/logging

```java
throw new MarketNotFoundException(slug);
```

### 集中式异常处理

```java
// [SPRING]
@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(MarketNotFoundException.class)
  public ResponseEntity<ErrorResponse> handle(MarketNotFoundException ex) {
    return ResponseEntity.status(404).body(ErrorResponse.from(ex));
  }
}

// [QUARKUS] 方案 A：ExceptionMapper
@Provider
public class MarketNotFoundMapper implements ExceptionMapper<MarketNotFoundException> {
  @Override
  public Response toResponse(MarketNotFoundException ex) {
    return Response.status(404).entity(ErrorResponse.from(ex)).build();
  }
}

// [QUARKUS] 方案 B：@ServerExceptionMapper（RESTEasy Reactive）
@ServerExceptionMapper
public RestResponse<ErrorResponse> handle(MarketNotFoundException ex) {
  return RestResponse.status(Status.NOT_FOUND, ErrorResponse.from(ex));
}
```

## Generics 与类型安全

- 避免 raw types；声明 generic parameters
- 对可复用工具优先使用 bounded generics

```java
public <T extends Identifiable> Map<Long, T> indexById(Collection<T> items) { ... }
```

## 项目结构

### [SPRING] Maven/Gradle

```
src/main/java/com/example/app/
  config/
  controller/
  service/
  repository/
  domain/
  dto/
  util/
src/main/resources/
  application.yml
src/test/java/... （镜像 main 结构）
```

### [QUARKUS] Maven/Gradle

```
src/main/java/com/example/app/
  config/              # @ConfigMapping、@ConfigProperty beans、Producers
  resource/            # JAX-RS resources（不是 "controller"）
  service/
  repository/          # PanacheRepository 实现（若未使用 active record）
  domain/              # JPA/Panache entities、MongoDB entities
  dto/
  util/
  mapper/              # MapStruct mappers（若使用）
src/main/resources/
  application.properties   # Quarkus 约定（通过 quarkus-config-yaml 支持 YAML）
  import.sql               # Hibernate 在 dev/test 时自动导入
src/test/java/... （镜像 main 结构）
```

## 格式与风格

- 一致使用 2 或 4 个空格（项目标准）
- 每个文件一个 public top-level type
- 保持方法短小且聚焦；抽取 helper 方法
- 成员排列顺序：constants、fields、constructors、public methods、protected、private

## 应避免的 Code Smells

- 过长的参数列表 → 使用 DTO/builders
- 过深的嵌套 → 提前返回
- Magic numbers → 命名常量
- 静态的可变状态 → 优先使用 dependency injection
- 静默的 catch 块 → 记录日志并处理或 rethrow
- **[QUARKUS]**：本应使用 `@ApplicationScoped` 却用了 `@Singleton` —— 会破坏 proxying 与 interception
- **[QUARKUS]**：混用 `quarkus-resteasy-reactive` 与 `quarkus-resteasy`（classic）—— 只选一套技术栈
- **[QUARKUS]**：在同一个 bounded context 中同时使用 Panache active-record 与 repository pattern —— 只选一种

## 日志

```java
// [SPRING] SLF4J
private static final Logger log = LoggerFactory.getLogger(MarketService.class);
log.info("fetch_market slug={}", slug);
log.error("failed_fetch_market slug={}", slug, ex);

// [QUARKUS] JBoss Logging（默认，构建时零开销）
private static final Logger log = Logger.getLogger(MarketService.class);
log.infof("fetch_market slug=%s", slug);
log.errorf(ex, "failed_fetch_market slug=%s", slug);

// [QUARKUS] 备选方案：通过 @Inject 简化日志
@Inject
Logger log; // CDI 注入，作用域限定于声明类
```

## Null 处理

- 仅在不可避免时才接受 `@Nullable`；否则使用 `@NonNull`
- 对输入使用 Bean Validation（`@NotNull`、`@NotBlank`）
- **[QUARKUS]**：对 `@BeanParam`、`@RestForm` 以及请求体参数应用 `@Valid`

## 配置

```java
// [SPRING] @ConfigurationProperties
@ConfigurationProperties(prefix = "market")
public record MarketProperties(int maxPageSize, Duration cacheTtl) {}

// [QUARKUS] @ConfigMapping（类型安全，构建时校验）
@ConfigMapping(prefix = "market")
public interface MarketConfig {
  int maxPageSize();
  Duration cacheTtl();
}

// [QUARKUS] 使用 @ConfigProperty 设置简单值
@ConfigProperty(name = "market.max-page-size", defaultValue = "100")
int maxPageSize;
```

## 测试要求

### 通用
- JUnit 5 + AssertJ 用于 fluent assertions
- Mockito 用于 mocking；尽量避免 partial mocks
- 倾向于 deterministic 测试；不使用隐式的 sleep

### [SPRING]
- `@WebMvcTest` 用于 controller slices，`@DataJpaTest` 用于 repository slices
- `@SpringBootTest` 保留用于完整的 integration tests
- `@MockBean` 用于替换 Spring context 中的 beans

### [QUARKUS]
- 纯 JUnit 5 + Mockito 用于 unit tests（不使用 `@QuarkusTest`）
- `@QuarkusTest` 保留用于 CDI integration tests
- `@InjectMock` 用于在 integration tests 中替换 CDI beans
- 使用 Dev Services 处理 database/Kafka/Redis —— 当 Dev Services 足够时避免手动配置 Testcontainers
- `@QuarkusTestResource` 用于自定义外部 service 的生命周期

```java
// [SPRING] Controller 测试
@WebMvcTest(MarketController.class)
class MarketControllerTest {
  @Autowired MockMvc mockMvc;
  @MockBean MarketService marketService;
}

// [QUARKUS] Integration test
@QuarkusTest
class MarketResourceTest {
  @InjectMock
  MarketService marketService;

  @Test
  void should_return_404_when_market_not_found() {
    given().when().get("/markets/unknown").then().statusCode(404);
  }
}

// [QUARKUS] Unit test（无 CDI，无 @QuarkusTest）
@ExtendWith(MockitoExtension.class)
class MarketServiceTest {
  @Mock MarketRepository marketRepository;
  @InjectMocks MarketService marketService;
}
```

**切记**：让代码保持意图明确、有类型约束且可观测。除非确有必要，优先追求可维护性而非微优化。
