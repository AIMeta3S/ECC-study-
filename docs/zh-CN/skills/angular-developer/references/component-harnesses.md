# 使用 Component Harnesses 进行测试

Component harnesses 是在测试中与组件交互的标准、首选方式。它们提供了一个健壮的、以用户为中心的 API，通过将测试与组件内部 DOM 结构的变化隔离开来，使测试更不易损坏、更易读。

## 为什么使用 Harnesses？

- **健壮性：** 当你重构组件的内部 HTML 或 CSS 类时，测试不会失效。
- **可读性：** 测试从用户视角描述交互（例如 `button.click()`、`slider.getValue()`），而不是通过 DOM 查询（`fixture.nativeElement.querySelector(...)`）。
- **可复用性：** 同一个 harness 可同时用于 unit tests 和 E2E tests。

Angular Material 为其库中的每个组件都提供了 test harness。

## 在 Unit Test 中使用 Harness

`TestbedHarnessEnvironment` 是在 unit tests 中使用 harnesses 的入口点。

### 示例：使用 `MatButtonHarness` 进行测试

```ts
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {MatButtonHarness} from '@angular/material/button/testing';
import {MyButtonContainerComponent} from './my-button-container.component';

describe('MyButtonContainerComponent', () => {
  let fixture: ComponentFixture<MyButtonContainerComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyButtonContainerComponent, MatButtonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(MyButtonContainerComponent);
    // 为组件的 fixture 创建一个 harness loader
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('should find a button with specific text', async () => {
    // 加载文本为 "Submit" 的 MatButton 的 harness
    const submitButton = await loader.getHarness(MatButtonHarness.with({text: 'Submit'}));

    // 使用 harness API 与组件交互
    expect(await submitButton.isDisabled()).toBe(false);
    await submitButton.click();

    // ... 断言
  });
});
```

### 关键概念

1. **`HarnessLoader`**：用于查找并创建 harness 实例的对象。使用 `TestbedHarnessEnvironment.loader(fixture)` 获取组件 fixture 的 loader。

2. **`loader.getHarness(HarnessClass)`**：异步查找并返回第一个匹配组件的 harness 实例。

3. **`HarnessClass.with({ ... })`**：许多 harnesses 提供了一个静态 `with` 方法，返回一个 `HarnessPredicate`。这允许你根据组件的属性（如文本、选择器或禁用状态）来过滤和查找组件。始终使用此方法来精确定位你要测试的组件。

4. **Harness API：** 一旦你拥有了一个 harness 实例，就可以使用其方法（例如 `.click()`、`.getText()`、`.getValue()`）与组件进行交互。这些方法会自动处理等待异步操作和变更检测。
