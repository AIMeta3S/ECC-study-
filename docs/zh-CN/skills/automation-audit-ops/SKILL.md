---
name: automation-audit-ops
description: 面向 ECC 的证据优先的自动化清单与重叠审计工作流。当用户在修复任何内容之前，想了解哪些 jobs、hooks、connectors、MCP servers 或 wrappers 处于活跃、损坏、冗余或缺失状态时使用。
metadata:
  origin: ECC
---

# Automation Audit Ops

当用户询问哪些自动化已上线、哪些 jobs 已损坏、哪里存在重叠，或哪些工具和 connectors 当前真正在发挥有用作用时，使用此 skill。

这是一个审计优先的运维 skill。其任务是在重写任何内容之前，先产出一份有证据支撑的清单以及一套 keep / merge / cut / fix-next 的建议集。

## Skill Stack

在相关时，将以下 ECC 原生 skills 引入工作流：

- `workspace-surface-audit` 用于 connector、MCP、hook 和 app 清单
- `knowledge-ops` 当审计需要将 repo 的实时真相与持久 context 进行核对时
- `github-ops` 当答案依赖于 CI、定时工作流、issues 或 PR 自动化时
- `ecc_tools-cost-audit` 当真正的问题是兄弟 app repo 中的 webhook 扇出、排队 jobs 或账单消耗时
- `research-ops` 当需要将本地清单与当前平台支持或公开文档进行对比时
- `verification-loop` 用于证明修复后的状态，而非依赖假设的恢复

## 何时使用

- 用户询问"我有哪些自动化"、"什么是活跃的"、"什么是损坏的"或"什么有重叠"
- 任务涉及 cron jobs、GitHub Actions、本地 hooks、MCP servers、connectors、wrappers 或 app 集成
- 用户想了解哪些内容是从其他 agent 系统移植过来的，哪些仍需在 ECC 内部重建
- workspace 已积累多种完成同一件事的方式，用户希望有一个规范通道

## 护栏

- 除非用户明确要求修复，否则以只读方式开始
- 区分：
  - configured
  - authenticated
  - recently verified
  - stale or broken
  - missing entirely
- 不要仅仅因为某个 skill 或 config 引用了某工具，就声称该工具是活跃的
- 在证据表存在之前，不要合并或删除重叠的 surfaces

## 工作流

### 1. 清点真实的 surface

在理论分析之前，先读取当前实际存在的 surface：

- repo hooks 和本地 hook 脚本
- GitHub Actions 和定时工作流
- MCP configs 和已启用的 servers
- connector 或 app 支撑的集成
- wrapper 脚本和 repo 特定的自动化 entrypoints

按 surface 对它们分组：

- 本地 runtime
- repo CI / 自动化
- 已连接的外部系统
- 消息 / 通知
- 计费 / 客户运营
- 研究 / 监控

### 2. 按活跃状态对每项分类

对每一个已盘点的自动化项，标记：

- configured
- authenticated
- recently verified
- stale or broken
- missing

然后分类问题类型：

- active breakage
- auth outage
- stale status
- overlap or redundancy
- missing capability

### 3. 追踪证据路径

用具体的来源支撑每一个重要声明：

- 文件路径
- 工作流运行记录
- hook 日志
- config 条目
- 近期命令输出
- 精确的失败特征

如果当前状态不明确，直接说明，而不是假装审计已完成。

### 4. 以 keep / merge / cut / fix-next 结束

对每一个重叠或可疑的 surface，返回一个判定：

- keep
- merge
- cut
- fix next

其价值在于将杂乱的自动化收敛为一条规范的 ECC 通道，而非保留每一条历史路径。

## 输出格式

```text
CURRENT SURFACE
- automation
- source
- live state
- proof

FINDINGS
- active breakage
- overlap
- stale status
- missing capability

RECOMMENDATION
- keep
- merge
- cut
- fix next

NEXT ECC MOVE
- exact skill / hook / workflow / app lane to strengthen
```

## 陷阱

- 当可以读取实际清单时，不要凭记忆作答
- 不要将"存在于 config 中"等同于"正常工作"
- 在识别出已损坏的高信号路径之前，不要先去修复低价值的冗余
- 如果用户首先要求的是清单，不要将任务扩大为 repo 重写

## 验证

- 重要声明引用实际的证据路径
- 每个已盘点的自动化项都标注了清晰的活跃状态类别
- 最终建议区分 keep / merge / cut / fix-next
