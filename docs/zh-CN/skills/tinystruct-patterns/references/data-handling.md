# tinystruct 数据处理 (JSON)

## 何时使用

优先使用 `org.tinystruct.data.component.Builder` 和 `Builders` 来处理轻量级、零依赖的 JSON。使用 `Builder` 表示 JSON 对象 (`{}`)，使用 `Builders` 表示 JSON 数组 (`[]`)。**始终使用 `Builders` 而非 `List<Builder>`**，以避免泛型类型擦除问题。

## 工作原理

`Builder` 提供键值接口，用于创建和读取 JSON 对象。`Builders` 为 JSON 数组提供带索引的列表。两者都直接集成到 `AbstractApplication` 的结果处理流程中。

### 为什么使用 Builder/Builders？
- **零外部依赖** — 精简且快速
- **原生集成** — 与框架的结果处理协同工作
- **类型安全** — `Builders` 能正确序列化为 `[]`；`List<Builder>` 可能引发类型转换问题

## 示例

### 序列化单个对象
```java
import org.tinystruct.data.component.Builder;

Builder response = new Builder();
response.put("status", "success");
response.put("count", 42);
return response.toString(); // {"status":"success","count":42}
```

### 使用 Builders 序列化列表
```java
import org.tinystruct.data.component.Builder;
import org.tinystruct.data.component.Builders;

Builders dataList = new Builders();
for (MyModel item : myCollection) {
    Builder b = new Builder();
    b.put("id", item.getId());
    b.put("name", item.getName());
    dataList.add(b);
}
Builder response = new Builder();
response.put("data", dataList);
return response.toString(); // {"data":[{"id":1,"name":"X"}]}
```

### 解析 JSON 对象
```java
Builder parsed = new Builder();
parsed.parse(jsonString);
String status = parsed.get("status").toString();
```

### 解析 JSON 数组
```java
Builders parsedArray = new Builders();
parsedArray.parse(jsonArrayString);
for (int i = 0; i < parsedArray.size(); i++) {
    Builder item = parsedArray.get(i);
    System.out.println(item.get("name"));
}
```
