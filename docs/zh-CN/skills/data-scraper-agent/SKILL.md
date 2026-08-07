---
name: data-scraper-agent
description: 为任何公开数据源构建全自动 AI 数据采集 agent —— 招聘网站、价格、新闻、GitHub、体育，无所不包。按计划调度抓取，用免费 LLM（Gemini Flash）富集数据，将结果存储到 Notion/Sheets/Supabase，并根据用户 feedback 持续学习。在 GitHub Actions 上 100% 免费运行。当用户想要自动监控、采集或跟踪任何公开数据时使用。
metadata:
  origin: community
---

# Data Scraper Agent

为任何公开数据源构建生产就绪的 AI 数据采集 agent。
按计划调度运行，用免费 LLM 富集结果，存储到数据库，并随时间持续改进。

**技术栈：Python · Gemini Flash（免费）· GitHub Actions（免费）· Notion / Sheets / Supabase**

## When to Activate

- 用户想要抓取或监控任何公开网站或 API
- 用户说"做一个检查……的机器人"、"帮我监控 X"、"从……采集数据"
- 用户想要跟踪招聘岗位、价格、新闻、代码仓库、体育比分、活动、列表信息
- 用户询问如何在不支付托管费用的情况下自动化数据采集
- 用户想要一个能根据自己的决策随时间变得越来越聪明的 agent

## Core Concepts

### The Three Layers

每个数据采集 agent 都有三层：

```
COLLECT → ENRICH → STORE
  │           │        │
Scraper    AI (LLM)  Database
runs on    scores/   Notion /
schedule   summarises Sheets /
           & classifies Supabase
```

### Free Stack

| 层 | 工具 | 原因 |
|---|---|---|
| **抓取** | `requests` + `BeautifulSoup` | 零成本，覆盖 80% 的公开网站 |
| **JS 渲染站点** | `playwright`（免费）| 当 HTML 抓取失败时 |
| **AI 富集** | 通过 REST API 调用 Gemini Flash | 每天 500 次请求、100 万 token——免费 |
| **存储** | Notion API | 免费层，出色的审核 UI |
| **调度** | GitHub Actions cron | 对公开仓库免费 |
| **学习** | 仓库中的 JSON feedback 文件 | 零基础设施，在 git 中持久化 |

### AI Model Fallback Chain

构建 agent 时要在配额耗尽时跨 Gemini 模型自动 fallback：

```
gemini-2.0-flash-lite (30 RPM) →
gemini-2.0-flash (15 RPM) →
gemini-2.5-flash (10 RPM) →
gemini-flash-lite-latest (fallback)
```

### Batch API Calls for Efficiency

绝不要逐条调用 LLM，始终批量处理：

```python
# 差：33 个条目发 33 次 API 调用
for item in items:
    result = call_ai(item)  # 33 次调用 → 触发速率限制

# 好：33 个条目发 7 次 API 调用（批量大小 5）
for batch in chunks(items, size=5):
    results = call_ai(batch)  # 7 次调用 → 保持在免费额度内
```

---

## Workflow

### Step 1: Understand the Goal

询问用户：

1. **采集什么：**"数据源是什么？URL / API / RSS / 公开端点？"
2. **提取什么：**"哪些字段重要？标题、价格、URL、日期、评分？"
3. **如何存储：**"结果存到哪里？Notion、Google Sheets、Supabase，还是本地文件？"
4. **如何富集：**"你是否希望 AI 对每个条目打分、摘要、分类或匹配？"
5. **频率：**"多久运行一次？每小时、每天、每周？"

可主动提示的常见示例：
- 招聘网站 → 按简历相关度打分
- 商品价格 → 降价时告警
- GitHub 仓库 → 摘要新版本发布
- 新闻 feed → 按主题和情感分类
- 体育赛果 → 提取数据到跟踪表
- 活动日历 → 按兴趣筛选

---

### Step 2: Design the Agent Architecture

为用户生成如下目录结构：

```
my-agent/
├── config.yaml              # 用户在此自定义（关键词、过滤器、偏好）
├── profile/
│   └── context.md           # AI 使用的用户上下文（简历、兴趣、标准）
├── scraper/
│   ├── __init__.py
│   ├── main.py              # orchestrator：抓取 → 富集 → 存储
│   ├── filters.py           # 基于规则的预过滤（快速，在 AI 之前）
│   └── sources/
│       ├── __init__.py
│       └── source_name.py   # 每个数据源一个文件
├── ai/
│   ├── __init__.py
│   ├── client.py            # 带模型 fallback 的 Gemini REST 客户端
│   ├── pipeline.py          # 批量 AI 分析
│   ├── jd_fetcher.py        # 从 URL 抓取完整内容（可选）
│   └── memory.py            # 从用户 feedback 中学习
├── storage/
│   ├── __init__.py
│   └── notion_sync.py       # 或 sheets_sync.py / supabase_sync.py
├── data/
│   └── feedback.json        # 用户决策历史（自动更新）
├── .env.example
├── setup.py                 # 一次性创建数据库/schema
├── enrich_existing.py       # 对旧行 backfill AI 评分
├── requirements.txt
└── .github/
    └── workflows/
        └── scraper.yml      # GitHub Actions 调度
```

---

### Step 3: Build the Scraper Source

适用于任何数据源的模板：

```python
# scraper/sources/my_source.py
"""
[Source Name] —— 从 [where] 抓取 [what]。
方式：[REST API / HTML 抓取 / RSS feed]
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from scraper.filters import is_relevant

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; research-bot/1.0)",
}


def fetch() -> list[dict]:
    """
    返回具有统一 schema 的条目列表。
    每个条目至少必须包含：name、url、date_found。
    """
    results = []

    # ---- REST API 源 ----
    resp = requests.get("https://api.example.com/items", headers=HEADERS, timeout=15)
    if resp.status_code == 200:
        for item in resp.json().get("results", []):
            if not is_relevant(item.get("title", "")):
                continue
            results.append(_normalise(item))

    return results


def _normalise(raw: dict) -> dict:
    """将原始 API/HTML 数据转换为标准 schema。"""
    return {
        "name": raw.get("title", ""),
        "url": raw.get("link", ""),
        "source": "MySource",
        "date_found": datetime.now(timezone.utc).date().isoformat(),
        # 在此添加领域专属字段
    }
```

**HTML 抓取模式：**
```python
soup = BeautifulSoup(resp.text, "lxml")
for card in soup.select("[class*='listing']"):
    title = card.select_one("h2, h3").get_text(strip=True)
    link = card.select_one("a")["href"]
    if not link.startswith("http"):
        link = f"https://example.com{link}"
```

**RSS feed 模式：**
```python
import xml.etree.ElementTree as ET
root = ET.fromstring(resp.text)
for item in root.findall(".//item"):
    title = item.findtext("title", "")
    link = item.findtext("link", "")
```

---

### Step 4: Build the Gemini AI Client

```python
# ai/client.py
import os, json, time, requests

_last_call = 0.0

MODEL_FALLBACK = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-flash-lite-latest",
]


def generate(prompt: str, model: str = "", rate_limit: float = 7.0) -> dict:
    """调用 Gemini，遇到 429 时自动 fallback。返回解析后的 JSON 或 {}。"""
    global _last_call

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return {}

    elapsed = time.time() - _last_call
    if elapsed < rate_limit:
        time.sleep(rate_limit - elapsed)

    models = [model] + [m for m in MODEL_FALLBACK if m != model] if model else MODEL_FALLBACK
    _last_call = time.time()

    for m in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.3,
                "maxOutputTokens": 2048,
            },
        }
        try:
            resp = requests.post(url, json=payload, timeout=30)
            if resp.status_code == 200:
                return _parse(resp)
            if resp.status_code in (429, 404):
                time.sleep(1)
                continue
            return {}
        except requests.RequestException:
            return {}

    return {}


def _parse(resp) -> dict:
    try:
        text = (
            resp.json()
            .get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
            .strip()
        )
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0]
        return json.loads(text)
    except (json.JSONDecodeError, KeyError):
        return {}
```

---

### Step 5: Build the AI Pipeline (Batch)

```python
# ai/pipeline.py
import json
import yaml
from pathlib import Path
from ai.client import generate

def analyse_batch(items: list[dict], context: str = "", preference_prompt: str = "") -> list[dict]:
    """批量分析条目，返回带 AI 字段的富集条目。"""
    config = yaml.safe_load((Path(__file__).parent.parent / "config.yaml").read_text())
    model = config.get("ai", {}).get("model", "gemini-2.5-flash")
    rate_limit = config.get("ai", {}).get("rate_limit_seconds", 7.0)
    min_score = config.get("ai", {}).get("min_score", 0)
    batch_size = config.get("ai", {}).get("batch_size", 5)

    batches = [items[i:i + batch_size] for i in range(0, len(items), batch_size)]
    print(f"  [AI] {len(items)} items → {len(batches)} API calls")

    enriched = []
    for i, batch in enumerate(batches):
        print(f"  [AI] Batch {i + 1}/{len(batches)}...")
        prompt = _build_prompt(batch, context, preference_prompt, config)
        result = generate(prompt, model=model, rate_limit=rate_limit)

        analyses = result.get("analyses", [])
        for j, item in enumerate(batch):
            ai = analyses[j] if j < len(analyses) else {}
            if ai:
                score = max(0, min(100, int(ai.get("score", 0))))
                if min_score and score < min_score:
                    continue
                enriched.append({**item, "ai_score": score, "ai_summary": ai.get("summary", ""), "ai_notes": ai.get("notes", "")})
            else:
                enriched.append(item)

    return enriched


def _build_prompt(batch, context, preference_prompt, config):
    priorities = config.get("priorities", [])
    items_text = "\n\n".join(
        f"Item {i+1}: {json.dumps({k: v for k, v in item.items() if not k.startswith('_')})}"
        for i, item in enumerate(batch)
    )

    return f"""Analyse these {len(batch)} items and return a JSON object.

# Items
{items_text}

# User Context
{context[:800] if context else "Not provided"}

# User Priorities
{chr(10).join(f"- {p}" for p in priorities)}

{preference_prompt}

# Instructions
Return: {{"analyses": [{{"score": <0-100>, "summary": "<2 sentences>", "notes": "<why this matches or doesn't>"}} for each item in order]}}
Be concise. Score 90+=excellent match, 70-89=good, 50-69=ok, <50=weak."""
```

---

### Step 6: Build the Feedback Learning System

```python
# ai/memory.py
"""从用户决策中学习以改进未来评分。"""
import json
from pathlib import Path

FEEDBACK_PATH = Path(__file__).parent.parent / "data" / "feedback.json"


def load_feedback() -> dict:
    if FEEDBACK_PATH.exists():
        try:
            return json.loads(FEEDBACK_PATH.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {"positive": [], "negative": []}


def save_feedback(fb: dict):
    FEEDBACK_PATH.parent.mkdir(parents=True, exist_ok=True)
    FEEDBACK_PATH.write_text(json.dumps(fb, indent=2))


def build_preference_prompt(feedback: dict, max_examples: int = 15) -> str:
    """将 feedback 历史转换为一段 prompt 偏置段落。"""
    lines = []
    if feedback.get("positive"):
        lines.append("# Items the user LIKED (positive signal):")
        for e in feedback["positive"][-max_examples:]:
            lines.append(f"- {e}")
    if feedback.get("negative"):
        lines.append("\n# Items the user SKIPPED/REJECTED (negative signal):")
        for e in feedback["negative"][-max_examples:]:
            lines.append(f"- {e}")
    if lines:
        lines.append("\nUse these patterns to bias scoring on new items.")
    return "\n".join(lines)
```

**与你的存储层集成：**每次运行后，查询数据库中具有 positive/negative 状态的条目，并调用 `save_feedback()` 传入提取出的模式。

---

### Step 7: Build Storage (Notion example)

```python
# storage/notion_sync.py
import os
from notion_client import Client
from notion_client.errors import APIResponseError

_client = None

def get_client():
    global _client
    if _client is None:
        _client = Client(auth=os.environ["NOTION_TOKEN"])
    return _client

def get_existing_urls(db_id: str) -> set[str]:
    """获取所有已存储的 URL —— 用于去重。"""
    client, seen, cursor = get_client(), set(), None
    while True:
        resp = client.databases.query(database_id=db_id, page_size=100, **{"start_cursor": cursor} if cursor else {})
        for page in resp["results"]:
            url = page["properties"].get("URL", {}).get("url", "")
            if url: seen.add(url)
        if not resp["has_more"]: break
        cursor = resp["next_cursor"]
    return seen

def push_item(db_id: str, item: dict) -> bool:
    """推送一个条目到 Notion。成功返回 True。"""
    props = {
        "Name": {"title": [{"text": {"content": item.get("name", "")[:100]}}]},
        "URL": {"url": item.get("url")},
        "Source": {"select": {"name": item.get("source", "Unknown")}},
        "Date Found": {"date": {"start": item.get("date_found")}},
        "Status": {"select": {"name": "New"}},
    }
    # AI 字段
    if item.get("ai_score") is not None:
        props["AI Score"] = {"number": item["ai_score"]}
    if item.get("ai_summary"):
        props["Summary"] = {"rich_text": [{"text": {"content": item["ai_summary"][:2000]}}]}
    if item.get("ai_notes"):
        props["Notes"] = {"rich_text": [{"text": {"content": item["ai_notes"][:2000]}}]}

    try:
        get_client().pages.create(parent={"database_id": db_id}, properties=props)
        return True
    except APIResponseError as e:
        print(f"[notion] Push failed: {e}")
        return False

def sync(db_id: str, items: list[dict]) -> tuple[int, int]:
    existing = get_existing_urls(db_id)
    added = skipped = 0
    for item in items:
        if item.get("url") in existing:
            skipped += 1; continue
        if push_item(db_id, item):
            added += 1; existing.add(item["url"])
        else:
            skipped += 1
    return added, skipped
```

---

### Step 8: Orchestrate in main.py

```python
# scraper/main.py
import os, sys, yaml
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from scraper.sources import my_source          # 添加你的数据源

# 注意：本示例使用 Notion。如果 storage.provider 是 "sheets" 或 "supabase"，
# 请将此 import 替换为 storage.sheets_sync 或 storage.supabase_sync，并相应更新
# 环境变量和 sync() 调用。
from storage.notion_sync import sync

SOURCES = [
    ("My Source", my_source.fetch),
]

def ai_enabled():
    return bool(os.environ.get("GEMINI_API_KEY"))

def main():
    config = yaml.safe_load((Path(__file__).parent.parent / "config.yaml").read_text())
    provider = config.get("storage", {}).get("provider", "notion")

    # 根据 provider 从环境变量解析存储目标标识
    if provider == "notion":
        db_id = os.environ.get("NOTION_DATABASE_ID")
        if not db_id:
            print("ERROR: NOTION_DATABASE_ID not set"); sys.exit(1)
    else:
        # 在此处为 sheets（SHEET_ID）或 supabase（SUPABASE_TABLE）等扩展
        print(f"ERROR: provider '{provider}' not yet wired in main.py"); sys.exit(1)

    config = yaml.safe_load((Path(__file__).parent.parent / "config.yaml").read_text())
    all_items = []

    for name, fetch_fn in SOURCES:
        try:
            items = fetch_fn()
            print(f"[{name}] {len(items)} items")
            all_items.extend(items)
        except Exception as e:
            print(f"[{name}] FAILED: {e}")

    # 按 URL 去重
    seen, deduped = set(), []
    for item in all_items:
        if (url := item.get("url", "")) and url not in seen:
            seen.add(url); deduped.append(item)

    print(f"Unique items: {len(deduped)}")

    if ai_enabled() and deduped:
        from ai.memory import load_feedback, build_preference_prompt
        from ai.pipeline import analyse_batch

        # load_feedback() 读取由你的 feedback 同步脚本写入的 data/feedback.json。
        # 为保持最新，请实现一个独立的 feedback_sync.py，查询你的
        # 存储提供商中具有 positive/negative 状态的条目并调用 save_feedback()。
        feedback = load_feedback()
        preference = build_preference_prompt(feedback)
        context_path = Path(__file__).parent.parent / "profile" / "context.md"
        context = context_path.read_text() if context_path.exists() else ""
        deduped = analyse_batch(deduped, context=context, preference_prompt=preference)
    else:
        print("[AI] Skipped — GEMINI_API_KEY not set")

    added, skipped = sync(db_id, deduped)
    print(f"Done — {added} new, {skipped} existing")

if __name__ == "__main__":
    main()
```

---

### Step 9: GitHub Actions Workflow

```yaml
# .github/workflows/scraper.yml
name: Data Scraper Agent

on:
  schedule:
    - cron: "0 */3 * * *"  # 每 3 小时 —— 根据你的需要调整
  workflow_dispatch:        # 允许手动触发

permissions:
  contents: write   # feedback 历史 commit 步骤所需

jobs:
  scrape:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"

      - run: pip install -r requirements.txt

      # 如果在 requirements.txt 中启用了 Playwright，请取消注释
      # - name: Install Playwright browsers
      #   run: python -m playwright install chromium --with-deps

      - name: Run agent
        env:
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
          NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: python -m scraper.main

      - name: Commit feedback history
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/feedback.json || true
          git diff --cached --quiet || git commit -m "chore: update feedback history"
          git push
```

---

### Step 10: config.yaml Template

```yaml
# 自定义此文件 —— 无需改动代码

# 采集什么（在 AI 之前预过滤）
filters:
  required_keywords: []      # 条目必须至少包含一个
  blocked_keywords: []       # 条目不得包含任何一个

# 你的优先级 —— AI 用这些来打分
priorities:
  - "example priority 1"
  - "example priority 2"

# 存储
storage:
  provider: "notion"         # notion | sheets | supabase | sqlite

# Feedback 学习
feedback:
  positive_statuses: ["Saved", "Applied", "Interested"]
  negative_statuses: ["Skip", "Rejected", "Not relevant"]

# AI 设置
ai:
  enabled: true
  model: "gemini-2.5-flash"
  min_score: 0               # 过滤掉低于此评分的条目
  rate_limit_seconds: 7      # API 调用之间的秒数
  batch_size: 5              # 每次 API 调用的条目数
```

---

## Common Scraping Patterns

### Pattern 1: REST API（最简单）
```python
resp = requests.get(url, params={"q": query}, headers=HEADERS, timeout=15)
items = resp.json().get("results", [])
```

### Pattern 2: HTML 抓取
```python
soup = BeautifulSoup(resp.text, "lxml")
for card in soup.select(".listing-card"):
    title = card.select_one("h2").get_text(strip=True)
    href = card.select_one("a")["href"]
```

### Pattern 3: RSS Feed
```python
import xml.etree.ElementTree as ET
root = ET.fromstring(resp.text)
for item in root.findall(".//item"):
    title = item.findtext("title", "")
    link = item.findtext("link", "")
    pub_date = item.findtext("pubDate", "")
```

### Pattern 4: 分页 API
```python
page = 1
while True:
    resp = requests.get(url, params={"page": page, "limit": 50}, timeout=15)
    data = resp.json()
    items = data.get("results", [])
    if not items:
        break
    for item in items:
        results.append(_normalise(item))
    if not data.get("has_more"):
        break
    page += 1
```

### Pattern 5: JS 渲染页面（Playwright）
```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto(url)
    page.wait_for_selector(".listing")
    html = page.content()
    browser.close()

soup = BeautifulSoup(html, "lxml")
```

---

## Anti-Patterns to Avoid

| 反模式 | 问题 | 修复 |
|---|---|---|
| 每个条目一次 LLM 调用 | 立即触发速率限制 | 每次调用批量 5 个条目 |
| 代码中硬编码关键词 | 不可复用 | 将所有配置移到 `config.yaml` |
| 抓取时不设速率限制 | IP 被封 | 在请求之间加 `time.sleep(1)` |
| 在代码中存储 secrets | 安全风险 | 始终使用 `.env` + GitHub Secrets |
| 不做去重 | 重复行堆积 | 推送前始终检查 URL |
| 忽略 `robots.txt` | 法律/道德风险 | 遵守抓取规则；尽可能使用公开 API |
| 用 `requests` 抓 JS 渲染站点 | 空响应 | 使用 Playwright 或寻找底层 API |
| `maxOutputTokens` 过低 | JSON 截断、解析错误 | 批量响应使用 2048+ |

---

## Free Tier Limits Reference

| 服务 | 免费额度 | 典型用量 |
|---|---|---|
| Gemini Flash Lite | 30 RPM，1500 RPD | 每 3 小时间隔约 56 次/天 |
| Gemini 2.0 Flash | 15 RPM，1500 RPD | 良好的 fallback |
| Gemini 2.5 Flash | 10 RPM，500 RPD | 谨慎使用 |
| GitHub Actions | 无限制（公开仓库）| 约 20 分钟/天 |
| Notion API | 无限制 | 约 200 次写入/天 |
| Supabase | 500MB 数据库，2GB 流量 | 适用于大多数 agent |
| Google Sheets API | 300 次/分钟 | 适用于小型 agent |

---

## Requirements 模板

```
requests==2.31.0
beautifulsoup4==4.12.3
lxml==5.1.0
python-dotenv==1.0.1
pyyaml==6.0.2
notion-client==2.2.1   # 如果使用 Notion
# playwright==1.40.0   # 为 JS 渲染站点取消注释
```

---

## Quality Checklist

在标记 agent 完成之前：

- [ ] `config.yaml` 控制所有面向用户的设置 —— 没有硬编码值
- [ ] `profile/context.md` 存放用户专属上下文供 AI 匹配
- [ ] 每次推送存储前按 URL 去重
- [ ] Gemini 客户端有模型 fallback 链（4 个模型）
- [ ] 批量大小 ≤ 每次 API 调用 5 个条目
- [ ] `maxOutputTokens` ≥ 2048
- [ ] `.env` 在 `.gitignore` 中
- [ ] 提供 `.env.example` 用于上手
- [ ] `setup.py` 在首次运行时创建数据库 schema
- [ ] `enrich_existing.py` 对旧行 backfill AI 评分
- [ ] GitHub Actions 工作流在每次运行后 commit `feedback.json`
- [ ] README 涵盖：5 分钟内完成 setup、必需的 secrets、自定义

---

## Real-World Examples

```
"给我做一个监控 Hacker News 上 AI 创业融资新闻的 agent"
"从 3 个电商网站抓取商品价格，降价时告警"
"跟踪带 'llm' 或 'agents' 标签的新 GitHub 仓库 —— 为每个写摘要"
"从 LinkedIn 和 Cutshort 采集 Chief of Staff 岗位列表并存入 Notion"
"监控某个 subreddit 中提及我公司的帖子 —— 做情感分类"
"每天从 arXiv 抓取我关心主题的新学术论文"
"跟踪体育赛程结果并在 Google Sheets 中维护一张动态表"
"做一个房产列表监视器 —— 有低于 ₹1 Cr 的新房产时告警"
```

---

## Reference Implementation

用这一确切架构构建的完整可运行 agent 能抓取 4 个以上数据源、批量调用 Gemini、从存储在 Notion 中的 Applied/Rejected 决策中学习，并在 GitHub Actions 上 100% 免费运行。按上面步骤 1–9 构建你自己的 agent。
