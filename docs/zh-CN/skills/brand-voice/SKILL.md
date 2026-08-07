---
name: brand-voice
description: 从真实的帖子、文章、随笔、发布公告、文档或站点文案中构建源自素材的写作风格画像，然后在内容、外联和社交工作流中复用该画像。当用户希望保持语调一致性、避免通用 AI 写作套路时使用。
metadata:
  origin: ECC
---

# Brand Voice

从真实源素材构建持久的语调画像，然后在各处复用该画像，而不是从头重新推导风格或退回到通用 AI 文案。

## When to Activate

- 用户希望以特定语调产出内容或外联信息
- 为 X、LinkedIn、邮件、发布公告、threads 或产品更新撰写内容
- 在多个渠道适配某位已知作者的语气
- 现有的内容赛道需要可复用的风格体系，而不是一次性的模仿

## Source Priority

按以下顺序使用可用的最强真实源集合：

1. 近期原创的 X 帖子和 threads
2. 文章、随笔、备忘录、发布公告或 newsletters
3. 真实有效的对外邮件或 DM
4. 产品文档、changelog、README 定位措辞和站点文案

不要使用通用的平台范例作为源素材。

## Collection Workflow

1. 在可用时收集 5 到 20 个代表性样本。
2. 优先选择近期素材而非旧素材，除非用户表示更早期的写作更具典范地位。
3. 如果源集合明显分化，将“公开发布语调”与“内部工作语调”分开。
4. 如果有实时的 X 访问权限，在起草前使用 `x-api` 拉取近期原创帖子。
5. 如果站点文案重要，包含当前的 ECC 落地页和 repo/plugin 定位措辞。

## What to Extract

- 节奏和句子长度
- 精简 vs 解释
- 大小写规范
- 括号的使用
- 提问的频率和目的
- 主张表达的锐利程度
- 数字、机制或证据出现的频率
- 过渡如何衔接
- 作者从不做什么

## Output Contract

产出一个可复用的 `VOICE PROFILE` 块，供下游 skill 直接消费。使用 [references/voice-profile-schema.md](references/voice-profile-schema.md) 中的 schema。

保持画像结构化且足够简短，以便在 session context 中复用。重点不在于文学评论，而在于可操作的复用。

## Affaan / ECC Defaults

如果用户希望使用 Affaan / ECC 语调，且实时源素材较少，则从此处开始，除非更新的源素材覆盖它：

- 直接、精简、具体
- 具体细节、机制、证据和数字胜过形容词
- 括号用于限定、收窄或过度澄清
- 大小写遵循常规，除非有真正的理由打破
- 提问很少出现，且不应用作诱饵
- 语调可以是犀利、直率、怀疑或冷峻的
- 过渡应当是顺理成章的，而非被抹平的

## Hard Bans

删除并重写以下任何内容：

- 虚假的好奇心钩子
- “not X, just Y”
- “no fluff”
- 强制小写
- LinkedIn 式意见领袖节奏
- 诱导性提问
- “Excited to share”
- 通用的创始人故事填充内容
- 老套的括号内容

## Persistence Rules

- 在同一 session 中的相关任务间复用最新确认的 `VOICE PROFILE`。
- 如果用户要求持久化的产出物，将画像保存到指定的 workspace 位置或 memory surface。
- 除非用户明确要求，否则不要创建存储个人语调指纹的 repo 跟踪文件。

## Downstream Use

在以下 skill 之前或内部使用本 skill：

- `content-engine`
- `crosspost`
- `lead-intelligence`
- 文章或发布公告写作
- 跨 X、LinkedIn 和邮件的冷启动或暖启动外联

如果另一个 skill 已经有部分语调捕获章节，本 skill 是权威的真理来源。
