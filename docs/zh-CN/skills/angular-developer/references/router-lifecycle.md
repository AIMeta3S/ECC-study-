# Router 生命周期与事件

Angular Router 通过 `Router.events` observable 发射事件，让你能够从头到尾跟踪导航生命周期。

## 常见 Router 事件（按时间顺序）

1. **`NavigationStart`**：导航开始。
2. **`RoutesRecognized`**：Router 将 URL 匹配到某条路由。
3. **`GuardsCheckStart` / `End`**：对 `canActivate`、`canMatch` 等进行求值。
4. **`ResolveStart` / `End`**：数据解析阶段（通过 resolver 获取数据）。
5. **`NavigationEnd`**：导航成功完成。
6. **`NavigationCancel`**：导航被取消（例如 guard 返回了 `false`）。
7. **`NavigationError`**：导航失败（例如 resolver 中出错）。

## 订阅事件

注入 `Router` 并对 `events` observable 进行过滤。

```ts
import {Router, NavigationStart, NavigationEnd} from '@angular/router';

export class MyService {
  private router = inject(Router);

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((event) => {
      console.log('Navigated to:', event.url);
    });
  }
}
```

## 调试

在应用 bootstrap 期间启用所有路由事件的详细 console 日志。

```ts
provideRouter(routes, withDebugTracing());
```

## 常见用例

- **加载指示器**：在 `NavigationStart` 触发时显示 spinner，在 `NavigationEnd`/`Cancel`/`Error` 时隐藏它。
- **分析**：通过监听 `NavigationEnd` 来跟踪页面浏览。
- **滚动管理**：响应 `Scroll` 事件以实现自定义滚动行为。
