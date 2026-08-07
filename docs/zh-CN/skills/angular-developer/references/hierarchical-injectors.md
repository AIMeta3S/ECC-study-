# 分层注入器

Angular 的依赖注入系统是分层的，这意味着服务可以被限定在应用的不同层级。

## 注入器层级的类型

1. **`EnvironmentInjector` 层级**：在应用启动期间通过 `@Injectable({ providedIn: 'root' })` 或 `ApplicationConfig.providers` 配置。这些是全局单例。
2. **`ElementInjector` 层级**：在每个 DOM 元素上隐式创建。通过 `@Component()` 或 `@Directive()` 中的 `providers` 或 `viewProviders` 数组配置。

## 解析规则

当请求某个依赖时，Angular 会分两个阶段解析它：

1. 它沿 **`ElementInjector`** 树向上搜索，从发起请求的组件/指令开始，一直到根元素。
2. 如果未找到，则搜索 **`EnvironmentInjector`** 树，从最近的环境注入器开始，一直到根节点。
3. 如果仍未找到，则抛出错误（除非标记为 optional）。

## 解析修饰符

你可以使用 `inject()` 中的选项对象来改变 Angular 搜索依赖的方式：

- **`optional`**：如果未找到该依赖，返回 `null` 而不是抛出错误。
- **`self`**：只检查当前 `ElementInjector`。不向上查找父树。
- **`skipSelf`**：从父级 `ElementInjector` 开始搜索，跳过当前元素。
- **`host`**：到达宿主组件的视图边界时停止搜索。

```ts
@Component({...})
export class Example {
  // 找不到时返回 null 而不是崩溃
  optionalService = inject(MyService, { optional: true });

  // 跳过此组件的 providers，查看父级
  parentService = inject(ParentService, { skipSelf: true });
}
```

## `providers` 与 `viewProviders`

在组件层级提供服务时：

- **`providers`**：该服务对组件、其视图（模板）以及任何**投影内容**（`<ng-content>`）可用。
- **`viewProviders`**：该服务对组件及其视图可用，但**不**对投影内容可用。当需要将服务与使用方传入的内容隔离时，请使用此选项。
