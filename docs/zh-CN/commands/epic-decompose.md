---
description: 将一个 epic 拆分为若干子任务，且不创建任务分支。
---

# /epic-decompose

为单个 epic issue 核对任务拆解。

```bash
node scripts/github-coordination.js decompose <issue-number> --repo <owner/repo>
```

该命令的作用：

1. 读取 epic issue 的正文，查找任务清单和依赖引用。
2. 将拆解结果存储到 coordination block 中。
3. 不将任务分支纳入此工作流。
4. 追加一条简明的审计评论。

兼容别名：

- `/plan`
- `/prp-plan`
