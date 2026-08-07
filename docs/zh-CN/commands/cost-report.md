---
description: 基于 ECC cost-tracker 的 metrics log 生成本地 Claude Code 成本报告。
argument-hint: [csv]
---

# 成本报告

从 ECC 的 `stop:cost-tracker` hook 写入的 metrics log 中，按日期、model、session 汇总本地 Claude Code 的花费。

## 数据所在位置

tracker 会在每次 session 结束时向 `~/.claude/metrics/costs.jsonl` 追加一个 JSON object。每一行都是该 session 的**累计 snapshot**，因此报告会取**每个 `session_id` 的最新一行**并跨 session 求和（如果对每一行都求和会导致重复计数）。

行 schema：
`{ timestamp, session_id, transcript_path, model, input_tokens, output_tokens, cache_write_tokens, cache_read_tokens, estimated_cost_usd }`

## 此命令的作用

1. 检查 `~/.claude/metrics/costs.jsonl` 是否存在。如果不存在，告知用户 tracker 尚未设置（在启用 `stop:cost-tracker` hook 且首个 session 结束后才会开始填充数据）。
2. 将行数据归约为每个 session 的最新 snapshot 并进行聚合。
3. 展示简洁报告；当参数为 `csv` 时，将最近的行导出为 CSV。

使用 `node` 而非 `sqlite3`/`jq`，以便在 macOS、Linux 和 Windows 上行为完全一致。

## 报告

```bash
node -e '
const fs=require("fs"),os=require("os"),path=require("path");
const f=path.join(os.homedir(),".claude","metrics","costs.jsonl");
if(!fs.existsSync(f)){console.log("Cost tracker not set up: "+f+" not found. Enable the stop:cost-tracker hook and finish a session first.");process.exit(0);}
const rows=fs.readFileSync(f,"utf8").split(/\r?\n/).filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean);
const bySession=new Map();
for(const r of rows){const k=r.session_id||r.transcript_path||r.timestamp;const p=bySession.get(k);if(!p||String(r.timestamp)>String(p.timestamp))bySession.set(k,r);}
const latest=[...bySession.values()];
const cost=r=>Number(r.estimated_cost_usd)||0;
const day=r=>String(r.timestamp||"").slice(0,10);
const today=new Date().toISOString().slice(0,10);
const d=new Date(Date.now()-864e5).toISOString().slice(0,10);
const sum=a=>a.reduce((s,r)=>s+cost(r),0);
const f4=n=>"$"+n.toFixed(4);
console.log("=== Cost summary ===");
console.log("today:     "+f4(sum(latest.filter(r=>day(r)===today))));
console.log("yesterday: "+f4(sum(latest.filter(r=>day(r)===d))));
console.log("total:     "+f4(sum(latest))+"  ("+latest.length+" sessions)");
const by=(key)=>{const m=new Map();for(const r of latest){const k=key(r)||"(unknown)";m.set(k,(m.get(k)||0)+cost(r));}return [...m.entries()].sort((a,b)=>b[1]-a[1]);};
console.log("\n=== By model ===");for(const [k,v] of by(r=>r.model))console.log(f4(v).padStart(12)+"  "+k);
console.log("\n=== Last 7 days ===");
const days=new Map();for(const r of latest){const k=day(r);days.set(k,(days.get(k)||0)+cost(r));}
[...days.entries()].sort((a,b)=>b[0]<a[0]?-1:1).slice(0,7).forEach(([k,v])=>console.log(k+"  "+f4(v)));
'
```

## CSV 导出（`/cost-report csv`）

```bash
node -e '
const fs=require("fs"),os=require("os"),path=require("path");
const f=path.join(os.homedir(),".claude","metrics","costs.jsonl");
if(!fs.existsSync(f)){console.error("no data");process.exit(0);}
const rows=fs.readFileSync(f,"utf8").split(/\r?\n/).filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean).slice(-100);
console.log("timestamp,session_id,model,input_tokens,output_tokens,cache_write_tokens,cache_read_tokens,estimated_cost_usd");
for(const r of rows)console.log([r.timestamp,r.session_id,r.model,r.input_tokens,r.output_tokens,r.cache_write_tokens,r.cache_read_tokens,r.estimated_cost_usd].join(","));
'
```

## 报告格式

1. 摘要：今日、昨日、总计、session 数量。
2. 按 model 分组：按总成本排名的 model 列表。
3. 最近七天：日期与成本。

依赖 tracker 写入的预计算 `estimated_cost_usd` 值；不要在此处基于原始 token 重新估算定价。
