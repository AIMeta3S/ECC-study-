---
paths:
  - "**/*.java"
---
# Java 测试

> 本文件扩展了 [common/testing.md](../common/testing.md)，补充 Java 特定内容。

## 测试框架

- **JUnit 5** (`@Test`, `@ParameterizedTest`, `@Nested`, `@DisplayName`)
- **AssertJ** 用于 fluent assertion（`assertThat(result).isEqualTo(expected)`）
- **Mockito** 用于 mock 依赖项
- **Testcontainers** 用于需要数据库或服务的集成测试

## 测试组织

```
src/test/java/com/example/app/
  service/           # service 层的单元测试
  controller/        # Web 层 / API 测试
  repository/        # 数据访问测试
  integration/       # 跨层集成测试
```

在 `src/test/java` 中镜像对应 `src/main/java` 的 package 结构。

## 单元测试模式

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    private OrderService orderService;

    @BeforeEach
    void setUp() {
        orderService = new OrderService(orderRepository);
    }

    @Test
    @DisplayName("findById returns order when exists")
    void findById_existingOrder_returnsOrder() {
        var order = new Order(1L, "Alice", BigDecimal.TEN);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

        var result = orderService.findById(1L);

        assertThat(result.customerName()).isEqualTo("Alice");
        verify(orderRepository).findById(1L);
    }

    @Test
    @DisplayName("findById throws when order not found")
    void findById_missingOrder_throws() {
        when(orderRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.findById(99L))
            .isInstanceOf(OrderNotFoundException.class)
            .hasMessageContaining("99");
    }
}
```

## 参数化测试

```java
@ParameterizedTest
@CsvSource({
    "100.00, 10, 90.00",
    "50.00, 0, 50.00",
    "200.00, 25, 150.00"
})
@DisplayName("discount applied correctly")
void applyDiscount(BigDecimal price, int pct, BigDecimal expected) {
    assertThat(PricingUtils.discount(price, pct)).isEqualByComparingTo(expected);
}
```

## 集成测试

使用 Testcontainers 进行真实的数据库集成：

```java
@Testcontainers
class OrderRepositoryIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    private OrderRepository repository;

    @BeforeEach
    void setUp() {
        var dataSource = new PGSimpleDataSource();
        dataSource.setUrl(postgres.getJdbcUrl());
        dataSource.setUser(postgres.getUsername());
        dataSource.setPassword(postgres.getPassword());
        repository = new JdbcOrderRepository(dataSource);
    }

    @Test
    void save_and_findById() {
        var saved = repository.save(new Order(null, "Bob", BigDecimal.ONE));
        var found = repository.findById(saved.getId());
        assertThat(found).isPresent();
    }
}
```

对于 Spring Boot 集成测试，参见 skill：`springboot-tdd`。
对于 Quarkus 集成测试，参见 skill：`quarkus-tdd`。

## 测试命名

配合 `@DisplayName` 使用描述性名称：
- 方法名采用 `methodName_scenario_expectedBehavior()`
- 报告采用 `@DisplayName("human-readable description")`

## 覆盖率

- 目标行覆盖率达到 80% 以上
- 使用 JaCoCo 生成覆盖率报告
- 关注 service 与 domain 逻辑——跳过简单的 getter / config 类

## 参考

参见 skill：`springboot-tdd`，了解使用 MockMvc 和 Testcontainers 的 Spring Boot TDD 模式。
参见 skill：`quarkus-tdd`，了解使用 REST Assured 和 Dev Services 的 Quarkus TDD 模式。
参见 skill：`java-coding-standards`，了解测试相关要求。
