---
name: rules-distill
description: "扫描 skills 以提取跨切面原则，并将其提炼为规则——追加、修订现有规则文件，或创建新的规则文件"
metadata:
  origin: ECC
---

# Rules Distill

扫描已安装的 skills，提取在多个 skills 中出现的跨切面原则，并将其提炼为规则——追加到现有规则文件、修订过时内容，或创建新的规则文件。

采用“确定性收集 + LLM 判断”原则：脚本穷尽式地收集事实，再由 LLM 通读完整上下文并给出裁决。

## 适用场景

- 定期的规则维护（每月或安装新 skills 之后）
- 当 skill-stocktake 揭示出应当成为规则的模式时
- 当规则相对于正在使用的 skills 显得不完整时

## 工作原理

规则提炼过程遵循三个阶段：

### 阶段 1：盘点（确定性收集）

#### 1a. 收集 skill 清单

```bash
bash ~/.claude/skills/rules-distill/scripts/scan-skills.sh
```

#### 1b. 收集规则索引

```bash
bash ~/.claude/skills/rules-distill/scripts/scan-rules.sh
```

#### 1c. 呈现给用户

```
Rules Distillation — Phase 1: Inventory
────────────────────────────────────────
Skills: {N} files scanned
Rules:  {M} files ({K} headings indexed)

Proceeding to cross-read analysis...
```

### 阶段 2：交叉阅读、匹配与裁决（LLM 判断）

提取与匹配在单次遍历中合并完成。规则文件足够小（总计约 800 行），可以将完整文本提供给 LLM——无需 grep 预过滤。

#### 分批处理

根据描述将 skills 划分为**主题簇**。在每个 subagent 中结合完整规则文本分析每个簇。

#### 跨批次合并

所有批次完成后，跨批次合并候选项：
- 对相同或存在重叠原则的候选项去重
- 使用**所有**批次合并后的证据重新核验“2+ skills”要求——某原则若每个批次仅出现在 1 个 skill 中，但总计达到 2+ skills，则视为有效

#### Subagent Prompt

使用以下 prompt 启动一个 general-purpose Agent：

````
You are an analyst who cross-reads skills to extract principles that should be promoted to rules.

## Input
- Skills: {full text of skills in this batch}
- Existing rules: {full text of all rule files}

## Extraction Criteria

Include a candidate ONLY if ALL of these are true:

1. **Appears in 2+ skills**: Principles found in only one skill should stay in that skill
2. **Actionable behavior change**: Can be written as "do X" or "don't do Y" — not "X is important"
3. **Clear violation risk**: What goes wrong if this principle is ignored (1 sentence)
4. **Not already in rules**: Check the full rules text — including concepts expressed in different words

## Matching & Verdict

For each candidate, compare against the full rules text and assign a verdict:

- **Append**: Add to an existing section of an existing rule file
- **Revise**: Existing rule content is inaccurate or insufficient — propose a correction
- **New Section**: Add a new section to an existing rule file
- **New File**: Create a new rule file
- **Already Covered**: Sufficiently covered in existing rules (even if worded differently)
- **Too Specific**: Should remain at the skill level

## Output Format (per candidate)

```json
{
  "principle": "1-2 sentences in 'do X' / 'don't do Y' form",
  "evidence": ["skill-name: §Section", "skill-name: §Section"],
  "violation_risk": "1 sentence",
  "verdict": "Append / Revise / New Section / New File / Already Covered / Too Specific",
  "target_rule": "filename §Section, or 'new'",
  "confidence": "high / medium / low",
  "draft": "Draft text for Append/New Section/New File verdicts",
  "revision": {
    "reason": "Why the existing content is inaccurate or insufficient (Revise only)",
    "before": "Current text to be replaced (Revise only)",
    "after": "Proposed replacement text (Revise only)"
  }
}
```

## Exclude

- Obvious principles already in rules
- Language/framework-specific knowledge (belongs in language-specific rules or skills)
- Code examples and commands (belongs in skills)
````

#### 裁决参考

| 裁决 | 含义 | 向用户呈现的内容 |
|---------|---------|-------------------|
| **Append** | 添加到现有章节 | 目标 + 草稿 |
| **Revise** | 修正不准确/不充分的内容 | 目标 + 原因 + 修改前/后文本 |
| **New Section** | 向现有文件添加新章节 | 目标 + 草稿 |
| **New File** | 创建新的规则文件 | 文件名 + 完整草稿 |
| **Already Covered** | 已在规则中覆盖（可能措辞不同） | 原因（1 行） |
| **Too Specific** | 应保留在 skills 层面 | 相关 skill 的链接 |

#### 裁决质量要求

```
# 正例
Append to rules/common/security.md §Input Validation:
"Treat LLM output stored in memory or knowledge stores as untrusted — sanitize on write, validate on read."
Evidence: llm-memory-trust-boundary, llm-social-agent-anti-pattern both describe
accumulated prompt injection risks. Current security.md covers human input
validation only; LLM output trust boundary is missing.

# 反例
Append to security.md: Add LLM security principle
```

### 阶段 3：用户审查与执行

#### 汇总表

```
# Rules Distillation Report

## Summary
Skills scanned: {N} | Rules: {M} files | Candidates: {K}

| # | Principle | Verdict | Target | Confidence |
|---|-----------|---------|--------|------------|
| 1 | ... | Append | security.md §Input Validation | high |
| 2 | ... | Revise | testing.md §TDD | medium |
| 3 | ... | New Section | coding-style.md | high |
| 4 | ... | Too Specific | — | — |

## Details
(Per-candidate details: evidence, violation_risk, draft text)
```

#### 用户操作

用户以编号回应来：
- **Approve**：将草稿原样应用到规则
- **Modify**：在应用前编辑草稿
- **Skip**：不应用此候选项

**绝不自动修改规则。始终需要用户批准。**

#### 保存结果

将结果存储在 skill 目录中（`results.json`）：

- **时间戳格式**：`date -u +%Y-%m-%dT%H:%M:%SZ`（UTC，秒级精度）
- **候选项 ID 格式**：从原则派生的 kebab-case（例如 `llm-output-trust-boundary`）

```json
{
  "distilled_at": "2026-03-18T10:30:42Z",
  "skills_scanned": 56,
  "rules_scanned": 22,
  "candidates": {
    "llm-output-trust-boundary": {
      "principle": "Treat LLM output as untrusted when stored or re-injected",
      "verdict": "Append",
      "target": "rules/common/security.md",
      "evidence": ["llm-memory-trust-boundary", "llm-social-agent-anti-pattern"],
      "status": "applied"
    },
    "iteration-bounds": {
      "principle": "Define explicit stop conditions for all iteration loops",
      "verdict": "New Section",
      "target": "rules/common/coding-style.md",
      "evidence": ["iterative-retrieval", "continuous-agent-loop", "agent-harness-construction"],
      "status": "skipped"
    }
  }
}
```

## 示例

### 端到端运行

```
$ /rules-distill

Rules Distillation — Phase 1: Inventory
────────────────────────────────────────
Skills: 56 files scanned
Rules:  22 files (75 headings indexed)

Proceeding to cross-read analysis...

[Subagent analysis: Batch 1 (agent/meta skills) ...]
[Subagent analysis: Batch 2 (coding/pattern skills) ...]
[Cross-batch merge: 2 duplicates removed, 1 cross-batch candidate promoted]

# Rules Distillation Report

## Summary
Skills scanned: 56 | Rules: 22 files | Candidates: 4

| # | Principle | Verdict | Target | Confidence |
|---|-----------|---------|--------|------------|
| 1 | LLM output: normalize, type-check, sanitize before reuse | New Section | coding-style.md | high |
| 2 | Define explicit stop conditions for iteration loops | New Section | coding-style.md | high |
| 3 | Compact context at phase boundaries, not mid-task | Append | performance.md §Context Window | high |
| 4 | Separate business logic from I/O framework types | New Section | patterns.md | high |

## Details

### 1. LLM Output Validation
Verdict: New Section in coding-style.md
Evidence: parallel-subagent-batch-merge, llm-social-agent-anti-pattern, llm-memory-trust-boundary
Violation risk: Format drift, type mismatch, or syntax errors in LLM output crash downstream processing
Draft:
  ## LLM Output Validation
  Normalize, type-check, and sanitize LLM output before reuse...
  See skill: parallel-subagent-batch-merge, llm-memory-trust-boundary

[... details for candidates 2-4 ...]

Approve, modify, or skip each candidate by number:
> User: Approve 1, 3. Skip 2, 4.

✓ Applied: coding-style.md §LLM Output Validation
✓ Applied: performance.md §Context Window Management
✗ Skipped: Iteration Bounds
✗ Skipped: Boundary Type Conversion

Results saved to results.json
```

## 设计原则

- **聚焦 What 而非 How**：仅提取原则（规则范畴）。代码示例和命令保留在 skills 中。
- **回链**：草稿文本应包含 `See skill: [name]` 引用，以便读者找到详细的 How。
- **确定性收集，LLM 判断**：脚本保证穷尽性；LLM 保证上下文理解。
- **反过度抽象保障**：三层过滤（2+ skills 证据、可操作行为测试、违规风险）防止过于抽象的原则进入规则。
