---
description: 验证 epic 的就绪状态、依赖项与协调策略。
---

# /epic-validate

在发布或移交评审之前，验证单个 epic issue。

```bash
node scripts/github-coordination.js validate <issue-number> --repo <owner/repo>
```

检查内容：

1. 协调状态存在且可解析。
2. 验证状态符合策略要求。
3. 已声明的依赖项均已关闭。
4. 该 epic 已就绪，可进入下一工作流阶段。

兼容别名：

- `/quality-gate`
