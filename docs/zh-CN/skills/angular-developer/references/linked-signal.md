# 使用 `linkedSignal` 实现依赖状态

`linkedSignal` 函数允许你创建与某些其他状态内在关联的可写状态。它非常适合这样的状态：需要一个从输入或其他 signal 派生的默认值，但仍可以被用户独立修改。

如果源状态发生变化，`linkedSignal` 会重置为一个新的计算值。

## 基本用法

当你只需要基于某个源重新计算时，传入一个 computation 函数。`linkedSignal` 的工作方式类似 `computed`，但得到的 signal 是可写的（你可以对它调用 `.set()` 或 `.update()`）。

```ts
import { Component, signal, linkedSignal } from '@angular/core';

@Component({...})
export class ShippingMethodPicker {
  shippingOptions = signal(['Ground', 'Air', 'Sea']);

  // 默认为第一个选项。
  // 如果 shippingOptions 变化，selectedOption 会重置为新的第一个选项。
  selectedOption = linkedSignal(() => this.shippingOptions()[0]);

  changeShipping(index: number) {
    // 我们仍然可以手动更新这个 signal！
    this.selectedOption.set(this.shippingOptions()[index]);
  }
}
```

## 高级用法：考虑之前的状态

有时，当源状态变化时，如果用户的手动选择仍然有效，你希望保留它。为此，使用提供 `source` 和 `computation` 的对象语法。

`computation` 函数接收源的新值，以及一个 `previous` 对象，该对象包含之前的源值和之前的 `linkedSignal` 值。

```ts
interface ShippingMethod { id: number; name: string; }

@Component({...})
export class ShippingMethodPicker {
  shippingOptions = signal<ShippingMethod[]>([
    {id: 0, name: 'Ground'}, {id: 1, name: 'Air'}, {id: 2, name: 'Sea'}
  ]);

  selectedOption = linkedSignal<ShippingMethod[], ShippingMethod>({
    source: this.shippingOptions,
    computation: (newOptions, previous) => {
      // 如果新加载的选项仍然包含用户之前
      // 选择的选项，则保持其选中状态。否则，重置为第一个选项。
      return newOptions.find(opt => opt.id === previous?.value.id) ?? newOptions[0];
    }
  });
}
```

### 何时使用 `linkedSignal`、`computed` 或 `effect`

- 使用 `computed`：当状态**严格**从其他状态派生，且永远不应被手动更新时。
- 使用 `linkedSignal`：当状态从其他状态派生，但用户**必须**能够覆盖或手动更新它时。
- **永远不要**使用 `effect` 把一个状态同步到另一个状态。这是一种 anti-pattern。应改用 `computed` 或 `linkedSignal`。
