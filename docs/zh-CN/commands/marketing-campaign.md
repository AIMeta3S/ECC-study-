---
description: 规划并执行完整的营销活动。接受产品简报输入，返回定位、落地页文案、邮件序列、社交媒体帖子、广告变体、视频脚本和内容日历。也可审查现有文案的转化质量。
allowed_tools: ["Read", "Grep", "Glob", "WebSearch", "WebFetch", "Write"]
---

# /marketing-campaign

从简报到完整内容套件，规划并执行一场营销活动。

## 用法

```
/marketing-campaign                          # 以交互方式提示输入简报
/marketing-campaign [product brief]          # 基于内联简报生成完整活动
/marketing-campaign copy [type]              # 仅生成单个交付物
/marketing-campaign review [file-or-brief]   # 针对转化与品牌一致性的文案审查
```

## 它做什么

1. **调研** — 在撰写任何内容之前，先刻画目标受众并梳理竞争对手
2. **定位** — 先锁定活动切入点和语气画像
3. **文案生产** — 按正确顺序生成完整内容套件（落地页 → 邮件 → 社交 → 广告 → 视频脚本 → 日历）
4. **审查** — 所有产出都需通过转化与品牌一致性清单的把关

## 模式

### 完整活动模式

提供一份产品简报，包含以下内容：
- 产品名称与描述
- 目标受众（要具体，不要泛泛而谈）
- 产品解决的核心问题
- 核心收益 / 结果
- 语气指引
- 所需渠道
- 发布目标或时间线

agent 会按顺序返回所有活动交付物，并在末尾附上文案审查摘要。

### 单一交付物模式

```
/marketing-campaign copy landing-page
/marketing-campaign copy email-sequence
/marketing-campaign copy social-posts
/marketing-campaign copy ads
/marketing-campaign copy video-scripts
```

要求先确定定位。在请求单一交付物之前，请先运行完整模式或提供切入点。

### 文案审查模式

```
/marketing-campaign review path/to/copy.md
/marketing-campaign review "paste copy here"
```

返回一份结构化审查报告，针对以下维度：
- 5 秒清晰度测试（首屏文案）
- CTA 质量（具体、有理有据、每篇仅一个）
- 品牌语气一致性
- 卖点的具体性与可支撑性
- 平台原生适配度
- 跨渠道一致性

## 简报模板

```markdown
Product: [name]
Description: [1-3 sentences on what it does]
Audience: [who, specifically]
Problem: [the specific pain the product solves]
Benefit: [the outcome the user gets]
Tone: [adjectives + what to avoid]
Channels: [landing page, email, LinkedIn, X, ads, video]
Goal: [launch, waitlist, signups, awareness — and timeline]
```

## 输出位置

保存活动素材时，约定使用 `.claude/campaigns/{campaign-name}/` 路径：

```
.claude/campaigns/product-launch/
├── positioning.md
├── landing-page.md
├── email-sequence.md
├── social-posts.md
├── ad-copy.md
├── video-scripts.md
└── content-calendar.md
```

写入文件前，请确认保存位置。

## 示例

```
/marketing-campaign Build a 7-day launch campaign for an AI career platform for UK university students.
```

```
/marketing-campaign copy landing-page
```

```
/marketing-campaign review .claude/campaigns/the-key/landing-page.md
```

## agent 委派

此命令会调用：
- `marketing-agent` — 活动规划与文案生产
- `brand-voice` — 当语气需在多个产出中保持统一时进行语气捕获
- `content-engine` — 平台原生社交内容生产
- `crosspost` — 多平台分发
- `market-research` — 深度受众或竞争情报

## 相关命令

- `/plan` — 活动前的战略规划
- `/plan-prd` — 活动简报前的产品需求文档
- `/code-review` — 审查落地页实现背后的代码

---

*属于 [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) 的一部分*
