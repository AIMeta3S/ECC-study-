# 风格预设参考

`frontend-slides` 的精选视觉风格。

本文件用于：
- 强制的视口适配 CSS 基础样式
- 预设选择与情绪映射
- CSS 陷阱与校验规则

仅使用抽象形状。除非用户明确要求，否则避免使用插图。

## 视口适配不可妥协

每个 slide 都必须完整容纳于单个视口内。

### 黄金法则

```text
Each slide = exactly one viewport height.
Too much content = split into more slides.
Never scroll inside a slide.
```

### 密度限制

| Slide 类型 | 最大内容量 |
|------------|-----------------|
| Title slide | 1 个标题 + 1 个副标题 + 可选标语 |
| Content slide | 1 个标题 + 4-6 个 bullet 或 2 个段落 |
| Feature grid | 最多 6 张卡片 |
| Code slide | 最多 8-10 行 |
| Quote slide | 1 条引言 + 出处 |
| Image slide | 1 张图片，建议不超过 60vh |

## 强制基础 CSS

将此代码块复制到每个生成的 presentation 中，然后在此基础上应用主题。

```css
/* ===========================================
   视口适配：强制基础样式
   =========================================== */

html, body {
    height: 100%;
    overflow-x: hidden;
}

html {
    scroll-snap-type: y mandatory;
    scroll-behavior: smooth;
}

.slide {
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
    scroll-snap-align: start;
    display: flex;
    flex-direction: column;
    position: relative;
}

.slide-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-height: 100%;
    overflow: hidden;
    padding: var(--slide-padding);
}

:root {
    --title-size: clamp(1.5rem, 5vw, 4rem);
    --h2-size: clamp(1.25rem, 3.5vw, 2.5rem);
    --h3-size: clamp(1rem, 2.5vw, 1.75rem);
    --body-size: clamp(0.75rem, 1.5vw, 1.125rem);
    --small-size: clamp(0.65rem, 1vw, 0.875rem);

    --slide-padding: clamp(1rem, 4vw, 4rem);
    --content-gap: clamp(0.5rem, 2vw, 2rem);
    --element-gap: clamp(0.25rem, 1vw, 1rem);
}

.card, .container, .content-box {
    max-width: min(90vw, 1000px);
    max-height: min(80vh, 700px);
}

.feature-list, .bullet-list {
    gap: clamp(0.4rem, 1vh, 1rem);
}

.feature-list li, .bullet-list li {
    font-size: var(--body-size);
    line-height: 1.4;
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
    gap: clamp(0.5rem, 1.5vw, 1rem);
}

img, .image-container {
    max-width: 100%;
    max-height: min(50vh, 400px);
    object-fit: contain;
}

@media (max-height: 700px) {
    :root {
        --slide-padding: clamp(0.75rem, 3vw, 2rem);
        --content-gap: clamp(0.4rem, 1.5vw, 1rem);
        --title-size: clamp(1.25rem, 4.5vw, 2.5rem);
        --h2-size: clamp(1rem, 3vw, 1.75rem);
    }
}

@media (max-height: 600px) {
    :root {
        --slide-padding: clamp(0.5rem, 2.5vw, 1.5rem);
        --content-gap: clamp(0.3rem, 1vw, 0.75rem);
        --title-size: clamp(1.1rem, 4vw, 2rem);
        --body-size: clamp(0.7rem, 1.2vw, 0.95rem);
    }

    .nav-dots, .keyboard-hint, .decorative {
        display: none;
    }
}

@media (max-height: 500px) {
    :root {
        --slide-padding: clamp(0.4rem, 2vw, 1rem);
        --title-size: clamp(1rem, 3.5vw, 1.5rem);
        --h2-size: clamp(0.9rem, 2.5vw, 1.25rem);
        --body-size: clamp(0.65rem, 1vw, 0.85rem);
    }
}

@media (max-width: 600px) {
    :root {
        --title-size: clamp(1.25rem, 7vw, 2.5rem);
    }

    .grid {
        grid-template-columns: 1fr;
    }
}

@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.2s !important;
    }

    html {
        scroll-behavior: auto;
    }
}
```

## 视口检查清单

- 每个 `.slide` 都具有 `height: 100vh`、`height: 100dvh` 和 `overflow: hidden`
- 所有 typography 均使用 `clamp()`
- 所有间距均使用 `clamp()` 或视口单位
- 图片具有 `max-height` 约束
- 网格使用 `auto-fit` + `minmax()` 自适应
- 在 `700px`、`600px` 和 `500px` 处设有短高度断点
- 若有任何拥挤感，则拆分该 slide

## 情绪到预设的映射

| 情绪 | 合适的预设 |
|------|--------------|
| 印象深刻 / 自信 | Bold Signal, Electric Studio, Dark Botanical |
| 兴奋 / 充满活力 | Creative Voltage, Neon Cyber, Split Pastel |
| 平静 / 专注 | Notebook Tabs, Paper & Ink, Swiss Modern |
| 受启发 / 被打动 | Dark Botanical, Vintage Editorial, Pastel Geometry |

## 预设目录

### 1. Bold Signal

- 氛围：自信、高冲击力、适合 keynote
- 最适用于：pitch deck、产品发布、主题声明
- 字体：Archivo Black + Space Grotesk
- 配色：炭灰底色、热橙色焦点卡片、利落的白色文字
- 标志性元素：超大章节编号、深色背景上的高对比卡片

### 2. Electric Studio

- 氛围：干净、硬朗、代理商级精致打磨
- 最适用于：客户 presentation、战略评审
- 字体：仅 Manrope
- 配色：黑、白、饱和钴蓝点缀
- 标志性元素：双栏分屏与锐利的编辑式对齐

### 3. Creative Voltage

- 氛围：充满活力、复古现代、俏皮的自信
- 最适用于：创意工作室、品牌项目、产品叙事
- 字体：Syne + Space Mono
- 配色：电光蓝、霓虹黄、深海军蓝
- 标志性元素：半调纹理、徽章、强对比

### 4. Dark Botanical

- 氛围：优雅、高端、富有氛围
- 最适用于：奢华品牌、深度叙事、高端产品 deck
- 字体：Cormorant + IBM Plex Sans
- 配色：近黑、暖象牙白、腮红粉、金、赤陶
- 标志性元素：模糊的抽象圆形、细发丝线、克制的动效

### 5. Notebook Tabs

- 氛围：编辑式、有条理、有触感
- 最适用于：报告、评审、结构化叙事
- 字体：Bodoni Moda + DM Sans
- 配色：炭灰底上的奶油纸配柔和色标签
- 标志性元素：纸张感、彩色侧标签、活页夹细节

### 6. Pastel Geometry

- 氛围：亲和、现代、友好
- 最适用于：产品概览、onboarding、轻量品牌 deck
- 字体：仅 Plus Jakarta Sans
- 配色：浅蓝底色、奶油色卡片、柔和粉/薄荷/薰衣草紫点缀
- 标志性元素：竖向药丸形、圆角卡片、柔和阴影

### 7. Split Pastel

- 氛围：俏皮、现代、创意
- 最适用于：代理商介绍、工作坊、作品集
- 字体：仅 Outfit
- 配色：桃色 + 薰衣草紫分屏配薄荷徽章
- 标志性元素：分屏背景、圆角标签、浅色网格叠加

### 8. Vintage Editorial

- 氛围：风趣、个性鲜明、杂志风
- 最适用于：个人品牌、观点演讲、叙事
- 字体：Fraunces + Work Sans
- 配色：奶油、炭灰、柔和暖色点缀
- 标志性元素：几何点缀、带边框 callout、醒目的衬线大标题

### 9. Neon Cyber

- 氛围：未来感、科技感、富有动感
- 最适用于：AI、基础设施、开发工具、"未来式"演讲
- 字体：Clash Display + Satoshi
- 配色：午夜海军蓝、青色、品红
- 标志性元素：发光、粒子、网格、数据雷达般的活力

### 10. Terminal Green

- 氛围：面向开发者、极客般的干净
- 最适用于：API、CLI 工具、工程演示
- 字体：仅 JetBrains Mono
- 配色：GitHub dark + 终端绿
- 标志性元素：扫描线、命令行边框、精准的等宽字体节奏

### 11. Swiss Modern

- 氛围：极简、精准、数据导向
- 最适用于：企业、产品战略、数据分析
- 字体：Archivo + Nunito
- 配色：白、黑、信号红
- 标志性元素：可见网格、不对称、几何秩序

### 12. Paper & Ink

- 氛围：文学感、深思、叙事驱动
- 最适用于：随笔、keynote 叙事、宣言式 deck
- 字体：Cormorant Garamond + Source Serif 4
- 配色：暖奶油、炭灰、深红点缀
- 标志性元素：引文、首字下沉、优雅的发丝线

## 直接选择提示

如果用户已经知道自己想要的风格，可直接让他们从上面的预设名中选择，而无需强制生成预览。

## 动效感受映射

| 感受 | 动效方向 |
|---------|------------------|
| 戏剧感 / 电影感 | 缓慢淡入淡出、视差、大幅放大入场 |
| 科技感 / 未来感 | 发光、粒子、网格运动、乱码文字效果 |
| 俏皮 / 友好 | 弹性缓动、圆润形状、浮动动效 |
| 专业 / 商务 | 细微的 200-300ms 过渡、干净的 slide |
| 平静 / 极简 | 极克制的运动、留白优先 |
| 编辑 / 杂志风 | 强层级、文字与图片交错呈现 |

## CSS 陷阱：对函数取负

不要这样写：

```css
right: -clamp(28px, 3.5vw, 44px);
margin-left: -min(10vw, 100px);
```

浏览器会静默忽略这些写法。

应始终改写为：

```css
right: calc(-1 * clamp(28px, 3.5vw, 44px));
margin-left: calc(-1 * min(10vw, 100px));
```

## 校验尺寸

至少在以下尺寸下进行测试：
- Desktop：`1920x1080`、`1440x900`、`1280x720`
- Tablet：`1024x768`、`768x1024`
- Mobile：`375x667`、`414x896`
- 横屏手机：`667x375`、`896x414`

## 反模式

不要使用：
- 紫色配白底的创业模板
- 将 Inter / Roboto / Arial 作为视觉基调（除非用户明确要求功利性的中性风格）
- bullet 堆砌、过小的字号、或需要滚动的代码块
- 当抽象几何能更好胜任时却使用装饰性插图
