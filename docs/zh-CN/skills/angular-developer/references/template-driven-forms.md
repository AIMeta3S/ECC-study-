# 模板驱动表单

模板驱动表单使用双向数据绑定（`[(ngModel)]`）在模板中发生更改时更新组件中的数据模型，反之亦然。它们非常适合简单表单，并在 HTML 模板中使用 directive 来管理表单状态和验证。

## 核心 directive

模板驱动表单依赖 `FormsModule`，该 module 提供以下关键 directive：

- `NgModel`：将表单元素中的值更改与数据模型（`[(ngModel)]`）进行协调。
- `NgForm`：自动创建绑定到 `<form>` 标签的顶层 `FormGroup`。
- `NgModelGroup`：创建绑定到 DOM 元素的嵌套 `FormGroup`。

## 设置

首先，将 `FormsModule` 导入到你的组件或 module 中。

```ts
import {Component} from '@angular/core';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-user-form',
  imports: [FormsModule],
  templateUrl: './user-form.component.html',
})
export class UserForm {
  user = {name: '', role: 'Guest'};

  onSubmit() {
    console.log('Form submitted!', this.user);
  }
}
```

## 构建表单模板

### 使用 `[(ngModel)]` 进行双向绑定

在 input 元素上使用 `[(ngModel)]`。**每个使用 `[(ngModel)]` 的元素都必须具有 `name` 属性。** Angular 使用 `name` 属性将该控件注册到父级 `NgForm`。

```html
<form #userForm="ngForm" (ngSubmit)="onSubmit()">
  <!-- 基本输入框 -->
  <div>
    <label for="name">Name:</label>
    <input type="text" id="name" required [(ngModel)]="user.name" name="name" #nameCtrl="ngModel" />
  </div>

  <!-- 下拉选择框 -->
  <div>
    <label for="role">Role:</label>
    <select id="role" [(ngModel)]="user.role" name="role">
      <option value="Admin">Admin</option>
      <option value="Guest">Guest</option>
    </select>
  </div>

  <!-- 提交按钮（表单无效时禁用） -->
  <button type="submit" [disabled]="!userForm.form.valid">Submit</button>
</form>
```

## 表单与控件状态

Angular 会根据控件和表单的状态自动向其应用 CSS 类：

| 状态           | 为 true 时的类                    | 为 false 时的类 |
| :------------- | :-------------------------------- | :------------- |
| 已访问         | `ng-touched`                      | `ng-untouched` |
| 值已更改       | `ng-dirty`                        | `ng-pristine`  |
| 值有效         | `ng-valid`                        | `ng-invalid`   |
| 表单已提交     | `ng-submitted`（仅在 `<form>` 上） | -              |

你可以在 CSS 中使用这些类来提供视觉反馈：

```css
.ng-valid[required],
.ng-valid.required {
  border-left: 5px solid #42a948; /* 绿色 */
}
.ng-invalid:not(form) {
  border-left: 5px solid #a94442; /* 红色 */
}
```

## 验证与错误消息

若要有条件地显示错误消息，请将 `ngModel` directive 导出到模板引用变量（例如 `#nameCtrl="ngModel"`）。

```html
<input type="text" id="name" required [(ngModel)]="user.name" name="name" #nameCtrl="ngModel" />

<!-- 仅当控件无效且（touched 或 dirty）时才显示错误 -->
@if (nameCtrl.invalid && (nameCtrl.dirty || nameCtrl.touched)) {
<div class="alert alert-danger">
  @if (nameCtrl.errors?.['required']) {
  <div>Name is required.</div>
  }
</div>
}
```

## 提交表单

1. 在 `<form>` 元素上使用 `(ngSubmit)` 事件。
2. 使用 `NgForm` 模板引用变量，将提交按钮的禁用状态绑定到整体表单有效性（例如 `[disabled]="!userForm.form.valid"`）。

## 重置表单

若要以编程方式将表单重置为 pristine 状态（清除值和验证标志），请在 `NgForm` 实例上使用 `reset()` 方法。

```html
<button type="button" (click)="userForm.reset()">Reset</button>
```
