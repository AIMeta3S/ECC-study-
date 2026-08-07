# 响应式表单

响应式表单提供了一种模型驱动的方式来处理表单输入。它围绕 observable 流构建，并提供对数据模型的同步访问，使其比模板驱动表单更具可扩展性和可测试性。

## 核心类

响应式表单使用来自 `@angular/forms` 的以下基础类构建：

- `FormControl`：管理单个 input 的值和有效性。
- `FormGroup`：管理一组控件（类似对象的结构）。
- `FormArray`：管理按数字索引的控件数组。
- `FormBuilder`：一个 service，提供用于创建控件实例的工厂方法。

## 设置

将 `ReactiveFormsModule` 导入到你的 component 中。

```ts
import {Component, inject} from '@angular/core';
import {ReactiveFormsModule, FormGroup, FormControl, Validators, FormBuilder} from '@angular/forms';

@Component({
  selector: 'app-profile-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './profile-editor.component.html',
})
export class ProfileEditor {
  private fb = inject(FormBuilder);

  // 使用 FormBuilder 进行简洁的定义
  profileForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: [''],
    address: this.fb.group({
      street: [''],
      city: [''],
    }),
    aliases: this.fb.array([this.fb.control('')]),
  });

  onSubmit() {
    console.warn(this.profileForm.value);
  }
}
```

## 模板绑定

使用 directive 将模型绑定到视图：

- `[formGroup]`：将一个 `FormGroup` 绑定到 `<form>` 或 `<div>`。
- `formControlName`：将 group 内具名 control 绑定到一个 input。
- `formGroupName`：绑定嵌套的 `FormGroup`。
- `formArrayName`：绑定嵌套的 `FormArray`。
- `[formControl]`：绑定一个独立的 `FormControl`。

```html
<form [formGroup]="profileForm" (ngSubmit)="onSubmit()">
  <input type="text" formControlName="firstName" />

  <div formGroupName="address">
    <input type="text" formControlName="street" />
  </div>

  <div formArrayName="aliases">
    @for (alias of aliases.controls; track $index) {
    <input type="text" [formControlName]="$index" />
    }
  </div>

  <button type="submit" [disabled]="!profileForm.valid">Submit</button>
</form>
```

## 访问控件

使用 getter 可以方便地访问控件，尤其是 `FormArray`。

```ts
get aliases() {
  return this.profileForm.get('aliases') as FormArray;
}

addAlias() {
  this.aliases.push(this.fb.control(''));
}
```

## 更新值

- `patchValue()`：仅更新指定的属性。在结构不匹配时静默失败。
- `setValue()`：替换整个模型。严格遵循表单结构。

```ts
updateProfile() {
  this.profileForm.patchValue({
    firstName: 'Nancy',
    address: { street: '123 Drew Street' }
  });
}
```

## 统一的变更事件

现代 Angular（v18+）在所有控件上提供了一个统一的 `events` observable，用于追踪 value、status、pristine、touched、reset 和 submit 事件。

```ts
import {ValueChangeEvent, StatusChangeEvent} from '@angular/forms';

this.profileForm.events.subscribe((event) => {
  if (event instanceof ValueChangeEvent) {
    console.log('New value:', event.value);
  }
});
```

## 手动状态管理

- `markAsTouched()` / `markAllAsTouched()`：用于在提交时显示校验错误。
- `markAsDirty()` / `markAsPristine()`：用于追踪值是否已被修改。
- `updateValueAndValidity()`：手动触发值和状态的重新计算。
- 可以向大多数方法传入选项 `{ emitEvent: false }` 或 `{ onlySelf: true }` 来控制传播。
