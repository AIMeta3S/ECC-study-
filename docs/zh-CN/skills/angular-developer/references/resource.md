# 使用 `resource` 实现异步响应式

> [!IMPORTANT]
> `resource` API 目前在 Angular 中处于实验阶段。

`Resource` 将异步数据获取纳入 Angular 基于 signal 的响应式体系。每当其依赖变更时，它会执行一个异步 loader 函数，并将状态与结果以同步 signal 的形式暴露出来。

## 基本用法

`resource` 函数接受一个 options 对象，包含两个主要属性：

1. `params`：一个响应式计算（类似 `computed`）。当此处读取的 signal 发生变化时，resource 会重新获取数据。
2. `loader`：一个根据参数获取数据的异步函数。

```ts
import { Component, resource, signal, computed } from '@angular/core';

@Component({...})
export class UserProfile {
  userId = signal('123');

  userResource = resource({
    // 响应式追踪 userId
    params: () => ({ id: this.userId() }),

    // 每当 params 变化时执行
    loader: async ({ params, abortSignal }) => {
      const response = await fetch(`/api/users/${params.id}`, { signal: abortSignal });
      if (!response.ok) throw new Error('Network error');
      return response.json();
    }
  });

  // 在 computed signal 中使用 resource 的值
  userName = computed(() => {
    if (this.userResource.hasValue()) {
      return this.userResource.value()?.name;
    } else {
      return 'Loading...';
    }
  });
}
```

## 中止请求

如果 `params` signal 在前一个 loader 仍在运行时发生变化，`Resource` 将尝试使用提供的 `abortSignal` 中止未完成的请求。**始终将 `abortSignal` 传递给你的 `fetch` 调用。**

## 重新加载数据

你可以通过调用 `.reload()` 命令式地强制 resource 重新运行 loader，而无需 params 发生变化。

```ts
this.userResource.reload();
```

## Resource 状态 Signal

`Resource` 对象提供了多个 signal 来读取其当前状态：

- `value()`：已解析的数据，或 `undefined`。
- `hasValue()`：类型保护布尔值。如果值存在则为 `true`。
- `isLoading()`：布尔值，指示 loader 是否正在运行。
- `error()`：loader 抛出的错误，或 `undefined`。
- `status()`：表示精确状态的字符串常量（`'idle'`、`'loading'`、`'resolved'`、`'error'`、`'reloading'`、`'local'`）。

## 本地 Mutation

你可以直接乐观更新 resource 的值。这会将状态变为 `'local'`。

```ts
this.userResource.value.set({name: 'Optimistic Update'});
```

## 使用 `httpResource` 进行响应式数据获取

如果你正在使用 Angular 的 `HttpClient`，推荐使用 `httpResource`。它是一个专用的封装，利用 Angular HTTP 技术栈（包括 interceptor），同时提供相同的基于 signal 的 resource API。
