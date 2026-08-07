---
name: cost-tracking
description: 从本地 ECC cost-tracker 指标日志中追踪并报告 Claude Code 的 token 用量、支出与预算。当用户询问费用、支出、用量、token、预算，或要求按 model、session 或日期查看费用明细时使用。
metadata:
  origin: community
---

# Cost Tracking

使用本 skill 可分析 Claude Code 的费用与用量历史，数据来源于 ECC 的 `stop:cost-tracker` hook 写入的指标日志。

## 数据存放位置

tracker 会在每次 session 停止时向 `~/.claude/metrics/costs.jsonl` 追加一个 JSON 对象。每一行都是**该 session 的累计快照**，因此要统计总支出，需取**每个 `session_id` 的最新一行**再跨 session 求和——若对每一行都求和会导致重复计数。

行结构：

| 字段 | 含义 |
| --- | --- |
| `timestamp` | 快照的 ISO 时间戳 |
| `session_id` | Claude Code session 标识符 |
| `transcript_path` | 该 session transcript 的路径 |
| `model` | 所使用的 model |
| `input_tokens` / `output_tokens` | token 计数 |
| `cache_write_tokens` / `cache_read_tokens` | prompt-cache token 计数 |
| `estimated_cost_usd` | 预计算好的该 session 累计费用（USD） |

优先使用 `estimated_cost_usd`，而非手动按定价计算——model 与 cache 的价格会变化，tracker 才是事实来源。

## 适用场景

- 用户询问"我花了多少钱？"、"这次 session 花了多少？"或"我的 token 用量是多少？"
- 用户提到预算、支出限额、超支或费用控制。
- 用户希望按 model、session 或日期查看费用明细，或导出 CSV。

## 工作原理

首先确认日志是否存在（使用 `node`，而不是 `sqlite3`——tracker 写入的是 JSONL，且 `node` 跨平台）：

```bash
node -e 'const fs=require("fs"),os=require("os"),p=require("path");const f=p.join(os.homedir(),".claude","metrics","costs.jsonl");console.log(fs.existsSync(f)?"cost log found":"cost log not found: "+f)'
```

如果日志缺失，不要编造用量数据。告知用户：费用追踪会在启用 `stop:cost-tracker` hook 的首个 session 结束后才开始产生数据。

## 示例 —— 汇总，按 model，最近 7 天

```bash
node -e '
const fs=require("fs"),os=require("os"),path=require("path");
const f=path.join(os.homedir(),".claude","metrics","costs.jsonl");
if(!fs.existsSync(f)){console.log("cost log not found: "+f);process.exit(0);}
const rows=fs.readFileSync(f,"utf8").split(/\r?\n/).filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean);
const bySession=new Map();
for(const r of rows){const k=r.session_id||r.transcript_path||r.timestamp;const p=bySession.get(k);if(!p||String(r.timestamp)>String(p.timestamp))bySession.set(k,r);}
const latest=[...bySession.values()];
const cost=r=>Number(r.estimated_cost_usd)||0, day=r=>String(r.timestamp||"").slice(0,10), sum=a=>a.reduce((s,r)=>s+cost(r),0), f4=n=>"$"+n.toFixed(4);
const today=new Date().toISOString().slice(0,10), yest=new Date(Date.now()-864e5).toISOString().slice(0,10);
console.log("today: "+f4(sum(latest.filter(r=>day(r)===today)))+" | yesterday: "+f4(sum(latest.filter(r=>day(r)===yest)))+" | total: "+f4(sum(latest))+" ("+latest.length+" sessions)");
const m=new Map();for(const r of latest){const k=r.model||"(unknown)";m.set(k,(m.get(k)||0)+cost(r));}
console.log("by model:");[...m.entries()].sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("  "+f4(v)+"  "+k));
'
```

若要下钻某个 session 或导出 CSV，对同一份 `latest` 集合（CSV 用原始行）迭代并打印所需字段即可。

## 报告指引

展示费用数据时，包含今日与昨日的支出对比、所有 session 的总额、按 model 的明细以及 session 数量。不足 1 美元的金额保留四位小数，1 美元以上的金额保留两位小数。

## 反模式

- 不要对每一行求和——它们是每个 session 的累计值；需先归约为每个 `session_id` 的最新一行。
- 当存在 `estimated_cost_usd` 时，不要从原始 token 计数估算费用。
- 不要在未检查的情况下假定日志存在。
- 不要在面向用户的回答中硬编码当前的 model 定价。
- 不要推荐安装未评审、且会执行任意代码的 hook 或 plugin。

## 相关资源

- `/cost-report` —— 以 command 形式对同一指标日志生成报告。
- `cost-aware-llm-pipeline` —— model 路由与预算设计模式。
- `token-budget-advisor` —— context 与 token 预算规划。
- `strategic-compact` —— context 压缩，以减少重复的 token 支出。
