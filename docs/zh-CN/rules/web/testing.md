> 本文件扩展了 [common/testing.md](../common/testing.md)，增加 web 特定的测试内容。

# Web 测试规则

## 优先级顺序

### 1. 视觉回归

- 截取关键断点的截图：320、768、1024、1440
- 测试 hero 区域、scrollytelling 区域以及有意义的状态
- 对高度可视化的工作使用 Playwright 截图
- 如果两个主题都存在，则两个主题都测试

### 2. 无障碍

- 运行自动化无障碍检查
- 测试键盘导航
- 验证 reduced-motion 行为
- 验证颜色对比度

### 3. 性能

- 对有意义的页面运行 Lighthouse 或等效工具
- 保持 [performance.md](performance.md) 中的 CWV 目标

### 4. 跨浏览器

- 最低要求：Chrome、Firefox、Safari
- 测试滚动、动画和降级行为

### 5. 响应式

- 测试 320、375、768、1024、1440、1920
- 验证无溢出
- 验证触摸交互

## E2E 结构

```ts
import { test, expect } from '@playwright/test';

test('landing hero loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
});
```

- 避免 flaky 的基于超时的断言
- 优先使用确定性等待

## 单元测试

- 测试工具函数、数据转换和自定义 hook
- 对于高度可视化的组件，视觉回归通常比脆弱的 markup 断言携带更多信号
- 视觉回归补充覆盖率目标；它不替代它们
