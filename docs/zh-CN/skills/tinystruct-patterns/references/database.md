# tinystruct 数据库持久化

## 何时使用

使用内置的类 ORM 数据层进行数据库操作。它通过继承 `AbstractData` 的 POJO 和 XML mapping 文件，提供了一种 JPA/Hibernate 的轻量级替代方案。

## 工作原理

### 架构

每张表由以下内容表示：
1. **Java POJO**：继承 `AbstractData`，提供 getters/setters 和 `setData(Row)`。
2. **Mapping XML**：resources 中的 `ClassName.map.xml`，将 Java 字段绑定到数据库列。

#### 关键基类：`AbstractData`
提供 CRUD 方法：
- `append()` / `appendAndGetId()`
- `update()`
- `delete()`
- `findAll()` / `findOneById()` / `findOneByKey(key, value)`
- `findWith(where, params)`
- `find(SQL, params)`

### POJO 生成（CLI）

扫描实际数据库表以生成 POJO 和 mapping 文件。

#### 配置
`application.properties`：
```properties
driver=com.mysql.cj.jdbc.Driver
database.url=jdbc:mysql://localhost:3306/mydb
database.user=root
database.password=secret
```

#### 命令
```bash
# 交互模式
bin/dispatcher generate

# 指定表
bin/dispatcher generate --tables users
```

## 示例

### CRUD 操作
```java
// 创建
User user = new User();
user.setUsername("james");
user.append();

// 读取
User user = new User();
user.setId(42);
user.findOneById();

// 更新
user.setEmail("new@example.com");
user.update();

// 删除
user.delete();
```

### 条件查询
```java
User user = new User();
Table results = user.findWith("username LIKE ?", new Object[]{"%jam%"});

// 流式条件构建器
Condition condition = new Condition();
condition.setRequestFields("id,username");
Table filtered = user.find(
    condition.select("`users`").and("email LIKE ?").orderBy("id DESC"),
    new Object[]{"%@example.com"}
);
```

### Mapping XML 结构
`User.map.xml`：
```xml
<mapping>
  <class name="User" table="users">
    <id name="Id" column="id" increment="true" generate="false" length="11" type="int"/>
    <property name="username" column="username" length="50" type="varchar"/>
    <property name="email" column="email" length="100" type="varchar"/>
  </class>
</mapping>
```

## 重要规则

1. **文件放置**：mapping XML **必须**在 `src/main/resources/` 下镜像 POJO 的包路径。
2. **命名**：表名单数化后作为类名（`users` → `User`）。带下划线的列变为 camelCase 字段（`created_at` → `createdAt`）。
3. **Setters**：在 setter 中使用 `setFieldAsXxx` 方法（例如 `setFieldAsString`），将状态与内部 field map 同步。
4. **Id 字段**：Java 中的主键字段始终命名为 `Id`（继承自 `AbstractData`）。
