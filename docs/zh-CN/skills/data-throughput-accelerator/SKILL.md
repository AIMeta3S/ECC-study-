---
name: data-throughput-accelerator
description: 当大规模数据接入、backfill、导出、ETL、数据仓库加载、manifest 追赶或表同步需要在保证数据正确性的前提下大幅提速时使用。
metadata:
  origin: ECC
tools: Read, Write, Edit, Bash, Grep, Glob
---

# 数据吞吐加速器

当瓶颈在于移动、转换或保存大量数据时使用本 skill。目标不仅是速度。目标是以更快的速度将正确的数据落地到正确的位置，并留下证据。

## 首要区分

在优化之前，先区分以下各项：

- 源端抽取速度；
- 网络传输速度；
- 数据仓库/加载速度；
- 转换速度；
- 服务表新鲜度；
- 作业运行期间实时 tail 的增长。

如果新数据到达得比最终追赶窗口还快，一条 pipeline 即使"很快"仍然会显得滞后。

## 快速路径启发式

- 把计算移动到数据所在的位置。
- 对已落地的大文件，优先使用数据仓库原生的 scan、join 和 append。
- 使用 manifest 或 checkpoint，使已完成的文件/分区被跳过。
- 使用与读取和 append 模式相匹配的分区和聚簇。
- 将小文件、请求和写入做 batch。
- 通过唯一键、manifest 或可替换的 staging 使写入幂等。
- 将 raw 表、derived 表和 serving 表分别独立核算。

## 工作流程

1. 阅读当前的源端、目标端和 manifest 契约。
2. 度量积压量：外部文件、manifest 行数、raw 行数、derived 行数、最小/最大时间戳，以及未处理计数。
3. 运行一次安全的追赶或采样基准测试。
4. 对比不同变体：batch 大小、worker 数量、数据仓库 SQL、文件分组、staging 形态，以及 manifest 更新方式。
5. 只提升那条在计数和时间戳上保持一致的最快路径。
6. 将该路径固化为 CLI、定时作业、workflow 或 runbook。
7. 在固化路径执行后重新做最终核算。

## 核算输出

使用一个硬性核算块：

```text
Data throughput result:
- Source files discovered: 294
- Files processed this run: 294
- Raw rows added: 9,683,598
- Derived rows added: 8,917,585
- Remaining tail: 24 files at readback time
- Runtime: 38.7s
- Correctness gate: manifest counts and table max timestamps match
```

## 护栏

- 不要为了使某个指标好看而删除 raw 数据。
- 不要静默跳过失败的文件。
- 不要将历史 backfill 状态与实时 tail 新鲜度混为一谈。
- 在目标表和 manifest 达成一致之前，不要宣布 pipeline 已完成。
- 对于金融、医疗、受监管或会影响客户的数据，保留重放证据和审批 gate。
