> 本文件在 [common/patterns.md](../common/patterns.md) 基础上扩展了 Web 特有的模式。

# Web 模式

## 组件组合

### Compound Components

当相关 UI 共享 state 和交互语义时，使用 compound components：

```tsx
<Tabs defaultValue="overview">
  <Tabs.List>
    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
    <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="overview">...</Tabs.Content>
  <Tabs.Content value="settings">...</Tabs.Content>
</Tabs>
```

- 父组件拥有 state
- 子组件通过 context 消费
- 对于复杂 widget，优先采用此模式而非 prop drilling

### Render Props / Slots

- 当行为共享但标记结构需要变化时，使用 render props 或 slot 模式
- 将键盘处理、ARIA 与 focus 逻辑保留在 headless 层

### Container / Presentational Split

- Container 组件负责数据加载与副作用
- Presentational 组件接收 props 并渲染 UI
- Presentational 组件应保持 pure

## State Management

将以下内容分开处理：

| 关注点 | 工具 |
|---------|---------|
| Server state | TanStack Query、SWR、tRPC |
| Client state | Zustand、Jotai、signals |
| URL state | search params、route segments |
| Form state | React Hook Form 或等效方案 |

- 不要将 server state 复制到 client store 中
- 应派生值，而非存储冗余的计算 state

## URL 作为 State

将可共享的 state 持久化到 URL 中：
- 筛选条件
- 排序顺序
- 分页
- 当前标签页
- 搜索查询

## 数据获取

### Stale-While-Revalidate

- 立即返回缓存数据
- 在后台 revalidate
- 优先使用现有库，而非手动实现

### Optimistic Updates

- Snapshot 当前 state
- 应用 optimistic update
- 失败时 rollback
- 在 rollback 时发出可见的错误反馈

### 并行加载

- 并行获取独立数据
- 避免父子组件间的请求瀑布流
- 在合理情况下，prefetch 可能的下一路由或 state
