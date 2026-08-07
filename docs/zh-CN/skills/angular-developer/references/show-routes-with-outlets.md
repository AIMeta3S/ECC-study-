# 使用 Outlet 展示路由

`RouterOutlet` 指令是一个占位符，Angular 会在其中为当前 URL 渲染对应的组件。

## 基本用法

在模板中加入 `<router-outlet />`。Angular 会把路由对应的组件作为紧随该 outlet 之后的兄弟节点插入。

```html
<app-header /> <router-outlet />
<!-- 路由内容会出现在这里 -->
<app-footer />
```

## 嵌套 Outlet

子路由需要在父组件的模板中拥有自己的 `<router-outlet />`。

```ts
// 父组件模板
<h1>Settings</h1>
<router-outlet /> <!-- Profile 或 Security 等子组件会渲染在这里 -->
```

## 命名 Outlet（辅助路由）

页面可以拥有多个 outlet。为某个 outlet 指定 `name` 即可专门定向到它。默认名称为 `'primary'`。

```html
<router-outlet />
<!-- 主 outlet -->
<router-outlet name="sidebar" />
<!-- 辅助 outlet -->
```

在路由配置中定义 `outlet`：

```ts
{
  path: 'chat',
  component: Chat,
  outlet: 'sidebar'
}
```

## Outlet 生命周期事件

当组件发生变更时，`RouterOutlet` 会触发事件：

- `activate`：新组件被实例化。
- `deactivate`：组件被销毁。
- `attach` / `detach`：与 `RouteReuseStrategy` 配合使用。

```html
<router-outlet (activate)="onActivate($event)" />
```

## 通过 `routerOutletData` 传递数据

你可以使用 `routerOutletData` input 向路由对应的组件传递上下文数据。组件通过 `ROUTER_OUTLET_DATA` injection token 以 signal 的形式访问该数据。

```ts
// 在父组件中
<router-outlet [routerOutletData]="{ theme: 'dark' }" />

// 在路由对应的组件中
outletData = inject(ROUTER_OUTLET_DATA) as Signal<{ theme: string }>;
```
