---
name: seo
description: 审计、规划并实施 SEO 改进，覆盖技术 SEO、on-page 优化、结构化数据、Core Web Vitals 与内容策略。当用户希望提升搜索可见性、进行 SEO 修复、schema markup、sitemap/robots 相关工作或关键词映射时使用。
metadata:
  origin: ECC
---

# SEO

通过技术正确性、性能和内容相关性来提升搜索可见性，而非依赖投机取巧的手法。

## 何时使用

在以下情况下使用此 skill：
- 审计可抓取性、可索引性、canonical 或重定向
- 改进标题标签、元描述和标题结构
- 添加或验证结构化数据
- 改进 Core Web Vitals
- 进行关键词研究并将关键词映射到 URL
- 规划内部链接或 sitemap / robots 变更

## 工作原理

### 原则

1. 先修复技术阻塞，再进行内容优化。
2. 一个页面应有一个清晰的主要搜索意图。
3. 优先追求长期的质量信号，而非操纵性手法。
4. 移动优先的假设很重要，因为索引是移动优先的。
5. 建议应针对具体页面且可实施。

### 技术 SEO 清单

#### 可抓取性

- `robots.txt` 应允许重要页面并屏蔽低价值页面
- 不应有任何重要页面被意外设为 `noindex`
- 重要页面应在较浅的点击深度内可到达
- 避免超过两跳的重定向链
- canonical 标签应自洽且不形成循环

#### 可索引性

- 首选的 URL 格式应保持一致
- 多语言页面（若使用）需要正确的 hreflang
- sitemap 应反映预期的公开页面集合
- 不应有重复 URL 在缺乏 canonical 控制的情况下相互竞争

#### 性能

- LCP < 2.5s
- INP < 200ms
- CLS < 0.1
- 常见修复：预加载首屏关键资源、减少阻塞渲染的工作、预留布局空间、精简过重的 JS

#### 结构化数据

- 首页：视情况使用 organization 或 business schema
- 编辑类页面：`Article` / `BlogPosting`
- 产品页面：`Product` 和 `Offer`
- 内部页面：`BreadcrumbList`
- 问答板块：仅在内容确实匹配时使用 `FAQPage`

### On-page 规则

#### 标题标签

- 目标约为 50-60 个字符
- 将主要关键词或概念放在靠前位置
- 让标题对人类可读，而非为爬虫堆砌

#### 元描述

- 目标约为 120-160 个字符
- 如实描述页面内容
- 自然地包含主要主题

#### 标题结构

- 一个清晰的 `H1`
- `H2` 和 `H3` 应反映实际的内容层级
- 不要仅为视觉样式而跳过结构层级

### 关键词映射

1. 定义搜索意图
2. 收集真实的关键词变体
3. 按意图匹配度、潜在价值和竞争程度排序
4. 将一个主要关键词/主题映射到一个 URL
5. 检测并避免关键词蚕食

### 内部链接

- 从强页面链接到希望获得排名的页面
- 使用描述性的锚文本
- 当可以使用更具体的锚文本时，避免使用通用锚文本
- 从新页面回链到相关的已有页面

## 示例

### 标题公式

```text
Primary Topic - Specific Modifier | Brand
```

### 元描述公式

```text
Action + topic + value proposition + one supporting detail
```

### JSON-LD 示例

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Page Title Here",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Brand Name"
  }
}
```

### 审计输出格式

```text
[HIGH] 产品页面存在重复的标题标签
位置: src/routes/products/[slug].tsx
问题: 动态标题坍缩为相同的默认字符串，削弱了相关性并产生重复信号。
修复: 使用产品名称和主要分类为每个产品生成唯一的标题。
```

## Anti-Patterns

| Anti-pattern | 修复方式 |
| --- | --- |
| 关键词堆砌 | 优先为用户写作 |
| 轻薄的近似重复页面 | 合并它们或使其差异化 |
| 为实际不存在的内容添加 schema | 让 schema 与实际情况匹配 |
| 未查看实际页面就给出内容建议 | 先阅读真实页面 |
| 泛泛的"改进 SEO"输出 | 将每条建议关联到具体页面或资源 |

## 相关 skill

- `seo-specialist`
- `frontend-patterns`
- `brand-voice`
- `market-research`
