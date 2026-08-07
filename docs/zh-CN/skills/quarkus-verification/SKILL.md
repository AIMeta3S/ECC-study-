---
name: quarkus-verification
description: "面向 Quarkus 项目的验证循环：在发布或 PR 之前进行 build、static analysis、带覆盖率的测试、安全扫描、native 编译以及 diff 审查。"
metadata:
  origin: ECC
---

# Quarkus 验证循环

在 PR 之前、重大变更之后以及部署前运行。

## 何时启用

- 在为 Quarkus 服务提交 pull request 之前
- 在重大重构或依赖升级之后
- 面向 staging 或生产环境的部署前验证
- 运行完整的 build → lint → test → security scan → native compilation 流水线
- 验证测试覆盖率达标（80%+）
- 测试 native image 兼容性

## 阶段 1：Build

```bash
# Maven
mvn clean verify -DskipTests

# Gradle
./gradlew clean assemble -x test
```

如果 build 失败，停止并修复编译错误。

## 阶段 2：Static Analysis

### Checkstyle、PMD、SpotBugs（Maven）

```bash
mvn checkstyle:check pmd:check spotbugs:check
```

### SonarQube（如已配置）

```bash
mvn sonar:sonar \
  -Dsonar.projectKey=my-quarkus-project \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=${SONAR_TOKEN}
```

### 需要处理的常见问题

- 未使用的 import 或变量
- 复杂度过高的方法（高圈复杂度）
- 潜在的空指针解引用
- SpotBugs 标记的安全问题

## 阶段 3：Tests + Coverage

```bash
# 运行全部测试
mvn clean test

# 生成覆盖率报告
mvn jacoco:report

# 强制覆盖率阈值（80%）
mvn jacoco:check

# 或使用 Gradle
./gradlew test jacocoTestReport jacocoTestCoverageVerification
```

### 测试分类

#### Unit Tests
使用 mock 的依赖项测试 service 逻辑：

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
  @Mock UserRepository userRepository;
  @InjectMocks UserService userService;

  @Test
  void createUser_validInput_returnsUser() {
    var dto = new CreateUserDto("Alice", "alice@example.com");

    // Panache persist() 返回 void —— 使用 doNothing + verify
    doNothing().when(userRepository).persist(any(User.class));

    User result = userService.create(dto);

    assertThat(result.name).isEqualTo("Alice");
    verify(userRepository).persist(any(User.class));
  }
}
```

#### Integration Tests
使用真实数据库测试（Testcontainers）：

```java
@QuarkusTest
@QuarkusTestResource(PostgresTestResource.class)
class UserRepositoryIntegrationTest {

  @Inject
  UserRepository userRepository;

  @Test
  @Transactional
  void findByEmail_existingUser_returnsUser() {
    User user = new User();
    user.name = "Alice";
    user.email = "alice@example.com";
    userRepository.persist(user);

    Optional<User> found = userRepository.findByEmail("alice@example.com");

    assertThat(found).isPresent();
    assertThat(found.get().name).isEqualTo("Alice");
  }
}
```

#### API Tests
使用 REST Assured 测试 REST 端点：

```java
@QuarkusTest
class UserResourceTest {

  @Test
  void createUser_validInput_returns201() {
    given()
        .contentType(ContentType.JSON)
        .body("""
            {"name": "Alice", "email": "alice@example.com"}
            """)
        .when().post("/api/users")
        .then()
        .statusCode(201)
        .body("name", equalTo("Alice"));
  }

  @Test
  void createUser_invalidEmail_returns400() {
    given()
        .contentType(ContentType.JSON)
        .body("""
            {"name": "Alice", "email": "invalid"}
            """)
        .when().post("/api/users")
        .then()
        .statusCode(400);
  }
}
```

### 覆盖率报告

查看 `target/site/jacoco/index.html` 获取详细覆盖率：
- 整体行覆盖率（目标：80%+）
- 分支覆盖率（目标：70%+）
- 识别未覆盖的关键路径

## 阶段 4：Security Scanning

### 依赖漏洞（Maven）

```bash
mvn org.owasp:dependency-check-maven:check
```

查看 `target/dependency-check-report.html` 了解 CVE。

### Quarkus 安全审计

```bash
# 检查存在漏洞的 extension
mvn quarkus:audit

# 列出全部 extension
mvn quarkus:list-extensions
```

### OWASP ZAP（API 安全测试）

```bash
docker run -t owasp/zap2docker-stable zap-api-scan.py \
  -t http://localhost:8080/q/openapi \
  -f openapi
```

### 常见安全检查

- [ ] 所有 secret 存放在环境变量中（不在代码中）
- [ ] 所有端点都执行输入校验
- [ ] 已配置 authentication/authorization
- [ ] CORS 已正确配置
- [ ] 已设置安全头
- [ ] 密码使用 BCrypt 哈希
- [ ] SQL 注入防护（参数化查询）
- [ ] 公开端点设有限流

## 阶段 5：Native Compilation

测试 GraalVM native image 兼容性：

```bash
# 构建 native 可执行文件
mvn package -Dnative

# 或使用 container
mvn package -Dnative -Dquarkus.native.container-build=true

# 测试 native 可执行文件
./target/*-runner

# 运行基础 smoke test
curl http://localhost:8080/q/health/live
curl http://localhost:8080/q/health/ready
```

### Native Image 问题排查

常见问题：
- **Reflection**：为动态类添加 reflection 配置
- **Resources**：使用 `quarkus.native.resources.includes` 纳入资源
- **JNI**：如使用 native 库，注册 JNI 类

reflection 配置示例：
```java
@RegisterForReflection(targets = {MyDynamicClass.class})
public class ReflectionConfiguration {}
```

## 阶段 6：性能测试

### 使用 K6 进行负载测试

```javascript
// load-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const res = http.get('http://localhost:8080/api/markets');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
```

运行：
```bash
k6 run load-test.js
```

### 需要监控的指标

- 响应时间（p50、p95、p99）
- 吞吐量（requests/sec）
- 错误率
- 内存使用量
- CPU 使用率

## 阶段 7：Health Checks

```bash
# Liveness
curl http://localhost:8080/q/health/live

# Readiness
curl http://localhost:8080/q/health/ready

# 全部 health check
curl http://localhost:8080/q/health

# 指标（如已启用）
curl http://localhost:8080/q/metrics
```

预期响应：
```json
{
  "status": "UP",
  "checks": [
    {
      "name": "Database connection",
      "status": "UP"
    }
  ]
}
```

## 阶段 8：Container Image Build

```bash
# 构建 container image
mvn package -Dquarkus.container-image.build=true

# 或指定 registry
mvn package \
  -Dquarkus.container-image.build=true \
  -Dquarkus.container-image.registry=docker.io \
  -Dquarkus.container-image.group=myorg \
  -Dquarkus.container-image.tag=1.0.0

# 测试 container
docker run -p 8080:8080 myorg/my-quarkus-app:1.0.0
```

### Container 安全扫描

```bash
# Trivy
trivy image myorg/my-quarkus-app:1.0.0

# Grype
grype myorg/my-quarkus-app:1.0.0
```

## 阶段 9：配置校验

```bash
# 检查所有配置属性
mvn quarkus:info

# 列出全部 config source
curl http://localhost:8080/q/dev/io.quarkus.quarkus-vertx-http/config
```

### 针对各环境的检查

- [ ] 每个环境都已配置数据库 URL
- [ ] secret 已外置（Vault、环境变量）
- [ ] 日志级别合适
- [ ] CORS 来源设置正确
- [ ] 已配置限流
- [ ] 已启用监控/tracing

## 阶段 10：文档审查

- [ ] OpenAPI/Swagger 文档为最新（`/q/swagger-ui`）
- [ ] README 包含 setup 说明
- [ ] API 变更已记录
- [ ] 针对破坏性变更提供迁移指南
- [ ] 配置属性已记录

生成 OpenAPI spec：
```bash
curl http://localhost:8080/q/openapi -o openapi.json
```

## 验证清单

### 代码质量
- [ ] build 通过且无警告
- [ ] static analysis 无问题（无 high/medium 级别 issue）
- [ ] 代码遵循团队规范
- [ ] PR 中无注释掉的代码或 TODO

### 测试
- [ ] 所有测试通过
- [ ] 代码覆盖率 ≥ 80%
- [ ] 使用真实数据库的 integration test
- [ ] 安全测试通过
- [ ] 性能在可接受范围内

### 安全
- [ ] 无依赖漏洞
- [ ] authentication/authorization 已测试
- [ ] 输入校验完整
- [ ] 源代码中无 secret
- [ ] 已配置安全头

### 部署
- [ ] native 编译成功
- [ ] container image 构建成功
- [ ] health check 正确响应
- [ ] 配置对目标环境有效

### Native Image
- [ ] native 可执行文件构建成功
- [ ] native 测试通过
- [ ] 启动时间 < 100ms
- [ ] 内存占用可接受

## 自动化验证脚本

```bash
#!/bin/bash
set -e

echo "=== Phase 1: Build ==="
mvn clean verify -DskipTests

echo "=== Phase 2: Static Analysis ==="
mvn checkstyle:check pmd:check spotbugs:check

echo "=== Phase 3: Tests + Coverage ==="
mvn test jacoco:report jacoco:check

echo "=== Phase 4: Security Scan ==="
mvn org.owasp:dependency-check-maven:check

echo "=== Phase 5: Native Compilation ==="
mvn package -Dnative -Dquarkus.native.container-build=true

echo "=== All Phases Complete ==="
echo "Review reports:"
echo "  - Coverage: target/site/jacoco/index.html"
echo "  - Security: target/dependency-check-report.html"
echo "  - Native: target/*-runner"
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Verification

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up JDK 21
        uses: actions/setup-java@v3
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Cache Maven packages
        uses: actions/cache@v3
        with:
          path: ~/.m2
          key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}

      - name: Build
        run: mvn clean verify -DskipTests

      - name: Test with Coverage
        run: mvn test jacoco:report jacoco:check

      - name: Security Scan
        run: mvn org.owasp:dependency-check-maven:check

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: target/site/jacoco/jacoco.xml
```

## 最佳实践

- 每次 PR 之前运行验证循环
- 在 CI/CD pipeline 中自动化
- 立即修复问题；不要累积技术债
- 保持覆盖率在 80% 以上
- 定期更新依赖
- 定期测试 native 编译
- 监控性能趋势
- 记录破坏性变更
- 审查安全扫描结果
- 为每个环境校验配置
