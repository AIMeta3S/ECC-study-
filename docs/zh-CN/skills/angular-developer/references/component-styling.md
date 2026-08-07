# 组件样式

Angular 组件可以定义专用于其模板的样式，从而实现封装与模块化。

## 定义样式

样式可以内联定义，也可以放在单独的文件中。

```ts
@Component({
  selector: 'app-photo',
  // 内联样式
  styles: `
    img {
      border-radius: 50%;
    }
  `,
  // 或外部文件
  styleUrl: 'photo.component.css',
})
export class Photo {}
```

## 视图封装

每个组件都有一个视图封装设置，用于决定样式的作用域范围。

| 模式                            | 行为                                                                                          |
| :------------------------------ | :-------------------------------------------------------------------------------------------- |
| `Emulated`（默认）              | 通过唯一的 HTML 属性将样式限定在组件范围内。全局样式仍可能泄漏进来。                         |
| `ShadowDom`                     | 使用浏览器原生的 Shadow DOM API 完全隔离样式。                                                |
| `None`                          | 禁用封装。组件样式变为全局样式。                                                              |
| `ExperimentalIsolatedShadowDom` | 严格保证只应用组件自身的样式。                                                                |

### 用法

```ts
import { ViewEncapsulation } from '@angular/core';

@Component({
  ...,
  encapsulation: ViewEncapsulation.None,
})
export class GlobalStyled {}
```

## 特殊选择器

### `:host`

指向组件的宿主元素（与组件 selector 匹配的元素）。

```css
:host {
  display: block;
  border: 1px solid black;
}
```

### `:host-context()`

根据宿主元素祖先中的某些条件来指向宿主元素。

```css
/* 如果任一祖先元素带有 'theme-dark' class，则应用以下样式 */
:host-context(.theme-dark) {
  background-color: #333;
}
```

### `::ng-deep`

针对某条特定规则禁用视图封装，使其能够"泄漏"到子组件中。
**注意：Angular 团队强烈不建议使用 `::ng-deep`。** 它仅为向后兼容而保留。

## 模板中的样式

你可以直接在组件的模板中使用 `<style>` 元素。视图封装规则仍然适用。

```html
<style>
  .dynamic-class {
    color: red;
  }
</style>
<div class="dynamic-class">Hello</div>
```

## 外部样式

在 CSS 中使用 `<link>` 或 `@import` 会被视为外部样式。**外部样式不受 emulated 视图封装的影响。**
