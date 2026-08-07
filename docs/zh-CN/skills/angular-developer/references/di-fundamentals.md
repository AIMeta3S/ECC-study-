# Dependency Injection (DI) 基础

Dependency Injection (DI) 是一种设计模式，通过允许你将特性"注入"到不同部分，来组织代码并在整个应用中共享。这能提升代码的可维护性、可扩展性和可测试性。

## DI 在 Angular 中的工作方式

代码与 Angular 的 DI 系统交互主要有两种方式：

1. **Providing**：将值（对象、函数、原始值）提供给 DI 系统。
2. **Injecting**：向 DI 系统请求这些值。

Angular 的组件、指令和服务会自动参与 DI。

## 服务

**服务**是在整个应用中共享数据和功能最常见的方式。它是一个用 `@Injectable()` 装饰的 TypeScript 类。

### 创建服务

在 `@Injectable` 装饰器中使用 `providedIn: 'root'` 选项，可将服务设为在整个应用中都可用的 singleton。这是大多数服务的推荐做法。

```ts
import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root', // 使其成为到处可用的 singleton
})
export class AnalyticsLogger {
  trackEvent(category: string, value: string) {
    console.log('Analytics event logged:', {category, value});
  }
}
```

服务的常见用途包括：

- 数据客户端（API 调用）
- 状态管理
- 认证与授权
- 日志记录与错误处理
- 工具函数

## 注入依赖

使用 Angular 的 `inject()` 函数来请求依赖。

### `inject()` 函数

你可以使用 `inject()` 函数获取服务（或任何其他已提供的 token）的实例。

```ts
import {Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {AnalyticsLogger} from './analytics-logger.service';

@Component({
  selector: 'app-navbar',
  template: `<a href="#" (click)="navigateToDetail($event)">Detail Page</a>`,
})
export class Navbar {
  // 使用类字段初始化器注入依赖
  private router = inject(Router);
  private analytics = inject(AnalyticsLogger);

  navigateToDetail(event: Event) {
    event.preventDefault();
    this.analytics.trackEvent('navigation', '/details');
    this.router.navigate(['/details']);
  }
}
```

### `inject()` 可以在哪里使用？（注入上下文）

你可以在**注入上下文**中调用 `inject()`。最常见的注入上下文出现在组件、指令或服务的构造过程中。

调用 `inject()` 的有效位置：

1. **类字段初始化器**（推荐）
2. **构造函数体**
3. **路由 guard 和 resolver**（它们在注入上下文中执行）
4. **在 providers 中使用的工厂函数**

```typescript
import {Component, Directive, Injectable, inject, ElementRef} from '@angular/core';
import {HttpClient} from '@angular/common/http';

// 1. 在组件中（字段初始化器和构造函数）
@Component({
  /*...*/
})
export class Example {
  private service1 = inject(MyService); // 有效的字段初始化器

  private service2: MyService;
  constructor() {
    this.service2 = inject(MyService); // 有效的构造函数体
  }
}

// 2. 在指令中
@Directive({
  /*...*/
})
export class MyDirective {
  private element = inject(ElementRef); // 有效的字段初始化器
}

// 3. 在服务中
@Injectable({providedIn: 'root'})
export class MyService {
  private http = inject(HttpClient); // 有效的字段初始化器
}

// 4. 在路由 guard 中（函数式）
export const authGuard = () => {
  const auth = inject(AuthService); // 有效的路由 guard
  return auth.isAuthenticated();
};
```
