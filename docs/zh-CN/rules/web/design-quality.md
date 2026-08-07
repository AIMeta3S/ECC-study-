> 本文件扩展了 [common/patterns.md](../common/patterns.md)，提供针对 Web 的设计质量指引。

# Web 设计质量标准

## 反模板策略

不要交付看起来像通用模板的 UI。前端产出应当是有意为之、有主张，且专属于该产品。

### 禁止的模式

- 默认的卡片网格，间距统一且毫无层级
- 现成的 hero section，配上居中标题、渐变色块和通用 CTA
- 把未经修改的库默认值当作完成的设计交付
- 扁平布局，没有分层、深度或 motion
- 每个组件都使用统一的圆角、间距和阴影
- 保守的灰字白底风格，只加一个装饰性 accent color
- 按套路拼凑的 dashboard 布局，侧边栏 + 卡片 + 图表，毫无立场
- 没有明确理由就使用默认 font stack

### 必备品质

每个有意义的前端界面都应至少体现以下四项：

1. 通过尺度对比建立清晰的层级
2. 间距上有意为之的节奏感，而非处处统一的 padding
3. 通过重叠、阴影、surface 或 motion 营造深度或分层
4. 有个性、且有真实配对策略的 typography
5. 色彩按语义使用，而非仅作装饰
6. hover、focus 和 active 状态让人感觉经过设计
7. 在合适处采用打破网格的 editorial 或 bento 构图
8. 在契合视觉方向时使用纹理、颗粒感或氛围感
9. motion 应让流程更清晰，而非干扰流程
10. 把数据可视化视为 design system 的一部分，而非事后补充

## 编写前端代码之前

1. 选定一个具体的风格方向。避免像 "clean minimal" 这样含糊的默认风格。
2. 有意地定义调色板。
3. 慎重地选择 typography。
4. 至少收集一小批真实参考。
5. 在相关处使用 ECC 的 design/frontend skills。

## 值得采用的风格方向

- Editorial / 杂志风
- Neo-brutalism
- 具有真实深度感的 Glassmorphism
- 对比克制的 dark luxury 或 light luxury
- Bento 布局
- Scrollytelling
- 3D 集成
- Swiss / International
- Retro-futurism

不要自动默认采用 dark mode。选择产品真正想要的视觉方向。

## 组件检查清单

- [ ] 它是否避免了看起来像默认的 Tailwind 或 shadcn 模板？
- [ ] 它是否有经过有意设计的 hover/focus/active 状态？
- [ ] 它是否采用了层级，而非处处统一的强调？
- [ ] 放在真实的产品截图中，它是否可信？
- [ ] 若它同时支持两种 theme，light 和 dark 是否都让人感觉经过设计？
