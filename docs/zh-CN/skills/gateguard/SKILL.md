---
name: gateguard
description: 强制事实的 gate：在允许操作前阻止 Edit/Write/Bash（包括 MultiEdit），并要求进行具体调查（导入方、data schema、用户指令）。相比未启用 gate 的 agent，可衡量地提升输出质量 +2.25 分。
metadata:
  origin: community
---

# GateGuard —— 强制事实的前置 Gate

一个 PreToolUse hook，强制 Claude 在编辑前进行调查。它不采用自我评估（"你确定吗？"），而是要求呈现具体事实。调查这一行为本身能建立自我评估永远无法建立的意识。

## 何时激活

- 在任何文件编辑会影响多个 module 的 codebase 上工作时
- 包含具有特定 schema 或日期格式的数据文件的项目
- AI 生成代码必须匹配既有 pattern 的团队
- 任何 Claude 倾向于猜测而非调查的 workflow

## 核心概念

LLM 自我评估不奏效。问"你是否违反了任何策略？"，答案永远是"没有"。这已通过实验验证。

但要求"列出所有 import 此 module 的文件"会强制 LLM 运行 Grep 和 Read。调查本身会创建改变输出的 context。

**三阶段 gate：**

```
1. DENY  — block the first Edit/Write/Bash attempt
2. FORCE — tell the model exactly which facts to gather
3. ALLOW — permit retry after facts are presented
```

没有竞品能三者兼备。大多数止步于 deny。

## 证据

两次独立的 A/B 测试，相同的 agent，相同的任务：

| 任务 | Gated | Ungated | 差距 |
| --- | --- | --- | --- |
| Analytics module | 8.0/10 | 6.5/10 | +1.5 |
| Webhook validator | 10.0/10 | 7.0/10 | +3.0 |
| **平均值** | **9.0** | **6.75** | **+2.25** |

两个 agent 都生成了能运行并通过测试的代码。差别在于设计深度。

## Gate 类型

### Edit / MultiEdit Gate（每个文件的首次编辑）

MultiEdit 的处理方式相同 —— batch 中的每个文件单独 gate。

```
Before editing {file_path}, present these facts:

1. List ALL files that import/require this file (search the tree — Glob/Grep, or find/grep via Bash)
2. List the public functions/classes affected by this change
3. If this file reads/writes data files, show field names, structure,
   and date format (use redacted or synthetic values, not raw production data)
4. Quote the user's current instruction verbatim
```

### Write Gate（首次创建新文件）

```
Before creating {file_path}, present these facts:

1. Name the file(s) and line(s) that will call this new file
2. Confirm no existing file serves the same purpose (search the tree — Glob/Grep, or find/grep via Bash)
3. If this file reads/writes data files, show field names, structure,
   and date format (use redacted or synthetic values, not raw production data)
4. Quote the user's current instruction verbatim
```

### 破坏性 Bash Gate（每条破坏性命令）

触发条件：`rm -rf`、`git reset --hard`、`git push --force`、`drop table` 等。

```
1. List all files/data this command will modify or delete
2. Write a one-line rollback procedure
3. Quote the user's current instruction verbatim
```

### 常规 Bash Gate（每个 session 一次）

```
1. The current user request in one sentence
2. What this specific command verifies or produces
```

## 快速开始

### 选项 A：使用 ECC hook（零安装）

此 plugin 包含位于 `scripts/hooks/gateguard-fact-force.js` 的 hook。通过 hooks.json 启用它。

如果 GateGuard 阻止了 setup 或修复工作，以 `ECC_GATEGUARD=off` 启动 session。对于 hook 级别的控制，继续使用 `ECC_DISABLED_HOOKS` 配合 GateGuard 的 hook ID。

在长 session 中，仅前 `GATEGUARD_FACT_FORCE_FULL_DENIALS` 次 fact-force 拒绝（默认 3 次）会输出完整的四项事实 block；后续拒绝会压缩为携带拒绝序号的单行，这样近乎相同的 block 就不会在 context window 中累积并放大模型的重复 loop（#2142）。在呈现事实后重试同一文件或命令永远不会再次触发 gate。

### 选项 B：带 config 的完整 package

```bash
pip install gateguard-ai
gateguard init
```

这会添加 `.gateguard.yml` 用于 per-project 配置（自定义消息、忽略路径、gate 切换）。

## 反模式

- **不要用自我评估替代。**"你确定吗？"总是得到"确定"。这已通过实验验证。
- **不要跳过 data schema 检查。** 两个 A/B 测试 agent 都假定日期为 ISO-8601，而真实数据使用的是 `%Y/%m/%d %H:%M`。检查数据结构（使用脱敏值）可以防止这一整类 bug。
- **不要对每条 Bash 命令都 gate。** 常规 bash 每个 session gate 一次。破坏性 bash 每次都 gate。这种平衡在避免拖慢速度的同时捕获真正的风险。

## 最佳实践

- 让 gate 自然触发。不要试图预先回答 gate 的问题 —— 调查本身才是提升质量的关键。
- 针对你的领域自定义 gate 消息。如果你的项目有特定 convention，将它们添加到 gate prompt 中。
- 使用 `.gateguard.yml` 忽略诸如 `.venv/`、`node_modules/`、`.git/` 等路径。

## 相关 skill

- `safety-guard` —— 运行时安全检查（互补，不重叠）
- `code-reviewer` —— 编辑后 review（GateGuard 是编辑前的调查）
