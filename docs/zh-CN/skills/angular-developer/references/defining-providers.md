# 定义依赖 Provider

Angular 提供了自动和手动两种方式，将依赖提供给它的 Dependency Injection (DI) 系统。

## 自动提供

提供 service 最常用的方式是在 `@Injectable()` 上使用 `providedIn: 'root'`。

### InjectionToken

对于非 class 依赖（配置对象、函数、primitives），使用 `InjectionToken`。`InjectionToken` 也可以自动提供。

```ts
import {InjectionToken} from '@angular/core';

export interface AppConfig {
  apiUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('app.config', {
  providedIn: 'root',
  factory: () => ({apiUrl: 'https://api.example.com'}),
});
```

## 手动提供

当 service 缺少 `providedIn`、当你想为某个特定 component 提供新实例，或者当配置 runtime 值时，使用 `providers` 数组。

```ts
@Component({
  providers: [
    // { provide: LocalService, useClass: LocalService } 的简写
    LocalService,

    // useClass：替换实现
    {provide: Logger, useClass: BetterLogger},

    // useValue：提供静态值
    {provide: API_URL_TOKEN, useValue: 'https://api.example.com'},

    // useFactory：动态生成值
    {
      provide: ApiClient,
      useFactory: (http = inject(HttpClient)) => new ApiClient(http),
    },

    // useExisting：创建别名
    {provide: OldLogger, useExisting: NewLogger},

    // multi：将同一个 token 的多个值作为 array 提供
    {provide: INTERCEPTOR_TOKEN, useClass: AuthInterceptor, multi: true},
  ],
})
export class Example {}
```

## Provider 的作用域

- **Application Bootstrap**：全局 singleton。用于 HTTP client、日志或应用级配置。
- **Component/Directive**：隔离的实例。用于 component 特有的状态或表单。service 在 component 销毁时随之销毁。
- **Route**：仅随特定 route 加载的功能专属 service。

## 库的模式：`provide*` 函数

库作者应导出返回 provider 数组的函数，以封装配置：

```ts
export function provideAnalytics(config: AnalyticsConfig): Provider[] {
  return [{provide: ANALYTICS_CONFIG, useValue: config}, AnalyticsService];
}
```
