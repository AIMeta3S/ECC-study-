---
name: brand-discovery
description: >-
  当品牌需要通过结构化的多 session 访谈来发现或阐明其身份时使用。涵盖宗旨、定位、受众、个性、语调、叙事，以及创始人与品牌之间的张力，通过 8 个 module 展开，运用 laddering、5 Whys 和 projective techniques。产出可恢复的 session，状态持久化到磁盘，并生成一份主品牌手册（90_SYNTHESIS.md）。
---

# Brand Discovery

使用本 skill 开展结构化、自适应的品牌身份访谈。目标是产出一份完整的
`90_SYNTHESIS.md` —— 一份主品牌手册，组织可用它来向设计师、撰稿人和外部
协作者简要说明品牌。

访谈横跨多个 session 进行。过程中将回答落盘保存，这样当一段对话结束时，
任何已获取的知识都不会丢失，后续 session 也能从上次中断处继续。

## 何时启用

- 品牌正在创建、重新定位，或需要一份书面身份参考来向协作者简要说明。
- 预计会有多个 session —— 对话将持续数天或数周。
- 多位创始人或利益相关方需要在合并阶段之前分别访谈。
- 用户希望采用结构化、可复用的方法，而非临时性的闲聊。
- 现有品牌文档零散、隐含或依赖创始人个人认知，需要被显式化。

## session 启动流程

每次启用时，在提出任何访谈问题**之前**执行以下步骤：

1. **检查既有进度。** 在项目的品牌身份目录中查找是否已存在一组 module
   文件和 `state.json` 检查点。如果不存在，说明是全新开始 —— 确认品牌名称、
   参与者，以及品牌身份文件的保存位置，然后从第一个 module 开始。
2. **读取当前 module 文件**（如果正在进行中），并扫描其 Raw 部分，查找
   此前已记录的回答。
3. **向用户汇报**，用两三句话说明：当前处于哪个 module、其状态如何、还剩
   哪些内容。然后询问："在此继续，还是切换 module？"

## 访谈纪律

在每个 module 中全程遵循以下规则：

1. **一次只问一个问题。** 绝不一次性呈现一组问题列表。
2. **每次回答之后：** 简短复述 → 提一个深入追问，或在话题已饱和时结束该
   线索。绝不默默跳过。
3. **Laddering：** 对每一个"是什么"的回答，紧接着追问"这对你为什么
   重要？"，直到触及一项核心价值（通常迭代两到四次）。
4. **5 Whys：** 针对信念或定位主张 —— 追问直到根因浮出水面，而非停留在
   表面的声明。
5. **识别空洞回答：** 若回答泛泛、充满行话或含糊不清，要求对方给出一个
   具体例子、一个客户故事或一个数字。
6. **Projective techniques**（每个 module 使用一次以打破僵局）：
   - "如果品牌是一个人，它会怎样走进一个房间？"
   - 品牌悼词："如果该组织在五年后关闭，客户会怀念什么？你会有什么没说
     出口而感到遗憾？"
   - 竞品对照："举出一个你欣赏但绝不愿成为的同侪。具体是什么让它们成了
     错误范本？"
7. **饱和信号：** 当连续两次追问都未产生新信息时，总结并结束该 module。
8. **module 结束时：** 写入一个结构化的 module 文件，包含两个部分：
   - `## Raw` —— 逐字引用和示例。
   - `## Synthesis` —— 你的解读、三个候选表述、未决问题、参与者之间的矛盾。
   随后更新 `state.json` 检查点（见下文状态写入协议）。

## module 顺序

| 文件 | 标签 | 所用框架 |
|------|-------|-----------------|
| `10_purpose-why.md` | 宗旨 / 原因 | Sinek Golden Circle, Lencioni |
| `20_positioning.md` | 定位 | Dunford "Obviously Awesome", Moore template |
| `30_audience-niche.md` | 受众与利基市场 | Baker "Business of Expertise", ICP |
| `40_personality-archetype.md` | 个性与原型 | Mark & Pearson 12 archetypes, J. Aaker 5 dims |
| `50_voice-tone.md` | 语调与调性 | 品牌语调指南 |
| `60_narrative-story.md` | 叙事 / 故事 | Neumeier trueline、品牌故事弧 |
| `70_founder-tension.md` | 创始人品牌 vs 工作室品牌 | Enns "Win Without Pitching" |
| `90_SYNTHESIS.md` | 主品牌手册 | Kapferer prism, Aaker brand system |

按顺序完成各 module。若用户要求跳转 module，予以尊重，并在 `state.json` 中
记录该跳过。

## 状态写入协议

每个 module 达到饱和或完成状态后，写入两个文件：

**module 文件**位于 `modules/{moduleFile}` —— 完整的 Raw 与 Synthesis 内容。

**`state.json`** —— 一个轻量级检查点，便于后续 session 恢复。更新
`completedModules`、`inProgressModule`、`nextModule`、`lastUpdated`。Schema：

```json
{
  "session": "{brand_name}-brand-{YYYY-MM}",
  "outputPath": "{path_to_brand_identity_directory}",
  "completedModules": [],
  "inProgressModule": "10_purpose-why.md",
  "nextModule": "20_positioning.md",
  "participants": ["founder-A"],
  "lastUpdated": "{ISO-8601}"
}
```

写入后确认："Module X 已保存。状态已更新。下一个：Y。"

**终止 module（90_SYNTHESIS.md）：** 写入最终 synthesis 时，在 `state.json`
中将 `inProgressModule` 设为 `"90_SYNTHESIS.md"`，将 `nextModule` 设为
`null`。写入完成后，将 `completedModules` 设为包含
`"90_SYNTHESIS.md"`，然后将 `inProgressModule` 设为 `null` —— 若留有值，
会导致将来恢复时把已完成的品牌手册误认为仍在进行中。确认："品牌手册已
完成。所有 module 已保存。"

## 多创始人模式

当有多位创始人参与时，将每位创始人的回答写入
`founders/{participant}.md`，而不是主 module 文件。写入前校验
`participant` 名：仅接受字母数字字符和连字符（例如 `founder-a`、
`anna`）；拒绝包含路径分隔符（`/`、`\`、`..`）或特殊字符的名字。针对
枚举的 module 序列校验 `moduleFile`（仅限 10 到 90）。校验
`outputPath` 以确保它是项目目录内的绝对路径 —— 拒绝相对路径以及通过
`..` 段逃逸的路径。所有创始人完成一个 module 后，执行一轮合并梳理：在
module 文件中总结趋同点与分歧点，并为群体对齐工作坊标记出"有建设性的
张力"。

## 反模式

- **未先读取状态就开始。** 每个 session 都必须从检查既有 module 文件和 `state.json` 开始。跳过此步骤会丧失与之前 session 的所有连续性。
- **一次提出多个问题。** "一次一个问题"不是可选项 —— 问题列表只会产生清单式回答，而非真实洞察。
- **在饱和之前就进入 Synthesis。** 如果最后两次追问没有产生新信息，该 module 就算完成。如果产生了 —— 那就还没完成。
- **跳过多创始人合并。** 当涉及多位利益相关方时，必须先完成各自访谈，再做合并。先集体讨论品牌会引入锚定偏差。
- **将其视作一次性 session。** 本 skill 为多个 session 而设计。在一段对话中急于冲向 `90_SYNTHESIS.md` 会产出肤浅的成果。

## 相关 skill

- `competitive-platform-analysis` —— 在 brand-discovery 确立定位简报之后，用它来圈定并分类竞品集合。
- `brand-voice`（ECC）—— 如果 brand-discovery 的语调与调性 module 需要一份独立的、源自一手资料的写作风格画像。
