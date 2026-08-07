---
description: 扫描清理被阻塞的 epic issue，并重新打开依赖已关闭的项。
---

# /epic-unblock

扫描清理其声明的依赖已完成的被阻塞 epic。

```bash
node scripts/github-coordination.js unblock --repo <owner/repo>
```

该命令会执行以下操作：

1. 扫描仓库中的 epic issue。
2. 检查每个被阻塞 epic 的依赖列表。
3. 将已完全解除阻塞的 epic 移至 ready 状态。
4. 更新标签、评论和本地快照。

兼容别名：

- `/loop-status`
