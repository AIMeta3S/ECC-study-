# Route Guards

路由守卫控制用户是否可以导航到或离开某个路由。

## 守卫的类型

- **`CanActivate`**：用户能否访问此路由？（例如，权限检查）。
- **`CanActivateChild`**：用户能否访问此路由的子路由？
- **`CanDeactivate`**：用户能否离开此路由？（例如，未保存的更改）。
- **`CanMatch`**：此路由是否应被纳入匹配考虑？（例如，feature flags）。如果它返回 `false`，router 会继续检查其他路由。

## 创建守卫

自 Angular 15 起，守卫通常采用函数式形式。

```ts
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  // 重定向到登录页
  return router.parseUrl('/login');
};
```

## 应用守卫

将它们以数组形式添加到路由配置中。它们会按顺序执行。

```ts
{
  path: 'admin',
  component: Admin,
  canActivate: [authGuard],
  canActivateChild: [adminChildGuard],
  canDeactivate: [unsavedChangesGuard]
}
```

## 返回值

- `boolean`：`true` 表示允许，`false` 表示阻止。
- `UrlTree` 或 `RedirectCommand`：重定向到其他路由。
- `Observable` 或 `Promise`：解析为上述类型。

## 安全提示

**客户端守卫不能替代服务端安全措施。** 务必在服务端验证权限。
