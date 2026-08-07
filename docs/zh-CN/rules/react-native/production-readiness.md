---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# React Native / Expo 生产就绪

> 将 ECC 理念延伸到那些风格/模式规则无法单独表达的生产级关注点。
> 干净的代码库是生产环境的必要条件但非充分条件——这些条目在发布前是强制性的。

## Architecture

- 在 **New Architecture**（Fabric + TurboModules）上发布。它是近期 Expo SDK 的默认选项，并从 SDK 55+ 起成为强制项（无法禁用）。审计 native 依赖的兼容性。
- 固定 Expo SDK 版本；通过 `npx expo install --check` 谨慎升级，并在两个平台上测试。

## Build & Release (EAS)

- 使用 **EAS Build** 构建生产二进制文件，使用 **EAS Submit** 进行商店交付。不要依赖本地临时构建来发布。
- 在 `eas.json` 中保持独立的 build profile（`development`、`preview`、`production`）。
- 通过 EAS 管理签名凭证；永远不要提交 keystore 或 provisioning profile。

## Over-the-Air Updates

- 使用 **EAS Update**（`expo-updates`）发布仅限 JS 的修复，并制定明确的 runtime version 策略。
- 永远不要通过 OTA 推送 native 变更——这些变更需要新的商店构建。
- 逐步推出，并保留回滚能力。

## Observability

- 在生产构建中集成 crash + error 报告（例如通过 `@sentry/react-native` 集成 **Sentry**）。
- 添加 structured logging，并在有用的地方添加 analytics——但要从 release 中剥离冗长的 log。
- 捕获并暴露失败的网络/mutation 状态；不要静默失败。

## Configuration & Versioning

- 每次发布时递增 `version` 和 `ios.buildNumber` / `android.versionCode`。
- 公共 config 通过 `EXPO_PUBLIC_*`；真正的 secret 只能通过 EAS secrets。
- 启动时验证必需的 config，并以清晰的消息快速失败。

## Pre-Release Gate

发布前，以下全部必须通过：

- [ ] `tsc --noEmit` 干净
- [ ] `npx expo lint` 干净
- [ ] 测试全绿，coverage >= 80%（见 testing.md）
- [ ] `npx expo-doctor` 健康
- [ ] 关键流程的 E2E（Maestro/Detox）在真实构建上通过
- [ ] bundle 中无 secret（见 security.md）
- [ ] crash reporting 已启用并已验证
- [ ] 在物理 iOS 和 Android 设备上测试，不仅仅是模拟器
