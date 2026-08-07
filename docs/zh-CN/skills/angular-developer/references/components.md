# 组件

Angular 组件是应用程序的基本构建块。每个组件由一个包含行为的 TypeScript class、一个 HTML 模板和一个 CSS 选择器组成。

## 组件定义

使用 `@Component` 装饰器来定义组件的元数据。

```ts
@Component({
  selector: 'app-profile',
  template: `
    <img src="profile.jpg" alt="Profile photo" />
    <button (click)="save()">Save</button>
  `,
  styles: `
    img {
      border-radius: 50%;
    }
  `,
})
export class Profile {
  save() {
    /* ... */
  }
}
```

## 元数据选项

- `selector`：用于在模板中标识此组件的 CSS 选择器。
- `template`：内联 HTML 模板（小型模板推荐）。
- `templateUrl`：外部 HTML 文件的路径。
- `styles`：内联 CSS 样式。
- `styleUrl` / `styleUrls`：外部 CSS 文件的路径。
- `imports`：列出此组件模板中使用的组件、directive 或 pipe。

## 使用组件

要使用某个组件，请将其添加到使用它的组件的 `imports` 数组中，并在模板中使用其选择器。

```ts
@Component({
  selector: 'app-root',
  imports: [Profile],
  template: `<app-profile />`,
})
export class App {}
```

## 模板控制流

Angular 使用内置块来实现条件渲染和循环。

### 条件渲染（`@if`）

使用 `@if` 根据条件显示内容。可以包含 `@else if` 和 `@else` 块。

```html
@if (user.isAdmin) {
<admin-dashboard />
} @else if (user.isModerator) {
<mod-dashboard />
} @else {
<standard-dashboard />
}
```

**结果别名**：保存表达式的结果以便复用。

```html
@if (user.settings(); as settings) {
<p>Theme: {{ settings.theme }}</p>
}
```

### 循环（`@for`）

`@for` 块遍历集合。`track` 表达式对于性能和 DOM 复用是**必需的**。

```html
<ul>
  @for (item of items(); track item.id; let i = $index, total = $count) {
  <li>{{ i + 1 }}/{{ total }}: {{ item.name }}</li>
  } @empty {
  <li>No items to display.</li>
  }
</ul>
```

**隐式变量**：`$index`、`$count`、`$first`、`$last`、`$even`、`$odd`。

### 切换内容（`@switch`）

`@switch` 块根据值渲染内容。它使用严格相等（`===`）比较，并且**没有 fallthrough**。

```html
@switch (status()) { @case ('loading') { <app-spinner /> } @case ('error') { <app-error-msg /> }
@case ('success') { <app-data-grid /> } @default {
<p>Unknown status</p>
} }
```

**穷尽类型检查**：使用 `@default never;` 确保 union type 的所有情况都被处理。

```html
@switch (state) { @case ('on') { ... } @case ('off') { ... } @default never; // 若添加了新的
状态如 'standby' 则会报错 }
```

## 核心概念

- **宿主元素**：与组件选择器匹配的 DOM 元素。
- **视图**：由组件模板在宿主元素内渲染的 DOM。
- **Standalone**：默认情况下，组件是 standalone 的（自 Angular 19 起，`standalone: true` 为默认值）。对于旧版本，必须显式设置 `standalone: true`，否则组件必须属于某个 `NgModule`。
- **组件树**：Angular 应用程序组织为一棵组件树，其中每个组件都可以承载子组件。
- **组件命名**：不要为组件 class 添加 `Component` 后缀（例如 AppComponent），除非项目已配置为使用该命名规范。
