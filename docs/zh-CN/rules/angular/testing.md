---
paths:
  - "**/*.spec.ts"
  - "**/*.test.ts"
---
# Angular 测试

> 本文件在 [common/testing.md](../common/testing.md) 的基础上扩展了 Angular 专属内容。

## 测试运行器

使用项目配置的测试运行器。检查 `angular.json` 和 `package.json`；Angular 项目通常使用 Vitest、Jest 或 Jasmine + Karma。

```bash
ng test               # watch 模式
ng test --no-watch    # CI 模式
```

## TestBed 配置

对于 standalone component，直接导入 component。对于使用外部模板的 component，调用 `compileComponents()`。

```typescript
describe('UserCardComponent', () => {
  let fixture: ComponentFixture<UserCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserCardComponent);
  });
});
```

## Signal Input

通过 `fixture.componentRef.setInput()` 设置基于 signal 的 input：

```typescript
fixture.componentRef.setInput('user', mockUser);
fixture.detectChanges();
```

## Component Harness

在 UI 交互中，优先使用 Angular CDK 的 component harness，而非直接查询 DOM。harness 对标记变更更具韧性。

```typescript
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';

let loader: HarnessLoader;

beforeEach(() => {
  loader = TestbedHarnessEnvironment.loader(fixture);
});

it('triggers save on button click', async () => {
  const button = await loader.getHarness(MatButtonHarness.with({ text: 'Save' }));
  await button.click();
  expect(saveSpy).toHaveBeenCalled();
});
```

## Router 测试

对于依赖 router 的 component，使用 `RouterTestingHarness`：

```typescript
import { RouterTestingHarness } from '@angular/router/testing';

it('renders user on navigation', async () => {
  const harness = await RouterTestingHarness.create();
  const component = await harness.navigateByUrl('/users/1', UserDetailComponent);
  expect(component.userId()).toBe('1');
});
```

## 异步测试

使用 `fakeAsync` + `tick` 进行受控的异步操作。使用 `waitForAsync` 进行真实异步操作，配合 `fixture.whenStable()`。

```typescript
it('loads user after delay', fakeAsync(() => {
  const service = TestBed.inject(UserService);
  vi.spyOn(service, 'getUser').mockReturnValue(of(mockUser));

  fixture.detectChanges();
  tick();
  fixture.detectChanges();

  expect(fixture.nativeElement.querySelector('.name').textContent).toBe(mockUser.name);
}));
```

## HTTP 测试

```typescript
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpTestingController } from '@angular/common/http/testing';

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  httpMock = TestBed.inject(HttpTestingController);
});

afterEach(() => httpMock.verify());
```

## Service 测试

直接注入 service，无需 component fixture：

```typescript
describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
  });
});
```

## 测试内容

- **Service**：所有公共方法、错误路径、HTTP 交互
- **Component**：input/output 绑定、关键状态的渲染输出、通过 harness 进行用户交互
- **Pipe**：纯转换 —— 普通的单元测试，无需 TestBed
- **Guard/Resolver**：使用 `RouterTestingHarness` 测试允许和拒绝状态的返回值

## E2E 测试

对于关键用户流程，使用项目配置的 E2E 框架，例如 Cypress 或 Playwright。

```typescript
describe('Login flow', () => {
  it('redirects to dashboard on valid credentials', () => {
    cy.visit('/login');
    cy.get('[data-cy=email]').type('user@example.com');
    cy.get('[data-cy=password]').type('password123');
    cy.get('[data-cy=submit]').click();
    cy.url().should('include', '/dashboard');
  });
});
```

- 为交互元素添加 `data-cy` 属性，从而获得稳定的选择器
- 在 E2E 测试中，不要依赖 CSS 类或文本内容作为选择器

## 覆盖率

service 和 pipe 的覆盖率目标为 ≥80%。component：测试行为，而非实现细节。

## Skill 参考

参见 skill：`angular-developer`，了解全面的测试模式、harness 用法和异步最佳实践。
