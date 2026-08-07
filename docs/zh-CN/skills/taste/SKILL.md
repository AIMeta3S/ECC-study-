---
name: taste
description: 面向 angelcore / cloud-trance / hyperpop 视觉谱系的音乐视频与短视频剪辑的创意指导（taste）层。提炼一套具名流派的审美词汇、情绪 + 色彩 + 光线体系，以及一套踩点剪辑语法，再将 ECC 的视频 skills（video-editing、fal-ai-media、remotion-video-creation、motion-*、content-engine）串联成一条生产 pipeline。当任务不只是让视频"能跑通"，而是要让其呈现明确的创作意图时；当制作音乐视频、fancam/剪辑、moodboard 驱动的 reel 时；或当需要为 AI 生成的 b-roll 选定一个统一的视觉方向时使用。
origin: ECC
---

# Taste

大多数 AI 视频建议止步于*如何渲染画面*。这个 skill 是其上一层：**画面应该长什么样、以什么顺序排列、按什么节奏剪辑，才能让最终成片读起来是一个有意图的整体，而不是一堆生成的堆砌。**

它编码了一种特定的 taste —— **angelcore / cloud-trance / hyperpop** 谱系（Bladee "Silver Surfer" 时期的空灵 trance 与浓重的 angelcore 交叉）—— 提炼自一个已收藏 Reels 的语料库，以及对一个约 70 条目的视觉流派库的梳理。它刻意带有立场。Taste 是一种观点，而非一份菜单。

> 配套文件 `references/genre-taxonomy.md` 存放了完整的具名流派目录。
> 本文件是可执行层：情绪、语法、pipeline，以及一份按 beat 映射的镜头方案。

## 何时启用

- 制作 **音乐视频**、lyric video、fancam 或 visualizer。
- 制作短视频 **剪辑 / reel**，其中*感觉*比信息更重要。
- 驱动 **AI b-roll 生成**（fal.ai、Veo、Kling 等），且 prompt 需要一个统一方向，而非零散的氛围感。
- 在任何渲染之前组装 **moodboard** 或选定一个视觉流派。
- 用户说 "taste"、"make it feel like X"、"give it a direction"、"angelcore"、"cloud trance"、"hyperpop edit"、"Bladee"、"dreamcore"，或点名一个已保存的参考。
- 当前剪辑能跑通，但读起来平淡、套路化、AI-slop，或风格上不连贯。

这个 skill 位于 `video-editing`（机械层）和 `remotion-video-creation`（渲染器）**之上**。用它们解决*怎么做*。用这个 skill 解决*做什么与为什么*。

## 核心论点

1. **Taste 是最后一层，却必须最先决定。** `video-editing` 正确地指出 taste 是最终的人工 pass。陷阱在于：如果你只在最后才决定 taste，那么上游的每一次生成和剪辑都是瞎猜。在第一个 prompt *之前*就定好方向，然后让它约束一切。
2. **连贯性胜过新鲜感。** 一种观感贯穿 30 个镜头，胜过 30 种不同观感。一个具名流派（见下文）是一种约束，能免费换来连贯性。
3. **跟着歌剪，不是跟着素材剪。** 在音乐视频中，时间线就是波形。每一个 hard cut 都落在一个 beat 或一个 transient 上。帧数学见 pipeline 章节。
4. **有选择地生成，无情地剪辑。** AI 制造不存在的 b-roll；它制造不出 taste。你仍然要扔掉 80%。

## 审美词汇表（提炼版）

参考语料库遍历了一个大型*具名*视觉流派库。完整列表在 `references/genre-taxonomy.md`。有用的做法不是去背 70 个名字 —— 而是认识到**一个流派名就是一个完整的 prompt-and-grade preset**。当你选定一个，你就把它的调色盘、质感、光线和题材作为一个整体继承下来。

这些流派聚成若干家族。选定一个 **primary** 家族，外加最多 **一个 accent**：

| 家族 | 其中流派 | 呈现观感 |
|--------|-------------|----------|
| **Ethereal / divine** | spiritualism, glacial folk, beacons, zen core, fairy tale | 失重、神圣、发光、柔和 |
| **Hyperpop / Y2K-cyber** | cyberdelia, acid house, acid nora, neo aggressano, new liquid | 光亮、chrome、neon、kawaii-cyber |
| **Dark / occult** | dark academia, smoke nostalgia, communist core, abstract tech | 高对比、不祥、颗粒感 |
| **Retro / print** | retro surfers, art deco, adventure pulp, classic advertising, magazine collage, bumper stickers | 扁平、图形化、半调、怀旧 |
| **Organic / textural** | microbiology core, weaving patterns, fruitage retro, cozy blanket, pacific punk wave | 触感、微距、编织、湿润 |
| **Systemic / data** | numbers, mazes, code web, heatmap, pixel, 8-bit | 网格化、生成式、图示化 |

**对于当前项目**，primary 是 **Ethereal / divine**，搭配 **Hyperpop / Y2K-cyber** accent —— 即圣光与结晶绽放，间或以 chrome 和 neon 点破。这一组合*就是* angelcore × cloud-trance 的 brief。

## 情绪体系 —— angelcore × cloud-trance

直接从最强的参考 reels 提炼而来。这是具体的 grade。

### 调色盘
- **Base（基色）：** 近黑虚空（#05060a）与骨白（#f4f1ea）。大多数画面非此即彼。
- **Divine accent（神圣强调色）：** 熔金 / 余烬橙（#ffb24d → #ff7a18）—— 黑暗中的*那一缕暖光*。
- **Crystalline accent（结晶强调色）：** 幻彩紫→青→品红 bokeh（#8a6bff, #4fc3ff, #ff6ad5）—— hyperpop 绽放，用于明亮画面。
- **Danger accent（危险强调色，少量使用）：** 单色背景上的一抹发光红（#ff2a2a）—— 仅用于一两个 shock cut。
- **Hyperpop 主体：** 蓝天背景上的糖果粉头发 / chrome / 光亮白。

规则：**每个镜头一种 accent。** 金色存在于暗调画面；幻彩存在于亮调画面；绝不混用于同一镜头。

### 光线与质感
- 黑暗被单一暖源刺穿（余烬绽放、圣光光柱）。高对比，深邃黑位。
- 结晶 / 闪光 bokeh、lens flares、bloom、light leaks —— *天堂感*，而非脏污感。
- 暗调画面加 film grain + 轻微 chromatic aberration；亮调画面则是干净光泽。
- 负空间上的微距细节：一个主体物件居中于黑色（钥匙、眼睛、齿轮、花瓣、水）。
- 主体：有翼人物、云朵、光环、天使、结晶结构、candy-cyber 肖像。

### 动态
- 缓慢、漂浮、失重的镜头（drift、slow push、slow orbit）—— *cloud* trance。
- 仅在 drop 处爆发速度。其余时候一切都在呼吸。
- 粒子上升（余烬、尘埃、闪光）—— 向上运动 = 飞升。

## 剪辑语法（提炼版）

从参考剪辑中，反复出现并定义该风格的技法：

1. **Beat-locked hard cuts。** verse/drop 段不用 dissolves。在 kick 上切。眼睛应该感受到 BPM。
2. **Hero-on-black macro inserts。** 一件锐利的物件居中于黑色负空间，停留 1–2 个 beat，然后切。这些镜头的节奏化蒙太奇 = cloud-trance 的签名。
3. **Bloom / explosion reveal。** 一个白色或余烬 bloom 在 transient 处炸开整个画面，然后化入下一个镜头。即 "divine flash" 转场。
4. **Color-pop on monochrome。** 让一段以 B&W 运行，然后单个彩色元素（红眼、金焰、粉发）在 downbeat 处穿透而出。
5. **Speed-ramp into the drop。** 在 drop 前最后一 bar 内将素材从慢加速到快，在 the one 上 hard-cut 到节奏。
6. **Caption keyword highlight（仅用于 talking-head / lyric 段落）。** 全大写，用 accent 色高亮一两个词，与人声同步。用于 lyric video，不用于纯 visualizer。
7. **Reaction PiP（仅用于 explainer/edit-commentary）。** b-roll 之上叠加画中画 talking head。不在音乐视频本身的范围内；之所以记录，是因为语料库大量使用了它。

**禁止事项：** tempo 段落使用 crossfade 转场；单个镜头出现多于一种 accent 色；镜头拖过其 musical phrase；可读的屏幕 UI chrome（裁掉）；同一时间线混用多种宽高比。

## The Pipeline —— 混用 ECC 的视频 skills

这个 skill 是指挥。每个 ECC skill 是一件乐器。不要跳层。

```
0. TASTE (this skill)        在任何渲染之前决定 genre + mood + grammar
1. STRUCTURE (video-editing) 标注歌曲结构：为 intro/verse/drop/bridge/outro 标注时间戳
2. GENERATE (fal-ai-media)   按流派 prompt-preset 生成 b-roll；扔掉 80%
3. CUT (video-editing/FFmpeg) beat-cut + reframe 到 9:16；在网格上组装入选片段
4. COMPOSE (remotion-video-creation) 叠加层、bloom、lyric 文本、beat-synced sequencing
5. MOTION (motion-* skills)  easing 曲线、light-leak/粒子运动、转场时机
6. AUDIO (fal-ai-media)      转场 risers/impacts 来 selling 这些切点（音轨本身在 Ableton 里）
7. POLISH                    按上面的调色盘 grade，最后一遍节奏 pass，导出
8. DISTRIBUTE (content-engine) 平台原生版本 + caption/cover
```

| 步骤 | 要加载的 ECC skill | 在此做什么 |
|------|-------------------|-------------------|
| 结构与剪辑 | `video-editing` | FFmpeg cut/concat/reframe、EDL、scene/silence detection |
| 生成 b-roll | `fal-ai-media` | 按流派 preset 调用 image/video 模型 |
| 组合与叠加 | `remotion-video-creation` | beat-synced 的 `<Sequence>`、文本、bloom、mask |
| 动态时机 | `motion-foundations`、`motion-patterns`、`motion-advanced`、`motion-ui` | easing、springs、光线/粒子运动 |
| 服务端视频 | `videodb` | 智能 reframe、大量素材时的 indexing |
| 分发 | `content-engine` | 平台专属 cut、cover、caption |
| 人声/lyric VO | `video-editing`（ElevenLabs 章节） | 仅当需要一层旁白时 |

## Beat Math（将切点锁到歌曲）

当前音轨是 **138 BPM，B minor**。常量：

- `seconds_per_beat = 60 / 138 = 0.43478s`
- `frames_per_beat   = fps × 0.43478`  →  **24fps: 10.43**, **30fps: 13.04**, **60fps: 26.09**
- `1 bar (4 beats)   = 1.7391s`  →  30fps: **52.17 frames**
- `8-bar phrase      = 13.913s`  →  来自音轨的 loop 长度

在 Remotion 中，把每个 `from={}` 吸附到一个 beat：
```ts
const FPS = 30;
const BPM = 138;
const beat = (n: number) => Math.round(n * (60 / BPM) * FPS); // beat(n) → 帧
// 在 beat 0,4,8,... 处切：  <Sequence from={beat(0)} durationInFrames={beat(4)}> ...
```

## Beat-Mapped 镜头方案（本音乐视频）

歌曲编排（来自项目自带笔记）是 **Intro → Verse → Drop → Bridge → Drop → Outro（约 2:05）**。将 taste 映射到每一段：

| 段落 | 流派/情绪倾向 | 语法 | 镜头点子 |
|---------|-----------------|---------|------------|
| **Intro** | Ethereal/divine，近黑 | slow push，无剪辑 | 虚空中的 ember bloom；一道金光；尘埃升腾 |
| **Verse** | Dark + macro hero-on-black | 每 2 个 beat 一次 hard cut | 钥匙、眼睛、齿轮、水滴、花瓣 —— 节奏化 macro 蒙太奇 |
| **Drop** | Hyperpop bloom + crystalline | speed-ramp 进入，在 the one 上切，快 | 糖果粉人影、chrome、幻彩 bokeh、有翼飞升 |
| **Bridge** | Spiritualism，失重 | 一个长停镜头，color-pop | 云 + 光环；单个 red accent 穿透一次 |
| **Drop 2** | 同 Drop，加烈 | 在 transient 上加 divine-flash bloom | 翼展开、闪光迸发、light leaks 拉满 |
| **Outro** | Glacial folk，冰冷宁静 | 缓慢 fade 到黑 | 结晶结构消融；余烬熄灭 |

## fal.ai Prompt Preset（按情绪）

配合 `fal-ai-media` 使用。每个 preset 都是流派渲染到项目调色盘的结果。在所有 prompt 后追加 `9:16, vertical, cinematic, film grain, volumetric light, no text, no watermark`。

- **Divine void：** "a single molten-gold ember bloom rising in an infinite near-black void, deep shadow, one warm light source, weightless dust particles, holy, high contrast"
- **Macro hero：** "extreme macro of an antique brass key / a human eye / interlocking gears, centered on pure black negative space, razor-sharp detail, single rim light"
- **Crystalline bloom：** "iridescent violet-cyan-magenta crystalline bokeh, glittering light refraction, dreamy lens flares, heavenly glow, soft focus, hyperpop angelcore"
- **Candy-cyber portrait：** "candy-pink-haired figure, glossy chrome accents, bright blue sky, Y2K hyperpop, clean gloss, saturated, kawaii-cyber"
- **Winged ascension：** "a winged figure ascending into clouds, halo of light, bone-white and gold, volumetric god-rays, ethereal, religious iconography, soft"
- **Cold outro：** "pale crystalline ice structure slowly dissolving, glacial folk, cold blue and bone white, minimal, calm, fading to black"

每个 preset 生成 6–10 张，保留 2–3 张。要获得运动效果，用 image-to-video 模型把静帧动起来，或直接生成短片段；按动态规则保持运镜缓慢。

## FFmpeg Recipes（剪切 + reframe）

```bash
# 将任意横屏/原始片段 reframe 到 9:16（居中裁剪）
ffmpeg -i in.mp4 -vf "crop=ih*9/16:ih,scale=1080:1920" v.mp4

# 将一个片段按 138 BPM 精确切到 N 个 beat（例如 2 beats = 0.8696s）
ffmpeg -i in.mp4 -t 0.8696 -c copy beat2.mp4

# 把 beat-selects 拼接成 verse 蒙太奇
for f in selects/*.mp4; do echo "file '$f'"; done > concat.txt
ffmpeg -f concat -safe 0 -i concat.txt -c copy verse.mp4

# 去除屏录参考里的 UI chrome / 状态栏（裁掉顶部+底部）
ffmpeg -i reel.mp4 -vf "crop=iw:ih-300:0:150" clean.mp4
```

## Remotion Composition 骨架（beat-synced）

```tsx
import { AbsoluteFill, Sequence, Video, Img, useCurrentFrame, interpolate } from "remotion";

const FPS = 30, BPM = 138;
const beat = (n: number) => Math.round(n * (60 / BPM) * FPS);

const Bloom: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 3, 12], [0, 1, 0], { extrapolateRight: "clamp" }); // transient 上的 divine flash
  return <AbsoluteFill style={{ background: "radial-gradient(#fff,#ffb24d)", opacity: o, mixBlendMode: "screen" }} />;
};

export const AngelcoreMV: React.FC = () => (
  <AbsoluteFill style={{ background: "#05060a" }}>
    {/* Verse：macro hero-on-black，每 2 个 beat 一次 hard cut */}
    <Sequence from={beat(0)} durationInFrames={beat(2)}><Video src="/selects/key.mp4" /></Sequence>
    <Sequence from={beat(2)} durationInFrames={beat(2)}><Video src="/selects/eye.mp4" /></Sequence>
    <Sequence from={beat(4)} durationInFrames={beat(2)}><Video src="/selects/gear.mp4" /></Sequence>
    {/* Drop：crystalline bloom + 在 the one 上 flash */}
    <Sequence from={beat(8)} durationInFrames={beat(16)}><Video src="/selects/crystalline.mp4" /></Sequence>
    <Sequence from={beat(8)} durationInFrames={beat(1)}><Bloom /></Sequence>
  </AbsoluteFill>
);
```
渲染：`npx remotion render src/index.ts AngelcoreMV out.mp4`。项目搭建、音轨绑定以及 render flag 见 `remotion-video-creation`。

## 关键原则

1. **在第一次生成之前定好流派。** 选定一个 primary 家族 + 一个 accent。
2. **每个镜头一种 accent 色。** 金色在暗处，幻彩在亮处，红色只用一次。
3. **每一个 hard cut 都落在一个 beat 上。** 使用 beat math；tempo 段落不加转场。
4. **Hero-on-black macro 是签名技法。** 掌握它；它撑起 verse。
5. **生成 10，保留 2。** 连贯性来自淘汰，而非更用力地 prompt。
6. **裁掉 chrome。** 最终画面里不留状态栏、字幕或 UI。
7. **Taste 最先定、最后判。** 定好方向，然后在每一次剪辑上捍卫它。

## 相关 Skills

- `video-editing` —— 本 skill 所依赖的机械 pipeline（FFmpeg、reframe、EDL、polish）
- `remotion-video-creation` —— 可编程的 beat-synced 合成与渲染
- `fal-ai-media` —— 生成 b-roll、转场 SFX 和 risers
- `motion-foundations`、`motion-patterns`、`motion-advanced`、`motion-ui` —— easing 与 motion 时机
- `videodb` —— 面向大量素材的服务端智能 reframe 与 indexing
- `content-engine` —— 平台原生分发、cover、caption
- `frontend-design-direction` —— 面向 UI 的同一套"先定方向"准则
