---
description: 使用专门的 agents 进行全面的 PR 审查
---

对一个 pull request 进行全面的多视角审查。

## 用法

`/review-pr [PR-number-or-URL] [--focus=comments|tests|errors|types|code|simplify]`

如果未指定 PR，则审查当前分支的 PR。如果未指定 focus，则运行完整的审查流程。

## 步骤

1. 识别 PR：
   - 使用 `gh pr view` 获取 PR 详情、变更的文件和 diff
2. 查找项目指南：
   - 查找 `CLAUDE.md`、lint 配置、TypeScript 配置、仓库规范
3. 运行专门的审查 agents：
   - `code-reviewer`
   - `comment-analyzer`
   - `pr-test-analyzer`
   - `silent-failure-hunter`
   - `type-design-analyzer`
   - `code-simplifier`
4. 汇总结果：
   - 对重叠的发现去重
   - 按严重程度排序
5. 按严重程度分组报告发现

## 置信度规则

仅报告置信度 >= 80 的问题：

- Critical：bug、安全问题、数据丢失
- Important：缺少测试、质量问题、风格违规
- Advisory：仅在明确要求时提供建议
