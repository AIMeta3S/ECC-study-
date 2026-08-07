---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# React Native / Expo 测试

> 本文件在 [common/testing.md](../common/testing.md) 基础上扩展了 React Native / Expo 专属内容。
> 覆盖率目标和 TDD 工作流继承自 common/testing.md（最低 80%，RED-GREEN-REFACTOR）。

## 工具链

| 层级 | 工具 |
|-------|------|
| 单元 / 组件 | Jest + `@testing-library/react-native`（通过 `jest-expo` preset） |
| Hooks | `@testing-library/react-native` 的 `renderHook` |
| E2E | Maestro（推荐，简单的 YAML flows）或 Detox |
| 类型安全 | CI 中运行 `tsc --noEmit` |

## 组件测试

- 按 accessible role/label/text 查询，除非必要不要用 `testID` —— 这同时也在强化无障碍性。
- 断言用户可见的行为，而非实现细节。
- 遵循 Arrange-Act-Assert。

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native'

test('calls onSelect with the user id when pressed', () => {
  const onSelect = jest.fn()
  render(<UserCard user={{ id: '1', email: 'a@b.com' }} onSelect={onSelect} />)

  fireEvent.press(screen.getByText('a@b.com'))

  expect(onSelect).toHaveBeenCalledWith('1')
})
```

## Mocking

- 在测试边界处 mock Expo SDK 模块（camera、location、notifications、secure-store）。
- 将使用 TanStack Query 的组件包裹在 `QueryClientProvider` 中，每个测试使用全新的 client。
- mock 导航（`expo-router`），使各 screen 独立渲染。

## E2E

- 只覆盖关键流程：认证、主导航、核心交易。
- 发布前在 CI 中针对已构建的 app（EAS Build）运行 E2E。

## 优先测试什么

对新功能主动使用 `tdd-guide` agent：先写一个能刻画目标行为的失败测试，然后再实现。
