---
name: react-testing
description: 使用 React Testing Library、Vitest/Jest 进行 React 组件测试，使用 MSW 进行网络 mock，使用 axe 进行无障碍断言，以及组件测试与 Playwright/Cypress 端到端运行之间的决策边界。在为 React 组件、hook 或页面编写或修复测试时使用。
metadata:
  origin: ECC
---

# React Testing

全面的 React 测试模式，涵盖行为导向的组件测试、自定义 hook 测试、无障碍断言和网络层 mock。

## 何时启用

- 为 React 组件、自定义 hook 或页面编写测试
- 为遗留的未测试组件增加测试覆盖
- 从 Enzyme 或类组件时代的模式迁移到 React Testing Library
- 为新的 React 项目配置 Vitest 或 Jest
- 在测试中 mock HTTP 请求
- 断言无障碍违规
- 决定哪些测试应归于 RTL、Playwright Component Testing 还是完整 E2E

## 核心原则

测试用户所见与所做，而非实现细节。

一个测试应该：

- 使用与生产环境相同的 provider 渲染组件
- 通过无障碍查询（role、label）和 `userEvent` 与之交互
- 断言可见输出与可观察的副作用（回调被触发、请求被发送）

一个测试不应该：

- 检查组件 state、传递给子组件的 props，或哪些 hook 被调用
- mock React 本身或框架 hook
- 断言渲染次数或超出影响用户范围的 DOM 结构

## 库的选择

| Runner | 何时使用 | 说明 |
|---|---|---|
| **Vitest** | Vite、Remix、现代配置 | 更快、原生 ESM、与 Jest 兼容的 API |
| **Jest** | Next.js、CRA、既有仓库 | 许多 React 项目的默认选择 |
| **Playwright Component Testing** | 需要真实浏览器引擎 | 当 JSDOM 缺少所需功能时使用 |
| **Cypress Component Testing** | 真实浏览器、已在使用的 Cypress | Playwright CT 的替代方案 |

只选一个。不要在同一个仓库中同时运行 RTL + Vitest 和 Playwright CT，除非有清晰的边界划分。

## 查询优先级

React Testing Library 提供三个层级的查询——自上而下使用：

1. **对所有人可访问**：`getByRole`、`getByLabelText`、`getByPlaceholderText`、`getByText`、`getByDisplayValue`
2. **语义化**：`getByAltText`、`getByTitle`
3. **Test ID（兜底方案）**：`getByTestId`

```tsx
// 最佳
screen.getByRole("button", { name: /save/i });

// 用于输入框尚可
screen.getByLabelText("Email");

// 最后手段
screen.getByTestId("save-btn");
```

变体：

- `getBy*` — 无匹配时抛出异常
- `queryBy*` — 返回 `null`（用于“断言不存在”）
- `findBy*` — 异步，返回 Promise（用于异步操作后出现的元素）

## 使用 `userEvent` 进行用户交互

```tsx
import userEvent from "@testing-library/user-event";

test("submits the form", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(<UserForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText("Email"), "user@example.com");
  await user.click(screen.getByRole("button", { name: /save/i }));

  expect(onSubmit).toHaveBeenCalledWith({ email: "user@example.com" });
});
```

- 始终对 userEvent 调用使用 `await`
- 每个测试调用一次 `userEvent.setup()`，复用返回的 `user`
- `userEvent` 模拟真实的浏览器事件序列；`fireEvent` 仅派发单个合成事件——优先使用 `userEvent`

## 异步模式

```tsx
// 异步操作后出现的元素
expect(await screen.findByText("Loaded")).toBeInTheDocument();

// 副作用断言
await waitFor(() => expect(saveSpy).toHaveBeenCalled());

// 应该消失的元素
await waitForElementToBeRemoved(() => screen.queryByText("Loading"));
```

绝不要使用 `setTimeout` + 断言——会导致 flaky。使用上面的 matcher。

## 使用 MSW 进行网络 mock

Mock Service Worker 在网络层进行 mock。组件、hook 和 fetch 库的行为与生产环境完全一致。

### 配置

```ts
// test/setup.ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users/:id", ({ params }) =>
    HttpResponse.json({ id: params.id, name: "Alice" }),
  ),
  http.post("/api/users", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: "new-id", ...body }, { status: 201 });
  }),
];

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

配置 `onUnhandledRequest: "error"`，这样任何未 mock 的请求都会显式让测试失败——静默通过比报错更糟糕。

### 按测试重写

```tsx
test("renders error on 500", async () => {
  server.use(
    http.get("/api/users/:id", () => new HttpResponse(null, { status: 500 })),
  );
  render(<UserPage id="1" />);
  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
});
```

## Provider 包装

将 provider 在 `test-utils.tsx` 中统一包装一次：

```tsx
// test-utils.tsx
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter>{ui}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
    options,
  );
}

export * from "@testing-library/react";
```

然后每个测试文件中 `import { renderWithProviders, screen } from "test-utils"`。

## 自定义 hook 测试

```tsx
import { renderHook, act } from "@testing-library/react";

test("useCounter increments and decrements", () => {
  const { result } = renderHook(() => useCounter(0));

  expect(result.current.count).toBe(0);

  act(() => result.current.increment());
  expect(result.current.count).toBe(1);

  act(() => result.current.decrement());
  expect(result.current.count).toBe(0);
});

test("useCounter accepts initial value", () => {
  const { result } = renderHook(() => useCounter(10));
  expect(result.current.count).toBe(10);
});

test("useUser fetches user data", async () => {
  // 每个测试在 wrapper 外部实例化 QueryClient 一次，使其在重新渲染时保留。
  // 在 wrapper 闭包内部创建会在每次渲染时重置 cache state，导致 flaky 测试。
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const { result } = renderHook(() => useUser("1"), { wrapper });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual({ id: "1", name: "Alice" });
});
```

- 将改变 state 的调用包裹在 `act` 中
- 只通过 hook 的公共 API 进行测试
- 对于使用 context 的 hook，传入 `wrapper`

## 无障碍断言

```tsx
import { axe, toHaveNoViolations } from "jest-axe"; // 或 vitest-axe
expect.extend(toHaveNoViolations);

test("UserCard has no a11y violations", async () => {
  const { container } = render(<UserCard user={mockUser} />);
  expect(await axe(container)).toHaveNoViolations();
});
```

在每个交互组件的组件测试中运行 axe。它能捕获：

- 表单输入缺少 label
- 无效的 ARIA 使用
- 颜色对比度差（有限——JSDOM 没有真实的 CSS 引擎，因此仅对 inline style 有效；视觉对比度应归入 Playwright）
- 图片缺少 alt 文本
- 标题顺序违规

交叉链接：[skills/accessibility/SKILL.md](../accessibility/SKILL.md) 提供更全面的无障碍测试 playbook。

## 何时不使用 snapshot 测试

渲染输出的 snapshot：

- 每次样式变更都会失效
- 在 review 中被机械批准
- 测试的是实现细节（DOM 结构），而非行为

可接受的 snapshot 用途：

- 纯数据序列化函数（`formatInvoice(invoice)` -> 稳定的字符串）
- 生成的配置文件（例如 webpack 配置输出）

对于组件的 visual regression，使用 Playwright/Cypress 截图或 Percy/Chromatic——真实的视觉差异，而非 DOM 字符串。

## 何时转用 Playwright / Cypress

JSDOM（被 Vitest/Jest 使用）无法：

- 渲染真实布局（flexbox、grid、viewport 查询）
- 运行原生浏览器动画、CSS 过渡
- 测试滚动行为、拖放、从剪贴板粘贴
- 处理 iframe、弹窗、下载、跨源流程
- 在受控环境中运行真实网络并完整支持 DevTools

对于以上任何一项，使用 Playwright Component Testing（在真实浏览器中进行组件测试）或完整 E2E。参见 [e2e-testing skill](../e2e-testing/SKILL.md)。

决策边界：

- hook、presentational component、带逻辑的表单 -> RTL
- 布局至关重要的组件，或使用 JSDOM 中没有的浏览器 API 的组件 -> Playwright CT
- 跨多个页面的完整用户流程 -> Playwright/Cypress E2E

## 覆盖率目标

| 层级 | 目标 |
|---|---|
| 纯工具函数 | >=90% |
| 自定义 hook | >=85% |
| presentational component | >=80% — 行为，而非行数 |
| container component | >=70% — golden path + 错误状态 |
| 页面 | E2E 单独覆盖；最少 smoke test |

通过 `vitest.config.ts` / `jest.config.js` 配置：

```ts
// vitest.config.ts
test: {
  coverage: {
    provider: "v8",
    reporter: ["text", "html", "lcov"],
    thresholds: {
      lines: 80,
      functions: 80,
      branches: 70,
      statements: 80,
    },
  },
}
```

## 反模式

- `container.querySelector("...")` — 绕过无障碍查询，让真实用户会失败的测试通过
- 断言渲染次数——实现细节
- `jest.mock("react", ...)` — 绝不要 mock React，应重构组件
- 默认 mock 子组件——测试的是集成而非隔离。仅当子组件有重度副作用时才 mock
- 忽略 `act()` 警告——它们标志着真实的 bug（卸载后更新 state、缺少异步包裹）
- 跨测试共享可变 state——测试顺序变化时会出现 flaky
- 移除 `it.skip()` 后就通过的测试——你的测试并未真正断言你以为的内容

## TDD 工作流

```
RED     -> 为下一个需求编写失败的测试
GREEN   -> 编写最少的组件代码使其通过
REFACTOR -> 改进组件，测试保持绿色
REPEAT  -> 下一个需求
```

对于新组件：

1. 定义组件的 prop 类型和签名
2. 为最简单的场景编写第一个测试
3. 验证它因正确的原因失败
4. 实现刚好足够通过的代码
5. 添加下一个测试用例
6. 当第三个相似测试揭示出模式时进行重构

## 测试命令

```bash
# Vitest
vitest                            # watch 模式
vitest run                        # 一次性运行
vitest run --coverage             # 带 coverage
vitest run path/to/file.test.tsx  # 单个文件

# Jest
jest --watch
jest --coverage
jest path/to/file.test.tsx

# CI 模式
CI=true vitest run --coverage
```

## 相关资源

- 规则：[rules/react/testing.md](../../rules/react/testing.md)
- skill：[react-patterns](../react-patterns/SKILL.md)、[accessibility](../accessibility/SKILL.md)、[e2e-testing](../e2e-testing/SKILL.md)、[tdd-workflow](../tdd-workflow/SKILL.md)
- agent：`react-reviewer`（在 code review 中审查测试质量）、`tdd-guide`（执行 TDD 流程）
- command：`/react-test`、`/react-review`

## 示例

### 使用 MSW 和 userEvent 的表单提交

```tsx
test("submits user form and shows success", async () => {
  server.use(
    http.post("/api/users", () =>
      HttpResponse.json({ id: "1", name: "Alice" }, { status: 201 }),
    ),
  );

  const user = userEvent.setup();
  renderWithProviders(<UserForm />);

  await user.type(screen.getByLabelText("Name"), "Alice");
  await user.type(screen.getByLabelText("Email"), "alice@example.com");
  await user.click(screen.getByRole("button", { name: /save/i }));

  expect(await screen.findByText(/saved successfully/i)).toBeInTheDocument();
});
```

### 测试 error boundary

```tsx
function Broken() {
  throw new Error("boom");
}

test("error boundary renders fallback", () => {
  // 抑制 React 对预期抛错产生的 console.error 噪音，然后恢复，以免
  // spy 泄漏到其他测试中并掩盖真实的错误。
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  } finally {
    errorSpy.mockRestore();
  }
});
```

### 测试 Suspense boundary

```tsx
test("shows loading then content", async () => {
  renderWithProviders(
    <Suspense fallback={<div>Loading...</div>}>
      <UserDetail id="1" />
    </Suspense>,
  );

  expect(screen.getByText("Loading...")).toBeInTheDocument();
  expect(await screen.findByText("Alice")).toBeInTheDocument();
});
```
