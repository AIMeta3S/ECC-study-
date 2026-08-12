# 测试要求

## 最低测试覆盖率：80%

测试类型（全部必需）：
1. **单元测试（Unit Tests）** - 单个函数、工具函数、组件
2. **集成测试（Integration Tests）** - API 端点、数据库操作
3. **端到端测试（E2E Tests）** - 关键用户流程（按语言选择框架）

## TDD（测试驱动开发）

强制性工作流程：
1. 先写测试（RED）
2. 运行测试——应当 FAIL
3. 写最小实现（GREEN）
4. 运行测试——应当 PASS
5. 重构（IMPROVE）
6. 验证覆盖率（80%+）

## 测试失败的处理流程

1. 使用 **tdd-guide** agent
2. 检查 test isolation
3. 验证 mock 是否正确
4. 修复实现，而非测试（除非测试本身有错）

## Agent 支持

- **tdd-guide** - 对新功能主动使用，强制要求先编写测试。

## 测试结构（AAA Pattern）

优先采用 Arrange-Act-Assert 结构测试：

```typescript
test('calculates similarity correctly', () => {
  // Arrange
  const vector1 = [1, 0, 0]
  const vector2 = [0, 1, 0]

  // Act
  const similarity = calculateCosineSimilarity(vector1, vector2)

  // Assert
  expect(similarity).toBe(0)
})
```

### 测试命名

使用能说明被测行为的描述性名称：

```typescript
test('returns empty array when no markets match query', () => {})
test('throws error when API key is missing', () => {})
test('falls back to substring search when Redis is unavailable', () => {})
```
