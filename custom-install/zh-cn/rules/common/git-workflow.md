# Git 工作流

## Commit Message 格式
```
<类型>: <描述>

<可选主体>
```

类型：feat, fix, refactor, docs, test, chore, perf, ci

注意：要禁用提交的共同作者署名，请在 `~/.claude/settings.json` 中设置 `"includeCoAuthoredBy": false` (Claude Code 默认会附加 `Co-Authored-By` )。

## Pull Request 工作流

创建 PR 时：
1. 分析完整的 commit 历史（不仅仅是最近的提交）
2. 使用 `git diff [base-branch]...HEAD` 查看所有变更
3. 起草全面的 PR 摘要
4. 包含带 TODO 的测试计划
5. 如果是新 branch，使用 `-u` flag 推送

> 有关 git 操作之前的完整开发流程（planning、TDD、code review），请参见 [development-workflow.md](./development-workflow.md)。
