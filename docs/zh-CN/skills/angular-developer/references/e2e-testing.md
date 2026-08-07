# End-to-End (E2E) 测试

使用 E2E 测试覆盖真实浏览器中的关键用户旅程。优先使用 Angular workspace 中已配置的框架，例如 Cypress 或 Playwright。

## 运行 E2E 测试

在 `package.json` 和 `angular.json` 中查看项目特定的命令。常见模式包括：

```shell
npm run e2e
pnpm e2e
ng e2e
```

当应用必须先构建或启动时，使用现有的项目脚本，而不是另造一个平行的测试入口。

## 测试结构

- 让 E2E specs 靠近已配置的测试框架，例如 `cypress/e2e/` 或 `e2e/`。
- 将可复用的登录/设置 helper 放在框架的 support 目录中。
- 保持 fixtures 明确且足够小，使每个测试都能解释它所依赖的用户状态。

### Cypress 示例

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

### Playwright 示例

```typescript
import {expect, test} from '@playwright/test';

test('redirects to dashboard on valid credentials', async ({page}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', {name: 'Sign in'}).click();
  await expect(page).toHaveURL(/dashboard/);
});
```

## 最佳实践

- 优先使用无障碍 locators（`getByRole`、`getByLabel`）或稳定的 `data-*` 属性。
- 避免依赖 CSS 类、DOM 层级或附带文本的 selectors。
- 等待特定的 UI 状态、路由或网络响应，而不是任意 sleep。
- 保持 smoke tests 简短，并将完整工作流覆盖留给价值最高的路径。
