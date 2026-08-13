# 安全指南

## 强制性安全检查

在**任何** commit 之前：
- [ ] 无硬编码密钥（API keys、passwords、tokens）
- [ ] 所有用户输入均已验证
- [ ] SQL注入防护 (parameterized queries)
- [ ] XSS 防护 (sanitized HTML)
- [ ] CSRF 保护 已启用
- [ ] Authentication/authorization 已验证
- [ ] 所有 endpoint 启用 rate limiting
- [ ] 错误信息不会泄露敏感数据

## Secret 管理

- 绝不在源代码中硬编码 secrets
- 始终使用环境变量或密钥管理器
- 在启动时验证所需的 secrets 是否存在
- 轮换任何可能已暴露的 secrets

## 安全响应协议

如果发现安全问题：
1. 立即**停止**
2. 使用 **security-reviewer** agent 进行安全审核
3. 在继续之前修复 CRITICAL 问题
4. 轮换任何已暴露的 secrets
5. 审查整个代码库以查找类似问题
