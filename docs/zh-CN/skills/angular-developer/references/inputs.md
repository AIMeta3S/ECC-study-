# Inputs

Inputs 允许数据从父 component 流向子 component。Angular 推荐在现代应用中使用基于 signal 的 `input` API。

## 基于 Signal 的 Inputs

使用 `input()` 函数声明 input。它会返回一个 `InputSignal`。

```ts
import {Component, input, computed} from '@angular/core';

@Component({
  selector: 'app-user',
  template: `<p>User: {{ name() }} ({{ age() }})</p>`,
})
export class User {
  // 带默认值的可选 input
  name = input('Guest');

  // 必填 input
  age = input.required<number>();

  // input 是响应式 signal
  label = computed(() => `Name: ${this.name()}`);
}
```

### 在模板中使用

```html
<app-user [name]="userName" [age]="25" />
```

## 配置选项

`input` 函数接受一个配置对象：

- **Alias**：修改在模板中使用的属性名。
- **Transform**：在值到达 component 之前对其进行修改。

```ts
import { input, booleanAttribute } from '@angular/core';

@Component({...})
export class CustomButton {
  // Alias 示例
  label = input('', { alias: 'btnLabel' });

  // 使用内置辅助函数的 Transform 示例
  disabled = input(false, { transform: booleanAttribute });
}
```

## Model Inputs（双向绑定）

使用 `model()` 创建支持双向数据绑定的 input。

```ts
@Component({
  selector: 'custom-counter',
  template: `<button (click)="increment()">+</button>`,
})
export class CustomCounter {
  value = model(0);

  increment() {
    this.value.update((v) => v + 1);
  }
}
```

### 用法

```html
<!-- 与 signal 的双向绑定 -->
<custom-counter [(value)]="mySignal" />

<!-- 与普通属性的双向绑定 -->
<custom-counter [(value)]="myProperty" />
```

## 基于装饰器的 Inputs（@Input）

旧版 API 仍受支持，但不推荐用于新代码。

```ts
import { Component, Input } from '@angular/core';

@Component({...})
export class Legacy {
  @Input({ required: true }) value = 0;
  @Input({ transform: trimString }) label = '';
}
```

## 最佳实践

- **优先使用 Signal**：使用 `input()` 而非 `@Input()`，以获得更好的响应性和类型安全。
- **必填 Inputs**：对必填数据使用 `input.required()`，以在构建时获得错误提示。
- **纯 Transform**：确保 input 的 transform 函数是纯函数且可静态分析。
- **避免冲突**：不要使用与标准 DOM 属性冲突的 input 名称（例如 `id`、`title`）。
