---
name: api-design
description: REST API 设计模式，涵盖资源命名、状态码、分页、过滤、错误响应、版本控制与限流，适用于生产级 API。
metadata:
  origin: ECC
---

# API 设计模式

设计一致、对开发者友好的 REST API 的约定与最佳实践。

## 何时启用

- 设计新的 API endpoint
- 审查现有 API 契约
- 添加分页、过滤或排序
- 为 API 实现 error handling
- 规划 API 版本控制策略
- 构建公开或面向合作伙伴的 API

## 资源设计

### URL 结构

```
# 资源使用名词、复数、小写、kebab-case
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PUT    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id

# 用子资源表示关系
GET    /api/v1/users/:id/orders
POST   /api/v1/users/:id/orders

# 不映射到 CRUD 的动作（谨慎使用动词）
POST   /api/v1/orders/:id/cancel
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
```

### 命名规则

```
# GOOD
/api/v1/team-members          # 多词资源使用 kebab-case
/api/v1/orders?status=active  # 用 query params 过滤
/api/v1/users/123/orders      # 用嵌套资源表示归属

# BAD
/api/v1/getUsers              # URL 中包含动词
/api/v1/user                  # 单数（应使用复数）
/api/v1/team_members          # URL 中使用 snake_case
/api/v1/users/123/getOrders   # 嵌套资源中包含动词
```

## HTTP 方法与状态码

### 方法语义

| Method | Idempotent | Safe | 用途 |
|--------|-----------|------|---------|
| GET | Yes | Yes | 检索资源 |
| POST | No | No | 创建资源、触发动作 |
| PUT | Yes | No | 完整替换资源 |
| PATCH | No* | No | 部分更新资源 |
| DELETE | Yes | No | 删除资源 |

*PATCH 在实现得当时可以做到 idempotent

### 状态码参考

```
# 成功
200 OK                    — GET、PUT、PATCH（带响应体）
201 Created               — POST（包含 Location header）
204 No Content            — DELETE、PUT（无响应体）

# 客户端错误
400 Bad Request           — 校验失败、JSON 格式错误
401 Unauthorized          — 缺失或无效的认证
403 Forbidden             — 已认证但未授权
404 Not Found             — 资源不存在
409 Conflict              — 重复条目、状态冲突
422 Unprocessable Entity  — 语义无效（JSON 有效但数据错误）
429 Too Many Requests     — 超出限流

# 服务器错误
500 Internal Server Error — 意外失败（绝不暴露细节）
502 Bad Gateway           — 上游服务失败
503 Service Unavailable   — 临时过载，包含 Retry-After
```

### 常见错误

```
# BAD：所有情况都返回 200
{ "status": 200, "success": false, "error": "Not found" }

# GOOD：按语义使用 HTTP 状态码
HTTP/1.1 404 Not Found
{ "error": { "code": "not_found", "message": "User not found" } }

# BAD：校验错误返回 500
# GOOD：返回 400 或 422 并附字段级细节

# BAD：资源创建返回 200
# GOOD：返回 201 并附 Location header
HTTP/1.1 201 Created
Location: /api/v1/users/abc-123
```

## 响应格式

### 成功响应

```json
{
  "data": {
    "id": "abc-123",
    "email": "alice@example.com",
    "name": "Alice",
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

### 集合响应（带分页）

```json
{
  "data": [
    { "id": "abc-123", "name": "Alice" },
    { "id": "def-456", "name": "Bob" }
  ],
  "meta": {
    "total": 142,
    "page": 1,
    "per_page": 20,
    "total_pages": 8
  },
  "links": {
    "self": "/api/v1/users?page=1&per_page=20",
    "next": "/api/v1/users?page=2&per_page=20",
    "last": "/api/v1/users?page=8&per_page=20"
  }
}
```

### 错误响应

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address",
        "code": "invalid_format"
      },
      {
        "field": "age",
        "message": "Must be between 0 and 150",
        "code": "out_of_range"
      }
    ]
  }
}
```

### 响应 Envelope 变体

```typescript
// 方案 A：带 data 包装器的 envelope（公开 API 推荐）
interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  links?: PaginationLinks;
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: FieldError[];
  };
}

// 方案 B：扁平响应（更简单，内部 API 常用）
// 成功：直接返回资源
// 失败：返回错误对象
// 通过 HTTP 状态码区分
```

## 分页

### 基于 Offset（简单）

```
GET /api/v1/users?page=2&per_page=20

# 实现
SELECT * FROM users
ORDER BY created_at DESC
LIMIT 20 OFFSET 20;
```

**优点：** 实现简单，支持"跳转到第 N 页"
**缺点：** 在大 offset 下变慢（OFFSET 100000），与并发插入时不一致

### 基于 Cursor（可扩展）

```
GET /api/v1/users?cursor=eyJpZCI6MTIzfQ&limit=20

# 实现
SELECT * FROM users
WHERE id > :cursor_id
ORDER BY id ASC
LIMIT 21;  -- 多取一条以判断 has_next
```

```json
{
  "data": [...],
  "meta": {
    "has_next": true,
    "next_cursor": "eyJpZCI6MTQzfQ"
  }
}
```

**优点：** 无论位置如何性能都保持稳定，在并发插入时稳定
**缺点：** 无法跳转到任意页，cursor 不透明

### 何时使用哪种

| 场景 | 分页类型 |
|----------|----------------|
| 管理后台 dashboard、小数据集（<10K） | Offset |
| 无限滚动、信息流、大数据集 | Cursor |
| 公开 API | Cursor（默认）+ offset（可选） |
| 搜索结果 | Offset（用户期望页码） |

## 过滤、排序与搜索

### 过滤

```
# 简单相等
GET /api/v1/orders?status=active&customer_id=abc-123

# 比较运算符（使用方括号表示法）
GET /api/v1/products?price[gte]=10&price[lte]=100
GET /api/v1/orders?created_at[after]=2025-01-01

# 多值（逗号分隔）
GET /api/v1/products?category=electronics,clothing

# 嵌套字段（点号表示法）
GET /api/v1/orders?customer.country=US
```

### 排序

```
# 单字段（前缀 - 表示降序）
GET /api/v1/products?sort=-created_at

# 多字段（逗号分隔）
GET /api/v1/products?sort=-featured,price,-created_at
```

### 全文搜索

```
# 搜索 query parameter
GET /api/v1/products?q=wireless+headphones

# 字段级搜索
GET /api/v1/users?email=alice
```

### 稀疏字段集

```
# 只返回指定字段（减小 payload）
GET /api/v1/users?fields=id,name,email
GET /api/v1/orders?fields=id,total,status&include=customer.name
```

## 认证与授权

### 基于 Token 的认证

```
# Authorization header 中的 Bearer token
GET /api/v1/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# API key（用于服务间通信）
GET /api/v1/data
X-API-Key: sk_live_abc123
```

### 授权模式

```typescript
// 资源级：检查归属
app.get("/api/v1/orders/:id", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: { code: "not_found" } });
  if (order.userId !== req.user.id) return res.status(403).json({ error: { code: "forbidden" } });
  return res.json({ data: order });
});

// 基于角色：检查权限
app.delete("/api/v1/users/:id", requireRole("admin"), async (req, res) => {
  await User.delete(req.params.id);
  return res.status(204).send();
});
```

## 限流

### Header

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000

# 超出时
HTTP/1.1 429 Too Many Requests
Retry-After: 60
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Try again in 60 seconds."
  }
}
```

### 限流等级

| 等级 | 限额 | 时间窗口 | 场景 |
|------|-------|--------|----------|
| 匿名 | 30/min | 每 IP | 公开 endpoint |
| 已认证 | 100/min | 每用户 | 标准 API 访问 |
| Premium | 1000/min | 每 API key | 付费 API 方案 |
| 内部 | 10000/min | 每服务 | 服务间通信 |

## 版本控制

### URL 路径版本控制（推荐）

```
/api/v1/users
/api/v2/users
```

**优点：** 显式、易于路由、可缓存
**缺点：** URL 在版本间会变化

### Header 版本控制

```
GET /api/users
Accept: application/vnd.myapp.v2+json
```

**优点：** URL 简洁
**缺点：** 测试更困难、容易遗忘

### 版本控制策略

```
1. 从 /api/v1/ 开始——在需要之前不要引入新版本
2. 最多同时维护 2 个活跃版本（当前版本 + 上一版本）
3. 弃用时间线：
   - 宣布弃用（公开 API 提前 6 个月通知）
   - 添加 Sunset header：Sunset: Sat, 01 Jan 2026 00:00:00 GMT
   - 在 sunset 日期后返回 410 Gone
4. 非破坏性变更无需新版本：
   - 在响应中添加新字段
   - 添加新的可选 query parameter
   - 添加新 endpoint
5. 破坏性变更需要新版本：
   - 移除或重命名字段
   - 改变字段类型
   - 改变 URL 结构
   - 改变认证方式
```

## 实现模式

### TypeScript（Next.js API Route）

```typescript
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({
      error: {
        code: "validation_error",
        message: "Request validation failed",
        details: parsed.error.issues.map(i => ({
          field: i.path.join("."),
          message: i.message,
          code: i.code,
        })),
      },
    }, { status: 422 });
  }

  const user = await createUser(parsed.data);

  return NextResponse.json(
    { data: user },
    {
      status: 201,
      headers: { Location: `/api/v1/users/${user.id}` },
    },
  );
}
```

### Python（Django REST Framework）

```python
from rest_framework import serializers, viewsets, status
from rest_framework.response import Response

class CreateUserSerializer(serializers.Serializer):
    email = serializers.EmailField()
    name = serializers.CharField(max_length=100)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "name", "created_at"]

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return CreateUserSerializer
        return UserSerializer

    def create(self, request):
        serializer = CreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = UserService.create(**serializer.validated_data)
        return Response(
            {"data": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
            headers={"Location": f"/api/v1/users/{user.id}"},
        )
```

### Go（net/http）

```go
func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "invalid_json", "Invalid request body")
        return
    }

    if err := req.Validate(); err != nil {
        writeError(w, http.StatusUnprocessableEntity, "validation_error", err.Error())
        return
    }

    user, err := h.service.Create(r.Context(), req)
    if err != nil {
        switch {
        case errors.Is(err, domain.ErrEmailTaken):
            writeError(w, http.StatusConflict, "email_taken", "Email already registered")
        default:
            writeError(w, http.StatusInternalServerError, "internal_error", "Internal error")
        }
        return
    }

    w.Header().Set("Location", fmt.Sprintf("/api/v1/users/%s", user.ID))
    writeJSON(w, http.StatusCreated, map[string]any{"data": user})
}
```

## API 设计清单

发布新 endpoint 之前：

- [ ] 资源 URL 遵循命名约定（复数、kebab-case、不含动词）
- [ ] 使用正确的 HTTP 方法（GET 用于读取、POST 用于创建等）
- [ ] 返回合适的状态码（不要所有情况都返回 200）
- [ ] 输入通过 schema 校验（Zod、Pydantic、Bean Validation）
- [ ] 错误响应遵循标准格式，包含 code 和 message
- [ ] 列表 endpoint 实现分页（cursor 或 offset）
- [ ] 需要认证（或显式标记为公开）
- [ ] 检查授权（用户只能访问自己的资源）
- [ ] 已配置限流
- [ ] 响应不泄露内部细节（stack trace、SQL 错误）
- [ ] 与现有 endpoint 命名一致（camelCase vs snake_case）
- [ ] 已编写文档（更新 OpenAPI/Swagger spec）
