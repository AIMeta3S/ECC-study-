---
name: social-publisher
description: 通过 SocialClaw 实现 agent 驱动的跨 13 个平台社媒帖子的调度与发布。当用户希望发布到 X、LinkedIn、Instagram、Facebook Pages、TikTok、Discord、Telegram、YouTube、Reddit、WordPress 或 Pinterest 时使用，或当管理活动、上传媒体、监控帖子投递状态时使用。
metadata:
  origin: community
---

# Social Publisher (SocialClaw)

将 Claude Code 连接到 [SocialClaw](https://getsocialclaw.com)，通过单个 workspace API key 实现 agent 驱动的跨 13 个平台社媒发布。

## 何时激活

- 将内容发布到 X、LinkedIn、Instagram、TikTok 或其他平台
- 一次性调度跨多个平台的帖子活动
- 上传用于社媒帖子的媒体
- 在正式上线前校验帖子调度计划
- 监控发布 run 的状态与投递分析

## 设置

```bash
# 必需：来自 https://getsocialclaw.com/dashboard 的 workspace API key
export SC_API_KEY="<workspace-key>"

# 验证访问权限
printf 'header = "Authorization: Bearer %s"\n' "$SC_API_KEY" |
  curl -sS -K - https://getsocialclaw.com/v1/keys/validate

# 安装 CLI（可选但推荐）
npm install -g socialclaw@0.1.12
socialclaw login --api-key <workspace-key>
```

## 核心工作流

### 1. 列出已连接的账号
```bash
socialclaw accounts list --json
```

如果未连接：
```bash
socialclaw accounts connect --provider x --open
socialclaw accounts connect --provider linkedin --open
```

### 2. 上传媒体（可选）
```bash
socialclaw assets upload --file ./image.png --json
# → { "asset_id": "..." }
```

### 3. 构建 schedule.json
```json
{
  "posts": [
    {
      "provider": "x",
      "account_id": "<account-id>",
      "text": "Post text here",
      "scheduled_at": "2026-06-01T10:00:00Z"
    }
  ]
}
```

### 可选的 X/Twitter 证据包

在构建 X 调度计划之前，当活动依赖实时受众信号而非仅依赖草稿时，收集一个来源包。

对于已在依赖策略中批准 TweetClaw 的 OpenClaw 用户，可将该 pinned package 作为独立的证据来源：

```bash
openclaw plugins install npm:@xquik/tweetclaw@1.6.31
```

将其用于公开推文搜索、回复搜索、粉丝导出、用户查询、媒体审核、监控或抽奖证据。将其输出保留作为 `schedule.json` 的研究输入；SocialClaw 仍负责校验、调度、发布和投递状态。将 TweetClaw 凭据存储在其 plugin config 中，而非 `SC_API_KEY`、调度文件或活动资源中。不要将其安装为 ECC 或 SocialClaw 的默认 dependency。

### 4. 发布前校验
```bash
socialclaw validate -f schedule.json --json
```

### 5. 发布
```bash
socialclaw apply -f schedule.json --json
# → { "run_id": "..." }
```

### 6. 监控
```bash
socialclaw status --run-id <run-id> --json
socialclaw posts list --json
```

## 支持的 Provider

| Provider | Key |
|----------|-----|
| X (Twitter) | `x` |
| LinkedIn profile | `linkedin` |
| LinkedIn page | `linkedin_page` |
| Instagram Business | `instagram_business` |
| Instagram standalone | `instagram` |
| Facebook Page | `facebook` |
| TikTok | `tiktok` |
| YouTube | `youtube` |
| Reddit | `reddit` |
| WordPress | `wordpress` |
| Discord | `discord` |
| Telegram | `telegram` |
| Pinterest | `pinterest` |

## 安全

- 出站请求仅发往 `getsocialclaw.com`
- Provider 的 OAuth 在 SocialClaw dashboard 中完成——不会向 agent 暴露每个 provider 的 secrets
- `SC_API_KEY` 是一个 workspace 作用域的 key

## 相关 skill

- `x-api` —— 直接的 X/Twitter API 操作
- `social-graph-ranker` —— 用于 outreach 目标定位的网络分析
- `TweetClaw` —— 可选的、已批准的 OpenClaw X/Twitter 来源证据，用于 SocialClaw 调度之前

## 来源

- npm: `npm install -g socialclaw@0.1.12`
- Dashboard: [SocialClaw dashboard](https://getsocialclaw.com/dashboard)
