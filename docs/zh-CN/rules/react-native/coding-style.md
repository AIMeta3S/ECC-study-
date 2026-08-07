---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# React Native / Expo 编码风格

> 本文件在 [common/coding-style.md](../common/coding-style.md) 的基础上扩展了 React Native / Expo 特定内容。

## 组件

- 使用命名的 `interface` 或 `type` 定义 props；不要使用 `React.FC`。
- 保持 screen 精简：一个 screen 由 hooks + 展示性组件组合而成，不应承载沉重的逻辑。
- 可复用的组件每个文件只放一个；小型私有子组件可就近放置。
- 优先使用函数组件和 hooks。不使用 class 组件。

```tsx
interface AvatarProps {
  uri: string
  size?: number
  onPress?: () => void
}

export function Avatar({ uri, size = 40, onPress }: AvatarProps) {
  return (
    <Pressable onPress={onPress}>
      <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    </Pressable>
  )
}
```

## 样式

每个项目选择一种样式系统并保持一致。`StyleSheet.create()` 是框架原生方案；utility-class 库（如 NativeWind）是常见的替代选择。本规则与具体库无关——重要的是保持一致并避免内联分配。

- StyleSheet：在模块作用域内使用 `StyleSheet.create()` 定义样式——切勿在热路径上的 `render`/JSX 内部内联构建样式对象（每次 render 都会产生分配）。
- Utility-class 方案：将重复的 class 字符串抽取为共享常量或 variant 辅助函数。
- 切勿将原始颜色、间距或字号硬编码散落在各文件中。集中管理 design token（theme 文件或 config）。

```tsx
// 错误：每次 render 都重新创建内联样式对象
<View style={{ padding: 16, backgroundColor: '#fff' }} />

// 正确（StyleSheet）
const styles = StyleSheet.create({ card: { padding: 16, backgroundColor: '#fff' } })
<View style={styles.card} />

// 正确（NativeWind）
<View className="p-4 bg-white" />
```

## 平台差异

- 当差异较大时使用平台特定文件（`Component.ios.tsx`、`Component.android.tsx`）。
- 仅在差异较小时使用 `Platform.select()` / `Platform.OS`。
- 使用 `react-native-safe-area-context` 处理安全区域；不要硬编码状态栏 / notch 偏移量。

## 导入与项目布局

- 使用 Expo/TS 的路径别名（如 `@/components/...`），而非冗长的相对路径链。
- 按 feature/domain 组织，而非按类型组织。保持文件聚焦（通常 200-400 行，最多 800 行）。

## 日志

- 发布的代码中不要使用 `console.log`。使用 logger 并在 production build 中剥离日志。
- 通过 UI 状态而非 console 呈现面向用户的错误。

## TypeScript

`rules/typescript/` 中的所有 TypeScript 规则均适用（公开 API 上使用显式类型、避免 `any`、使用 Zod 进行校验、不可变更新）。本文件仅在其基础上补充 RN 特有的指引。
