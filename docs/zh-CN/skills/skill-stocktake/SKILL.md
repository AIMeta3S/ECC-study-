---
name: skill-stocktake
description: "在审计 Claude skills 与 commands 的质量时使用。支持 Quick Scan（仅针对已变更的 skills）与 Full Stocktake 两种模式，配合串行 subagent 批量评估。"
metadata:
  origin: ECC
---

# skill-stocktake

`/skill-stocktake` 这条 slash command 通过质量检查清单 + AI 综合判断，审计所有 Claude skills 与 commands。支持两种模式：用于近期变更 skills 的 Quick Scan，以及用于完整审查的 Full Stocktake。

## 范围

该命令针对以下路径，路径**相对于其被调用时所在的目录**：

| 路径 | 说明 |
|------|------|
| `~/.claude/skills/` | 全局 skills（所有项目） |
| `{cwd}/.claude/skills/` | 项目级 skills（若该目录存在） |

**在 Phase 1 开始时，命令会明确列出哪些路径被找到并扫描。**

### 针对特定项目

若要包含项目级 skills，请在该项目的根目录下运行：

```bash
cd ~/path/to/my-project
/skill-stocktake
```

若项目没有 `.claude/skills/` 目录，则只评估全局 skills 与 commands。

## 模式

| 模式 | 触发条件 | 耗时 |
|------|----------|------|
| Quick Scan | `results.json` 存在（默认） | 5–10 分钟 |
| Full Stocktake | `results.json` 不存在，或 `/skill-stocktake full` | 20–30 分钟 |

**结果缓存：** `~/.claude/skills/skill-stocktake/results.json`

## Quick Scan 流程

仅重新评估自上次运行以来发生变更的 skills（5–10 分钟）。

1. 读取 `~/.claude/skills/skill-stocktake/results.json`
2. 运行：`bash ~/.claude/skills/skill-stocktake/scripts/quick-diff.sh \
         ~/.claude/skills/skill-stocktake/results.json`
   （项目目录会从 `$PWD/.claude/skills` 自动检测；仅在需要时显式传入）
3. 若输出为 `[]`：报告 "No changes since last run." 并停止
4. 仅使用相同的 Phase 2 标准重新评估那些已变更的文件
5. 从之前的结果中沿用未变更的 skills
6. 仅输出 diff
7. 运行：`bash ~/.claude/skills/skill-stocktake/scripts/save-results.sh \
         ~/.claude/skills/skill-stocktake/results.json <<< "$EVAL_RESULTS"`

## Full Stocktake 流程

### Phase 1 — 清单盘点

运行：`bash ~/.claude/skills/skill-stocktake/scripts/scan.sh`

该脚本会枚举 skill 文件、提取 frontmatter，并收集 UTC mtime。
项目目录会从 `$PWD/.claude/skills` 自动检测；仅在需要时显式传入。
展示脚本输出中的扫描摘要与清单表：

```
Scanning:
  ✓ ~/.claude/skills/         (17 files)
  ✗ {cwd}/.claude/skills/    (not found — global skills only)
```

| Skill | 7d use | 30d use | 说明 |
|-------|--------|---------|------|

### Phase 2 — 质量评估

启动一个 Agent tool subagent（**general-purpose agent**），附带完整的清单与检查清单：

```text
Agent(
  subagent_type="general-purpose",
  prompt="
Evaluate the following skill inventory against the checklist.

[INVENTORY]

[CHECKLIST]

Return JSON for each skill:
{ \"verdict\": \"Keep\"|\"Improve\"|\"Update\"|\"Retire\"|\"Merge into [X]\", \"reason\": \"...\" }
"
)
```

subagent 读取每个 skill，应用检查清单，并按 skill 返回 JSON：

`{ "verdict": "Keep"|"Improve"|"Update"|"Retire"|"Merge into [X]", "reason": "..." }`

**分块指引：** 每次 subagent 调用处理约 20 个 skills，以保持上下文可控。每处理完一个分块，将中间结果保存到 `results.json`（`status: "in_progress"`）。

全部 skills 评估完成后：设置 `status: "completed"`，进入 Phase 3。

**续跑检测：** 若在启动时发现 `status: "in_progress"`，则从第一个未评估的 skill 处续跑。

每个 skill 按以下检查清单进行评估：

```
- [ ] Content overlap with other skills checked
- [ ] Overlap with MEMORY.md / CLAUDE.md checked
- [ ] Freshness of technical references verified (use WebSearch if tool names / CLI flags / APIs are present)
- [ ] Usage frequency considered
```

Verdict 判定标准：

| Verdict | 含义 |
|---------|------|
| Keep | 有用且保持最新 |
| Improve | 值得保留，但需要特定改进 |
| Update | 引用的技术已过时（用 WebSearch 验证） |
| Retire | 质量低、内容陈旧或成本与收益不对称 |
| Merge into [X] | 与另一 skill 存在大量重叠；指出合并目标 |

评估是 **AI 的综合判断**——而非数字化评分细则。指导维度：
- **可操作性**：让你可以立即行动的代码示例、命令或步骤
- **范围契合**：名称、触发条件与内容一致；不过宽或过窄
- **独特性**：价值不能被 MEMORY.md / CLAUDE.md / 另一 skill 替代
- **时效性**：技术引用在当前环境中可用

**`reason` 字段的质量要求**——`reason` 字段必须自包含并足以支撑决策：
- 不要只写 "unchanged"——必须重述核心证据
- 对 **Retire**：说明 (1) 发现了什么具体缺陷，(2) 由什么来覆盖相同需求
  - 反例：`"Superseded"`
  - 正例：`"disable-model-invocation: true already set; superseded by continuous-learning-v2 which covers all the same patterns plus confidence scoring. No unique content remains."`
- 对 **Merge**：指出目标并描述要整合哪些内容
  - 反例：`"Overlaps with X"`
  - 正例：`"42-line thin content; Step 4 of chatlog-to-article already covers the same workflow. Integrate the 'article angle' tip as a note in that skill."`
- 对 **Improve**：描述需要的具体变更（哪个小节、什么动作、相关时给出目标篇幅）
  - 反例：`"Too long"`
  - 正例：`"276 lines; Section 'Framework Comparison' (L80–140) duplicates ai-era-architecture-principles; delete it to reach ~150 lines."`
- 对 **Keep**（Quick Scan 中仅 mtime 变更的情况）：重述原始 verdict 的依据，不要写 "unchanged"
  - 反例：`"Unchanged"`
  - 正例：`"mtime updated but content unchanged. Unique Python reference explicitly imported by rules/python/; no overlap found."`

### Phase 3 — 汇总表

| Skill | 7d use | Verdict | 理由 |
|-------|--------|---------|------|

### Phase 4 — 整合落地

1. **Retire / Merge**：在向用户确认前，逐文件呈现详细理由：
   - 发现了什么具体问题（重叠、陈旧、失效引用等）
   - 由什么替代来覆盖相同功能（对 Retire：哪个现有的 skill/rule；对 Merge：目标文件以及要整合的内容）
   - 移除的影响（是否有依赖该 skill 的其他 skill、MEMORY.md 引用或工作流受影响）
2. **Improve**：呈现具体的改进建议及理由：
   - 改什么、为什么（例如 "把 430→200 行精简，因为 X/Y 小节与 python-patterns 重复"）
   - 由用户决定是否执行
3. **Update**：呈现已更新的内容以及核查过的来源
4. 检查 MEMORY.md 行数；若超过 100 行则提议压缩

## 结果文件 Schema

`~/.claude/skills/skill-stocktake/results.json`：

**`evaluated_at`**：必须设为评估完成时的实际 UTC 时间。
通过 Bash 获取：`date -u +%Y-%m-%dT%H:%M:%SZ`。绝不能使用类似 `T00:00:00Z` 这种仅含日期的近似值。

```json
{
  "evaluated_at": "2026-02-21T10:00:00Z",
  "mode": "full",
  "batch_progress": {
    "total": 80,
    "evaluated": 80,
    "status": "completed"
  },
  "skills": {
    "skill-name": {
      "path": "~/.claude/skills/skill-name/SKILL.md",
      "verdict": "Keep",
      "reason": "Concrete, actionable, unique value for X workflow",
      "mtime": "2026-01-15T08:30:00Z"
    }
  }
}
```

## 备注

- 评估是盲评：同一份检查清单适用于所有 skills，不区分来源（ECC、自撰、自动抽取）
- 归档 / 删除操作必须始终经用户显式确认
- 不按 skill 来源做 verdict 分支判定
