# Outputs（自定义事件）

Outputs 允许子组件发出自定义事件，供父组件监听。Angular 推荐在现代应用中使用新的 `output()` 函数。

## 基于函数的 outputs

使用 `output()` 函数声明 outputs。它会返回一个 `OutputEmitterRef`。

```ts
import {Component, output} from '@angular/core';

@Component({
  selector: 'custom-slider',
  template: `<button (click)="changeValue(50)">Set to 50</button>`,
})
export class CustomSlider {
  // 不带事件数据的 output
  panelClosed = output<void>();

  // 带事件数据（number）的 output
  valueChanged = output<number>();

  changeValue(newValue: number) {
    this.valueChanged.emit(newValue);
  }
}
```

### 在模板中使用

使用圆括号 `()` 绑定到 output 事件。如果事件会发出数据，使用特殊的 `$event` 变量来访问它。

```html
<custom-slider (panelClosed)="savePanelState()" (valueChanged)="logValue($event)" />
```

## 配置选项

`output` 函数接受一个配置对象来指定别名。

```ts
@Component({...})
export class CustomSlider {
  // 该事件在模板中命名为 'valueChanged'，
  // 但在组件类中以 'changed' 访问。
  changed = output<number>({ alias: 'valueChanged' });
}
```

## 编程式订阅

在动态创建组件时，可以采用编程式方式订阅 outputs：

```ts
const componentRef = viewContainerRef.createComponent(CustomSlider);

const subscription = componentRef.instance.valueChanged.subscribe((val) => {
  console.log('Value changed:', val);
});

// 如有需要可手动清理（Angular 会自动清理已销毁的组件）
subscription.unsubscribe();
```

## 基于装饰器的 Outputs（@Output）

旧版 API 使用 `@Output()` 装饰器配合 `EventEmitter`。它仍然受支持，但不推荐用于新代码。

```ts
import { Component, Output, EventEmitter } from '@angular/core';

@Component({...})
export class LegacyExample {
  @Output() valueChanged = new EventEmitter<number>();

  // 带别名
  @Output('customEventName') changed = new EventEmitter<void>();
}
```

## 最佳实践

- **优先使用 `output()`**：使用基于函数的 `output()`，而不是 `@Output()` 和 `EventEmitter`。
- **命名**：output 名称使用 `camelCase`。避免使用 `on` 前缀（例如，使用 `valueChanged` 而不是 `onValueChanged`）。
- **不会在 DOM 冒泡**：Angular 自定义事件不会像原生事件那样沿 DOM 树向上冒泡。
- **避免命名冲突**：不要选择与原生 DOM 事件（如 `click` 或 `submit`）冲突的名称。
