# 动画模式参考

生成演示文稿时使用本参考。让动画与期望传达的感觉相匹配。

## 效果与感觉对照指南

| 感觉 | 动画 | 视觉线索 |
|---------|-----------|-------------|
| **戏剧性 / 电影感** | 缓慢淡入(1-1.5s)、缩放过渡(0.9 到 1)、视差滚动 | 深色背景、聚光灯效果、满版图片 |
| **科技感 / 未来感** | 霓虹光晕(box-shadow)、故障/乱码文字、网格揭示 | 粒子系统(canvas)、网格图案、等宽字体点缀、青色/品红/电光蓝 |
| **活泼 / 友好** | 弹性缓动(spring physics)、漂浮/浮动 | 圆角、粉彩/明亮色彩、手绘元素 |
| **专业 / 商务** | 简洁的快速动画(200-300ms)、干净的幻灯片 | 藏青/石板灰/炭灰、精确间距、以数据可视化为焦点 |
| **宁静 / 极简** | 极其缓慢的细微运动、柔和的淡入淡出 | 大量留白、低饱和色调、衬线字体、宽裕的内边距 |
| **杂志 / 编辑风** | 交错文字揭示、图文互动 | 强字体层级、引言块、打破网格的布局、衬线标题 + 无衬线正文 |

## 入场动画

```css
/* 淡入 + 向上滑动(最通用)*/
.reveal {
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.6s var(--ease-out-expo),
                transform 0.6s var(--ease-out-expo);
}
.visible .reveal {
    opacity: 1;
    transform: translateY(0);
}

/* 缩放进入 */
.reveal-scale {
    opacity: 0;
    transform: scale(0.9);
    transition: opacity 0.6s, transform 0.6s var(--ease-out-expo);
}
.visible .reveal-scale {
    opacity: 1;
    transform: scale(1);
}

/* 从左侧滑入 */
.reveal-left {
    opacity: 0;
    transform: translateX(-50px);
    transition: opacity 0.6s, transform 0.6s var(--ease-out-expo);
}
.visible .reveal-left {
    opacity: 1;
    transform: translateX(0);
}

/* 模糊淡入 */
.reveal-blur {
    opacity: 0;
    filter: blur(10px);
    transition: opacity 0.8s, filter 0.8s var(--ease-out-expo);
}
.visible .reveal-blur {
    opacity: 1;
    filter: blur(0);
}
```

## 背景效果

```css
/* 渐变网格 — 分层径向渐变营造层次感 */
.gradient-bg {
    background:
        radial-gradient(ellipse at 20% 80%, rgba(120, 0, 255, 0.3) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(0, 255, 200, 0.2) 0%, transparent 50%),
        var(--bg-primary);
}

/* 噪点纹理 — 内联 SVG 营造颗粒感 */
.noise-bg {
    background-image: url("data:image/svg+xml,..."); /* 内联 SVG 噪点 */
}

/* 网格图案 — 细微的结构线条 */
.grid-bg {
    background-image:
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 50px 50px;
}
```

## 交互效果

```javascript
/* 悬停时 3D 倾斜 — 为卡片/面板增加层次感 */
class TiltEffect {
    constructor(element) {
        this.element = element;
        this.element.style.transformStyle = 'preserve-3d';
        this.element.style.perspective = '1000px';

        this.element.addEventListener('mousemove', (e) => {
            const rect = this.element.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            this.element.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
        });

        this.element.addEventListener('mouseleave', () => {
            this.element.style.transform = 'rotateY(0) rotateX(0)';
        });
    }
}
```

## 故障排查

| 问题 | 修复方法 |
|---------|-----|
| 字体未加载 | 检查 Fontshare/Google Fonts URL;确保 CSS 中字体名称匹配 |
| 动画未触发 | 验证 Intersection Observer 是否在运行;检查是否添加了 `.visible` class |
| Scroll snap 失效 | 确保 html 上设置了 `scroll-snap-type: y mandatory`;每个幻灯片都需要 `scroll-snap-align: start` |
| 移动端问题 | 在 768px 断点处禁用重型效果;测试触摸事件;减少粒子数量 |
| 性能问题 | 谨慎使用 `will-change`;优先使用 `transform`/`opacity` 动画;节流滚动处理器 |
