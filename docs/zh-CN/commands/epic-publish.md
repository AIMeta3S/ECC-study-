---
description: 将已验证的 epic 更新发布回 issue 与本地 cache。
---

# /epic-publish

将已验证的 coordination 更新发布到 GitHub。

```bash
node scripts/github-coordination.js publish <issue-number> --repo <owner/repo>
```

该命令的作用：

1. 在发布前重新验证 epic。
2. 更新 issue 正文中的 coordination block。
3. 追加一条简洁的发布评论。
4. 记录最终的本地 snapshot。

兼容别名：

- `/pr`
- `/prp-pr`
