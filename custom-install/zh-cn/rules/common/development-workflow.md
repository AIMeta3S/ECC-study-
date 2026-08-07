# 开发工作流

> 本文件在 [common/git-workflow.md](./git-workflow.md) 的基础上，补充了 git 操作之前完整的功能开发流程。

功能实现工作流程描述了开发流程：研究、规划、TDD、代码审查，然后提交到 git。

## 功能实现工作流

0. **研究及复用** (任何新实现前的强制性步骤)
   - **首先进行 GitHub 代码搜索：** 在编写任何新代码之前，先运行 `gh search repos` 和 `gh search code` 查找已有的实现、模板和模式。
   - **其次查阅 library 文档：** 在实现之前，使用 Context7 或厂商官方文档确认 API 行为、包用法以及版本相关细节。
   - **仅当前两者不足时使用 Exa：** 在 GitHub 搜索和官方文档之后，使用 Exa 进行更广泛的网络调研或发现。
   - **检查包注册表：** 在编写工具代码之前，搜索 npm、PyPI、crates.io 及其他注册表。优先使用久经考验的库，而非自己编写的方案。
   - **搜索可适配的实现：** 寻找能解决 80% 以上问题且可 fork、移植或封装的开源项目。
   - 当现成方案能满足需求时，优先采用或移植经过验证的方案，而非编写全新代码。

1. **先规划**
   - 使用 **planner** agent 创建实现计划
   - 在编码之前生成规划文档：PRD、architecture、system_design、tech_doc、task_list
   - 识别依赖和风险
   - 拆分为多个阶段

2. **TDD 方法**
   - 使用 **tdd-guide** agent
   - 先写测试 (RED)
   - 实现以通过测试 (GREEN)
   - 重构 (IMPROVE)
   - 验证 80% 以上覆盖率

3. **Code Review**
   - 编写完代码后立即使用 **code-reviewer** agent
   - 处理 CRITICAL 和 HIGH 级别的问题
   - 尽可能修复 MEDIUM 级别的问题

4. **提交并推送**
   - 详细的提交信息
   - 遵循常规的提交格式
   - 关于提交信息格式和 PR 流程，参见 [git-workflow.md](./git-workflow.md)

5. **Pre-Review Checks**
   - 验证所有自动化检查 (CI/CD) 均已通过
   - 解决所有合并冲突
   - 确保分支已与目标分支保持同步
   - 只有通过这些检查后，才请求人工 Review
