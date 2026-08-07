---
paths:
  - "**/*.test.tsx"
  - "**/*.test.jsx"
  - "**/*.spec.tsx"
  - "**/*.spec.jsx"
  - "**/__tests__/**/*.ts"
  - "**/__tests__/**/*.tsx"
---
# React 测试

> 本文件扩展了 [typescript/testing.md](../typescript/testing.md) 和 [common/testing.md](../common/testing.md)，增加了 React 特定内容。

## 库的选择

- **React Testing Library (RTL)** — 组件测试的标准。通过渲染后的 DOM 测试行为。
- **Vitest** — 基于 Vite 的新项目的首选 runner。比 Jest 更快，原生 ESM，相同的 API。
- **Jest** — 仍然是 Next.js / CRA 项目的默认选择。RTL 的工作方式完全相同。
- **Playwright Component Testing** — 当组件测试需要真实的浏览器引擎时（动画、布局、复杂事件）
- **Cypress Component Testing** — 替代的真实浏览器组件 runner

每个项目选择一个组件测试 runner —— 不要在同一个 repo 中混用 RTL + Playwright CT。

## 核心原则

测试用户看到和做的事情，而不是实现细节。

- 先按可访问性 role 查询，然后是 label，然后是 text —— 只有在其他方式都不合适时才回退到 `data-testid`
- 永远不要对内部状态、传递给子组件的 props 或调用了哪些 hooks 做断言
- 重构而不破坏测试 = 测试验证的是行为；这就是目标

## 查询优先级

RTL 暴露了三类查询。按以下优先级顺序从上到下使用：

1. **对所有人可访问**
   - `getByRole(role, { name })` — 首选
   - `getByLabelText` — 用于表单输入
   - `getByPlaceholderText` — 当没有 label 时使用（并添加一个 label）
   - `getByText` — 用于非交互式文本
   - `getByDisplayValue` — 用于有当前值的表单字段

2. **语义查询**
   - `getByAltText` — 用于图片
   - `getByTitle` — 最后手段，可访问性价值低

3. **Test ID**
   - `getByTestId("some-id")` — 仅作为兜底方案，当以上都不适用时

`getBy*` 在没有匹配时抛出异常。`queryBy*` 返回 null（用于断言不存在）。`findBy*` 返回 promise（用于 async）。

## 用户交互

优先使用 `userEvent` 而非 `fireEvent`。`userEvent` 模拟真实的浏览器事件序列（focus、keydown、beforeinput、input、keyup）—— `fireEvent` 只派发单个合成事件。

```tsx
import userEvent from "@testing-library/user-event";

test("submits the form", async () => {
  const user = userEvent.setup();
  render(<UserForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText("Email"), "user@example.com");
  await user.click(screen.getByRole("button", { name: /save/i }));

  expect(handleSubmit).toHaveBeenCalledWith({ email: "user@example.com" });
});
```

- 总是 `await` `userEvent` 调用 —— 它们是 async 的
- 在每个测试顶部调用一次 `userEvent.setup()`，然后复用返回的 `user`

## 异步断言

```tsx
// 错误：对异步渲染的内容进行同步查询
expect(screen.getByText("Loaded")).toBeInTheDocument();   // 抛出异常 —— 此时还不在 DOM 中

// 正确：findBy*（返回 promise，会重试）
expect(await screen.findByText("Loaded")).toBeInTheDocument();

// 正确：waitFor 用于非元素断言
await waitFor(() => expect(saveSpy).toHaveBeenCalled());
```

- `findBy*` 用于异步元素出现
- `waitFor` 用于对副作用或其他 matcher 的异步期望
- 永远不要用 `setTimeout` + 断言 —— 容易 flaky

## 使用 MSW 进行网络 Mock

对任何触及网络边界的测试使用 Mock Service Worker。MSW 运行在网络层，因此组件、hooks 和 fetch 库的行为都与生产环境中一致。

```tsx
// 测试设置
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const server = setupServer(
  http.get("/api/users/:id", ({ params }) =>
    HttpResponse.json({ id: params.id, name: "Alice" }),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

针对单个 test 的覆盖：

```tsx
test("renders error on 500", async () => {
  server.use(http.get("/api/users/:id", () => new HttpResponse(null, { status: 500 })));
  render(<UserPage id="1" />);
  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
});
```

## 避免对组件使用 Snapshot 测试

渲染输出的 snapshot 脆弱、难以审查，且会被审查者机械地批准。仅在以下情况使用它们：

- 纯数据序列化（例如，一个产生稳定字符串的 transformer）
- 捕获非视觉输出中的意外 regression

对于组件的视觉 regression，使用 Playwright / Cypress / Percy 截图 —— 真实的视觉差异，而不是 DOM 差异。

## 测试设置辅助工具

包装 providers 一次：

```tsx
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ThemeProvider theme={lightTheme}>
        <Router>{ui}</Router>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}
```

从 `test-utils.tsx` 导出并在所有地方使用。

## 自定义 Hook 测试

使用 RTL 的 `renderHook`：

```tsx
import { renderHook, act } from "@testing-library/react";

test("useCounter increments", () => {
  const { result } = renderHook(() => useCounter());
  act(() => result.current.increment());
  expect(result.current.count).toBe(1);
});
```

- 总是将改变状态的调用包裹在 `act` 中
- 总是通过公开的 hook API 测试，而不是内部实现

## 无障碍断言

```tsx
import { axe } from "vitest-axe";   // 或 jest-axe

test("UserCard has no a11y violations", async () => {
  const { container } = render(<UserCard user={mockUser} />);
  expect(await axe(container)).toHaveNoViolations();
});
```

在组件测试中运行 axe 断言 —— 可以捕获缺失的 label、ARIA 误用、颜色对比度问题（有限）。

## 何时使用 Playwright / Cypress

使用 RTL + JSDOM 的组件测试无法：

- 测试真实布局（flexbox、grid、依赖 viewport 的渲染）
- 测试滚动、拖放、从剪贴板粘贴
- 测试浏览器原生动画、CSS transitions
- 测试跨 frame 交互（iframe、弹窗）

对于这些情况，使用 Playwright Component Testing 或端到端的 Playwright/Cypress 运行。参见 [e2e-testing skill](../../skills/e2e-testing/SKILL.md)。

## 覆盖率目标

| 层级 | 目标 |
|---|---|
| 纯工具函数 | ≥90% |
| 自定义 hooks | ≥85% |
| 展示型组件 | ≥80% —— 关注行为，而非行数 |
| 容器组件 | ≥70% —— 关键路径 + 错误状态 |
| 页面（E2E 另行覆盖） | 每个路由至少一个 smoke test |

## 反模式

- 对 `container.querySelector` 做断言 —— 绕过了无障碍查询
- 对渲染次数做断言 —— 实现细节
- Mock React hooks（`jest.mock("react", ...)`）—— 应该重构组件
- 默认 mock 子组件 —— 测试的是集成，而不是孤立的父组件
- 忽略手动的 `act()` 警告 —— 它们表明存在真实的 bug

## Skill 参考

参见 `skills/react-testing/SKILL.md` 获取端到端测试示例、MSW 模式和无障碍测试脚手架。
