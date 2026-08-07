---
description: 认领一个 epic issue，写入 coordination 状态，并同步本地归属。
---

# /epic-claim

认领一个 epic issue，作为某个工作单元的 source of truth。

使用 coordination 脚本：

```bash
node scripts/github-coordination.js claim <issue-number> --repo <owner/repo> --actor <login>
```

该命令的作用：

1. 加载 issue 正文和 coordination block。
2. 在 GitHub issue 状态中将该 epic 标记为已认领。
3. 更新标签和本地 SQLite cache。
4. 为此次认领追加一条审计评论。

兼容别名：

- `/orch-add-feature`
- `/orch-change-feature`
- `/prp-implement`
