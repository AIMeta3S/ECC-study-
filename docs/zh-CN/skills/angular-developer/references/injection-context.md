# Injection Context

`inject()` 函数只能在代码执行于 **injection context** 中时使用。

## injection context 在哪里可用？

injection context 在以下场景中自动可用：

1. 由 DI 实例化的类的 **字段初始化器**（`@Injectable`、`@Component`、`@Directive`、`@Pipe`）。
2. 由 DI 实例化的类的 **构造函数**。
3. 在 `useFactory` 或 `InjectionToken` 配置中指定的 **工厂函数**。
4. 由 Angular 执行的 **函数式 API**（例如 functional guard、resolver、interceptor）。

```ts
@Component({...})
export class Example {
  // 有效：字段初始化器
  private router = inject(Router);

  constructor() {
    // 有效：构造函数
    const http = inject(HttpClient);
  }

  onClick() {
    // 无效：非 injection context
    // const auth = inject(AuthService);
  }
}
```

## `runInInjectionContext`

如果需要在 injection context 中运行某个函数（通常用于动态组件创建或测试），请使用 `runInInjectionContext`。这需要能够访问一个已存在的 injector（例如 `EnvironmentInjector` 或 `Injector`）。

```ts
import {Injectable, inject, EnvironmentInjector, runInInjectionContext} from '@angular/core';

@Injectable({providedIn: 'root'})
export class MyService {
  private injector = inject(EnvironmentInjector);

  doSomethingDynamic() {
    runInInjectionContext(this.injector, () => {
      // 在此处使用 inject() 现在是有效的
      const router = inject(Router);
    });
  }
}
```

## `assertInInjectionContext`

在工具函数中使用 `assertInInjectionContext`，以确保它们从有效的 context 中被调用。否则它会抛出一个清晰的错误。

```ts
import {assertInInjectionContext, inject, ElementRef} from '@angular/core';

export function injectNativeElement<T extends Element>(): T {
  assertInInjectionContext(injectNativeElement);
  return inject(ElementRef).nativeElement;
}
```
