---
name: springboot-patterns
description: Spring Boot 架构模式、REST API 设计、分层服务、数据访问、缓存、异步处理与日志。用于 Java Spring Boot 后端开发。
metadata:
  origin: ECC
---

# Spring Boot 开发模式

Spring Boot 架构与 API 模式，用于可扩展的生产级服务。

## 何时激活

- 使用 Spring MVC 或 WebFlux 构建 REST API
- 构建 controller → service → repository 分层结构
- 配置 Spring Data JPA、缓存或异步处理
- 添加校验、异常处理或分页
- 为 dev/staging/生产环境配置 profile
- 使用 Spring Events 或 Kafka 实现事件驱动模式

## REST API 结构

```java
@RestController
@RequestMapping("/api/markets")
@Validated
class MarketController {
  private final MarketService marketService;

  MarketController(MarketService marketService) {
    this.marketService = marketService;
  }

  @GetMapping
  ResponseEntity<Page<MarketResponse>> list(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    Page<Market> markets = marketService.list(PageRequest.of(page, size));
    return ResponseEntity.ok(markets.map(MarketResponse::from));
  }

  @PostMapping
  ResponseEntity<MarketResponse> create(@Valid @RequestBody CreateMarketRequest request) {
    Market market = marketService.create(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(MarketResponse.from(market));
  }
}
```

## Repository Pattern（Spring Data JPA）

```java
public interface MarketRepository extends JpaRepository<MarketEntity, Long> {
  @Query("select m from MarketEntity m where m.status = :status order by m.volume desc")
  List<MarketEntity> findActive(@Param("status") MarketStatus status, Pageable pageable);
}
```

## Service Layer 与事务

```java
@Service
public class MarketService {
  private final MarketRepository repo;

  public MarketService(MarketRepository repo) {
    this.repo = repo;
  }

  @Transactional
  public Market create(CreateMarketRequest request) {
    MarketEntity entity = MarketEntity.from(request);
    MarketEntity saved = repo.save(entity);
    return Market.from(saved);
  }
}
```

## DTO 与校验

```java
public record CreateMarketRequest(
    @NotBlank @Size(max = 200) String name,
    @NotBlank @Size(max = 2000) String description,
    @NotNull @FutureOrPresent Instant endDate,
    @NotEmpty List<@NotBlank String> categories) {}

public record MarketResponse(Long id, String name, MarketStatus status) {
  static MarketResponse from(Market market) {
    return new MarketResponse(market.id(), market.name(), market.status());
  }
}
```

## 异常处理

```java
@ControllerAdvice
class GlobalExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
    String message = ex.getBindingResult().getFieldErrors().stream()
        .map(e -> e.getField() + ": " + e.getDefaultMessage())
        .collect(Collectors.joining(", "));
    return ResponseEntity.badRequest().body(ApiError.validation(message));
  }

  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<ApiError> handleAccessDenied() {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiError.of("Forbidden"));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiError> handleGeneric(Exception ex) {
    // 记录意外错误及其堆栈
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiError.of("Internal server error"));
  }
}
```

## 缓存

需要在配置类上添加 `@EnableCaching`。

```java
@Service
public class MarketCacheService {
  private final MarketRepository repo;

  public MarketCacheService(MarketRepository repo) {
    this.repo = repo;
  }

  @Cacheable(value = "market", key = "#id")
  public Market getById(Long id) {
    return repo.findById(id)
        .map(Market::from)
        .orElseThrow(() -> new EntityNotFoundException("Market not found"));
  }

  @CacheEvict(value = "market", key = "#id")
  public void evict(Long id) {}
}
```

## 异步处理

需要在配置类上添加 `@EnableAsync`。

```java
@Service
public class NotificationService {
  @Async
  public CompletableFuture<Void> sendAsync(Notification notification) {
    // 发送邮件/短信
    return CompletableFuture.completedFuture(null);
  }
}
```

## 日志（SLF4J）

```java
@Service
public class ReportService {
  private static final Logger log = LoggerFactory.getLogger(ReportService.class);

  public Report generate(Long marketId) {
    log.info("generate_report marketId={}", marketId);
    try {
      // 业务逻辑
    } catch (Exception ex) {
      log.error("generate_report_failed marketId={}", marketId, ex);
      throw ex;
    }
    return new Report();
  }
}
```

## Middleware / Filter

```java
@Component
public class RequestLoggingFilter extends OncePerRequestFilter {
  private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    long start = System.currentTimeMillis();
    try {
      filterChain.doFilter(request, response);
    } finally {
      long duration = System.currentTimeMillis() - start;
      log.info("req method={} uri={} status={} durationMs={}",
          request.getMethod(), request.getRequestURI(), response.getStatus(), duration);
    }
  }
}
```

## 分页与排序

```java
PageRequest page = PageRequest.of(pageNumber, pageSize, Sort.by("createdAt").descending());
Page<Market> results = marketService.list(page);
```

## 容错的外部调用

```java
public <T> T withRetry(Supplier<T> supplier, int maxRetries) {
  int attempts = 0;
  while (true) {
    try {
      return supplier.get();
    } catch (Exception ex) {
      attempts++;
      if (attempts >= maxRetries) {
        throw ex;
      }
      try {
        Thread.sleep((long) Math.pow(2, attempts) * 100L);
      } catch (InterruptedException ie) {
        Thread.currentThread().interrupt();
        throw ex;
      }
    }
  }
}
```

## Rate Limiting（Filter + Bucket4j）

**安全提示**：`X-Forwarded-For` header 默认不可信，因为客户端可以伪造它。
仅在以下情况下使用 forwarded header：
1. 你的应用位于受信任的 reverse proxy 之后（nginx、AWS ALB 等）
2. 你已将 `ForwardedHeaderFilter` 注册为 bean
3. 你已在应用属性中配置 `server.forward-headers-strategy=NATIVE` 或 `FRAMEWORK`
4. 你的 proxy 已配置为覆盖（而非追加）`X-Forwarded-For` header

当 `ForwardedHeaderFilter` 正确配置后，`request.getRemoteAddr()` 会自动从 forwarded header 中返回正确的客户端 IP。若缺少此配置，请直接使用 `request.getRemoteAddr()`——它返回的是直连 IP，这是唯一可信的值。

```java
@Component
public class RateLimitFilter extends OncePerRequestFilter {
  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  /*
   * 安全提示：此 Filter 使用 request.getRemoteAddr() 来识别限流客户端。
   *
   * 如果你的应用位于 reverse proxy 之后（nginx、AWS ALB 等），必须配置
   * Spring 正确处理 forwarded header，才能准确检测客户端 IP：
   *
   * 1. 在 application.properties/yaml 中设置 server.forward-headers-strategy=NATIVE
   *    （适用于云平台）或 FRAMEWORK
   * 2. 如果使用 FRAMEWORK 策略，注册 ForwardedHeaderFilter：
   *
   *    @Bean
   *    ForwardedHeaderFilter forwardedHeaderFilter() {
   *        return new ForwardedHeaderFilter();
   *    }
   *
   * 3. 确保 proxy 覆盖（而非追加）X-Forwarded-For header，以防止伪造
   * 4. 为你的容器配置 server.tomcat.remoteip.trusted-proxies 或等效设置
   *
   * 缺少此配置时，request.getRemoteAddr() 返回的是 proxy IP，而非客户端 IP。
   * 切勿直接读取 X-Forwarded-For——在没有可信 proxy 处理的情况下，它极易被伪造。
   */
  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    // 使用 getRemoteAddr()：当 ForwardedHeaderFilter 已配置时返回正确的客户端 IP，
    // 否则返回直连 IP。在没有正确 proxy 配置的情况下，切勿直接信任 X-Forwarded-For header。
    String clientIp = request.getRemoteAddr();

    Bucket bucket = buckets.computeIfAbsent(clientIp,
        k -> Bucket.builder()
            .addLimit(Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1))))
            .build());

    if (bucket.tryConsume(1)) {
      filterChain.doFilter(request, response);
    } else {
      response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
    }
  }
}
```

## Background Job

使用 Spring 的 `@Scheduled`，或与队列集成（如 Kafka、SQS、RabbitMQ）。保持 handler 幂等且可观测。

## 可观测性

- 通过 Logback encoder 进行结构化日志（JSON）
- Metrics：Micrometer + Prometheus/OTel
- Tracing：使用 Micrometer Tracing 搭配 OpenTelemetry 或 Brave backend

## 生产环境默认实践

- 优先使用 constructor injection，避免 field injection
- 启用 `spring.mvc.problemdetails.enabled=true` 以支持 RFC 7807 错误（Spring Boot 3+）
- 根据工作负载配置 HikariCP 连接池大小，并设置超时
- 查询使用 `@Transactional(readOnly = true)`
- 在合适的位置通过 `@NonNull` 和 `Optional` 强制 null 安全

**切记**：保持 controller 轻量、service 聚焦、repository 简洁，错误集中处理。以可维护性和可测试性为目标进行优化。
