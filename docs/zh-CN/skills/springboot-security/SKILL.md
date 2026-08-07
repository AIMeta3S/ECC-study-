---
name: springboot-security
description: Spring Security 在 Java Spring Boot 服务中关于认证/授权、校验、CSRF、密钥、安全头、限流以及依赖安全的最佳实践。
metadata:
  origin: ECC
---

# Spring Boot Security 审查

在添加认证、处理输入、创建端点或处理密钥时使用。

## 何时启用

- 添加认证（JWT、OAuth2、基于 session）
- 实现授权（@PreAuthorize、基于角色的访问控制）
- 校验用户输入（Bean Validation、自定义校验器）
- 配置 CORS、CSRF 或安全头
- 管理密钥（Vault、环境变量）
- 添加限流或暴力破解防护
- 扫描依赖以排查 CVE

## 认证

- 优先使用无状态的 JWT 或带撤销列表的 opaque token
- 为 session 使用 `httpOnly`、`Secure`、`SameSite=Strict` cookie
- 使用 `OncePerRequestFilter` 或资源服务器校验 token

```java
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
  private final JwtService jwtService;

  public JwtAuthFilter(JwtService jwtService) {
    this.jwtService = jwtService;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain chain) throws ServletException, IOException {
    String header = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (header != null && header.startsWith("Bearer ")) {
      String token = header.substring(7);
      Authentication auth = jwtService.authenticate(token);
      SecurityContextHolder.getContext().setAuthentication(auth);
    }
    chain.doFilter(request, response);
  }
}
```

## 授权

- 启用方法级安全：`@EnableMethodSecurity`
- 使用 `@PreAuthorize("hasRole('ADMIN')")` 或 `@PreAuthorize("@authz.canEdit(#id)")`
- 默认拒绝；只暴露必需的 scope

```java
@RestController
@RequestMapping("/api/admin")
public class AdminController {

  @PreAuthorize("hasRole('ADMIN')")
  @GetMapping("/users")
  public List<UserDto> listUsers() {
    return userService.findAll();
  }

  @PreAuthorize("@authz.isOwner(#id, authentication)")
  @DeleteMapping("/users/{id}")
  public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
    userService.delete(id);
    return ResponseEntity.noContent().build();
  }
}
```

## 输入校验

- 在 controller 上使用 Bean Validation 配合 `@Valid`
- 在 DTO 上施加约束：`@NotBlank`、`@Email`、`@Size`、自定义校验器
- 渲染前用白名单净化任何 HTML

```java
// 糟糕：无校验
@PostMapping("/users")
public User createUser(@RequestBody UserDto dto) {
  return userService.create(dto);
}

// 良好：经过校验的 DTO
public record CreateUserDto(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email String email,
    @NotNull @Min(0) @Max(150) Integer age
) {}

@PostMapping("/users")
public ResponseEntity<UserDto> createUser(@Valid @RequestBody CreateUserDto dto) {
  return ResponseEntity.status(HttpStatus.CREATED)
      .body(userService.create(dto));
}
```

## SQL 注入防护

- 使用 Spring Data repository 或参数化查询
- 对于原生查询，使用 `:param` 绑定；切勿拼接字符串

```java
// 糟糕：原生查询中拼接字符串
@Query(value = "SELECT * FROM users WHERE name = '" + name + "'", nativeQuery = true)

// 良好：参数化原生查询
@Query(value = "SELECT * FROM users WHERE name = :name", nativeQuery = true)
List<User> findByName(@Param("name") String name);

// 良好：Spring Data 派生查询（自动参数化）
List<User> findByEmailAndActiveTrue(String email);
```

## 密码编码

- 始终使用 BCrypt 或 Argon2 对密码进行哈希——绝不存储明文
- 使用 `PasswordEncoder` bean，而非手动哈希

```java
@Bean
public PasswordEncoder passwordEncoder() {
  return new BCryptPasswordEncoder(12); // cost factor 为 12
}

// 在 service 中
public User register(CreateUserDto dto) {
  String hashedPassword = passwordEncoder.encode(dto.password());
  return userRepository.save(new User(dto.email(), hashedPassword));
}
```

## CSRF 防护

- 对于浏览器 session 应用，保持 CSRF 启用；在表单/请求头中包含 token
- 对于使用 Bearer token 的纯 API，禁用 CSRF 并依赖无状态认证

```java
http
  .csrf(csrf -> csrf.disable())
  .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
```

## 密钥管理

- 源码中不存放密钥；从环境变量或 vault 加载
- 保持 `application.yml` 不含凭据；使用占位符
- 定期轮换 token 和数据库凭据

```yaml
# 糟糕：硬编码在 application.yml 中
spring:
  datasource:
    password: mySecretPassword123

# 良好：环境变量占位符
spring:
  datasource:
    password: ${DB_PASSWORD}

# 良好：Spring Cloud Vault 集成
spring:
  cloud:
    vault:
      uri: https://vault.example.com
      token: ${VAULT_TOKEN}
```

## 安全头

```java
http
  .headers(headers -> headers
    .contentSecurityPolicy(csp -> csp
      .policyDirectives("default-src 'self'"))
    .frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin)
    .xssProtection(Customizer.withDefaults())
    .referrerPolicy(rp -> rp.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER)));
```

## CORS 配置

- 在 security filter 层级配置 CORS，而非按 controller 配置
- 限制允许的 origin——生产环境绝不使用 `*`

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
  CorsConfiguration config = new CorsConfiguration();
  config.setAllowedOrigins(List.of("https://app.example.com"));
  config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
  config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
  config.setAllowCredentials(true);
  config.setMaxAge(3600L);

  UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
  source.registerCorsConfiguration("/api/**", config);
  return source;
}

// 在 SecurityFilterChain 中：
http.cors(cors -> cors.configurationSource(corsConfigurationSource()));
```

## 限流

- 对开销大的端点施加 Bucket4j 或网关层级的限制
- 对突发流量记录日志并告警；返回 429 并附带重试提示

```java
// 使用 Bucket4j 对每个端点进行限流
@Component
public class RateLimitFilter extends OncePerRequestFilter {
  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  private Bucket createBucket() {
    return Bucket.builder()
        .addLimit(Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1))))
        .build();
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain chain) throws ServletException, IOException {
    String clientIp = request.getRemoteAddr();
    Bucket bucket = buckets.computeIfAbsent(clientIp, k -> createBucket());

    if (bucket.tryConsume(1)) {
      chain.doFilter(request, response);
    } else {
      response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
      response.getWriter().write("{\"error\": \"Rate limit exceeded\"}");
    }
  }
}
```

## 依赖安全

- 在 CI 中运行 OWASP Dependency Check / Snyk
- 保持 Spring Boot 和 Spring Security 处于受支持版本
- 遇到已知 CVE 时让构建失败

## 日志与 PII

- 绝不记录密钥、token、密码或完整的 PAN 数据
- 对敏感字段脱敏；使用结构化 JSON 日志

## 文件上传

- 校验大小、content type 和扩展名
- 存储于 web root 之外；如需要则扫描

## 发布前检查清单

- [ ] 认证 token 已正确校验和过期
- [ ] 每个敏感路径都有授权守护
- [ ] 所有输入都已校验和净化
- [ ] 没有字符串拼接的 SQL
- [ ] CSRF 防护策略与应用类型相符
- [ ] 密钥已外部化；未提交任何密钥
- [ ] 安全头已配置
- [ ] API 已限流
- [ ] 依赖已扫描且保持最新
- [ ] 日志不含敏感数据

**切记**：默认拒绝、校验输入、最小权限，并以配置安全为先。
