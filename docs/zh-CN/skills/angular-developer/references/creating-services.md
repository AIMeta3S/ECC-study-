# 创建和使用服务

Angular 中的服务是可重用的代码片段，负责处理数据获取、业务逻辑或状态管理，供多个组件或其他服务访问。

## 创建服务

你可以使用 Angular CLI 生成一个服务：

```bash
ng generate service my-data
```

或者你也可以手动创建一个 TypeScript class，并用 `@Injectable()` 装饰它。

```ts
import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BasicDataStore {
  private data: string[] = [];

  addData(item: string): void {
    this.data.push(item);
  }

  getData(): string[] {
    return [...this.data];
  }
}
```

### `providedIn: 'root'` 选项

对于大多数服务来说，使用 `providedIn: 'root'` 是推荐做法。它告诉 Angular：

- **创建单一实例（singleton）**，供整个应用使用。
- **自动使其在所有位置都可用**，无需将其列入任何 `providers` 数组。
- **启用 tree-shaking**，意味着该服务只有在确实被某处注入时，才会被包含进最终的 JavaScript bundle 中。

## 注入服务

一旦创建了服务，你就可以使用 `inject()` 函数将其注入到组件、directive 或其他服务中。

### 注入到组件中

```ts
import {Component, inject} from '@angular/core';
import {BasicDataStore} from './basic-data-store.service';

@Component({
  selector: 'app-example',
  template: `
    <div>
      <p>Data items: {{ dataStore.getData().length }}</p>
      <button (click)="dataStore.addData('New Item')">Add Item</button>
    </div>
  `,
})
export class Example {
  // 将该服务作为 class 字段注入
  dataStore = inject(BasicDataStore);
}
```

### 注入到另一个服务中

服务可以用完全相同的方式注入其他服务。

```ts
import {Injectable, inject} from '@angular/core';
import {AdvancedDataStore} from './advanced-data-store.service';

@Injectable({
  providedIn: 'root',
})
export class BasicDataStore {
  // 注入另一个服务
  private advancedDataStore = inject(AdvancedDataStore);

  private data: string[] = [];

  getData(): string[] {
    // 合并来自当前服务和被注入服务的数据
    return [...this.data, ...this.advancedDataStore.getData()];
  }
}
```

## 高级服务模式

虽然 `providedIn: 'root'` 覆盖了大多数场景，但你有时可能需要：

- **组件专属实例**：如果某个组件需要自己独立的服务实例，可直接在该组件的 `@Component({ providers: [MyService] })` 数组中提供它。
- **Factory provider**：用于动态创建。
- **Value provider**：用于注入配置对象。
