---
name: uspto-database
description: USPTO 专利与商标数据工作流,用于官方记录查询、PatentSearch 查询、TSDR 检查、转让数据以及可复现的 IP 研究日志。
metadata:
  origin: community
---

# USPTO Database

当任务需要来自 USPTO 系统的美国官方专利或商标记录时,使用此 skill。

## 使用时机

- 搜索已授权专利或授权前公开。
- 检查专利申请状态、file-wrapper 数据、转让记录或公开的审查历史。
- 查询商标状态、文件或转让历史。
- 构建可复现的现有技术、专利组合或 IP 布局研究日志。
- 将 USPTO 记录与次要工具(如 Google Patents、Lens.org、Semantic Scholar 或公司专利页面)进行对比。

不要使用此 skill 提供法律建议。将其视为数据收集与记录验证的工作流。

## 来源选择

优先使用官方 USPTO 或 USPTO 支持的平台:

- Open Data Portal (ODP):迁移后的 USPTO 数据集与 API 的当前归属平台。
- Patent File Wrapper:公开的专利申请著录数据与 file wrapper 记录。
- PatentSearch API:用于已授权专利与授权前公开数据集的 PatentsView 搜索 API。
- TSDR Data API:商标状态与文件检索。
- Patent and Trademark Assignment Search:所有权转让记录。
- PTAB data in ODP:Patent Trial and Appeal Board 诉讼程序。

仅将次要来源作为便捷索引使用。当结果至关重要时,需与官方记录交叉核对。

## 认证与密钥

许多 USPTO API 流程需要 API key。请将 key 存放在环境变量或 secret manager 中,绝不要放在提交到仓库的文件中或粘贴到对话记录里。

常见的环境变量名:

```bash
export USPTO_API_KEY="..."
export PATENTSVIEW_API_KEY="..."
```

对 PatentSearch,使用 `X-Api-Key` header 发送 key。对 TSDR,遵循当前的 USPTO API Manager 指引与速率限制指引。

## PatentSearch 工作流

当问题涉及趋势、发明人、受让人、分类、日期或专利组合切片时,使用 PatentSearch 进行广泛的专利与授权前公开搜索。

工作流:

1. 从当前的 PatentSearch 参考文档或 Swagger UI 中确定 endpoint。
2. 构建带有显式筛选条件的 JSON 查询。
3. 仅请求分析所需的字段。
4. 以确定性方式排序和分页。
5. 记录 endpoint、查询体、日期、数据时效说明与结果数量。

Python 请求骨架:

```python
import os
import requests

API_KEY = os.environ["PATENTSVIEW_API_KEY"]
BASE = "https://search.patentsview.org/api/v1"

payload = {
    "q": {
        "_and": [
            {"patent_date": {"_gte": "2024-01-01"}},
            {"assignees.assignee_organization": {"_text_any": ["Google", "Alphabet"]}},
        ]
    },
    "f": ["patent_id", "patent_title", "patent_date"],
    "s": [{"patent_date": "desc"}],
    "o": {"per_page": 100, "page": 1},
}

response = requests.post(
    f"{BASE}/patent/",
    headers={"X-Api-Key": API_KEY, "Content-Type": "application/json"},
    json=payload,
    timeout=30,
)
response.raise_for_status()
print(response.json())
```

在复用查询之前,请在实时的 PatentSearch 文档中核实当前的 endpoint 名称、字段路径、请求参数与 API-key 可用性。

## 商标/TSDR 工作流

当任务需要商标案件状态、文件、图像、所有人历史或审查事件时,使用 TSDR。

工作流:

1. 规范化序列号或注册号。
2. 检查当前的 TSDR API 说明与所需的 API-key header。
3. 先获取状态,仅在需要时再获取文件。
4. 对 PDF、ZIP 与多案件下载,遵守较低的速率限制。
5. 在输出中记录检索日期与序列号/注册号标识符。

对于大批量商标数据拉取,优先使用文档化的批量数据流程,而非抓取公开页面。

## File Wrapper 与审查历史

对于申请状态、交易历史与审查文件:

- 从 ODP Patent File Wrapper 搜索开始。
- 在可用时使用精确的标识符:申请号、公开号、专利号或当事人名称。
- 记录该记录是已授权专利、授权前公开还是待审申请。
- 在引用之前,对照记录详情页交叉核对文件日期与状态。

## 转让工作流

对于专利或商标所有权:

1. 在可用时,按专利号/申请号/注册号、转让人、受让人或 reel/frame 搜索官方转让数据。
2. 记录转让文本、签署日期、登记日期与各方当事人。
3. 区分转让记录与当前法律所有权结论。
4. 如果所有权事关重大,请将结果标记为需律师或主题审查。

## 可复现输出

每次 USPTO 研究过程都应包含一个日志表:

```markdown
| Source | Date searched | Identifier/query | Filters | Results | Notes |
| --- | --- | --- | --- | ---: | --- |
| PatentSearch | 2026-05-11 | `assignee=Alphabet AND date>=2024` | patent endpoint | 118 | API docs checked before run |
| TSDR | 2026-05-11 | `serial=90000000` | status only | 1 | API-key flow, no document bulk pull |
```

对于最终报告,应区分:

- 官方记录事实
- 推断分析
- 次要来源的便捷匹配
- 未解决的缺口或需要法律审查的记录

## 审查清单

- 是否优先使用了官方 USPTO 或 USPTO 支持的来源?
- 是否在运行代码前核实了当前的 endpoint 与字段名称?
- API key 是否避开了文件、shell history 与输出日志?
- 查询日志是否包含搜索日期与确切的请求结构?
- 是否遵守了速率限制?
- 是否避免或明确上报了法律结论?
- 次要来源是否被标注为次要?

## 参考资源

- [USPTO APIs catalog](https://developer.uspto.gov/api-catalog)
- [USPTO Open Data Portal](https://data.uspto.gov/)
- [PatentSearch API reference](https://search.patentsview.org/docs/docs/Search%20API/SearchAPIReference/)
- [PatentSearch API updates](https://search.patentsview.org/docs/)
- [TSDR API bulk download FAQ](https://developer.uspto.gov/faq/tsdr-api-bulk-download)
