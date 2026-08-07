# 定义路由

路由是对象，用于定义哪个组件应当为特定的 URL 路径渲染。

## 基本配置

在 `Routes` 数组中定义路由，并使用 `provideRouter` 在 `appConfig` 中提供它们。

```ts
// app.routes.ts
export const routes: Routes = [
  {path: '', component: HomePage},
  {path: 'admin', component: AdminPage},
];

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes)],
};
```

## URL 路径

- **静态**：匹配精确字符串（例如 `'admin'`）。
- **路由参数**：以冒号为前缀的动态片段（例如 `'user/:id'`）。
- **通配符**：使用 `**` 匹配任意 URL。常用于 "Not Found" 页面。**始终放在数组末尾。**

## 匹配策略

Angular 采用 **首个匹配胜出** 策略。具体的路由必须放在不太具体的路由之前。

## 重定向

使用 `redirectTo` 将一个路径指向另一个路径。

```ts
{ path: 'articles', redirectTo: '/blog' },
{ path: 'blog', component: Blog },
```

## 页面标题

将标题与路由关联以提升可访问性。标题可以是静态或动态的（通过 `ResolveFn` 或自定义的 `TitleStrategy`）。

```ts
{ path: 'home', component: Home, title: 'Home Page' }
```

## 路由数据与 Providers

- **静态数据**：使用 `data` 属性附加元数据。
- **Route Providers**：使用 `providers` 数组将依赖项限定到特定路由及其子路由。

## 嵌套（子）路由

使用 `children` 属性定义子视图。父组件必须包含一个 `<router-outlet />`。

```ts
{
  path: 'product/:id',
  component: Product,
  children: [
    { path: 'info', component: ProductInfo },
    { path: 'reviews', component: ProductReviews },
  ],
}
```
