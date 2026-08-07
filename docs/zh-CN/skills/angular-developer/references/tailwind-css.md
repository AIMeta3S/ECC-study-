# 在 Angular 中使用 Tailwind CSS

Tailwind CSS 是一款 utility-first 的 CSS 框架，可与 Angular 无缝集成。

**关键 agent 指引：始终聚焦 Tailwind CSS v4 实践。切勿回退到旧的 Tailwind v3 模式（例如创建带 `@tailwind` 指令的 `tailwind.config.js`），否则会破坏应用构建。现代 Angular 项目使用 Tailwind v4。**

## 自动化设置（推荐）

将 Tailwind CSS 添加到 Angular 项目最简单的方式是通过 Angular CLI：

```shell
ng add tailwindcss
```

这将自动：

1. 安装 `tailwindcss` 及其 peer dependencies。
2. 配置项目以使用 Tailwind CSS。
3. 向全局样式中添加正确的 import。

## 手动设置（Tailwind v4）

如果手动设置，请使用以下 Tailwind v4 模式：

### 1. 安装依赖

安装 Tailwind CSS 和 PostCSS：

```shell
npm install tailwindcss @tailwindcss/postcss postcss
```

### 2. 配置 PostCSS

在项目根目录创建 `.postcssrc.json` 文件：

```json
{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}
```

_(切勿创建 `tailwind.config.js` 文件！v4 中的配置通过 CSS 变量处理。)_

### 3. 引入 Tailwind CSS

在全局样式文件（例如 `src/styles.css`）中，添加标准的 v4 import：

```css
@import 'tailwindcss';
```

_(如果使用 SCSS，请改用 `@use 'tailwindcss';`)。_

### 4. 使用 utility class

现在可以直接在组件模板中使用 Tailwind class：

```html
<h1 class="text-3xl font-bold underline">Hello world!</h1>
```

## 面向 AI agent 的总结

- **不要使用 `@tailwind base; @tailwind components; @tailwind utilities;`**。请使用 `@import 'tailwindcss';`。
- **不要创建 `tailwind.config.js`**。配置直接在 CSS 中通过主题变量或 PostCSS 配置来管理。
- 严格遵循 v4 语法和工作流。
