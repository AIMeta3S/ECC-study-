---
name: security-review
description: 当添加身份认证、处理用户输入、操作密钥、创建 API 端点或实现 支付/敏感 功能时使用此 skill。提供全面的安全检查清单与模式。
metadata:
  origin: ECC
---

# 安全审查 Skill

本 skill 确保所有代码遵循安全最佳实践，并识别潜在的漏洞。

## 何时激活

- 实现身份认证或授权
- 处理用户输入或文件上传
- 创建新的 API 端点
- 操作密钥或凭据
- 实现支付功能
- 存储或传输敏感数据
- 集成第三方 API

## 安全检查清单

### 1. 密钥管理

#### FAIL：绝不要这样做
```typescript
const apiKey = "sk-proj-xxxxx"  // 硬编码密钥
const dbPassword = "password123" // 在源代码中
```

#### PASS：务必这样做
```typescript
const apiKey = process.env.OPENAI_API_KEY
const dbUrl = process.env.DATABASE_URL

// 验证密钥是否存在
if (!apiKey) {
  throw new Error('OPENAI_API_KEY not configured')
}
```

#### 验证步骤
- [ ] 无硬编码的 API key、token 或密码
- [ ] 所有密钥存放在环境变量中
- [ ] `.env.local` 已加入 .gitignore
- [ ] git history 中不存在密钥
- [ ] 生产环境密钥存放在托管平台（Vercel、Railway）中

### 2. 输入校验

#### 始终校验用户输入
```typescript
import { z } from 'zod'

// 定义校验 schema
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150)
})

// 处理前先校验
export async function createUser(input: unknown) {
  try {
    const validated = CreateUserSchema.parse(input)
    return await db.users.create(validated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.issues }
    }
    throw error
  }
}
```

#### 文件上传校验
```typescript
function validateFileUpload(file: File) {
  // 大小检查（最大 5MB）
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('File too large (max 5MB)')
  }

  // 类型检查
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type')
  }

  // 扩展名检查
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif']
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
  if (!extension || !allowedExtensions.includes(extension)) {
    throw new Error('Invalid file extension')
  }

  return true
}
```

#### 验证步骤
- [ ] 所有用户输入均通过 schema 校验
- [ ] 文件上传已限制（大小、类型、扩展名）
- [ ] 查询中不直接使用用户输入
- [ ] 采用白名单校验（而非黑名单）
- [ ] 错误消息不泄露敏感信息

### 3. SQL 注入防范

#### FAIL：绝不要拼接 SQL
```typescript
// 危险 - SQL 注入漏洞
const query = `SELECT * FROM users WHERE email = '${userEmail}'`
await db.query(query)
```

#### PASS：务必使用参数化查询
```typescript
// 安全 - 参数化查询
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', userEmail)

// 或使用原始 SQL
await db.query(
  'SELECT * FROM users WHERE email = $1',
  [userEmail]
)
```

#### 验证步骤
- [ ] 所有数据库查询均使用参数化查询
- [ ] SQL 中不使用字符串拼接
- [ ] ORM / query builder 使用正确
- [ ] Supabase 查询已正确净化

### 4. 认证与授权

#### JWT token 处理
```typescript
// FAIL：错误：localStorage（易受 XSS 攻击）
localStorage.setItem('token', token)

// PASS：正确：httpOnly cookie
res.setHeader('Set-Cookie',
  `token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`)
```

#### 授权检查
```typescript
export async function deleteUser(userId: string, requesterId: string) {
  // 始终先验证授权
  const requester = await db.users.findUnique({
    where: { id: requesterId }
  })

  if (requester.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    )
  }

  // 继续执行删除
  await db.users.delete({ where: { id: userId } })
}
```

#### Row Level Security（Supabase）
```sql
-- 在所有表上启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的数据
CREATE POLICY "Users view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- 用户只能更新自己的数据
CREATE POLICY "Users update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

#### 验证步骤
- [ ] token 存储在 httpOnly cookie 中（而非 localStorage）
- [ ] 敏感操作前进行授权检查
- [ ] Supabase 中启用 Row Level Security
- [ ] 已实现基于角色的访问控制
- [ ] session 管理安全

### 5. XSS 防范

#### 净化 HTML
```typescript
import DOMPurify from 'isomorphic-dompurify'

// 始终净化用户提供的 HTML
function renderUserContent(html: string) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p'],
    ALLOWED_ATTR: []
  })
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
```

#### 内容安全策略

从严开始，只有在具备文档化的移除计划时才放宽。不要默认使用
`'unsafe-inline'` 或 `'unsafe-eval'`；它们会抵消 CSP 的大部分保护，应视为临时兼容性债务。

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      base-uri 'self';
      object-src 'none';
      frame-ancestors 'none';
      script-src 'self';
      style-src 'self';
      img-src 'self' data: https:;
      font-src 'self';
      connect-src 'self' https://api.example.com;
    `.replace(/\s{2,}/g, ' ').trim()
  }
]
```

#### 验证步骤
- [ ] 用户提供的 HTML 已净化
- [ ] 已配置 CSP header
- [ ] 无未经验证的动态内容渲染
- [ ] 已使用 React 内置 XSS 保护

### 6. CSRF 防护

#### CSRF token
```typescript
import { csrf } from '@/lib/csrf'

export async function POST(request: Request) {
  const token = request.headers.get('X-CSRF-Token')

  if (!csrf.verify(token)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    )
  }

  // 处理请求
}
```

#### SameSite cookie
```typescript
res.setHeader('Set-Cookie',
  `session=${sessionId}; HttpOnly; Secure; SameSite=Strict`)
```

#### 验证步骤
- [ ] 状态变更操作使用 CSRF token
- [ ] 所有 cookie 设置 SameSite=Strict
- [ ] 已实现 double-submit cookie 模式

### 7. 限流

#### API 限流
```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个时间窗口 100 次请求
  message: '请求过多'
})

// 应用到路由
app.use('/api/', limiter)
```

#### 高开销操作
```typescript
// 对搜索实施更严格的限流
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 10, // 每分钟 10 次请求
  message: '搜索请求过多'
})

app.use('/api/search', searchLimiter)
```

#### 验证步骤
- [ ] 所有 API 端点启用限流
- [ ] 高开销操作实施更严格限制
- [ ] 基于 IP 的限流
- [ ] 基于用户的限流（已认证）

### 8. 敏感数据泄露

#### 日志记录
```typescript
// FAIL：错误：记录敏感数据
console.log('User login:', { email, password })
console.log('Payment:', { cardNumber, cvv })

// PASS：正确：脱敏敏感数据
console.log('User login:', { email, userId })
console.log('Payment:', { last4: card.last4, userId })
```

#### 错误消息
```typescript
// FAIL：错误：暴露内部细节
catch (error) {
  return NextResponse.json(
    { error: error.message, stack: error.stack },
    { status: 500 }
  )
}

// PASS：正确：通用错误消息
catch (error) {
  console.error('Internal error:', error)
  return NextResponse.json(
    { error: 'An error occurred. Please try again.' },
    { status: 500 }
  )
}
```

#### 验证步骤
- [ ] 日志中不含密码、token 或密钥
- [ ] 给用户的错误消息是通用的
- [ ] 详细错误仅出现在服务端日志中
- [ ] 不向用户暴露堆栈跟踪

### 9. 区块链安全（Solana）

#### 钱包验证
```typescript
import { verify } from '@solana/web3.js'

async function verifyWalletOwnership(
  publicKey: string,
  signature: string,
  message: string
) {
  try {
    const isValid = verify(
      Buffer.from(message),
      Buffer.from(signature, 'base64'),
      Buffer.from(publicKey, 'base64')
    )
    return isValid
  } catch (error) {
    return false
  }
}
```

#### 交易验证
```typescript
async function verifyTransaction(transaction: Transaction) {
  // 验证收款方
  if (transaction.to !== expectedRecipient) {
    throw new Error('Invalid recipient')
  }

  // 验证金额
  if (transaction.amount > maxAmount) {
    throw new Error('Amount exceeds limit')
  }

  // 验证用户余额充足
  const balance = await getBalance(transaction.from)
  if (balance < transaction.amount) {
    throw new Error('Insufficient balance')
  }

  return true
}
```

#### 验证步骤
- [ ] 已验证钱包签名
- [ ] 已验证交易细节
- [ ] 交易前进行余额检查
- [ ] 无不加验证的交易签名

### 10. 依赖安全

#### 定期更新
```bash
# 检查漏洞
npm audit

# 自动修复可修复的问题
npm audit fix

# 更新依赖
npm update

# 检查过期的包
npm outdated
```

#### Lock 文件
```bash
# 始终提交 lock 文件
git add package-lock.json

# 在CI/CD中使用以进行可重现的构建
npm ci  # 而非 npm install
```

#### 验证步骤
- [ ] 依赖保持最新
- [ ] 无已知漏洞（npm audit 无问题）
- [ ] lock 文件已提交
- [ ] 在 GitHub 上启用 Dependabot
- [ ] 定期进行安全更新

## 安全测试

### 自动化安全测试
```typescript
// 测试身份认证
test('需要身份认证', async () => {
  const response = await fetch('/api/protected')
  expect(response.status).toBe(401)
})

// 测试授权
test('需要管理员角色', async () => {
  const response = await fetch('/api/admin', {
    headers: { Authorization: `Bearer ${userToken}` }
  })
  expect(response.status).toBe(403)
})

// 测试输入校验
test('拒绝无效输入', async () => {
  const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify({ email: 'not-an-email' })
  })
  expect(response.status).toBe(400)
})

// 测试限流
test('实施限流', async () => {
  const requests = Array(101).fill(null).map(() =>
    fetch('/api/endpoint')
  )

  const responses = await Promise.all(requests)
  const tooManyRequests = responses.filter(r => r.status === 429)

  expect(tooManyRequests.length).toBeGreaterThan(0)
})
```

## 部署前安全检查清单

在任何生产环境部署之前：

- [ ] **机密**：无硬编码机密，全部使用环境变量
- [ ] **输入验证**：所有用户输入均已验证
- [ ] **SQL注入**：所有查询已参数化
- [ ] **XSS**：用户内容已净化
- [ ] **CSRF**：已启用保护
- [ ] **认证**：正确处理令牌
- [ ] **授权**：已有角色检查
- [ ] **限流**：在所有端点启用
- [ ] **HTTPS**：在生产环境强制实施
- [ ] **安全头**：已配置CSP、X-Frame-Options
- [ ] **错误处理**：错误中无敏感数据
- [ ] **日志记录**：未记录敏感数据
- [ ] **依赖**：保持最新，无漏洞
- [ ] **行级安全**：在Supabase中启用
- [ ] **CORS**：已正确配置
- [ ] **文件上传**：已验证（大小、类型）
- [ ] **钱包签名**：已验证（若涉及区块链）

## 资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js 安全](https://nextjs.org/docs/security)
- [Supabase 安全](https://supabase.com/docs/guides/auth)
- [Web Security Academy](https://portswigger.net/web-security)

---

**请牢记**：安全不是可选的。一个漏洞可能危及整个平台。不确定时，宁可过于谨慎。
