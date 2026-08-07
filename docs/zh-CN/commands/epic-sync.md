---
description: 从 GitHub 同步 epic issue 的正文、标签以及本地 coordination 快照。
---

# /epic-sync

对 epic issues 执行确定性同步。

```bash
node scripts/github-coordination.js sync --repo <owner/repo>
```

该命令会执行以下操作：

1. 读取 issue 正文作为 epic 的权威状态。
2. 核对 coordination block 使其与标签保持一致。
3. 为每个 epic issue 写入新的本地快照。
4. 保持 SQLite cache 与 GitHub 同步。

兼容别名：

- `/projects`
- `/work-items sync-github`
