---
name: skill-comply
description: 可视化展示 skills、rules 和 agent 定义是否被实际遵循——自动生成 3 个 prompt 严格度级别的场景、运行 agent、对行为序列进行分类，并报告合规率及完整的 tool call 时间线
metadata:
  origin: ECC
tools: Read, Bash
---

# skill-comply：自动化合规度量

通过以下方式度量编码 agent 是否实际遵循 skills、rules 或 agent 定义：
1. 从任意 .md 文件自动生成期望行为序列（spec）
2. 自动生成 prompt 严格度递减的场景（支持性 → 中性 → 竞争性）
3. 运行 `claude -p` 并通过 stream-json 捕获 tool call trace
4. 使用 LLM（而非 regex）将 tool call 对照 spec 步骤进行分类
5. 确定性地检查时序顺序
6. 生成自包含的报告，包含 spec、prompt 和时间线

## 支持的目标

- **Skills**（`skills/*/SKILL.md`）：如 search-first、TDD 指南等工作流 skill
- **Rules**（`rules/common/*.md`）：如 testing.md、security.md、git-workflow.md 等强制性 rule
- **Agent 定义**（`agents/*.md`）：agent 是否在期望时被调用（暂不支持内部工作流验证）

## 何时激活

- 用户运行 `/skill-comply <path>`
- 用户询问“这条 rule 是否真的被遵循了？”
- 新增 rule/skill 后，验证 agent 合规性
- 作为质量维护的一部分定期执行

## 用法

```bash
# 完整运行
uv run python -m scripts.run ~/.claude/rules/common/testing.md

# 试运行（无成本，仅生成 spec 和场景）
uv run python -m scripts.run --dry-run ~/.claude/skills/search-first/SKILL.md

# 自定义模型
uv run python -m scripts.run --gen-model haiku --model sonnet <path>
```

## 关键概念：Prompt 独立性

度量某个 skill/rule 即使在 prompt 未明确支持它时是否仍被遵循。

## 报告内容

报告是自包含的，包含：
1. 期望行为序列（自动生成的 spec）
2. 场景 prompt（在每个严格度级别下询问的内容）
3. 每个场景的合规分数
4. 带有 LLM 分类标签的 tool call 时间线

### 进阶（可选）

对于熟悉 hook 的用户，报告还会针对合规率较低的步骤提供 hook 推广建议。此内容仅供参考——核心价值在于合规性本身的可视化。
