---
paths:
  - "**/*.component.ts"
  - "**/*.component.html"
  - "**/*.service.ts"
  - "**/*.store.ts"
  - "**/*.routes.ts"
---
# Angular 模式

> 本文件扩展了 [common/patterns.md](../common/patterns.md)，补充 Angular 特定内容。

## Smart / Dumb 组件拆分

Smart（container）组件负责数据获取与状态。Dumb（presentational）组件仅接收 input、发射 output —— 不注入 service。

```typescript
// Smart —— 负责数据
@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush })
export class UserPageComponent {
  private userService = inject(UserService);
  user = toSignal(this.userService.getUser(this.userId()));
}
```

```html
<!-- Dumb —— 纯展示 -->
<app-user-card [user]="user()" (select)="onSelect($event)" />
```

## Service Layer

Service 负责所有数据访问与业务逻辑。组件负责委派 —— 组件中不使用 `HttpClient`。

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users');
  }
}
```

## 使用 `resource` 进行异步数据处理

使用 `resource()` 进行响应式异步获取。对于简单的数据加载，优先使用它而非手动 RxJS pipeline：

```typescript
export class UserDetailComponent {
  userId = input.required<string>();

  userResource = resource({
    request: () => ({ id: this.userId() }),
    loader: ({ request }) =>
      firstValueFrom(inject(UserService).getUser(request.id)),
  });
}
```

访问状态：`userResource.value()`、`userResource.isLoading()`、`userResource.error()`、`userResource.reload()`。

## Signal 状态模式

```typescript
// 局部可变状态
count = signal(0);

// 派生（从不重复）
doubled = computed(() => this.count() * 2);

// 随源重置的可写派生状态
selectedItem = linkedSignal(() => this.items()[0]);

// 将 Observable 桥接为 signal
users = toSignal(this.userService.getUsers(), { initialValue: [] });
```

绝不将派生值存储在独立的 signal 中 —— 使用 `computed`。绝不使用 `effect` 来同步 signal —— 使用 `computed` 或 `linkedSignal`。

## 订阅清理

所有手动订阅都使用 `takeUntilDestroyed()`。新代码中绝不使用手动 `ngOnDestroy` + `Subject` + `takeUntil`。

```typescript
export class UserComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.userService.updates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(update => this.handleUpdate(update));
  }
}
```

## 路由

### 路由定义

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'admin',
    canMatch: [authGuard],           // CanMatch 彻底阻止加载 chunk
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  {
    path: 'users/:id',
    resolve: { user: userResolver },
    component: UserDetailComponent,
  },
];
```

- 当路由模块不应为未授权用户加载时，使用 `canMatch` 而非 `canActivate`
- 使用 `loadChildren` 懒加载所有 feature module
- 使用 `resolve` 预取数据，避免在组件中处理加载状态

### 函数式 Guard

```typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated()
    ? true
    : inject(Router).createUrlTree(['/login']);
};
```

### 数据 Resolver

```typescript
export const userResolver: ResolveFn<User> = (route) => {
  return inject(UserService).getUser(route.paramMap.get('id')!);
};
```

### View Transitions

使用 View Transitions API 启用平滑的路由过渡：

```typescript
// app.config.ts
provideRouter(routes, withViewTransitions())
```

## Dependency Injection 模式

### 作用域 Provider

当 service 不应为 singleton 时，在组件或路由级别提供：

```typescript
@Component({
  providers: [UserEditService],   // 作用域限定于该组件子树
})
export class UserEditComponent {}
```

### `InjectionToken`

```typescript
export const CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

// 在 providers 中：
{ provide: CONFIG, useValue: appConfig }
{ provide: CONFIG, useFactory: () => loadConfig(), deps: [] }

// 消费：
private config = inject(CONFIG);
```

### `viewProviders` 与 `providers`

- `providers`：对组件及其所有 content child 可用
- `viewProviders`：仅对组件自身视图可用（不包括投影内容）

## HTTP Interceptor

使用 functional interceptor（v15+）处理认证、错误处理与重试：

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  if (!token) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
```

在 `app.config.ts` 中注册：

```typescript
provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))
```

## RxJS Operator

- `switchMap` —— 搜索、导航（取消前一个）
- `mergeMap` —— 独立的并行请求
- `exhaustMap` —— 表单提交（完成前忽略后续）
- 始终用 `catchError` 处理错误 —— 绝不让 stream 静默中断

```typescript
search$ = this.query$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(q => this.service.search(q).pipe(catchError(() => of([])))),
);
```

## 表单

匹配项目现有的表单策略。对于新的 v21+ 应用，优先使用 signal form。

```typescript
// Reactive Forms —— 复杂表单的标准方案
export class UserFormComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });
}
```

## 渲染策略

- **CSR**（默认）：标准 SPA
- **SSR + Hydration**：`ng add @angular/ssr` —— 提升 FCP 与 SEO
- **SSG（Prerendering）**：构建时为内容密集型路由生成静态页面

使用 SSR 时，避免直接使用 `window`、`document`、`localStorage` —— 改用 `isPlatformBrowser` 或 `DOCUMENT` token。

## 无障碍

使用 Angular CDK 构建无样式的无障碍组件（Accordion、Listbox、Combobox、Menu、Tabs、Toolbar、Tree、Grid）。为 ARIA 属性编写样式，而非手动管理：

```css
[aria-selected="true"] { background: var(--color-selected); }
```

## Skill 参考

参见 skill：`angular-developer`，获取关于 signal、form、路由、DI、SSR 与无障碍模式的深入指导。
