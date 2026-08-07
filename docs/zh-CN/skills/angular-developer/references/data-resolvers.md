# Data Resolvers

data resolver 会在路由激活前获取数据，确保组件在渲染时拥有所需数据。

## 创建 resolver

实现 `ResolveFn` 类型。

```ts
export const userResolver: ResolveFn<User> = (route, state) => {
  const userService = inject(UserService);
  const id = route.paramMap.get('id')!;
  return userService.getUser(id);
};
```

## 配置路由

在 `resolve` 键下添加 resolver。

```ts
{
  path: 'user/:id',
  component: UserProfile,
  resolve: {
    user: userResolver
  }
}
```

## 访问已解析的数据

### 1. 通过 `ActivatedRoute`（传统方式）

```ts
private route = inject(ActivatedRoute);
data = toSignal(this.route.data);
user = computed(() => this.data().user);
```

### 2. 通过组件 input（现代方式）

在 `provideRouter` 中启用 `withComponentInputBinding()`，以将解析后的数据直接传递给 `@Input` 或 `input()`。

```ts
// app.config.ts
provideRouter(routes, withComponentInputBinding());

// component.ts
user = input.required<User>();
```

## 错误处理

如果 resolver 失败，导航会被阻止。

- 使用 `withNavigationErrorHandler` 进行全局处理。
- 在 resolver 内部使用 `catchError` 以返回 `RedirectCommand` 或回退数据。

```ts
return userService
  .get(id)
  .pipe(catchError(() => of(new RedirectCommand(router.parseUrl('/error')))));
```

## 最佳实践

- **保持轻量**：仅获取关键数据。
- **提供反馈**：监听 router 事件以在导航期间显示全局加载条，因为 UI 会停留在旧页面直到 resolver 完成。
