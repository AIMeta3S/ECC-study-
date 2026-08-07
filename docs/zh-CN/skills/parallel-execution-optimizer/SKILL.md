---
name: parallel-execution-optimizer
description: 当用户希望通过并行工作、并发 agent、批量 tool 调用、隔离的 worktree 或多条独立验证通道来大幅加快任务完成速度，且不损失正确性时使用。
metadata:
  origin: ECC
tools: Read, Write, Edit, Bash, Grep, Glob
---

# 并行执行优化器

当速度来自于同时执行独立工作时，使用此 skill：repo 检查、文件读取、API 检查、浏览器检查、build/test 通道、deploy 回读，或多 worktree 实现轮次。

## 核心模式

在行动之前，将紧迫感转化为依赖图。

1. 定义目标和完成信号。
2. 将工作拆分为多个通道。
3. 将每个通道标记为 parallel、sequential 或 gated。
4. 同时运行独立的读取/检查。
5. 按 file、worktree、branch、service 或 dataset 隔离写入。
6. 仅在有证据表明各通道兼容后才进行合并。
7. 以验证表结束，而非含糊的速度声明。

## 通道矩阵

在大型推进之前，编写一个紧凑的矩阵：

```text
Lane | Can run in parallel? | Write surface | Risk | Verification
Repo scan | yes | none | low | rg/git status outputs
Backend patch | maybe | src/api | medium | unit tests
Frontend patch | maybe | app/components | medium | browser screenshot
Deploy readback | after build | remote service | high | live URL + logs
```

仅当各通道的写入面互不冲突时，才并行运行这些通道。

## 执行规则

- 批量执行文件读取、搜索、状态检查和元数据查询。
- 为大型且不相关的实现通道使用隔离的 worktree。
- 在单独的 session 中启动长时间运行的测试、build、backfill 和 deploy，然后有意地轮询它们。
- 如果某个通道发现了会改变计划的 blocker，则暂停依赖该通道的其他通道并更新矩阵。
- 除非用户明确要求持续运行的服务，否则绝不让后台进程存活到当前 turn 之后。
- 在没有显式 gate 的情况下，不要并行化破坏性命令、migration、对同一张表的写入，或影响线上客户的 deploy。

## 输出格式

报告时使用以下格式：

```text
Parallel execution result:
- Lanes run: 5
- Lanes completed: 4
- Blocked lane: deploy readback, waiting on DNS propagation
- Fast path found: batched repo scan + focused tests
- Verification: lint pass, unit pass, live smoke pass
```

## 失败模式

- 更多的并发却产生冲突的编辑。
- 对工具而非任务进行基准测试。
- 在正确性得到证明之前就把“快”当作完成。
- 忘记轮询运行中的 session。
- 用成功摘要来掩盖被跳过的检查。
