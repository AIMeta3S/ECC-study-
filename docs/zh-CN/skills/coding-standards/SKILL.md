---
name: coding-standards
description: 跨项目的基础编码规范，涵盖命名、可读性、不可变性以及代码质量审查。框架特定的模式请使用详细的前端或后端 skill。
metadata:
  origin: ECC
---

# 编码规范与最佳实践

适用于各项目的基础编码规范。

本 skill 是共享的基线，而非详细的框架指南。

- 涉及 React、状态、表单、渲染和 UI 架构时，使用 `frontend-patterns`。
- 涉及 repository/service 层、endpoint 设计、校验以及服务器特定关注点时，使用 `backend-patterns` 或 `api-design`。
- 当你需要最短的可复用 rule 层，而非完整的 skill 走查时，使用 `rules/common/coding-style.md`。

## 何时激活

- 开始新项目或模块时
- 审查代码质量与可维护性时
- 重构现有代码以遵循规范时
- 强制执行命名、格式化或结构一致性时
- 设置 lint、格式化或 type-checking 规则时
- 向新贡献者介绍编码规范时

## 范围边界

在以下场景激活本 skill：
- 描述性命名
- 默认不可变性
- 可读性，以及 KISS、DRY 和 YAGNI 的执行
- 错误处理期望与 code smell 审查

不要将本 skill 作为以下内容的主要来源：
- React 组合、hooks 或渲染模式
- 后端架构、API 设计或数据库分层
- 当存在更窄范围的 ECC skill 时，特定领域的框架指导

## 代码质量原则

### 1. 可读性优先
- 代码被阅读的次数多于被编写的次数
- 清晰的变量与函数名
- 优先使用自解释代码而非注释
- 一致的格式化

### 2. KISS (Keep It Simple, Stupid)
- 能工作的最简方案
- 避免过度设计
- 不做过早优化
- 易于理解 > 花哨代码

### 3. DRY (Don't Repeat Yourself)
- 将公共逻辑提取为函数
- 创建可复用组件
- 跨模块共享工具函数
- 避免复制粘贴式编程

### 4. YAGNI (You Aren't Gonna Need It)
- 不要在需要之前构建功能
- 避免投机性通用性
- 仅在需要时才增加复杂度
- 从简单开始，需要时再重构

## TypeScript/JavaScript 规范

### 变量命名

```typescript
// PASS：好：描述性命名
const marketSearchQuery = 'election'
const isUserAuthenticated = true
const totalRevenue = 1000

// FAIL：差：不清晰的命名
const q = 'election'
const flag = true
const x = 1000
```

### 函数命名

```typescript
// PASS：好：动名词模式
async function fetchMarketData(marketId: string) { }
function calculateSimilarity(a: number[], b: number[]) { }
function isValidEmail(email: string): boolean { }

// FAIL：差：不清晰或仅用名词
async function market(id: string) { }
function similarity(a, b) { }
function email(e) { }
```

### 不可变性模式（CRITICAL）

```typescript
// PASS：始终使用 spread operator
const updatedUser = {
  ...user,
  name: 'New Name'
}

const updatedArray = [...items, newItem]

// FAIL：绝不直接 mutate
user.name = 'New Name'  // 差
items.push(newItem)     // 差
```

### 错误处理

```typescript
// PASS：好：完善的错误处理
async function fetchData(url: string) {
  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Fetch failed:', error)
    throw new Error('Failed to fetch data')
  }
}

// FAIL：差：无错误处理
async function fetchData(url) {
  const response = await fetch(url)
  return response.json()
}
```

### Async/Await 最佳实践

```typescript
// PASS：好：尽可能并行执行
const [users, markets, stats] = await Promise.all([
  fetchUsers(),
  fetchMarkets(),
  fetchStats()
])

// FAIL：差：不必要的串行执行
const users = await fetchUsers()
const markets = await fetchMarkets()
const stats = await fetchStats()
```

### 类型安全

```typescript
// PASS：好：正确的类型
interface Market {
  id: string
  name: string
  status: 'active' | 'resolved' | 'closed'
  created_at: Date
}

function getMarket(id: string): Promise<Market> {
  // 实现
}

// FAIL：差：使用 'any'
function getMarket(id: any): Promise<any> {
  // 实现
}
```

## React 最佳实践

### 组件结构

```typescript
// PASS：好：带类型的函数式组件
interface ButtonProps {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
}

export function Button({
  children,
  onClick,
  disabled = false,
  variant = 'primary'
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  )
}

// FAIL：差：无类型，结构不清晰
export function Button(props) {
  return <button onClick={props.onClick}>{props.children}</button>
}
```

### 自定义 Hooks

```typescript
// PASS：好：可复用的自定义 hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

// 用法
const debouncedQuery = useDebounce(searchQuery, 500)
```

### 状态管理

```typescript
// PASS：好：正确的状态更新
const [count, setCount] = useState(0)

// 基于前一个状态的函数式更新
setCount(prev => prev + 1)

// FAIL：差：直接引用状态
setCount(count + 1)  // 在 async 场景下可能是过时值
```

### 条件渲染

```typescript
// PASS：好：清晰的条件渲染
{isLoading && <Spinner />}
{error && <ErrorMessage error={error} />}
{data && <DataDisplay data={data} />}

// FAIL：差：三元运算符地狱
{isLoading ? <Spinner /> : error ? <ErrorMessage error={error} /> : data ? <DataDisplay data={data} /> : null}
```

## API 设计规范

### REST API 约定

```
GET    /api/markets              # 列出所有市场
GET    /api/markets/:id          # 获取特定市场
POST   /api/markets              # 创建新市场
PUT    /api/markets/:id          # 更新市场（完整）
PATCH  /api/markets/:id          # 更新市场（部分）
DELETE /api/markets/:id          # 删除市场

# 用于过滤的查询参数
GET /api/markets?status=active&limit=10&offset=0
```

### 响应格式

```typescript
// PASS：好：一致的响应结构
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}

// 成功响应
return NextResponse.json({
  success: true,
  data: markets,
  meta: { total: 100, page: 1, limit: 10 }
})

// 错误响应
return NextResponse.json({
  success: false,
  error: 'Invalid request'
}, { status: 400 })
```

### 输入校验

```typescript
import { z } from 'zod'

// PASS：好：schema 校验
const CreateMarketSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  endDate: z.string().datetime(),
  categories: z.array(z.string()).min(1)
})

export async function POST(request: Request) {
  const body = await request.json()

  try {
    const validated = CreateMarketSchema.parse(body)
    // 使用校验通过的数据继续处理
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.issues
      }, { status: 400 })
    }
  }
}
```

## 文件组织

### 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── markets/           # 市场页面
│   └── (auth)/           # 认证页面（route group）
├── components/            # React 组件
│   ├── ui/               # 通用 UI 组件
│   ├── forms/            # 表单组件
│   └── layouts/          # 布局组件
├── hooks/                # 自定义 React hooks
├── lib/                  # 工具函数与配置
│   ├── api/             # API 客户端
│   ├── utils/           # 辅助函数
│   └── constants/       # 常量
├── types/                # TypeScript 类型
└── styles/              # 全局样式
```

### 文件命名

```
components/Button.tsx          # 组件使用 PascalCase
hooks/useAuth.ts              # 带有 'use' 前缀的 camelCase
lib/formatDate.ts             # 工具函数使用 camelCase
types/market.types.ts         # 带有 .types 后缀的 camelCase
```

## 注释与文档

### 何时添加注释

```typescript
// PASS：好：解释"为什么"，而不是"做什么"
// 使用指数 backoff，避免在故障期间压垮 API
const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)

// 此处出于对大型数组的性能考虑，特意使用 mutation
items.push(newItem)

// FAIL：差：陈述显而易见的事
// 将计数器加 1
count++

// 将 name 设为用户的 name
name = user.name
```

### 公共 API 的 JSDoc

```typescript
/**
 * 使用语义相似度搜索市场。
 *
 * @param query - 自然语言搜索查询
 * @param limit - 返回结果的最大数量（默认：10）
 * @returns 按相似度得分排序的市场数组
 * @throws {Error} 如果 OpenAI API 失败或 Redis 不可用
 *
 * @example
 * ```typescript
 * const results = await searchMarkets('election', 5)
 * console.log(results[0].name) // "Trump vs Biden"
 * ```
 */
export async function searchMarkets(
  query: string,
  limit: number = 10
): Promise<Market[]> {
  // 实现
}
```

## 性能最佳实践

### Memoization

```typescript
import { useMemo, useCallback } from 'react'

// PASS：好：对昂贵的计算进行 memoize
// 排序前先复制——Array.prototype.sort 会原地 mutate
const sortedMarkets = useMemo(() => {
  return [...markets].sort((a, b) => b.volume - a.volume)
}, [markets])

// PASS：好：memoize 回调
const handleSearch = useCallback((query: string) => {
  setSearchQuery(query)
}, [])
```

### 懒加载

```typescript
import { lazy, Suspense } from 'react'

// PASS：好：懒加载重型组件
const HeavyChart = lazy(() => import('./HeavyChart'))

export function Dashboard() {
  return (
    <Suspense fallback={<Spinner />}>
      <HeavyChart />
    </Suspense>
  )
}
```

### 数据库查询

```typescript
// PASS：好：仅 select 所需列
const { data } = await supabase
  .from('markets')
  .select('id, name, status')
  .limit(10)

// FAIL：差：select 所有内容
const { data } = await supabase
  .from('markets')
  .select('*')
```

## 测试规范

### 测试结构（AAA Pattern）

```typescript
test('calculates similarity correctly', () => {
  // 准备
  const vector1 = [1, 0, 0]
  const vector2 = [0, 1, 0]

  // 执行
  const similarity = calculateCosineSimilarity(vector1, vector2)

  // 断言
  expect(similarity).toBe(0)
})
```

### 测试命名

```typescript
// PASS：好：描述性测试名
test('returns empty array when no markets match query', () => { })
test('throws error when OpenAI API key is missing', () => { })
test('falls back to substring search when Redis unavailable', () => { })

// FAIL：差：模糊的测试名
test('works', () => { })
test('test search', () => { })
```

## Code Smell 检测

注意以下 anti-pattern：

### 1. 过长的函数
```typescript
// FAIL：差：超过 50 行的函数
function processMarketData() {
  // 100 行代码
}

// PASS：好：拆分为更小的函数
function processMarketData() {
  const validated = validateData()
  const transformed = transformData(validated)
  return saveData(transformed)
}
```

### 2. 过深的嵌套
```typescript
// FAIL：差：5 层以上嵌套
if (user) {
  if (user.isAdmin) {
    if (market) {
      if (market.isActive) {
        if (hasPermission) {
          // 做点什么
        }
      }
    }
  }
}

// PASS：好：提前返回
if (!user) return
if (!user.isAdmin) return
if (!market) return
if (!market.isActive) return
if (!hasPermission) return

// 做点什么
```

### 3. Magic Numbers
```typescript
// FAIL：差：未解释的数字
if (retryCount > 3) { }
setTimeout(callback, 500)

// PASS：好：具名常量
const MAX_RETRIES = 3
const DEBOUNCE_DELAY_MS = 500

if (retryCount > MAX_RETRIES) { }
setTimeout(callback, DEBOUNCE_DELAY_MS)
```

**记住**：代码质量不可妥协。清晰、可维护的代码能够支撑快速开发与自信的重构。
