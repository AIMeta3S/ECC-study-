---
description: 标记 epic 审查状态为 requested、approved 或 changes requested。
---

# /epic-review

协调 epic issue 的审查状态。

```bash
node scripts/github-coordination.js review <issue-number> --repo <owner/repo> --review approved
```

执行的操作：

1. 更新 coordination block 中的审查状态。
2. 将审查 label 同步到 GitHub。
3. 在 audit comment 中记录审查结果。
4. 保持本地 cache 与 issue 正文一致。

兼容别名：

- `/review-pr`
- `/code-review`
