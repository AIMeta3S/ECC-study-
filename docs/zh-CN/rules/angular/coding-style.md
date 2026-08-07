---
paths:
  - "**/*.component.ts"
  - "**/*.component.html"
  - "**/*.service.ts"
  - "**/*.directive.ts"
  - "**/*.pipe.ts"
  - "**/*.guard.ts"
  - "**/*.resolver.ts"
  - "**/*.module.ts"
---
# Angular 编码风格

> 本文件在 [common/coding-style.md](../common/coding-style.md) 的基础上扩展了 Angular 专属内容。

## 版本感知

编写代码前务必检查项目的 Angular 版本——不同版本之间特性差异显著。运行 `ng version` 或检查 `package.json`。创建新项目时，除非用户明确指定，否则不要锁定版本。

生成或修改 Angular 代码后，完成前务必运行 `ng build` 以捕获错误。

## 文件命名

遵循 Angular CLI 约定——每个文件对应一个 artifact：

- `user-profile.component.ts` + `user-profile.component.html` + `user-profile.component.spec.ts`
- `user.service.ts`, `auth.guard.ts`, `date-format.pipe.ts`
- Feature 目录：`features/users/`、`features/auth/`
- 使用 CLI 生成：`ng generate component features/users/user-card`

## 组件

优先使用 standalone component（v17+ 默认）。所有新组件都使用 `OnPush` change detection。

```typescript
@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './user-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCardComponent {
  user = input.required<User>();
  select = output<string>();
}
```

## Dependency Injection

使用 `inject()` 而非 constructor injection。保持 constructor 为空，或将其完全移除。

```typescript
// 正确做法
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private router = inject(Router);
}

// 错误做法：constructor injection 冗长且更难 tree-shake
constructor(private http: HttpClient, private router: Router) {}
```

对非类依赖使用 `InjectionToken`：

```typescript
const API_URL = new InjectionToken<string>('API_URL');

// 提供：
{ provide: API_URL, useValue: 'https://api.example.com' }

// 消费：
private apiUrl = inject(API_URL);
```

## Signals

### 核心原语

```typescript
count = signal(0);
doubled = computed(() => this.count() * 2);

increment() {
  this.count.update(n => n + 1);
}
```

### `linkedSignal` —— 可写的派生状态

当某个 signal 在其数据源变化时必须重置或调整，但仍需保持独立可写时，使用 `linkedSignal`：

```typescript
selectedOption = linkedSignal(() => this.options()[0]);
// 当 options 变化时重置为第一项，但用户仍可覆盖
```

### `resource` —— 将异步数据接入 signal

使用 `resource()` 响应式地获取异步数据，无需手动订阅：

```typescript
userResource = resource({
  request: () => ({ id: this.userId() }),
  loader: ({ request }) => fetch(`/api/users/${request.id}`).then(r => r.json()),
});

// 访问方式：userResource.value(), userResource.isLoading(), userResource.error()
```

### `effect` 的使用

仅将 `effect()` 用于必须响应 signal 变化的 side effect（日志、第三方 DOM 操作）。绝不要用 effect 来同步 signal——应改用 `computed` 或 `linkedSignal`。渲染后的 DOM 处理请使用 `afterRenderEffect`。

```typescript
// 正确做法：side effect
effect(() => console.log('User changed:', this.user()));

// 错误做法：应改用 computed
effect(() => { this.fullName.set(`${this.first()} ${this.last()}`); });
```

## 模板

使用 v17+ 的 block 语法。在 `@for` 中始终提供 `track`：

```html
@for (item of items(); track item.id) {
  <app-item [item]="item" />
}

@if (isLoading()) {
  <app-spinner />
} @else if (error()) {
  <app-error [message]="error()" />
} @else {
  <app-content [data]="data()" />
}
```

模板中除简单条件判断外不得包含逻辑——应移至组件方法或 pipe。

## 表单

选择与项目现有方案一致的表单策略：

- **Signal Forms**（v21+）：v21+ 新项目首选。基于 signal 的表单状态。
- **Reactive Forms**：`FormBuilder` + `FormGroup` + `FormControl`。最适合带动态验证的复杂表单。
- **Template-Driven Forms**：`ngModel`。仅适用于简单表单。

```typescript
// Reactive Forms —— 大多数应用的标准方案
export class LoginComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit() {
    if (this.form.valid) {
      // 使用 this.form.value
    }
  }
}
```

## 组件样式

使用组件级样式并配合 `ViewEncapsulation.Emulated`（默认）。除非构建有意让样式外溢的设计系统，否则避免使用 `ViewEncapsulation.None`。

- 将样式作用域限定在组件内——不要在组件样式表中使用全局类名
- 使用 `:host` 为宿主元素设置样式
- 对需要主题化的值优先使用 CSS custom properties

## Change Detection

- 所有新组件默认使用 `ChangeDetectionStrategy.OnPush`
- signal 和 `async` pipe 会自动处理 change detection——避免使用 `markForCheck()` 和 `detectChanges()`
- 使用 OnPush 时绝不要就地修改 `@Input()` 对象
