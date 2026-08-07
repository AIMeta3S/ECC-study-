---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# React Native / Expo 安全

> 本文件扩展了 [common/security.md](../common/security.md)，增加了 React Native / Expo 特定的内容。
> common/security.md 中的强制性 pre-commit 检查清单和 Security Response Protocol 仍然适用。

## Bundle 是公开的

将随应用发布的所有内容视为攻击者可读。移动端二进制文件可以被解包。

- 绝不在 JS bundle 或 `app.config` 中发布真实的 secrets（私有 API keys、service-role keys、签名 secrets）。
- 公开/anon keys（例如 Supabase anon key、Firebase 配置）只有在受到服务端规则（RLS、security rules）保护时才可接受。在后端强制执行授权，绝不在客户端。
- 将特权操作保留在你自己的服务器 / edge functions 之后。

## Secret 与 Token 存储

- 将 auth tokens 和敏感值存储在 `expo-secure-store`（Keychain / Keystore）中——永远不要存储在 `AsyncStorage` 或明文 MMKV 中。
- 不要将 secrets 持久化到可能被序列化到磁盘的 Redux/Zustand state 中。

## 配置

- 通过 `expo-constants` / `app.config.ts` 的 `extra` 读取环境变量，`EXPO_PUBLIC_*` 仅用于真正公开的值。
- 将构建 secrets 保存在 EAS secrets 中，不要放在仓库中。

## 网络与数据

- 仅使用 HTTPS；拒绝 cleartext。对高风险应用考虑 certificate pinning。
- 在使用前用 Zod 验证所有外部数据（API 响应、deep-link 参数、推送载荷）。
- 验证并 sanitize deep links 和 universal links——绝不要基于未验证的参数进行路由或授予访问权限。

## 权限与隐私

- 在需要时才请求最小的设备权限，并给出清晰的理由。
- 为 App Store / Play Store 的隐私披露准确声明数据收集情况。

## 依赖

- 定期运行 `expo-doctor` 和 `npm audit`；保持 Expo SDK 和原生依赖为最新。
- 对 agent 配置本身使用 `/security-scan`（AgentShield）。
