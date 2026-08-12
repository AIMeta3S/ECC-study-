---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript/JavaScript 安全

> 本文件在 [common/security.md](../common/security.md) 基础上扩展了 TypeScript/JavaScript 特定内容。

## 密钥管理

```typescript
// 绝不允许：硬编码密钥
const apiKey = "sk-proj-xxxxx"

// 始终使用：环境变量
const apiKey = process.env.API_KEY

if (!apiKey) {
  throw new Error('API_KEY not configured')
}
```

## Agent 支持

- 使用 **security-reviewer** agent 进行全面的安全审计
