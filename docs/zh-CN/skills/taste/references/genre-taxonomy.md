# Visual-Genre 分类体系

从参考语料库（一次对大型生成式视觉风格库的巡览，外加一组保存的 angelcore/hyperpop reels）中提炼出的命名 genre 目录。每个名称实际上是一个**完整的 prompt 与 grade 预设**：选中其一即作为一个整体继承其调色板（palette）、纹理（texture）、光照（lighting）与主题（subject matter）。

将本表用作选择器。选择**一个 primary genre**与**至多一个 accent**。主 `SKILL.md` 将这些 genre 归入若干家族（family），并映射到当前的音乐视频项目。

## 家族与成员

### Ethereal / divine —— *轻盈、神圣、发光、柔和*
- **spiritualism** —— 宗教图像、光环、god-rays（圣光）、虔诚感
- **glacial folk** —— 冷蓝 + 骨白、结晶感、极简、宁静
- **beacons** —— 黑暗中的单一光源、信号、希望
- **zen core** —— 留白、静止、平衡、低饱和
- **fairy tale** —— 故事书、插画感、柔和的魔幻感
- **cozy blanket** —— 温暖、有触感、柔焦的舒适感

### Hyperpop / Y2K-cyber —— *光泽感、chrome（铬金属）、霓虹、kawaii-cyber*
- **cyberdelia** —— 迷幻赛博、高饱和、熔化的数字感
- **acid house** —— rave（锐舞）图形、笑脸、高饱和酸性色
- **acid nora** —— 酸色调的绘画感、扭曲变形
- **neo aggressano** —— 攻击性极强的极繁 hyperpop、撞色
- **new liquid** —— 湿润 chrome、液态金属、光泽反射
- **8-bit / pixel** —— 复古游戏像素、dithered、lo-fi digital

### Dark / occult —— *高对比、不祥、颗粒感*
- **dark academia** —— 忧郁学院风、sepia（棕褐色）、烛光、gothic
- **smoke nostalgia** —— 朦胧、烟雾感、褪色的记忆
- **communist core** —— 红星、宣传海报、醒目的红/黑
- **abstract tech** —— 示意图、冷感、技术抽象
- **microzoathic** —— 诡异的有机暗色微观形态

### Retro / print —— *扁平、图形化、halftone（半色调）、怀旧*
- **retro surfers** —— 60–70 年代冲浪风、阳光褪色、海滩感
- **art deco** —— 几何金色、1920 年代优雅、对称
- **adventure pulp** —— pulp 漫画封面、戏剧性、复古
- **classic advertising** —— 世纪中叶广告插画
- **magazine collage** —— 剪纸、编辑式 collage（拼贴）、分层
- **bumper stickers** —— 贴纸轰炸、kitsch、分层贴花
- **retro print / riso** —— 限色印刷、halftone、套印错位
- **neo lisboa** —— 瓷砖感、azulejo（葡式花砖）启发、地中海印刷风
- **factory pomo** —— 后现代工业图形
- **2026 austurbano** —— 近未来都市编辑风

### Organic / textural —— *触感、微距、编织、湿润*
- **microbiology core** —— 细胞、微生物、培养皿纹理
- **weaving patterns** —— 编织纤维、纺织、交织
- **fruitage retro** —— 水果/农产品、高饱和、光泽静物
- **pacific punk wave** —— 湿润、海洋感、冲刷感图形
- **shape design** —— 醒目的扁平形状、Bauhaus 式形态
- **colour fusion** —— 混合渐变、色域

### Systemic / data —— *网格化、生成式、示意图*
- **numbers** —— 数字排版、账本、计数
- **mazes** —— 迷宫、路径、网格谜题
- **code web** —— 节点图、网络、连接
- **heatmap** —— 热力色彩映射、数据渐变
- **the builds** —— 构造/蓝图、建筑体系
- **multilayer** —— 堆叠透明层、纵深感
- **scrapbooking** —— 拼贴纪念物、分层 ephemera（零碎小物件）

### Cultural / kitsch —— *张扬、特定、引用型*
- **catholic kitsch** —— 宗教 kitsch、镀金圣徒
- **mexendero / megadero / cubanista** —— 拉美本土图形
- **asian chic / asian store** —— 东亚零售/流行本土风
- **battle of culture** —— 撞击的文化母题
- **premium brands** —— 奢侈品包装、精致商业风
- **pro collectibles** —— 卡牌/收藏品装裱
- **diaper design / suburbia / ivy league / sharp preppy** —— 美式郊区/preppy 风
- **carnival difference** —— 节日、极繁庆典
- **men x soft club / faces** —— 人物为主、soft club
- **gomu / proteum aero / ice core / visual hex / vidcoms / anti-ai / photo-first** —— 观察到的杂项预设

> 部分预设名称的精确拼写/归属是从低分辨率屏幕帧中转写而来，可能与源应用的标签略有出入。**家族（families）** 才是持久、可复用的层级；请将各个名称视为灵感标签（inspiration tag），而非规范 ID。

## 如何将一个 genre 用作预设

1. 选取与该段落情感任务相匹配的 genre（见 `SKILL.md` 中的镜头计划）。
2. 通过组合：*其调色板 + 其纹理 + 其主题*，将其转换为一个 fal.ai prompt，然后追加项目的全局后缀（`9:16, cinematic, film grain, volumetric light, no text`）。
3. 保持一种 accent 色；渲染 6–10 张；保留 2–3 张。
4. 单一段落内绝不混合超过 primary + 一种 accent，否则剪辑会失去一致性。
