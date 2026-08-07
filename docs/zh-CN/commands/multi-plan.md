---
description: 创建多模型实施计划，不修改生产代码。
---

# Plan - 多模型协同规划

多模型协同规划 - 上下文检索 + 双模型分析 → 生成分步实施计划。

> **前提条件：** 依赖外部的 `ccg-workflow` 运行时，它**不属于** ECC 基础安装。通过 `npx ccg-workflow` 初始化，以 provision 本命令所依赖的 `~/.claude/bin/codeagent-wrapper` 和 `~/.claude/.ccg/prompts/*` 角色文件。缺少该运行时，本命令无法正常运行。

$ARGUMENTS

---

## 核心协议

- **语言协议**：与工具/模型交互时使用**英文**，与用户沟通时使用用户的语言
- **强制并行**：调用 Codex/Gemini 必须使用 `run_in_background: true`（包括单模型调用，以避免阻塞主线程）
- **代码主权**：外部模型**无任何文件系统写入权限**，所有修改由 Claude 完成
- **止损机制**：当前阶段输出未通过校验前，不得进入下一阶段
- **仅规划**：本命令允许读取上下文并写入 `.claude/plan/*` 计划文件，但**绝不修改生产代码**

---

## 多模型调用规范

**调用语法**（并行：使用 `run_in_background: true`）：

```
Bash({
  command: "~/.claude/bin/codeagent-wrapper {{LITE_MODE_FLAG}}--backend <codex|gemini> {{GEMINI_MODEL_FLAG}}- \"$PWD\" <<'EOF'
ROLE_FILE: <角色 prompt 路径>
<TASK>
Requirement: <增强后的需求>
Context: <检索到的项目上下文>
</TASK>
OUTPUT: 分步实施计划及伪代码。不得修改任何文件。
EOF",
  run_in_background: true,
  timeout: 3600000,
  description: "简要描述"
})
```

**模型参数说明**：
- `{{GEMINI_MODEL_FLAG}}`：当使用 `--backend gemini` 时，替换为 `--gemini-model gemini-3-pro-preview`（注意末尾有一个空格）；codex 使用空字符串

**角色 prompt**：

| 阶段 | Codex | Gemini |
|-------|-------|--------|
| Analysis（分析） | `~/.claude/.ccg/prompts/codex/analyzer.md` | `~/.claude/.ccg/prompts/gemini/analyzer.md` |
| Planning（规划） | `~/.claude/.ccg/prompts/codex/architect.md` | `~/.claude/.ccg/prompts/gemini/architect.md` |

**会话复用**：每次调用返回 `SESSION_ID: xxx`（通常由 wrapper 输出），**必须保存**，供后续 `/ccg:execute` 使用。

**等待后台任务**（最大 timeout 600000ms = 10 分钟）：

```
TaskOutput({ task_id: "<task_id>", block: true, timeout: 600000 })
```

**重要**：
- 必须指定 `timeout: 600000`，否则默认 30 秒会导致提前 timeout
- 若 10 分钟后仍未完成，继续用 `TaskOutput` 轮询，**绝不 kill 进程**
- 若因 timeout 跳过等待，**必须调用 `AskUserQuestion` 询问用户是否继续等待或 kill 任务**

---

## 执行工作流

**规划任务**：$ARGUMENTS

### Phase 1: 全量上下文检索

`[Mode: Research]`

#### 1.1 Prompt 增强（必须最先执行）

**若 ace-tool MCP 可用**，调用 `mcp__ace-tool__enhance_prompt` 工具：

```
mcp__ace-tool__enhance_prompt({
  prompt: "$ARGUMENTS",
  conversation_history: "<最近 5-10 轮对话>",
  project_root_path: "$PWD"
})
```

等待增强后的 prompt，**用增强结果替换原始 $ARGUMENTS**，用于后续所有阶段。

**若 ace-tool MCP 不可用**：跳过此步骤，后续所有阶段直接使用原始 `$ARGUMENTS`。

#### 1.2 上下文检索

**若 ace-tool MCP 可用**，调用 `mcp__ace-tool__search_context` 工具：

```
mcp__ace-tool__search_context({
  query: "<基于增强需求构建的语义查询>",
  project_root_path: "$PWD"
})
```

- 使用自然语言（Where/What/How）构建语义查询
- **绝不基于假设作答**

**若 ace-tool MCP 不可用**，回退使用 Claude Code 内置工具：
1. **Glob**：按 pattern 查找相关文件（如 `Glob("**/*.ts")`、`Glob("src/**/*.py")`）
2. **Grep**：搜索关键符号、函数名、class 定义（如 `Grep("className|functionName")`）
3. **Read**：阅读发现的文件，收集完整上下文
4. **Task（Explore agent）**：需要更深入探索时，使用 `Task` 配合 `subagent_type: "Explore"` 在代码库中检索

#### 1.3 完整性检查

- 必须取得相关 class、function、variable 的**完整定义和签名**
- 若上下文不足，触发**递归检索**
- 输出优先级：入口文件 + 行号 + 关键符号名；仅在必要时附上最少代码片段以消除歧义

#### 1.4 需求对齐

- 若需求仍存在歧义，**必须**向用户输出引导性问题
- 直至需求边界清晰（无遗漏、无冗余）

### Phase 2: 多模型协同分析

`[Mode: Analysis]`

#### 2.1 分发输入

**并行调用** Codex 和 Gemini（`run_in_background: true`）：

向两个模型分发**原始需求**（不带预设倾向）：

1. **Codex 后端分析**：
   - ROLE_FILE：`~/.claude/.ccg/prompts/codex/analyzer.md`
   - Focus：技术可行性、架构影响、性能考量、潜在风险
   - OUTPUT：多视角方案 + 优缺点分析

2. **Gemini 前端分析**：
   - ROLE_FILE：`~/.claude/.ccg/prompts/gemini/analyzer.md`
   - Focus：UI/UX 影响、用户体验、视觉设计
   - OUTPUT：多视角方案 + 优缺点分析

用 `TaskOutput` 等待两个模型的完整结果。**保存 SESSION_ID**（`CODEX_SESSION` 和 `GEMINI_SESSION`）。

#### 2.2 交叉验证

整合视角并迭代优化：

1. **识别共识**（强信号）
2. **识别分歧**（需要权衡）
3. **优势互补**：后端逻辑遵循 Codex，前端设计遵循 Gemini
4. **逻辑推演**：消除方案中的逻辑盲点

#### 2.3（可选但推荐）双模型计划草案

为降低 Claude 综合计划出现遗漏的风险，可并行让两个模型各自输出"计划草案"（仍**不得**修改文件）：

1. **Codex 计划草案**（后端权威）：
   - ROLE_FILE：`~/.claude/.ccg/prompts/codex/architect.md`
   - OUTPUT：分步计划 + 伪代码（focus：数据流/边界条件/错误处理/测试策略）

2. **Gemini 计划草案**（前端权威）：
   - ROLE_FILE：`~/.claude/.ccg/prompts/gemini/architect.md`
   - OUTPUT：分步计划 + 伪代码（focus：信息架构/交互/无障碍/视觉一致性）

用 `TaskOutput` 等待两个模型的完整结果，记录其建议中的关键差异。

#### 2.4 生成实施计划（Claude 最终版）

综合两方分析，生成**分步实施计划**：

```markdown
## Implementation Plan: <任务名称>

### Task Type
- [ ] Frontend（→ Gemini）
- [ ] Backend（→ Codex）
- [ ] Fullstack（→ 并行）

### Technical Solution
<由 Codex + Gemini 分析综合得出的最优方案>

### Implementation Steps
1. <步骤 1> - 预期交付物
2. <步骤 2> - 预期交付物
...

### Key Files
| File | Operation | Description |
|------|-----------|-------------|
| path/to/file.ts:L10-L50 | Modify | 说明 |

### Risks and Mitigation
| Risk | Mitigation |
|------|------------|

### SESSION_ID（供 /ccg:execute 使用）
- CODEX_SESSION: <session_id>
- GEMINI_SESSION: <session_id>
```

### Phase 2 结束：计划交付（而非执行）

**`/ccg:plan` 的职责到此为止，必须执行以下动作**：

1. 向用户呈现完整的实施计划（含伪代码）
2. 将计划保存至 `.claude/plan/<feature-name>.md`（从需求中提取 feature name，如 `user-auth`、`payment-module`）
3. 以**粗体**输出提示（必须使用实际保存的文件路径）：

---
**Plan generated and saved to `.claude/plan/actual-feature-name.md`**

**请审阅上面的计划。你可以：**
- **修改计划**：告诉我哪里需要调整，我会更新计划
- **执行计划**：将以下命令复制到新的 session

```
/ccg:execute .claude/plan/actual-feature-name.md
```
---

**注意**：上面的 `actual-feature-name.md` 必须替换为实际保存的文件名！

4. **立即终止当前响应**（到此为止，不再调用任何工具。）

**绝对禁止**：
- 询问用户"Y/N"后自动执行（执行是 `/ccg:execute` 的职责）
- 对生产代码进行任何写操作
- 自动调用 `/ccg:execute` 或任何实施动作
- 用户未明确要求修改时，继续触发模型调用

---

## 计划保存

规划完成后，将计划保存至：

- **首次规划**：`.claude/plan/<feature-name>.md`
- **迭代版本**：`.claude/plan/<feature-name>-v2.md`、`.claude/plan/<feature-name>-v3.md`...

向用户呈现计划前，应先完成计划文件的写入。

---

## 计划修改流程

若用户请求修改计划：

1. 根据用户反馈调整计划内容
2. 更新 `.claude/plan/<feature-name>.md` 文件
3. 重新呈现修改后的计划
4. 再次提示用户审阅或执行

---

## 后续步骤

用户批准后，**手动**执行：

```bash
/ccg:execute .claude/plan/<feature-name>.md
```

---

## 关键规则

1. **只规划，不实施**——本命令不执行任何代码改动
2. **不设 Y/N 提问**——只呈现计划，由用户决定下一步
3. **信任规则**——后端遵循 Codex，前端遵循 Gemini
4. 外部模型**无任何文件系统写入权限**
5. **SESSION_ID 交接**——计划结尾必须包含 `CODEX_SESSION` / `GEMINI_SESSION`（供 `/ccg:execute resume <SESSION_ID>` 使用）
