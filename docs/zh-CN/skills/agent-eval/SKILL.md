---
name: agent-eval
description: 在自定义任务上对编程 agent（Claude Code、Aider、Codex 等）做正面对比，提供通过率、成本、耗时和一致性指标
metadata:
  origin: ECC
tools: Read, Write, Edit, Bash, Grep, Glob
---

# Agent Eval Skill

一个轻量级 CLI 工具，用于在可复现任务上正面对比编程 agent。每个“哪个编程 agent 最好？”的比较都凭感觉——这个工具将其系统化。

## 何时激活

- 在你自己的 codebase 上对比编程 agent（Claude Code、Aider、Codex 等）
- 在采用新工具或 model 前衡量 agent 性能
- 当 agent 更新其 model 或工具链时运行回归检查
- 为团队产出有数据支撑的 agent 选择决策

## 安装

> **注意：** 在审查源代码后，从其仓库安装 agent-eval。

## 核心概念

### YAML 任务定义

以声明式方式定义任务。每个任务指定要做什么、涉及哪些文件，以及如何判定成功：

```yaml
name: add-retry-logic
description: Add exponential backoff retry to the HTTP client
repo: ./my-project
files:
  - src/http_client.py
prompt: |
  Add retry logic with exponential backoff to all HTTP requests.
  Max 3 retries. Initial delay 1s, max delay 30s.
judge:
  - type: pytest
    command: pytest tests/test_http_client.py -v
  - type: grep
    pattern: "exponential_backoff|retry"
    files: src/http_client.py
commit: "abc1234"  # 锁定到特定 commit 以保证可复现性
```

### Git Worktree 隔离

每次 agent 运行都会获得自己的 git worktree——无需 Docker。这提供了可复现性隔离，使 agent 之间不会相互干扰或破坏基础 repo。

### 收集的指标

| 指标 | 衡量内容 |
|--------|-----------------|
| 通过率 | agent 是否产出了通过 judge 的代码？ |
| 成本 | 每个任务的 API 花费（若可用） |
| 耗时 | 完成的实际耗时（秒） |
| 一致性 | 多次运行的通过率（例如 3/3 = 100%） |

## 工作流

### 1. 定义任务

创建一个 `tasks/` 目录，放入 YAML 文件，每个任务一个：

```bash
mkdir tasks
# 编写任务定义（见上面的模板）
```

### 2. 运行 Agent

针对你的任务执行 agent：

```bash
agent-eval run --task tasks/add-retry-logic.yaml --agent claude-code --agent aider --runs 3
```

每次运行：
1. 从指定的 commit 创建一个全新的 git worktree
2. 将 prompt 交给 agent
3. 运行 judge 标准
4. 记录通过/失败、成本和耗时

### 3. 对比结果

生成对比报告：

```bash
agent-eval report --format table
```

```
Task: add-retry-logic (3 runs each)
┌──────────────┬───────────┬────────┬────────┬─────────────┐
│ Agent        │ Pass Rate │ Cost   │ Time   │ Consistency │
├──────────────┼───────────┼────────┼────────┼─────────────┤
│ claude-code  │ 3/3       │ $0.12  │ 45s    │ 100%        │
│ aider        │ 2/3       │ $0.08  │ 38s    │  67%        │
└──────────────┴───────────┴────────┴────────┴─────────────┘
```

## Judge 类型

### 基于代码（确定性）

```yaml
judge:
  - type: pytest
    command: pytest tests/ -v
  - type: command
    command: npm run build
```

### 基于模式

```yaml
judge:
  - type: grep
    pattern: "class.*Retry"
    files: src/**/*.py
```

### 基于 model（LLM-as-judge）

```yaml
judge:
  - type: llm
    prompt: |
      Does this implementation correctly handle exponential backoff?
      Check for: max retries, increasing delays, jitter.
```

## 最佳实践

- **从 3-5 个任务开始**，代表你的真实工作负载，而不是玩具示例
- **每个 agent 至少运行 3 次试验**以捕捉方差——agent 是非确定性的
- **在任务 YAML 中锁定 commit**，使结果跨天/周可复现
- **每个任务至少包含一个确定性的 judge**（测试、build）——LLM judge 会引入噪声
- **在通过率之外跟踪成本**——一个 95% 通过率但成本高 10 倍的 agent 可能不是正确的选择
- **对你的任务定义进行版本管理**——它们是 test fixture，当作代码对待

## 链接

- 仓库：[github.com/joaquinhuigomez/agent-eval](https://github.com/joaquinhuigomez/agent-eval)
