# HTML 演示文稿模板

用于生成幻灯片演示文稿的参考架构。每个演示文稿都遵循此结构。

## 基础 HTML 结构

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Presentation Title</title>

    <!-- 字体：使用 Fontshare 或 Google Fonts — 切勿使用系统字体 -->
    <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=..." />

    <style>
      /* ===========================================
           CSS 自定义属性（主题）
           修改这些值即可改变整体外观
           =========================================== */
      :root {
        /* 颜色 — 来自所选样式预设 */
        --bg-primary: #0a0f1c;
        --bg-secondary: #111827;
        --text-primary: #ffffff;
        --text-secondary: #9ca3af;
        --accent: #00ffcc;
        --accent-glow: rgba(0, 255, 204, 0.3);

        /* 排版 — 必须使用 clamp() */
        --font-display: "Clash Display", sans-serif;
        --font-body: "Satoshi", sans-serif;
        --title-size: clamp(2rem, 6vw, 5rem);
        --subtitle-size: clamp(0.875rem, 2vw, 1.25rem);
        --body-size: clamp(0.75rem, 1.2vw, 1rem);

        /* 间距 — 必须使用 clamp() */
        --slide-padding: clamp(1.5rem, 4vw, 4rem);
        --content-gap: clamp(1rem, 2vw, 2rem);

        /* 动画 */
        --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
        --duration-normal: 0.6s;
      }

      /* ===========================================
           基础样式
           =========================================== */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      /* --- 在此粘贴 viewport-base.css 的内容 --- */

      /* ===========================================
           动画
           通过 .visible 类触发（滚动时由 JS 添加）
           =========================================== */
      .reveal {
        opacity: 0;
        transform: translateY(30px);
        transition:
          opacity var(--duration-normal) var(--ease-out-expo),
          transform var(--duration-normal) var(--ease-out-expo);
      }

      .slide.visible .reveal {
        opacity: 1;
        transform: translateY(0);
      }

      /* 错开子元素以实现依次显示 */
      .reveal:nth-child(1) {
        transition-delay: 0.1s;
      }
      .reveal:nth-child(2) {
        transition-delay: 0.2s;
      }
      .reveal:nth-child(3) {
        transition-delay: 0.3s;
      }
      .reveal:nth-child(4) {
        transition-delay: 0.4s;
      }

      /* ... 预设特定样式 ... */
    </style>
  </head>
  <body>
    <!-- 可选：进度条 -->
    <div class="progress-bar"></div>

    <!-- 可选：导航圆点 -->
    <nav class="nav-dots"><!-- 由 JS 生成 --></nav>

    <!-- 幻灯片 -->
    <section class="slide title-slide">
      <h1 class="reveal">Presentation Title</h1>
      <p class="reveal">Subtitle or author</p>
    </section>

    <section class="slide">
      <div class="slide-content">
        <h2 class="reveal">Slide Title</h2>
        <p class="reveal">Content...</p>
      </div>
    </section>

    <!-- 更多幻灯片... -->

    <script>
      /* ===========================================
           幻灯片演示控制器
           =========================================== */
      class SlidePresentation {
        constructor() {
          this.slides = document.querySelectorAll(".slide");
          this.currentSlide = 0;
          this.setupIntersectionObserver();
          this.setupKeyboardNav();
          this.setupTouchNav();
          this.setupProgressBar();
          this.setupNavDots();
        }

        setupIntersectionObserver() {
          // 当幻灯片进入视口时添加 .visible 类
          // 高效触发 CSS 动画
        }

        setupKeyboardNav() {
          // 方向键、空格键、Page Up/Down
        }

        setupTouchNav() {
          // 为移动端提供触摸/滑动支持
        }

        setupProgressBar() {
          // 滚动时更新进度条
        }

        setupNavDots() {
          // 重要：构建前务必先清空 — 如果在圆点已渲染时捕获了
          // outerHTML，重新打开文件会在已有圆点之上追加一组重复圆点。
          this.navDotsContainer.innerHTML = "";
          // 生成并管理导航圆点
        }
      }

      new SlidePresentation();
    </script>
  </body>
</html>
```

## 必备 JavaScript 功能

每个演示文稿都必须包含：

1. **SlidePresentation 类** — 主控制器，包含：
   - 键盘导航（方向键、空格键、page up/down）
   - 触摸/滑动支持
   - 鼠标滚轮导航
   - 进度条更新
   - 导航圆点

2. **Intersection Observer** — 用于滚动触发的动画：
   - 当幻灯片进入视口时添加 `.visible` 类
   - 高效触发 CSS 过渡

3. **可选增强功能**（与所选样式匹配）：
   - 带尾迹的自定义光标
   - 粒子系统背景（canvas）
   - 视差效果
   - 悬停时 3D 倾斜
   - 磁性按钮
   - 计数器动画

4. **内联编辑**（仅当用户在 Phase 1 中选择开启时 — 若用户回答 No 则完全跳过）：
   - 编辑切换按钮（默认隐藏，通过悬停热区或 `E` 键显示）
   - 自动保存到 localStorage
   - 导出/保存文件功能
   - 参见下方的“内联编辑实现”章节

## 内联编辑实现（仅在用户选择开启时）

**如果用户在 Phase 1 中对内联编辑选择了“No”，则不要生成任何与编辑相关的 HTML、CSS 或 JS。**

**不要使用 CSS `~` 兄弟选择器实现基于悬停的显示/隐藏。** 纯 CSS 方案（`edit-hotzone:hover ~ .edit-toggle`）会失败，因为切换按钮上的 `pointer-events: none` 打断了悬停链：用户悬停热区 -> 按钮变为可见 -> 鼠标移向按钮 -> 离开热区 -> 按钮在点击前消失。

**必需方案：基于 JS 的悬停，带 400ms 延迟超时。**

HTML：

```html
<div class="edit-hotzone"></div>
<button class="edit-toggle" id="editToggle" title="Edit mode (E)">Edit</button>
```

CSS（可见性仅由 JS 类控制）：

```css
/* 切勿为此使用 CSS ~ 兄弟选择器！
   pointer-events: none 会打断悬停链。
   必须使用带延迟超时的 JS。*/
.edit-hotzone {
  position: fixed;
  top: 0;
  left: 0;
  width: 80px;
  height: 80px;
  z-index: 10000;
  cursor: pointer;
}
.edit-toggle {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  z-index: 10001;
}
.edit-toggle.show,
.edit-toggle.active {
  opacity: 1;
  pointer-events: auto;
}
```

JS（三种交互方式）：

```javascript
// 1. 切换按钮上的点击处理程序
document.getElementById("editToggle").addEventListener("click", () => {
  editor.toggleEditMode();
});

// 2. 热区悬停，带 400ms 宽限期
const hotzone = document.querySelector(".edit-hotzone");
const editToggle = document.getElementById("editToggle");
let hideTimeout = null;

hotzone.addEventListener("mouseenter", () => {
  clearTimeout(hideTimeout);
  editToggle.classList.add("show");
});
hotzone.addEventListener("mouseleave", () => {
  hideTimeout = setTimeout(() => {
    if (!editor.isActive) editToggle.classList.remove("show");
  }, 400);
});
editToggle.addEventListener("mouseenter", () => {
  clearTimeout(hideTimeout);
});
editToggle.addEventListener("mouseleave", () => {
  hideTimeout = setTimeout(() => {
    if (!editor.isActive) editToggle.classList.remove("show");
  }, 400);
});

// 3. 热区直接点击
hotzone.addEventListener("click", () => {
  editor.toggleEditMode();
});

// 4. 键盘快捷键（E 键，编辑文本时跳过）
document.addEventListener("keydown", (e) => {
  if (
    (e.key === "e" || e.key === "E") &&
    !e.target.getAttribute("contenteditable")
  ) {
    editor.toggleEditMode();
  }
});
```

**关键：`exportFile()` 必须在捕获 outerHTML 之前剥离编辑状态。**

当用户在编辑模式下按下 Ctrl+S 时，`document.documentElement.outerHTML` 会捕获实时 DOM — 包括 `body.edit-active`、每个文本元素上的 `contenteditable="true"`，以及切换按钮和横幅上的 `.active`/`.show` 类。任何打开已保存文件的人都会看到虚线轮廓、勾选按钮和编辑横幅，就像永久卡在编辑模式一样。

始终按如下方式实现 `exportFile()`：

```javascript
exportFile() {
    // 临时剥离编辑状态，使保存的文件能干净地打开
    const editableEls = Array.from(document.querySelectorAll('[contenteditable]'));
    editableEls.forEach(el => el.removeAttribute('contenteditable'));
    document.body.classList.remove('edit-active');

    // 同时从切换按钮和横幅剥离 UI 类
    const editToggle = document.getElementById('editToggle');
    const editBanner = document.querySelector('.edit-banner');
    editToggle?.classList.remove('active', 'show');
    editBanner?.classList.remove('active', 'show');

    const html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;

    // 恢复编辑状态，以便用户可以继续编辑
    document.body.classList.add('edit-active');
    editableEls.forEach(el => el.setAttribute('contenteditable', 'true'));
    editToggle?.classList.add('active');
    editBanner?.classList.add('active');

    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'presentation.html';
    a.click();
    URL.revokeObjectURL(a.href);
}
```

## 图片处理流水线（无图片时跳过）

如果用户在 Phase 1 中选择了“No images”，则完全跳过本节。如果提供了图片，则在生成 HTML 之前处理它们。

**依赖：** `pip install Pillow`

### 图片处理

```python
from PIL import Image, ImageDraw

# 圆形裁剪（用于 modern/clean 样式上的 logo）
def crop_circle(input_path, output_path):
    img = Image.open(input_path).convert('RGBA')
    w, h = img.size
    size = min(w, h)
    left, top = (w - size) // 2, (h - size) // 2
    img = img.crop((left, top, left + size, top + size))
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size, size], fill=255)
    img.putalpha(mask)
    img.save(output_path, 'PNG')

# 缩放（用于使 HTML 膨胀的超大图片）
def resize_max(input_path, output_path, max_dim=1200):
    img = Image.open(input_path)
    img.thumbnail((max_dim, max_dim), Image.LANCZOS)
    img.save(output_path, quality=85)
```

| 场景                             | 操作                          |
| -------------------------------- | ----------------------------- |
| 圆角美学风格下的方形 logo        | `crop_circle()`               |
| 图片 > 1MB                       | `resize_max(max_dim=1200)`    |
| 宽高比错误                       | 使用 `img.crop()` 手动裁剪    |

使用 `_processed` 后缀保存处理后的图片。切勿覆盖原始文件。

### 图片放置

**使用直接文件路径**（而非 base64）— 演示文稿在本地查看：

```html
<img src="assets/logo_round.png" alt="Logo" class="slide-image logo" />
<img
  src="assets/screenshot.png"
  alt="Screenshot"
  class="slide-image screenshot"
/>
```

```css
.slide-image {
  max-width: 100%;
  max-height: min(50vh, 400px);
  object-fit: contain;
  border-radius: 8px;
}
.slide-image.screenshot {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
.slide-image.logo {
  max-height: min(30vh, 200px);
}
```

**调整边框/阴影颜色以匹配所选样式的强调色。** 切勿在多张幻灯片上重复同一张图片（标题幻灯片和结尾幻灯片上的 logo 除外）。

**放置模式：** logo 居中放在标题幻灯片上。截图放在与文本并排的双栏布局中。整版图片作为幻灯片背景并叠加文本（谨慎使用）。

---

## 代码质量

**注释：** 每个章节都需要清晰的注释，解释其作用及修改方法。

**无障碍：**

- 语义化 HTML（`<section>`、`<nav>`、`<main>`）
- 键盘导航完全可用
- 在需要处提供 ARIA 标签
- `prefers-reduced-motion` 支持（包含在 viewport-base.css 中）

## 文件结构

单个演示文稿：

```
presentation.html    # 自包含，所有 CSS/JS 内联
assets/              # 仅图片（如果有）
```

一个项目中的多个演示文稿：

```
[name].html
[name]-assets/
```
