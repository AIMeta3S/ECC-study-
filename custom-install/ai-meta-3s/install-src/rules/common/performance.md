# Performance Optimization

## Model Selection Strategy

**Haiku**（Sonnet 能力的 90%，节省 3 倍成本）：
- 频繁调用的轻量级 agent
- 结对编程与代码生成
- 多 agent 系统中的 worker agent

**Sonnet**（最佳编码模型）：
- 主要开发工作
- 编排多 agent 工作流
- 复杂编码任务

**Opus**（最深推理能力）：
- 复杂架构决策
- 最高推理需求
- 研究与分析任务

## Context Window Management

对于以下任务，避免使用 Context Window 的最后 20%：
- 大规模 refactoring
- 跨多文件的功能实现
- 调试复杂交互

对 context 敏感度较低的任务：
- 单文件编辑
- 独立工具创建
- 文档更新
- 简单 bug 修复

## Extended Thinking + Plan Mode

Extended Thinking 默认启用，最多为内部推理保留 31,999 个 token。

通过以下方式控制 Extended Thinking：
- **开关**：Option+T（macOS）/ Alt+T（Windows/Linux）
- **配置**：在 `~/.claude/settings.json` 中设置 `alwaysThinkingEnabled`
- **预算上限**：`export MAX_THINKING_TOKENS=10000`（bash）或 `$env:MAX_THINKING_TOKENS = "10000"`（PowerShell）
- **详细模式**：Ctrl+O 查看 thinking 输出

对于需要深度推理的复杂任务：
1. 确保 Extended Thinking 已启用（默认开启）
2. 启用 **Plan Mode** 以获得结构化方法
3. 使用多轮评审以进行彻底分析
4. 采用多角色 sub-agents 协同分析以获取多样化视角

## Build Troubleshooting

如果 build 失败：
1. 使用 **build-error-resolver** agent
2. 分析错误信息
3. 逐步修复
4. 每次修复后进行验证
