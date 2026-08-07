---
name: springboot-verification
description: "Spring Boot 项目的验证 loop：build、static analysis、带 coverage 的 test、security scan，以及 release 或 PR 前的 diff review。"
metadata:
  origin: ECC
---

# Spring Boot 验证 loop

在 PR 之前、重大变更之后以及部署前运行。

## 何时启用

- 在为 Spring Boot 服务提交 pull request 之前
- 在重大重构或依赖升级之后
- 在向 staging 或 production 部署前进行验证
- 运行完整的 build → lint → test → security scan pipeline
- 验证 test coverage 是否达到 threshold

## 第 1 阶段：Build

```bash
mvn -T 4 clean verify -DskipTests
# 或
./gradlew clean assemble -x test
```

如果 build 失败，停止并修复。

## 第 2 阶段：Static Analysis

Maven（常用 plugin）：
```bash
mvn -T 4 spotbugs:check pmd:check checkstyle:check
```

Gradle（如已配置）：
```bash
./gradlew checkstyleMain pmdMain spotbugsMain
```

## 第 3 阶段：Tests + Coverage

```bash
mvn -T 4 test
mvn jacoco:report   # 验证覆盖率达到 80% 以上
# 或
./gradlew test jacocoTestReport
```

报告：
- 总测试数、通过/失败数
- Coverage %（行/分支）

### 单元测试

在隔离环境中使用 mock 的依赖来测试 service 逻辑：

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

  @Mock private UserRepository userRepository;
  @InjectMocks private UserService userService;

  @Test
  void createUser_validInput_returnsUser() {
    var dto = new CreateUserDto("Alice", "alice@example.com");
    var expected = new User(1L, "Alice", "alice@example.com");
    when(userRepository.save(any(User.class))).thenReturn(expected);

    var result = userService.create(dto);

    assertThat(result.name()).isEqualTo("Alice");
    verify(userRepository).save(any(User.class));
  }

  @Test
  void createUser_duplicateEmail_throwsException() {
    var dto = new CreateUserDto("Alice", "existing@example.com");
    when(userRepository.existsByEmail(dto.email())).thenReturn(true);

    assertThatThrownBy(() -> userService.create(dto))
        .isInstanceOf(DuplicateEmailException.class);
  }
}
```

### 使用 Testcontainers 的集成测试

使用真实数据库进行测试，而不是 H2：

```java
@SpringBootTest
@Testcontainers
class UserRepositoryIntegrationTest {

  @Container
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
      .withDatabaseName("testdb");

  @DynamicPropertySource
  static void configureProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
  }

  @Autowired private UserRepository userRepository;

  @Test
  void findByEmail_existingUser_returnsUser() {
    userRepository.save(new User("Alice", "alice@example.com"));

    var found = userRepository.findByEmail("alice@example.com");

    assertThat(found).isPresent();
    assertThat(found.get().getName()).isEqualTo("Alice");
  }
}
```

### 使用 MockMvc 的 API 测试

在完整的 Spring context 下测试 controller 层：

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

  @Autowired private MockMvc mockMvc;
  @MockBean private UserService userService;

  @Test
  void createUser_validInput_returns201() throws Exception {
    var user = new UserDto(1L, "Alice", "alice@example.com");
    when(userService.create(any())).thenReturn(user);

    mockMvc.perform(post("/api/users")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"name": "Alice", "email": "alice@example.com"}
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.name").value("Alice"));
  }

  @Test
  void createUser_invalidEmail_returns400() throws Exception {
    mockMvc.perform(post("/api/users")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"name": "Alice", "email": "not-an-email"}
                """))
        .andExpect(status().isBadRequest());
  }
}
```

## 第 4 阶段：Security Scan

```bash
# 依赖 CVE
mvn org.owasp:dependency-check-maven:check
# 或
./gradlew dependencyCheckAnalyze

# 源码中的 secrets
grep -rn "password\s*=\s*\"" src/ --include="*.java" --include="*.yml" --include="*.properties"
grep -rn "sk-\|api_key\|secret" src/ --include="*.java" --include="*.yml"

# Secrets（git 历史）
git secrets --scan  # 如已配置
```

### 常见安全发现

```
# 检查 System.out.println（应改用 logger）
grep -rn "System\.out\.print" src/main/ --include="*.java"

# 检查 response 中是否暴露原始异常消息
grep -rn "e\.getMessage()" src/main/ --include="*.java"

# 检查通配符 CORS
grep -rn "allowedOrigins.*\*" src/main/ --include="*.java"
```

## 第 5 阶段：Lint/Format（可选 gate）

```bash
mvn spotless:apply   # 如使用 Spotless plugin
./gradlew spotlessApply
```

## 第 6 阶段：Diff Review

```bash
git diff --stat
git diff
```

检查清单：
- 没有遗留的调试 log（`System.out`、未加守卫的 `log.debug`）
- 有意义的错误信息和 HTTP 状态码
- 在需要的地方存在事务和校验
- 配置变更已记录在案

## 输出模板

```
验证报告
===================
Build:     [PASS/FAIL]
Static:    [PASS/FAIL] (spotbugs/pmd/checkstyle)
Tests:     [PASS/FAIL] (X/Y 通过，覆盖率 Z%)
Security:  [PASS/FAIL] (CVE 发现数：N)
Diff:      [变更 X 个文件]

Overall:   [READY / NOT READY]

待修复问题：
1. ...
2. ...
```

## 持续模式

- 在重大变更后或长 session 中每 30–60 分钟重新运行各阶段
- 保持短反馈 loop：用 `mvn -T 4 test` + spotbugs 获取快速反馈

**切记**：快速反馈胜过事后惊喜。保持 gate 严格——在生产系统中将 warning 视为缺陷。
