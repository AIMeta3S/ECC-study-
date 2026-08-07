---
name: mailtrap-email-integration
description: 指导 agents 通过 Mailtrap 的 Email API 集成事务性邮件发送功能，包括 sandbox 测试、域名验证和 API 认证。在实现邮件发送功能、排查投递问题或搭建安全的 dev/staging 邮件测试环境时使用。
origin: ECC
---

# Mailtrap 邮件集成

使用 Mailtrap 的 Email API 和 Sandbox 向应用添加事务性邮件发送功能的模式，涵盖认证、环境隔离以及常见的投递陷阱。

## 何时启用

- 实现"发送邮件"功能（注册确认、密码重置、通知、收据）
- 排查 dev/staging 环境下邮件为何无法送达
- 为项目搭建首个邮件发送集成
- 审查直接调用 email API 而未做 sandbox 隔离的代码

## 核心概念

**Sandbox 与 Production 的隔离。** Mailtrap 提供的 Sandbox API 会捕获邮件但不进行投递，用于 dev/staging 环境，确保测试邮件永远不会到达真实收件箱。Production 发送使用独立的、已验证域名的 endpoint。绝不要将 dev 环境指向 production 发送 endpoint。

**认证。** 请求在 `Authorization` header 中使用 Bearer token。token 按项目划定作用域；sandbox 和 production 通常使用不同的 token。

**域名验证。** Production 发送要求在 Mailtrap 向真实收件人投递之前，先通过 DNS 记录（SPF、DKIM、DMARC）验证发送域名。跳过此步骤会导致静默投递失败或被投入垃圾邮件文件夹。

## 代码示例

```typescript
// 通过 Mailtrap 的 Email API 发送（production）
async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://send.api.mailtrap.io/api/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.MAILTRAP_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: "no-reply@yourverifieddomain.com", name: "Your App" },
      to: [{ email: to }],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Email send failed: ${response.status}`);
  }
  return response.json();
}
```

```typescript
// 相同的调用，在非 production 环境下路由到 Sandbox
const MAILTRAP_ENDPOINT = process.env.NODE_ENV === "production"
  ? "https://send.api.mailtrap.io/api/send"
  : `https://sandbox.api.mailtrap.io/api/send/${process.env.MAILTRAP_INBOX_ID}`;
```

## 反模式

| 反模式 | 问题所在 | 改用方式 |
| --- | --- | --- |
| 在 dev/test 环境中使用 production 发送 endpoint | 真实的测试邮件会到达真实收件箱，带来垃圾邮件投诉和测试数据泄露的风险 | 将非 production 环境路由到 Sandbox endpoint |
| 在源码中硬编码 API token | 一旦提交到版本控制就有凭据泄露风险 | 从环境变量 / secrets manager 加载 token |
| 在域名验证完成之前就发送邮件 | 邮件静默失败或落入垃圾邮件 | 在启用 production 发送之前先验证 SPF/DKIM/DMARC 记录 |
| 发送失败时缺少重试/错误处理 | 静默的通知失败（例如：用户永远收不到密码重置邮件） | 检查 response 状态、记录失败、暴露可操作的错误 |

## 最佳实践

- 将 sandbox 和 production 的 token 分别保存在独立的环境变量中，绝不要跨环境共用同一个 token
- 在任何涉及邮件的 production 上线之前，先验证发送域名的 DNS 记录
- 记录投递失败日志时附带足够的上下文以便 debug（收件人、模板、时间戳、response code）
- 将邮件发送视为可能失败的网络调用：用 try/catch 包裹，绝不要假定一定会成功

## 相关 Skills

`api-and-interface-design`, `security-and-hardening`, `ci-cd-and-automation`
