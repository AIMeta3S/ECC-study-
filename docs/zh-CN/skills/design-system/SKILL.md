---
name: design-system
description: 使用此 skill 可生成或审查 design system、检查视觉一致性，并审查涉及样式的 PR。
metadata:
  origin: ECC
---

# Design System — 生成与审查视觉系统

## 何时使用

- 启动一个需要 design system 的新项目时
- 审查现有代码库的视觉一致性时
- 在重新设计之前——了解你目前拥有什么
- 当 UI 看起来"不对劲"但你无法准确定位原因时
- 审查涉及样式的 PR 时

## 工作原理

### 模式 1：生成 Design System

分析你的代码库并生成一套具有内聚性的 design system：

```
1. 扫描 CSS/Tailwind/styled-components 以发现现有模式
2. 提取：颜色、字体排版、间距、border-radius、阴影、breakpoints
3. 研究 3 个竞品站点以获取灵感（通过 browser MCP）
4. 提出一组 design token 集合（JSON + CSS custom properties）
5. 生成 DESIGN.md，并对每项决策给出依据
6. 创建一个交互式 HTML 预览页面（自包含、无依赖）
```

输出：`DESIGN.md` + `design-tokens.json` + `design-preview.html`

### 模式 2：视觉审查

在 10 个维度上为你的 UI 评分（每项 0-10 分）：

```
1. 颜色一致性——你是在使用既有调色板，还是在用随机的 hex 值？
2. 字体排版层级——是否有清晰的 h1 > h2 > h3 > 正文 > 说明文字层次？
3. 间距节奏——是统一的间距比例（4px/8px/16px），还是随意取值？
4. 组件一致性——相似的元素看起来是否相似？
5. 响应式行为——在 breakpoints 处是流畅过渡还是布局错乱？
6. 深色模式——是完整覆盖还是只做了一半？
7. 动画——是有明确目的，还是无意义的装饰？
8. 无障碍——对比度、focus 状态、触摸目标尺寸
9. 信息密度——是拥挤杂乱还是干净整洁？
10. 打磨度——hover 状态、transitions、loading 状态、empty 状态
```

每个维度都会得到一个分数、具体的示例，以及带有精确 file:line 的修复建议。

### 模式 3：AI 垃圾设计检测

识别通用的 AI 生成设计模式：

```
- 对所有东西都滥用渐变
- 紫到蓝的默认配色
- 没有实际目的的"Glass morphism"卡片
- 在不该圆角的东西上加圆角
- 滚动时过度的动画
- 在通用渐变背景上居中文字的通用 hero
- 毫无个性的 sans-serif font stack
```

## 示例

**为 SaaS 应用生成：**
```
/design-system generate --style minimal --palette earth-tones
```

**审查现有 UI：**
```
/design-system audit --url http://localhost:3000 --pages / /pricing /docs
```

**检查 AI 垃圾设计：**
```
/design-system slop-check
```
