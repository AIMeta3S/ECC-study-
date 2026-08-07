---
paths:
  - "**/*.swift"
  - "**/Package.swift"
---
# Swift 安全

> 本文件在 [common/security.md](../common/security.md) 基础上扩展了 Swift 特定内容。

## Secret 管理

- 对敏感数据（token、密码、密钥）使用 **Keychain Services** —— 绝不使用 `UserDefaults`
- 构建时的 secret 使用环境变量或 `.xcconfig` 文件
- 永远不要将 secret 硬编码在源码中 —— 反编译工具可以轻易提取它们

```swift
let apiKey = ProcessInfo.processInfo.environment["API_KEY"]
guard let apiKey, !apiKey.isEmpty else {
    fatalError("API_KEY not configured")
}
```

## 传输安全

- App Transport Security (ATS) 默认强制启用 —— 不要禁用它
- 对关键端点使用 certificate pinning
- 验证所有服务器证书

## 输入验证

- 在显示前对所有用户输入进行 sanitize，以防止 injection
- 使用 `URL(string:)` 并进行校验，而非 force-unwrapping
- 在处理前验证来自外部源（API、deep link、pasteboard）的数据
