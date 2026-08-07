---
paths:
  - "**/*.ets"
  - "**/*.ts"
  - "**/ohosTest/**"
---
# HarmonyOS / ArkTS 测试

> 本文件在 [common/testing.md](../common/testing.md) 基础上扩展了 HarmonyOS 专属的测试实践。

## 测试框架

HarmonyOS 使用内置的测试框架,基于 `@ohos.test` 能力:

- **单元测试**:位于 `src/ohosTest/ets/test/`
- **UI 测试**:使用 `@ohos.UiTest` 进行组件测试
- **插桩测试**:在设备/模拟器上运行

## 测试目录结构

```
module/
  |-- src/
  |   |-- main/ets/          # 生产代码
  |   |-- ohosTest/ets/      # 测试代码
  |       |-- test/
  |       |   |-- Ability.test.ets
  |       |   |-- List.test.ets
  |       |-- TestAbility.ets
  |       |-- TestRunner.ets
```

## 运行测试

```bash
# 运行某个模块的所有测试
hvigorw testHap -p product=default

# 在已连接的设备上运行测试
hdc shell aa test -b com.example.app -m entry_test -s unittest /ets/TestRunner/OpenHarmonyTestRunner
```

## 单元测试示例

```typescript
import { describe, it, expect } from '@ohos/hypium';

export default function UserViewModelTest() {
  describe('UserViewModel', () => {
    it('should_initialize_with_empty_state', 0, () => {
      const vm = new UserViewModel();
      expect(vm.userName).assertEqual('');
      expect(vm.isLoading).assertFalse();
    });

    it('should_update_user_name', 0, () => {
      const vm = new UserViewModel();
      vm.updateUserName('Alice');
      expect(vm.userName).assertEqual('Alice');
    });

    it('should_handle_empty_input', 0, () => {
      const vm = new UserViewModel();
      vm.updateUserName('');
      expect(vm.userName).assertEqual('');
      expect(vm.hasError).assertFalse();
    });
  });
}
```

## UI 测试示例

```typescript
import { describe, it, expect } from '@ohos/hypium';
import { Driver, ON } from '@ohos.UiTest';

export default function HomePageUITest() {
  describe('HomePage_UI', () => {
    it('should_display_title', 0, async () => {
      const driver = Driver.create();
      await driver.delayMs(1000);

      const title = await driver.findComponent(ON.text('Home'));
      expect(title !== null).assertTrue();
    });

    it('should_navigate_to_detail_on_click', 0, async () => {
      const driver = Driver.create();
      const button = await driver.findComponent(ON.id('detailButton'));
      await button.click();
      await driver.delayMs(500);

      const detailTitle = await driver.findComponent(ON.text('Detail'));
      expect(detailTitle !== null).assertTrue();
    });
  });
}
```

## HarmonyOS 的 TDD 工作流

遵循适配 HarmonyOS 的标准 TDD 循环:

1. **RED**:在 `ohosTest/ets/test/` 中编写一个失败的测试
2. **GREEN**:在 `main/ets/` 中实现最少代码使测试通过
3. **REFACTOR**:在保持测试通过的同时清理代码
4. **BUILD**:运行 `hvigorw assembleHap` 验证编译
5. **VERIFY**:在设备/模拟器上运行测试

## 测试覆盖率要求

- 所有关键应用代码(ViewModel、服务、工具)的覆盖率不低于 80%
- **单元测试**:覆盖所有工具函数、ViewModel 逻辑、数据模型
- **集成测试**:覆盖 API 调用、数据库操作、跨模块交互
- **E2E / UI 测试**:覆盖关键用户流程(登录、导航、数据提交)
- 测试边界情况:空数据、网络错误、权限拒绝

## 测试最佳实践

- 保持测试独立——测试之间不共享可变状态
- 在单元测试中 mock 网络调用和系统 API
- 使用有意义的测试命名:`should_[expected_behavior]_when_[condition]`
- 测试 V2 状态管理的响应式:验证 `@Trace` 属性会触发 UI 更新
- 测试导航流程:验证 `NavPathStack` 的 push/pop/replace 操作
- 避免测试框架内部实现——聚焦于业务逻辑和用户可见的行为
