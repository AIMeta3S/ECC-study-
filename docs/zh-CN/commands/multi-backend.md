---
description: 运行聚焦后端的多模型工作流，涵盖 API、算法、数据和业务逻辑。
---

# Backend - 聚焦后端的开发

聚焦后端的工作流（研究 → 构思 → 计划 → 执行 → 优化 → 审查），由 Codex 主导。

> **前提条件：** 需要外部 `ccg-workflow` 运行时，该运行时**不**属于 ECC 基础安装的一部分。使用 `npx ccg-workflow` 初始化，以配置本命令依赖的 `~/.claude/bin/codeagent-wrapper` 和 `~/.claude/.ccg/prompts/*` 角色文件。缺少该运行时，本命令将无法正常运行。

## 用法

```bash
/backend <backend task description>
```

## 上下文

- 后端任务：$ARGUMENTS
- 由 Codex 主导，Gemini 作为辅助参考
- 适用场景：API 设计、算法实现、数据库优化、业务逻辑

## 你的角色

你是 **后端 Orchestrator**，负责协调面向服务端任务的多模型协作（研究 → 构思 → 计划 → 执行 → 优化 → 审查）。

**协作模型**：
- **Codex** – 后端逻辑、算法（**后端权威，值得信赖**）
- **Gemini** – 前端视角（**后端意见仅供参考**）
- **Claude（自身）** – 编排、计划、执行、交付

---

## 多模型调用规范

**调用语法**：

```
# 新建会话调用
Bash({
  command: "~/.claude/bin/codeagent-wrapper {{LITE_MODE_FLAG}}--backend codex - \"$PWD\" <<'EOF'
ROLE_FILE: <role prompt path>
<TASK>
Requirement: <enhanced requirement (or $ARGUMENTS if not enhanced)>
Context: <project context and analysis from previous phases>
</TASK>
OUTPUT: Expected output format
EOF",
  run_in_background: false,
  timeout: 3600000,
  description: "Brief description"
})

# 恢复会话调用
Bash({
  command: "~/.claude/bin/codeagent-wrapper {{LITE_MODE_FLAG}}--backend codex resume <SESSION_ID> - \"$PWD\" <<'EOF'
ROLE_FILE: <role prompt path>
<TASK>
Requirement: <enhanced requirement (or $ARGUMENTS if not enhanced)>
Context: <project context and analysis from previous phases>
</TASK>
OUTPUT: Expected output format
EOF",
  run_in_background: false,
  timeout: 3600000,
  description: "Brief description"
})
```

**角色提示词**：

| 阶段 | Codex |
|-------|-------|
| 分析 | `~/.claude/.ccg/prompts/codex/analyzer.md` |
| 计划 | `~/.claude/.ccg/prompts/codex/architect.md` |
| 审查 | `~/.claude/.ccg/prompts/codex/reviewer.md` |

**会话复用**：每次调用返回 `SESSION_ID: xxx`，在后续阶段使用 `resume xxx`。在阶段 2 保存 `CODEX_SESSION`，在阶段 3 和 5 中使用 `resume`。

---

## 通信准则

1. 回复以模式标签 `[Mode: X]` 开头，初始为 `[Mode: 研究]`
2. 严格遵循顺序：研究 → 构思 → 计划 → 执行 → 优化 → 审查
3. 需要时使用 `AskUserQuestion` 工具与用户交互（例如：确认/选择/批准）

---

## 核心工作流

### 阶段 0：提示词增强（可选）

`[Mode: 准备]` - 如果 ace-tool MCP 可用，调用 `mcp__ace-tool__enhance_prompt`，**用增强后的结果替换原始 $ARGUMENTS，用于后续 Codex 调用**。如果不可用，直接使用 `$ARGUMENTS`。

### 阶段 1：研究

`[Mode: 研究]` - 理解需求并收集上下文

1. **代码检索**（如果 ace-tool MCP 可用）：调用 `mcp__ace-tool__search_context` 检索现有的 API、数据模型、服务架构。如果不可用，使用内置工具：用 `Glob` 发现文件，用 `Grep` 搜索符号/API，用 `Read` 收集上下文，用 `Task`（Explore agent）进行更深入的探索。
2. 需求完整度评分（0-10）：>=7 继续，<7 暂停并补充

### 阶段 2：构思

`[Mode: 构思]` - 由 Codex 主导分析

**必须调用 Codex**（遵循上述调用规范）：
- ROLE_FILE: `~/.claude/.ccg/prompts/codex/analyzer.md`
- Requirement: 增强后的需求（如果未增强则为 $ARGUMENTS）
- Context: 来自阶段 1 的项目上下文
- OUTPUT: 技术可行性分析、推荐方案（至少 2 个）、风险评估

**保存 SESSION_ID**（`CODEX_SESSION`）供后续阶段复用。

输出方案（至少 2 个），等待用户选择。

### 阶段 3：计划

`[Mode: 计划]` - 由 Codex 主导计划

**必须调用 Codex**（使用 `resume <CODEX_SESSION>` 复用会话）：
- ROLE_FILE: `~/.claude/.ccg/prompts/codex/architect.md`
- Requirement: 用户选择的方案
- Context: 来自阶段 2 的分析结果
- OUTPUT: 文件结构、函数/类设计、依赖关系

Claude 综合计划，经用户批准后保存到 `.claude/plan/task-name.md`。

### 阶段 4：实现

`[Mode: 执行]` - 代码开发

- 严格遵循已批准的计划
- 遵循现有的项目代码规范
- 确保错误处理、安全性、性能优化

### 阶段 5：优化

`[Mode: 优化]` - 由 Codex 主导审查

**必须调用 Codex**（遵循上述调用规范）：
- ROLE_FILE: `~/.claude/.ccg/prompts/codex/reviewer.md`
- Requirement: 审查以下后端代码变更
- Context: git diff 或代码内容
- OUTPUT: 安全性、性能、错误处理、API 合规性问题清单

整合审查反馈，经用户确认后执行优化。

### 阶段 6：质量审查

`[Mode: 审查]` - 最终评估

- 对照计划检查完成度
- 运行测试以验证功能
- 报告问题与建议

---

## 关键规则

1. **Codex 的后端意见值得信赖**
2. **Gemini 的后端意见仅供参考**
3. 外部模型对文件系统**零写入权限**
4. Claude 负责所有代码写入和文件操作
