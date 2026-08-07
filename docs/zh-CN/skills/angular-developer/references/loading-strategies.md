# 路由加载策略

Angular 支持两种主要的路由与组件加载策略，用于在初始加载时间与导航响应速度之间取得平衡。

## Eager Loading

组件被打包进初始 JavaScript payload 中，可立即使用。

```ts
{ path: 'home', component: Home }
```

- **优点**：切换无缝。
- **缺点**：增加初始 bundle 体积。

## Lazy Loading

组件或路由仅在用户导航至它们时才加载。这会生成独立的 JavaScript "chunks"。

### Lazy Loading 组件

使用 `loadComponent` 按需获取组件。

```ts
{
  path: 'admin',
  loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent)`,
}
```

### Lazy Loading 子路由

使用 `loadChildren` 获取一组路由。

```ts
{
  path: 'settings',
  loadChildren: () => import('./settings/settings.routes'),
}
```

## Injection Context 与 Lazy Loading

loader 函数运行在当前路由的 **injection context** 中。这允许你调用 `inject()` 做出感知上下文的加载决策。

```ts
{
  path: 'dashboard',
  loadComponent: () => {
    const flags = inject(FeatureFlags);
    return flags.isPremium
      ? import('./premium-dashboard')
      : import('./basic-dashboard');
  },
}
```

## 建议

- 为主要落地页使用 **Eager Loading**。
- 为所有其他功能区域使用 **Lazy Loading**，以保持初始 bundle 较小。
