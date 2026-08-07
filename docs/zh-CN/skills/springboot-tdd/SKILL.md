---
name: springboot-tdd
description: 使用 JUnit 5、Mockito、MockMvc、Testcontainers 和 JaCoCo 进行 Spring Boot 测试驱动开发。在添加功能、修复 bug 或 refactor 时使用。
metadata:
  origin: ECC
---

# Spring Boot TDD 工作流

针对 Spring Boot 服务的 TDD 指导，覆盖率 80% 以上（单元测试 + 集成测试）。

## 何时使用

- 新增功能或 endpoint
- 修复 bug 或 refactor
- 添加数据访问逻辑或安全规则

## 工作流

1) 先写测试（应当失败）
2) 实现最少代码使其通过
3) 在测试 green 的前提下 refactor
4) 强制覆盖率（JaCoCo）

## 单元测试（JUnit 5 + Mockito）

```java
@ExtendWith(MockitoExtension.class)
class MarketServiceTest {
  @Mock MarketRepository repo;
  @InjectMocks MarketService service;

  @Test
  void createsMarket() {
    CreateMarketRequest req = new CreateMarketRequest("name", "desc", Instant.now(), List.of("cat"));
    when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

    Market result = service.create(req);

    assertThat(result.name()).isEqualTo("name");
    verify(repo).save(any());
  }
}
```

模式：
- Arrange-Act-Assert
- 避免部分 mock；优先使用显式 stub
- 对变体使用 `@ParameterizedTest`

## Web 层测试（MockMvc）

```java
@WebMvcTest(MarketController.class)
class MarketControllerTest {
  @Autowired MockMvc mockMvc;
  @MockBean MarketService marketService;

  @Test
  void returnsMarkets() throws Exception {
    when(marketService.list(any())).thenReturn(Page.empty());

    mockMvc.perform(get("/api/markets"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isArray());
  }
}
```

## 集成测试（SpringBootTest）

```java
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MarketIntegrationTest {
  @Autowired MockMvc mockMvc;

  @Test
  void createsMarket() throws Exception {
    mockMvc.perform(post("/api/markets")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"name":"Test","description":"Desc","endDate":"2030-01-01T00:00:00Z","categories":["general"]}
        """))
      .andExpect(status().isCreated());
  }
}
```

## 持久化测试（DataJpaTest）

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestContainersConfig.class)
class MarketRepositoryTest {
  @Autowired MarketRepository repo;

  @Test
  void savesAndFinds() {
    MarketEntity entity = new MarketEntity();
    entity.setName("Test");
    repo.save(entity);

    Optional<MarketEntity> found = repo.findByName("Test");
    assertThat(found).isPresent();
  }
}
```

## Testcontainers

- 对 Postgres/Redis 使用可复用容器以镜像生产环境
- 通过 `@DynamicPropertySource` 将 JDBC URL 注入 Spring context

## 覆盖率（JaCoCo）

Maven 片段：
```xml
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.14</version>
  <executions>
    <execution>
      <goals><goal>prepare-agent</goal></goals>
    </execution>
    <execution>
      <id>report</id>
      <phase>verify</phase>
      <goals><goal>report</goal></goals>
    </execution>
  </executions>
</plugin>
```

## 断言

- 优先使用 AssertJ（`assertThat`）以提高可读性
- 对 JSON 响应，使用 `jsonPath`
- 对异常：`assertThatThrownBy(...)`

## 测试数据构建器

```java
class MarketBuilder {
  private String name = "Test";
  MarketBuilder withName(String name) { this.name = name; return this; }
  Market build() { return new Market(null, name, MarketStatus.ACTIVE); }
}
```

## CI 命令

- Maven: `mvn -T 4 test` 或 `mvn verify`
- Gradle: `./gradlew test jacocoTestReport`

**切记**：保持测试快速、隔离且确定性。测试行为，而非实现细节。
