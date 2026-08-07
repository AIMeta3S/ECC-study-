---
name: pubmed-database
description: 用于生物医学文献、MeSH 查询、PMID 查找、引文检索和基于 API 的文献监测的直接 PubMed 和 NCBI E-utilities 检索工作流。
metadata:
  origin: community
---

# PubMed 数据库

当任务需要来自 PubMed 的生物医学文献而非通用网络搜索时，使用此 skill。

## 何时使用

- 检索 MEDLINE 或生命科学文献。
- 使用 MeSH 术语、字段标签、日期或文献类型构建 PubMed 检索式。
- 查找 PMID、摘要、出版元数据或相关引文。
- 运行需要可重复检索字符串的系统综述检索轮次。
- 通过 Python、shell 或其他 HTTP 客户端直接使用 NCBI E-utilities。

## 检索式构建

从研究问题出发，将其拆分为若干概念，然后用布尔运算符组合这些概念。

```text
concept_1 AND concept_2 AND filter
synonym_a OR synonym_b
NOT exclusion_term
```

常用的 PubMed 字段标签：

- `[ti]`：标题
- `[ab]`：摘要
- `[tiab]`：标题或摘要
- `[au]`：作者
- `[ta]`：期刊标题缩写
- `[mh]`：MeSH 术语
- `[majr]`：主要 MeSH 主题
- `[pt]`：出版类型
- `[dp]`：出版日期
- `[la]`：语言

示例：

```text
diabetes mellitus[mh] AND treatment[tiab] AND systematic review[pt] AND 2023:2026[dp]
(metformin[nm] OR insulin[nm]) AND diabetes mellitus, type 2[mh] AND randomized controlled trial[pt]
smith ja[au] AND cancer[tiab] AND 2026[dp] AND english[la]
```

## MeSH 与副主题词

当概念拥有稳定的受控词汇术语时，优先使用 MeSH。当主题较新或术语不统一时，将 MeSH 与标题/摘要术语组合使用。

正确的副主题词语法将副主题词置于字段标签之前：

```text
diabetes mellitus, type 2/drug therapy[mh]
cardiovascular diseases/prevention & control[mh]
```

仅当主题必须是论文核心时才使用 `[majr]`。它能提升查准率，但可能遗漏相关研究。

## 过滤器

出版类型：

- `clinical trial[pt]`
- `meta-analysis[pt]`
- `randomized controlled trial[pt]`
- `review[pt]`
- `systematic review[pt]`
- `guideline[pt]`

日期过滤器：

```text
2026[dp]
2020:2026[dp]
2026/03/15[dp]
```

可用性过滤器：

```text
free full text[sb]
hasabstract[text]
```

## E-utilities 工作流

NCBI E-utilities 支持可重复的 API 工作流：

1. `esearch.fcgi`：检索并返回 PMID。
2. `esummary.fcgi`：返回轻量级的文献元数据。
3. `efetch.fcgi`：以 XML、MEDLINE 或文本格式获取摘要或完整记录。
4. `elink.fcgi`：查找相关文献及关联资源。

在生产脚本中使用 email 和 API key。将 API key 存储在环境变量中，切勿存放在已提交的文件或命令历史中。

```python
import os
import time
import requests

BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"


def esearch(query: str, retmax: int = 20) -> list[str]:
    params = {
        "db": "pubmed",
        "term": query,
        "retmode": "json",
        "retmax": retmax,
        "tool": "ecc-pubmed-search",
        "email": os.environ.get("NCBI_EMAIL", ""),
    }
    api_key = os.environ.get("NCBI_API_KEY")
    if api_key:
        params["api_key"] = api_key

    response = requests.get(f"{BASE}/esearch.fcgi", params=params, timeout=30)
    response.raise_for_status()
    time.sleep(0.35)
    return response.json()["esearchresult"]["idlist"]


pmids = esearch("hypertension[mh] AND randomized controlled trial[pt] AND 2024:2026[dp]")
print(pmids)
```

对于批量操作，优先使用 NCBI history server 参数（`usehistory=y`、`WebEnv`、`query_key`），而非通过 URL 传递过长的 PMID 列表。

## 输出规范

对每一次检索轮次，记录以下内容：

- 精确的检索字符串
- 所检索的数据库
- 检索日期
- 所用过滤器
- 结果数量
- 导出格式
- 任何人工排除项

示例：

```markdown
| Database | Date searched | Query | Filters | Results |
| --- | --- | --- | --- | ---: |
| PubMed | 2026-05-11 | `sickle cell disease[mh] AND CRISPR[tiab]` | 2020:2026[dp], English | 42 |
```

## 审查清单

- 字段标签是否为有效的 PubMed 标签？
- 对于较新的主题，MeSH 术语是否与自由文本同义词搭配使用？
- 日期范围是否明确且恰当？
- 检索日志是否包含足够的细节以复现该检索式？
- API key 是否从环境中加载？
- HTTP 代码是否在解析前调用了 `raise_for_status()` 或以其他方式处理非 200 响应？
- 是否遵守了速率限制？

## 参考资料

- [PubMed 帮助](https://pubmed.ncbi.nlm.nih.gov/help/)
- [NCBI E-utilities 文档](https://www.ncbi.nlm.nih.gov/books/NBK25501/)
- [NCBI API key 指南](https://support.nlm.nih.gov/kbArticle/?pn=KA-05317)
- NCBI 支持：<eutilities@ncbi.nlm.nih.gov>
