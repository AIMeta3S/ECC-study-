# 使用 RouterTestingHarness 进行测试

在测试涉及路由的组件时，**不要 mock Router 或相关服务**，这一点至关重要。应改用 `RouterTestingHarness`，它提供了一种健壮且可靠的方式，可在高度贴近真实应用的环境中测试路由逻辑。

使用 harness 可以确保你测试的是真实的路由配置、guards 和 resolvers，从而使测试更有意义。

## 设置路由测试

`RouterTestingHarness` 是测试路由场景的主要工具。你还需要在 `TestBed` 配置中使用 `provideRouter` 函数提供测试路由。

### 示例设置

```ts
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {Dashboard} from './dashboard.component';
import {HeroDetail} from './hero-detail.component';

describe('Dashboard Component Routing', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    // 1. 用测试路由配置 TestBed
    await TestBed.configureTestingModule({
      providers: [
        // 使用 provideRouter 配置你测试专用的路由
        provideRouter([
          {path: '', component: Dashboard},
          {path: 'heroes/:id', component: HeroDetail},
        ]),
      ],
    }).compileComponents();

    // 2. 创建 RouterTestingHarness
    harness = await RouterTestingHarness.create();
  });
});
```

### 关键概念

1. **`provideRouter([...])`**：提供测试专用的路由配置。它应包含被测组件正常运行所需的路由。
2. **`RouterTestingHarness.create()`**：异步创建并初始化 harness，并执行一次到根 URL（`/`）的初始导航。

## 编写路由测试

harness 创建完成后，你可以用它驱动导航，并对 router 的状态和已激活的组件做出断言。

### 示例：测试导航

```ts
it('should navigate to a hero detail when a hero is selected', async () => {
  // 1. 导航到初始组件并获取其实例
  const dashboard = await harness.navigateByUrl('/', Dashboard);

  // 假设 dashboard 有一个选择 hero 的方法
  const heroToSelect = {id: 42, name: 'Test Hero'};
  dashboard.selectHero(heroToSelect);

  // 在触发导航的动作之后等待稳定
  await harness.fixture.whenStable();

  // 2. 对 URL 进行断言
  expect(harness.router.url).toEqual('/heroes/42');

  // 3. 导航后获取已激活的组件
  const heroDetail = await harness.getHarness(HeroDetail);

  // 4. 对新组件的状态进行断言
  expect(await heroDetail.componentInstance.hero.name).toBe('Test Hero');
});

it('should get the activated component directly', async () => {
  // 一步完成导航并获取组件实例
  const dashboardInstance = await harness.navigateByUrl('/', Dashboard);

  expect(dashboardInstance).toBeInstanceOf(Dashboard);
});
```

### 最佳实践

- **用 harness 导航：**始终使用 `harness.navigateByUrl()` 来模拟导航。该方法返回一个 promise，resolve 后为已激活组件的实例。
- **访问 Router 状态：**使用 `harness.router` 访问实时的 router 实例并对其状态进行断言（例如 `harness.router.url`）。
- **获取已激活的组件：**使用 `harness.getHarness(ComponentType)` 获取当前已激活路由组件的 component harness 实例，或使用 `harness.routeDebugElement` 获取 `DebugElement`。
- **等待稳定：**在执行会引发导航的操作后，务必 `await harness.fixture.whenStable()`，以确保路由完成后再做断言。
