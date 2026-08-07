# 使用 `effect` 和 `afterRenderEffect` 的副作用

在 Angular 中，**effect** 是一种操作，每当它跟踪的一个或多个 signal 值发生变化时就会运行。

## 何时使用 `effect`

effect 用于将 signal 状态同步到命令式的非 signal API。

**有效用例：**

- 记录分析数据。
- 将状态同步到 `localStorage` 或 `sessionStorage`。
- 对 `<canvas>` 或第三方图表库执行自定义渲染。

**关键规则：不要使用 effect 传播状态。**
如果你发现自己 _在_ effect 内部对 signal 调用 `.set()` 或 `.update()` 来保持两个 signal 同步，你正在犯一个错误。这会导致 `ExpressionChangedAfterItHasBeenChecked` 错误和无限循环。**始终使用 `computed()` 或 `linkedSignal()` 进行状态派生。**

## 基本用法

effect 在 change detection 过程中异步执行。它们至少会运行一次。

```ts
import { Component, signal, effect } from '@angular/core';

@Component({...})
export class Example {
  count = signal(0);

  constructor() {
    // effect 必须在 injection context 中创建（例如 constructor）
    effect((onCleanup) => {
      console.log(`Count changed to ${this.count()}`);

      const timer = setTimeout(() => console.log('Timer finished'), 1000);

      // 清理函数在下一次执行前，或销毁时运行
      onCleanup(() => clearTimeout(timer));
    });
  }
}
```

## 使用 `afterRenderEffect` 操作 DOM

标准的 `effect` 在 Angular 更新 DOM _之前_ 运行。如果你需要基于 signal 变化手动检查或修改 DOM（例如，集成第三方 UI 库），请使用 `afterRenderEffect`。

`afterRenderEffect` 在 Angular 完成 DOM 渲染后运行。

### 渲染阶段

为了防止回流（强制布局抖动），`afterRenderEffect` 强制要求你将 DOM 的读取和写入划分到特定的阶段中。

```ts
import { Component, afterRenderEffect, viewChild, ElementRef } from '@angular/core';

@Component({...})
export class Chart {
  canvas = viewChild.required<ElementRef>('canvas');

  constructor() {
    afterRenderEffect({
      // 1. 从 DOM 读取
      earlyRead: () => {
        return this.canvas().nativeElement.getBoundingClientRect().width;
      },
      // 2. 写入 DOM（接收上一阶段的结果）
      write: (width) => {
        // 绝不要在 write 阶段从 DOM 读取。
        setupChart(this.canvas().nativeElement, width);
      }
    });
  }
}
```

**可用阶段（按此顺序执行）：**

1. `earlyRead`
2. `write`（绝不要在此读取）
3. `mixedReadWrite`（尽可能避免）
4. `read`（绝不要在此写入）

_注意：`afterRenderEffect` 只在客户端运行，绝不在 Server-Side Rendering (SSR) 期间运行。_
