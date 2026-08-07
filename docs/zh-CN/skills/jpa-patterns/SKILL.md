---
name: jpa-patterns
description: 面向 Spring Boot 的 JPA/Hibernate 模式，涵盖实体设计、关联关系、查询优化、事务、审计、索引、分页与连接池。
metadata:
  origin: ECC
---

# JPA/Hibernate Patterns

用于 Spring Boot 中的数据建模、Repository 与性能调优。

## When to Activate

- 设计 JPA 实体与表映射
- 定义关联关系（@OneToMany、@ManyToOne、@ManyToMany）
- 优化查询（N+1 预防、fetch 策略、投影）
- 配置事务、审计或软删除
- 设置分页、排序或自定义 Repository 方法
- 调优连接池（HikariCP）或二级缓存

## Entity Design

```java
@Entity
@Table(name = "markets", indexes = {
  @Index(name = "idx_markets_slug", columnList = "slug", unique = true)
})
@EntityListeners(AuditingEntityListener.class)
public class MarketEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 200)
  private String name;

  @Column(nullable = false, unique = true, length = 120)
  private String slug;

  @Enumerated(EnumType.STRING)
  private MarketStatus status = MarketStatus.ACTIVE;

  @CreatedDate private Instant createdAt;
  @LastModifiedDate private Instant updatedAt;
}
```

启用审计：
```java
@Configuration
@EnableJpaAuditing
class JpaConfig {}
```

## Relationships and N+1 Prevention

```java
@OneToMany(mappedBy = "market", cascade = CascadeType.ALL, orphanRemoval = true)
private List<PositionEntity> positions = new ArrayList<>();
```

- 默认使用懒加载；需要时在查询中使用 `JOIN FETCH`
- 避免在集合上使用 `EAGER`；读路径使用 DTO 投影

```java
@Query("select m from MarketEntity m left join fetch m.positions where m.id = :id")
Optional<MarketEntity> findWithPositions(@Param("id") Long id);
```

## Repository Patterns

```java
public interface MarketRepository extends JpaRepository<MarketEntity, Long> {
  Optional<MarketEntity> findBySlug(String slug);

  @Query("select m from MarketEntity m where m.status = :status")
  Page<MarketEntity> findByStatus(@Param("status") MarketStatus status, Pageable pageable);
}
```

- 对轻量查询使用投影：
```java
public interface MarketSummary {
  Long getId();
  String getName();
  MarketStatus getStatus();
}
Page<MarketSummary> findAllBy(Pageable pageable);
```

## Transactions

- 使用 `@Transactional` 标注 service 方法
- 对读路径使用 `@Transactional(readOnly = true)` 以优化
- 谨慎选择传播行为；避免长时间运行的事务

```java
@Transactional
public Market updateStatus(Long id, MarketStatus status) {
  MarketEntity entity = repo.findById(id)
      .orElseThrow(() -> new EntityNotFoundException("Market"));
  entity.setStatus(status);
  return Market.from(entity);
}
```

## Pagination

```java
PageRequest page = PageRequest.of(pageNumber, pageSize, Sort.by("createdAt").descending());
Page<MarketEntity> markets = repo.findByStatus(MarketStatus.ACTIVE, page);
```

对于类似游标的分页，在 JPQL 中加入 `id > :lastId` 并排序。

## Indexing and Performance

- 为常用过滤条件（`status`、`slug`、外键）添加索引
- 使用匹配查询模式的复合索引（`status, created_at`）
- 避免 `select *`；只投影所需列
- 使用 `saveAll` 和 `hibernate.jdbc.batch_size` 批量写入

## Connection Pooling (HikariCP)

推荐属性：
```
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.validation-timeout=5000
```

对于 PostgreSQL 的 LOB 处理，添加：
```
spring.jpa.properties.hibernate.jdbc.lob.non_contextual_creation=true
```

## Caching

- 一级缓存属于单个 EntityManager；避免跨事务持有实体
- 对读密集的实体，谨慎考虑二级缓存；验证淘汰策略

## Migrations

- 使用 Flyway 或 Liquibase；生产环境绝不依赖 Hibernate 自动 DDL
- 保持迁移幂等且增量；避免无计划地删除列

## Testing Data Access

- 优先使用 `@DataJpaTest` 配合 Testcontainers 以模拟生产环境
- 通过日志断言 SQL 效率：设置 `logging.level.org.hibernate.SQL=DEBUG`，并设置 `logging.level.org.hibernate.orm.jdbc.bind=TRACE` 以查看参数值

**Remember**：保持实体精简、查询有目的、事务简短。用 fetch 策略和投影预防 N+1，并为读写路径建立索引。
