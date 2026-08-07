---
name: ai-regression-testing
description: 面向 AI 辅助开发的回归测试策略。包括无数据库依赖的 sandbox 模式 API 测试、自动化的 bug-check 工作流，以及用于捕捉 AI 盲区的模式——即同一个模型既写代码又审查代码时所产生的盲区。
metadata:
  origin: ECC
---

# AI 回归测试

专为 AI 辅助开发设计的测试模式——当同一个模型既写代码又审查代码时，会产生系统性的盲区，只有自动化测试才能捕捉到这些盲区。

## 何时启用

- AI agent（Claude Code、Cursor、Codex）修改了 API 路由或后端逻辑
- 发现并修复了 bug——需要防止再次引入
- 项目具有可利用于无 DB 测试的 sandbox/mock 模式
- 在代码变更后运行 `/bug-check` 或类似的审查命令
- 存在多条代码路径（sandbox 对 production、feature flags 等）

## 核心问题

当 AI 编写代码然后审查自己的工作时，它会把相同的假设带入两个步骤。这会产生一种可预测的失败模式：

```
AI 写修复 → AI 审查修复 → AI 说"看起来正确" → Bug 仍然存在
```

**真实案例**（在生产环境中观察到）：

```
Fix 1：在 API 响应中加入 notification_settings
  → 忘了把它加到 SELECT query 中
  → AI 审查时漏掉了（同样的盲区）

Fix 2：加到了 SELECT query 中
  → TypeScript build 报错（列不在生成的类型中）
  → AI 审查了 Fix 1 但没发现 SELECT 的问题

Fix 3：改成 SELECT *
  → 修了 production 路径，忘了 sandbox 路径
  → AI 审查时再次漏掉（第 4 次出现）

Fix 4：测试在首次运行 PASS 时立即捕捉到：
```

模式：**sandbox/production 路径不一致**是 AI 引入的头号回归。

## Sandbox 模式 API 测试

大多数具有 AI 友好架构的项目都有 sandbox/mock 模式。这是快速、无 DB 的 API 测试的关键。

### 配置（Vitest + Next.js App Router）

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["__tests__/**/*.test.ts"],
    setupFiles: ["__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

```typescript
// __tests__/setup.ts
// 强制 sandbox 模式——无需数据库
process.env.SANDBOX_MODE = "true";
process.env.NEXT_PUBLIC_SUPABASE_URL = "";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
```

### Next.js API 路由的测试辅助函数

```typescript
// __tests__/helpers.ts
import { NextRequest } from "next/server";

export function createTestRequest(
  url: string,
  options?: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    sandboxUserId?: string;
  },
): NextRequest {
  const { method = "GET", body, headers = {}, sandboxUserId } = options || {};
  const fullUrl = url.startsWith("http") ? url : `http://localhost:3000${url}`;
  const reqHeaders: Record<string, string> = { ...headers };

  if (sandboxUserId) {
    reqHeaders["x-sandbox-user-id"] = sandboxUserId;
  }

  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers: reqHeaders,
  };

  if (body) {
    init.body = JSON.stringify(body);
    reqHeaders["content-type"] = "application/json";
  }

  return new NextRequest(fullUrl, init);
}

export async function parseResponse(response: Response) {
  const json = await response.json();
  return { status: response.status, json };
}
```

### 编写回归测试

关键原则：**为已发现的 bug 编写测试，而不是为能正常工作的代码编写测试**。

```typescript
// __tests__/api/user/profile.test.ts
import { describe, it, expect } from "vitest";
import { createTestRequest, parseResponse } from "../../helpers";
import { GET, PATCH } from "@/app/api/user/profile/route";

// 定义契约——响应中必须包含哪些字段
const REQUIRED_FIELDS = [
  "id",
  "email",
  "full_name",
  "phone",
  "role",
  "created_at",
  "avatar_url",
  "notification_settings",  // ← 在 bug 发现其缺失后添加
];

describe("GET /api/user/profile", () => {
  it("returns all required fields", async () => {
    const req = createTestRequest("/api/user/profile");
    const res = await GET(req);
    const { status, json } = await parseResponse(res);

    expect(status).toBe(200);
    for (const field of REQUIRED_FIELDS) {
      expect(json.data).toHaveProperty(field);
    }
  });

  // 回归测试——这个确切的 bug 被 AI 引入了 4 次
  it("notification_settings is not undefined (BUG-R1 regression)", async () => {
    const req = createTestRequest("/api/user/profile");
    const res = await GET(req);
    const { json } = await parseResponse(res);

    expect("notification_settings" in json.data).toBe(true);
    const ns = json.data.notification_settings;
    expect(ns === null || typeof ns === "object").toBe(true);
  });
});
```

### 测试 Sandbox/Production 的一致性

最常见的 AI 回归：修复了 production 路径却忘了 sandbox 路径（或反之）。

```typescript
// 测试 sandbox 响应是否符合预期契约
describe("GET /api/user/messages (conversation list)", () => {
  it("includes partner_name in sandbox mode", async () => {
    const req = createTestRequest("/api/user/messages", {
      sandboxUserId: "user-001",
    });
    const res = await GET(req);
    const { json } = await parseResponse(res);

    // 这捕捉到一个 bug：partner_name 被加到了
    // production 路径，但没加到 sandbox 路径
    if (json.data.length > 0) {
      for (const conv of json.data) {
        expect("partner_name" in conv).toBe(true);
      }
    }
  });
});
```

## 将测试集成到 Bug-Check 工作流中

### 自定义命令定义

```markdown
<!-- .claude/commands/bug-check.md -->
# Bug Check

## Step 1：自动化测试（强制，不可跳过）

在任何代码审查之前，先运行这些命令：

    npm run test       # Vitest 测试套件
    npm run build      # TypeScript 类型检查 + 构建

- 如果测试失败 → 作为最高优先级的 bug 报告
- 如果构建失败 → 将类型错误作为最高优先级报告
- 只有两者都通过才进入 Step 2

## Step 2：代码审查（AI 审查）

1. Sandbox / production 路径一致性
2. API 响应结构匹配前端预期
3. SELECT 子句完整性
4. 带回滚的错误处理
5. 乐观更新的竞态条件

## Step 3：对于每个修复的 bug，提出一个回归测试
```

### 工作流

```
User："バグチェックして"（或 "/bug-check"）
  │
  ├─ Step 1：npm run test
  │   ├─ FAIL → 机械地发现 bug（无需 AI 判断）
  │   └─ PASS → 继续
  │
  ├─ Step 2：npm run build
  │   ├─ FAIL → 机械地发现类型错误
  │   └─ PASS → 继续
  │
  ├─ Step 3：AI 代码审查（留意已知盲区）
  │   └─ 报告发现
  │
  └─ Step 4：为每个修复编写回归测试
      └─ 下次 bug-check 会捕捉到修复是否破坏
```

## 常见 AI 回归模式

### Pattern 1：Sandbox/Production 路径不匹配

**频率**：最常见（在 4 次回归中观察到 3 次）

```typescript
// FAIL：AI 只把字段加到 production 路径
if (isSandboxMode()) {
  return { data: { id, email, name } };  // 缺少新字段
}
// Production 路径
return { data: { id, email, name, notification_settings } };

// PASS：两条路径必须返回相同的结构
if (isSandboxMode()) {
  return { data: { id, email, name, notification_settings: null } };
}
return { data: { id, email, name, notification_settings } };
```

**捕捉它的测试**：

```typescript
it("sandbox and production return same fields", async () => {
  // 在测试环境中，sandbox 模式被强制开启
  const res = await GET(createTestRequest("/api/user/profile"));
  const { json } = await parseResponse(res);

  for (const field of REQUIRED_FIELDS) {
    expect(json.data).toHaveProperty(field);
  }
});
```

### Pattern 2：SELECT 子句遗漏

**频率**：在使用 Supabase/Prisma 添加新列时很常见

```typescript
// FAIL：新列加到了响应中，但没加到 SELECT
const { data } = await supabase
  .from("users")
  .select("id, email, name")  // notification_settings 不在这里
  .single();

return { data: { ...data, notification_settings: data.notification_settings } };
// → notification_settings 永远是 undefined

// PASS：使用 SELECT * 或显式包含新列
const { data } = await supabase
  .from("users")
  .select("*")
  .single();
```

### Pattern 3：错误状态泄漏

**频率**：中等——在为现有组件添加错误处理时

```typescript
// FAIL：设置了错误状态但未清除旧数据
catch (err) {
  setError("Failed to load");
  // reservations 仍然显示上一个 tab 的数据！
}

// PASS：出错时清除相关状态
catch (err) {
  setReservations([]);  // 清除过期数据
  setError("Failed to load");
}
```

### Pattern 4：没有适当回滚的乐观更新

```typescript
// FAIL：失败时没有回滚
const handleRemove = async (id: string) => {
  setItems(prev => prev.filter(i => i.id !== id));
  await fetch(`/api/items/${id}`, { method: "DELETE" });
  // 如果 API 失败，item 从 UI 消失但仍留在 DB 中
};

// PASS：捕获之前的状态并在失败时回滚
const handleRemove = async (id: string) => {
  const prevItems = [...items];
  setItems(prev => prev.filter(i => i.id !== id));
  try {
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("API error");
  } catch {
    setItems(prevItems);  // 回滚
    alert("削除に失敗しました");
  }
};
```

## 策略：在发现 bug 的地方测试

不要追求 100% 覆盖率。而是：

```
Bug 在 /api/user/profile 中发现     → 为 profile API 编写测试
Bug 在 /api/user/messages 中发现    → 为 messages API 编写测试
Bug 在 /api/user/favorites 中发现   → 为 favorites API 编写测试
/api/user/notifications 中没有 bug  → （暂）不编写测试
```

**为什么这在 AI 开发中有效：**

1. AI 倾向于反复犯**同一类错误**
2. Bug 聚集在复杂区域（认证、多路径逻辑、状态管理）
3. 一旦测试，那个确切的回归就**不可能再发生**
4. 测试数量随着 bug 修复自然增长——没有浪费的精力

## 快速参考

| AI 回归模式 | 测试策略 | Priority |
|---|---|---|
| Sandbox/production 不匹配 | 断言 sandbox 模式下响应结构相同 | High |
| SELECT 子句遗漏 | 断言响应包含所有必需字段 | High |
| 错误状态泄漏 | 断言出错时状态被清理 | Medium |
| 缺少回滚 | 断言 API 失败时状态被恢复 | Medium |
| 类型转换掩盖 null | 断言字段不是 undefined | Medium |

## DO / DON'T

**DO：**
- 发现 bug 后立即编写测试（如可能，在修复之前编写）
- 测试 API 响应结构，而不是实现
- 将运行测试作为每次 bug-check 的第一步
- 保持测试快速（sandbox 模式下总计 < 1 秒）
- 以测试所防止的 bug 命名（例如 "BUG-R1 regression"）

**DON'T：**
- 为从未出过 bug 的代码编写测试
- 将 AI 自我审查作为自动化测试的替代品
- 因为"只是 mock 数据"而跳过 sandbox 路径测试
- 在 unit test 足够时编写 integration test
- 追求覆盖率百分比——应追求回归预防
