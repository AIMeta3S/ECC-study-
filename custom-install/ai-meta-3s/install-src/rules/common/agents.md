# Agent 编排

## 可用 Agent

可用 agent 清单由系统提示词提供——Claude Code 启动时已从 `~/.claude/agents/*.md` 的 frontmatter（`name` + `description`）聚合并注入。

## 即时使用 Agent

无需用户在提示词中显式指定，根据 agent 的 **description（适用范围与边界）** 从系统清单中自动选择最合适的执行。典型映射（示例，非穷举）：
1. 复杂功能或重构的实现规划（拆解为可执行步骤） → 使用 **planner** agent
2. 通用代码变更审查（质量/安全/可维护性，非特定语言） → 使用 **code-reviewer** agent
3. 测试先行的新功能、bug 修复或重构 → 使用 **tdd-guide** agent
4. 系统设计、可扩展性或技术选型决策 → 使用 **architect** agent
5. 涉及用户输入、身份认证、API 端点或敏感数据的代码 → 使用 **security-reviewer** agent
6. 构建失败或类型错误 → 使用 **build-error-resolver** agent
7. 生成、维护或运行端到端（E2E）测试 → 使用 **e2e-runner** agent
8. TypeScript/JavaScript 代码变更 → 使用 **typescript-reviewer** agent
9. Python 代码变更 → 使用 **python-reviewer** agent
10. Vue 项目（.vue 文件或 Vue 生态代码）变更 → 使用 **vue-reviewer** agent
11. FastAPI 应用审查（异步、依赖注入、Pydantic、安全） → 使用 **fastapi-reviewer** agent

## 并行 Task 执行

对于独立的操作，始终使用并行 Task 执行：

```markdown
# GOOD：并行执行
并行启动 3 个 agent：
1. Agent 1：auth 模块的安全分析
2. Agent 2：cache 系统的性能审查
3. Agent 3：utilities 的类型检查

# BAD：不必要的串行执行
先 agent 1，再 agent 2，再 agent 3
```

## 委托完成约定

适用于每一层的每一个 agent（父、子、孙）：

1. **你的最终消息就是交付物。** 绝不要以“等待后台 agent”结束你的回合——一个已派生的 task 并非已完成的 task。当子任务仍在运行时结束你的回合，会使它们的结果成为孤立结果（已完成的子任务无法通知已结束回合的父任务）。
2. **如果你委派了任务，就必须负责收集结果。** 等待结果，整合它们，然后返回。禁止即发即忘式的委派。
3. **仅当工作无法在一个上下文中完成时才进行分解。** 不要将一个已经适合单个 agent 规模的 task 再次委派——深度是结果，而非计划。

> 理由：观察到的失败模式——研究 agent 遵循上述“并行 Task 执行”，派生子任务，然后以“等待中”作为最终回答返回。所有子任务均成功完成，但它们的结果成了孤立结果。没有完成约定的并行规则会产生僵尸任务。

## 多视角分析

当处理复杂问题时，采用多角色 sub-agents 协同分析：
- 事实审查员
- 资深工程师
- 安全专家
- 一致性审查员
- 冗余检查员
