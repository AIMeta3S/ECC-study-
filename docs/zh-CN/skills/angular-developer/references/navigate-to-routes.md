# 导航到路由

Angular 提供了声明式和编程式两种在路由之间导航的方式。

## 声明式导航（`RouterLink`）

在锚点元素上使用 `RouterLink` directive。

```ts
import {RouterLink, RouterLinkActive} from '@angular/router';

@Component({
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav>
      <a routerLink="/dashboard" routerLinkActive="active-link">Dashboard</a>
      <a [routerLink]="['/user', userId]">Profile</a>
    </nav>
  `,
})
export class Nav {
  userId = '123';
}
```

- **绝对路径**：以 `/` 开头（例如 `/settings`）。
- **相对路径**：不带前导 `/`。使用 `../` 上跳一级。

## 编程式导航（`Router`）

注入 `Router` service 以通过 TypeScript 代码进行导航。

### `router.navigate()`

使用命令数组。

```ts
private router = inject(Router);
private route = inject(ActivatedRoute);

// 标准导航
this.router.navigate(['/profile']);

// 带参数
this.router.navigate(['/search'], {
  queryParams: { q: 'angular' },
  fragment: 'results'
});

// 相对导航
this.router.navigate(['edit'], { relativeTo: this.route });
```

### `router.navigateByUrl()`

使用字符串路径。非常适合绝对导航或完整 URL。

```ts
this.router.navigateByUrl('/products/123?view=details');

// 替换历史记录中的当前条目
this.router.navigateByUrl('/login', {replaceUrl: true});
```

## URL 参数

- **路由参数**：路径的一部分（例如 `/user/123`）。
- **查询参数**：位于 `?` 之后（例如 `/search?q=query`）。
- **矩阵参数**：作用于单个 segment（例如 `/products;category=books`）。
