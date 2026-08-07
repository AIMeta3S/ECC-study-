# Angular Signals 概览

Signals 是现代 Angular 应用中响应式的基础。**signal** 是对某个值的封装，当该值发生变化时会通知关注的消费者。

## 可写 Signals（`signal`）

使用 `signal()` 创建可直接更新的状态。

```ts
import {signal} from '@angular/core';

// 创建一个可写 signal
const count = signal(0);

// 读取值（始终需要调用 getter 函数）
console.log(count());

// 直接更新值
count.set(3);

// 基于前一个值更新
count.update((value) => value + 1);
```

### 以只读形式暴露

当从服务中暴露状态时，最佳实践是暴露一个只读版本，以防止外部修改。

```ts
private readonly _count = signal(0);
// 消费者可以读取此值，但不能调用 .set() 或 .update()
readonly count = this._count.asReadonly();
```

## 计算 Signals（`computed`）

使用 `computed()` 创建从其他 signals 派生其值的只读 signals。

- **惰性求值**：在读取该 computed signal 之前，派生函数不会运行。
- **记忆化**：结果会被缓存。只有当它依赖的某个 signal 发生变化时才会重新计算。
- **动态依赖**：只有派生过程中_实际读取_的 signals 才会被跟踪。

```ts
import {signal, computed} from '@angular/core';

const count = signal(0);
const doubleCount = computed(() => count() * 2);

// 当 count 变化时，doubleCount 会自动更新。
```

## 响应式上下文

**响应式上下文**是一种运行时状态，Angular 在其中监视 signal 的读取以建立依赖关系。

Angular 在求值以下内容时会自动进入响应式上下文：

- `computed` signals
- `effect` 回调
- `linkedSignal` 计算
- 组件模板

### 未跟踪的读取（`untracked`）

如果需要在响应式上下文中读取 signal 但_不_创建依赖关系（这样当 signal 变化时该上下文不会重新执行），请使用 `untracked()`。

```ts
import {effect, untracked} from '@angular/core';

effect(() => {
  // 此 effect 仅在 currentUser 变化时运行。
  // 它不会在 counter 变化时运行，即使 counter 在此处被读取。
  console.log(`User: ${currentUser()}, Count: ${untracked(counter)}`);
});
```

### 响应式上下文中的异步操作

响应式上下文仅对**同步**代码有效。在 `await` 之后读取 signal 不会被跟踪。**始终在异步边界之前读取 signals。**

```ts
// 错误：theme() 未被跟踪，因为它在 await 之后被读取
effect(async () => {
  const data = await fetchUserData();
  console.log(theme());
});

// 正确：在 await 之前读取 signal
effect(async () => {
  const currentTheme = theme();
  const data = await fetchUserData();
  console.log(currentTheme);
});
```
