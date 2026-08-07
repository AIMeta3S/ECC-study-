---
name: x-api
description: X/Twitter API 集成，用于发布推文、thread、读取 timeline、搜索和分析。涵盖 OAuth 认证模式、rate limit 以及平台原生内容发布。当用户希望以编程方式与 X 交互时使用。
metadata:
  origin: ECC
---

# X API

> **易漂移的 skill。** X API 的 endpoint、访问层级、配额和写入权限会频繁变化。在引用 rate limit 或实现发布/搜索流程之前，请先核实当前的开发者文档和账户权限。

以编程方式与 X（Twitter）交互，用于发布、读取、搜索和分析。

## 何时激活

- 用户希望以编程方式发布推文或 thread
- 从 X 读取 timeline、mentions 或用户数据
- 在 X 中搜索内容、趋势或对话
- 构建 X 集成或 bot
- 分析和互动追踪
- 用户提到 "post to X"、"tweet"、"X API" 或 "Twitter API"

## 认证

### OAuth 2.0 Bearer Token（App-Only）

最适合：读密集型操作、搜索、公共数据。

```bash
# 环境变量设置
export X_BEARER_TOKEN="your-bearer-token"
```

```python
import os
import requests

bearer = os.environ["X_BEARER_TOKEN"]
headers = {"Authorization": f"Bearer {bearer}"}

# 搜索最近的推文
resp = requests.get(
    "https://api.x.com/2/tweets/search/recent",
    headers=headers,
    params={"query": "claude code", "max_results": 10}
)
tweets = resp.json()
```

### OAuth 1.0a（User Context）

必需用于：发布推文、管理账户、DM 以及任何写入流程。

```bash
# 环境变量设置 — 使用前先 source
export X_CONSUMER_KEY="your-consumer-key"
export X_CONSUMER_SECRET="your-consumer-secret"
export X_ACCESS_TOKEN="your-access-token"
export X_ACCESS_TOKEN_SECRET="your-access-token-secret"
```

在较早的配置中可能存在 `X_API_KEY`、`X_API_SECRET` 和 `X_ACCESS_SECRET` 等旧别名。在编写文档或接入新流程时，优先使用 `X_CONSUMER_*` 和 `X_ACCESS_TOKEN_SECRET` 这些名称。

```python
import os
from requests_oauthlib import OAuth1Session

oauth = OAuth1Session(
    os.environ["X_CONSUMER_KEY"],
    client_secret=os.environ["X_CONSUMER_SECRET"],
    resource_owner_key=os.environ["X_ACCESS_TOKEN"],
    resource_owner_secret=os.environ["X_ACCESS_TOKEN_SECRET"],
)
```

## 核心操作

### 发布推文

```python
resp = oauth.post(
    "https://api.x.com/2/tweets",
    json={"text": "Hello from Claude Code"}
)
resp.raise_for_status()
tweet_id = resp.json()["data"]["id"]
```

### 发布 Thread

```python
def post_thread(oauth, tweets: list[str]) -> list[str]:
    ids = []
    reply_to = None
    for text in tweets:
        payload = {"text": text}
        if reply_to:
            payload["reply"] = {"in_reply_to_tweet_id": reply_to}
        resp = oauth.post("https://api.x.com/2/tweets", json=payload)
        tweet_id = resp.json()["data"]["id"]
        ids.append(tweet_id)
        reply_to = tweet_id
    return ids
```

### 读取用户 Timeline

```python
resp = requests.get(
    f"https://api.x.com/2/users/{user_id}/tweets",
    headers=headers,
    params={
        "max_results": 10,
        "tweet.fields": "created_at,public_metrics",
    }
)
```

### 搜索推文

```python
resp = requests.get(
    "https://api.x.com/2/tweets/search/recent",
    headers=headers,
    params={
        "query": "from:affaanmustafa -is:retweet",
        "max_results": 10,
        "tweet.fields": "public_metrics,created_at",
    }
)
```

### 拉取最近的原创帖子用于语气建模

```python
resp = requests.get(
    "https://api.x.com/2/tweets/search/recent",
    headers=headers,
    params={
        "query": "from:affaanmustafa -is:retweet -is:reply",
        "max_results": 25,
        "tweet.fields": "created_at,public_metrics",
    }
)
voice_samples = resp.json()
```

### 按用户名获取用户

```python
resp = requests.get(
    "https://api.x.com/2/users/by/username/affaanmustafa",
    headers=headers,
    params={"user.fields": "public_metrics,description,created_at"}
)
```

### 上传媒体并发布

```python
# 媒体上传使用 v1.1 endpoint

# 步骤 1：上传媒体
media_resp = oauth.post(
    "https://upload.twitter.com/1.1/media/upload.json",
    files={"media": open("image.png", "rb")}
)
media_id = media_resp.json()["media_id_string"]

# 步骤 2：带媒体发布
resp = oauth.post(
    "https://api.x.com/2/tweets",
    json={"text": "Check this out", "media": {"media_ids": [media_id]}}
)
```

## Rate Limit

X API 的 rate limit 因 endpoint、认证方式和账户层级而异，并且会随时间变化。务必：
- 在硬编码假设之前，先查阅当前 X 开发者文档
- 在运行时读取 `x-rate-limit-remaining` 和 `x-rate-limit-reset` header
- 自动退避，而不是依赖代码中的静态表

```python
import time

remaining = int(resp.headers.get("x-rate-limit-remaining", 0))
if remaining < 5:
    reset = int(resp.headers.get("x-rate-limit-reset", 0))
    wait = max(0, reset - int(time.time()))
    print(f"Rate limit approaching. Resets in {wait}s")
```

## 错误处理

```python
resp = oauth.post("https://api.x.com/2/tweets", json={"text": content})
if resp.status_code == 201:
    return resp.json()["data"]["id"]
elif resp.status_code == 429:
    reset = int(resp.headers["x-rate-limit-reset"])
    raise Exception(f"Rate limited. Resets at {reset}")
elif resp.status_code == 403:
    raise Exception(f"Forbidden: {resp.json().get('detail', 'check permissions')}")
else:
    raise Exception(f"X API error {resp.status_code}: {resp.text}")
```

## 安全

- **切勿硬编码 token。** 使用环境变量或 `.env` 文件。
- **切勿提交 `.env` 文件。** 将其加入 `.gitignore`。
- **若 token 泄露，立即轮换。** 在 developer.x.com 重新生成。
- **不需要写入权限时，使用只读 token。**
- **安全存储 OAuth 密钥** — 不要放在源代码或日志中。

## 与 Content Engine 集成

使用 `brand-voice` 加 `content-engine` 生成平台原生内容，然后通过 X API 发布：
1. 当需要语气匹配时，拉取最近的原创帖子
2. 构建或复用一个 `VOICE PROFILE`
3. 用 `content-engine` 以 X 原生格式生成内容
4. 校验长度和 thread 结构
5. 返回草稿以供审批，除非用户明确要求立即发布
6. 仅在获批后通过 X API 发布
7. 通过 public_metrics 追踪互动

## 相关 skill

- `brand-voice` — 从真实的 X 和站点/来源素材构建可复用的语气档案
- `content-engine` — 为 X 生成平台原生内容
- `crosspost` — 跨 X、LinkedIn 等平台分发内容
- `connections-optimizer` — 在起草基于网络的人脉拓展之前重组 X 关系图
