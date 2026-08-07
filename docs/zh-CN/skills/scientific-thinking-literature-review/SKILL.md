---
name: literature-review
description: 面向学术、生物医学、技术与科学主题的系统化文献综述工作流，涵盖检索规划、来源筛选、综述综合、引用核查与证据记录。
metadata:
  origin: community
---

# 文献综述

当任务是发现、筛选、综合并引用一批学术或技术文献时，使用此 skill。

## 何时使用

- 构建系统综述、范围综述或叙述性综述。
- 针对某个研究问题综合最新研究进展。
- 发现研究空白、矛盾或未来工作方向。
- 为论文或报告准备有引用支撑的背景章节。
- 对比经同行评审的论文、预印本、专利与技术报告中的证据。

## 综述类型

- **叙述性综述**：宽泛的综合；适用于建立整体认知。
- **范围综述**：梳理概念、方法与证据空白。
- **系统综述**：预定义方案、可复现的检索、明确的筛选与排除。
- **荟萃分析**：系统综述加上定量的效应量聚合。

询问用户需要何种严格程度。若未指定，探索性工作默认采用范围综述，发表或临床结论默认采用系统综述。

## 工作流程

### 1. 明确问题

将 prompt 转换为可检索的研究问题。

对于临床或生物医学工作，使用 PICO：

- 人群
- 干预或暴露
- 对照
- 结局

对于技术工作，使用：

- 系统或领域
- 方法或干预
- 对比基线
- 评估指标

### 2. 规划检索

在收集来源之前，先制定检索方案：

- 待检索的数据库
- 日期范围
- 语言
- 出版物类型
- 纳入标准
- 排除标准
- 精确检索字符串

最小可用的数据库集合：

- PubMed，用于生物医学与生命科学文献。
- arXiv，用于计算机科学、数学、物理、定量生物学与预印本。
- Semantic Scholar 或 Crossref，用于广泛的学术发现。
- 必要时使用特定领域的来源，例如临床试验注册库、专利数据库、标准化组织或官方技术文档。

### 3. 检索并记录证据

保留一份使综述可复现的检索日志：

```markdown
| Database | Date searched | Query | Filters | Results | Export |
| --- | --- | --- | --- | ---: | --- |
| PubMed | 2026-05-11 | `("CRISPR"[tiab] OR "Cas9"[tiab]) AND "sickle cell"[tiab]` | 2020:2026, English | 86 | PMID list |
| arXiv | 2026-05-11 | `CRISPR sickle cell gene editing` | q-bio, 2020:2026 | 9 | BibTeX |
```

将原始 ID、URL、DOI、摘要与笔记与最终正文分开保存。

### 4. 去重

按以下顺序去重：

1. DOI
2. PMID 或 arXiv ID
3. 完全相同的标题
4. 规范化标题加上第一作者与年份

记录删除了多少条重复项。

### 5. 筛选来源

分阶段筛选：

1. 标题
2. 摘要
3. 全文

对于系统综述工作，记录排除原因：

- 人群不符
- 干预不符
- 结局不符
- 非原始研究
- 重复
- 全文不可得
- 超出日期范围

### 6. 提取数据

使用结构化提取表：

```markdown
| Study | Design | Population/Data | Method | Comparator | Outcome | Key finding | Limitations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Author Year | RCT/cohort/review/etc. | sample or corpus | method | baseline | measured outcome | result | caveat |
```

对于技术论文，应包含数据集、benchmark、指标、基线与可复现性说明。

### 7. 综合

按主题对证据进行分组，而非逐篇概述论文。

有用的综合视角：

- 最强证据
- 相互矛盾的证据
- 方法学缺陷
- 人群或数据集局限
- 时效性与可重复性
- 实践意义
- 尚未回答的问题

按置信度区分论断：

- **高置信度**：跨来源的、可重复的高质量证据。
- **中等置信度**：看似合理，但受样本、方法或时效限制。
- **低置信度**：早期、推测性、单一来源或测量粗略的论断。

### 8. 核查引用

在定稿之前：

- 核查 DOI、PMID、arXiv ID 或官方 URL
- 核对作者姓名与发表年份
- 不要让一篇论文为它并未提出的论断背书
- 将预印本标注为预印本
- 区分综述与原始证据

## 输出模板

```markdown
# Literature Review: <Topic>

Generated: <date>
Review type: <narrative | scoping | systematic | meta-analysis>
Search window: <dates>
Databases: <list>

## Research Question

## Search Strategy

## Inclusion and Exclusion Criteria

## Evidence Summary

## Thematic Synthesis

## Gaps and Limitations

## References

## Search Log
```

## 常见陷阱

- 不要将检索片段当作证据。
- 不要在未标注的情况下混用预印本、综述与原始研究。
- 不要遗漏阴性或相互矛盾的发现。
- 没有可复现的方案时，不要声称具备系统综述的严格性。
- 不要仅凭单一数据库做出宽泛结论，除非明确将范围限定在该数据库之内。
