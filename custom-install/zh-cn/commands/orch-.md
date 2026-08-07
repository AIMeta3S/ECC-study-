# 描述优化的规则


## 核心优先级

**内容准确 > 表达通顺 > 排版一致 > 精简**

准确性永远第一。跳过内容校对直接改排版，是最常见的错误。

---

## 最高原则

**表述的唯一依据是 command 所封装 skill 的实际内容——工作原理、阶段流转、示例、运行产物。**

以下信息本身也可能是错的，所以不能作为**依据**：

- skill 名字（`orch-{operation}-X`）
- 名字里的 operation 词（build / add / change / fix / refine）
- command 名字
- skill 自身的 `description:` 字段

---

## 第 0 步：必读上下文（不可跳过）
阅读英文版本的skill：位置在项目根目录下的 `skills` 目录中。
1. **command 封装的 skill**：`./skills/{command 对应 skill 名称}/SKILL.md` 全文（重点：工作原理、阶段、示例，而非 description 字段）
2. **共享引擎**：`./skills/orch-pipeline/SKILL.md`
   - 阶段定义（line 48-54）
   - agent / command 映射表（line 65-76）
   - 操作家族表（line 21-29）
   这是术语与定位的权威来源

---

## 内容准确性规则

1. **步骤序列逐项对照 pipeline 阶段表核实**——每个步骤词（ingest / slice / scaffold / TDD / review / commit）能否映射到真实阶段？有无遗漏（如 Research）或虚构？
2. **机制术语查证其在 pipeline 中的确切角色**——如"GAN harness"出现在 agent 映射表的"MVP 内部循环"行，是 phase 4 Implement 的引擎，不是独立阶段。
3. **关系必须无歧义**——两个相关概念（机制 vs 阶段）的从属 / 并列 / 替代关系要写明，不能孤立堆砌。
   - 反例：`...TDD, review, gated commit (reuses the GAN harness)`——读者不知 GAN harness 是替代、包含、还是独立于 TDD。
   - 正例：`TDD（复用 GAN harness 驱动 generator→evaluator）`——绑定关系写明。
4. **实体定位准确**——区分 **wrapper**（command / skill = 封装器）vs **engine**（orch-pipeline = 编排器）。orch-* skill 是"编排器针对某 operation 套用参数（size、phase 掩码、首步动作）的封装"，不是编排器本身。
5. **区分性机制保留**——若读 skill 时发现该 command 使用了兄弟 command 没有的特定机制（如某阶段的专用执行引擎、独有的首步动作、追加的 agent 或 gate），这类信息是它在该家族中的区分性特征，不能当冗余删除，只能修正其表达。"哪些属于区分性机制"须在读 skill 与 orch-pipeline 的差异时识别，不预设。

---

## 表达规则

6. **动词与所有用词，从 skill 的实际行为中提炼，而非从名字推断。** 读 skill 的"工作原理 / 阶段 / 示例"，问：skill 实际做了哪些动作？实际产出了什么？这些动作在 SKILL.md 里用哪些动词描述？动词就从这些实际描述里取。名字里的 operation 词最多作**交叉验证**——一致只是印证，不一致则忽略名字。
7. **动宾搭配单一清晰**——避免双动词叠用错配。
   - 反例：`编排从…引导出…`（编排 + 引导出叠用，宾语错位）
   - 正例：`从…构建出…`
8. **句式骨架**：来源 + 动词 + 产物，主谓宾清晰；末句用"这是一个启动 X skill 的封装器"定位本质，形成"动作 + 本质"双层。

---

## 排版

9. 中文字符间不留多余空格（"从 设计"→"从设计"）
10. 步骤分隔符统一顿号 `、`
11. 保留关键触发词（MVP、TDD、review、gated commit 等，便于命令面板匹配）

---

## 产出前自查清单

- [ ] 每个步骤词都能映射到 pipeline 真实阶段？
- [ ] 机制术语的角色已写明、无歧义？
- [ ] 实体定位准确（封装 vs 编排器）？
- [ ] 动词与用词来自 skill 工作原理 / 阶段 / 示例的实际描述（而非名字或 description 字段）？
- [ ] 动宾搭配单一、句式通顺？
- [ ] 区分性机制与关键触发词已保留？
- [ ] 排版规则已遵守？

---

## 反例 → 正例

| 错误做法 | 正确做法 |
|---|---|
| 跳过 skill 直接改排版 | 先读 skill + orch-pipeline 校对内容 |
| 盲信 skill 的 `description:` 字段 | 以 skill 工作原理 / 阶段 / 示例为准 |
| 从 skill 名字的 operation 词推断动词 | 从 skill 实际行为描述中提炼动词（名字仅交叉验证） |
| `...TDD, review, commit (reuses GAN harness)` 关系歧义 | `TDD（复用 GAN harness 驱动 generator→evaluator）` 绑定关系 |
| `...的编排器` 混淆 wrapper / engine | 动词（构建…）+ 末句`封装器`双层定位 |
| `编排从…引导出…` 双动词错配 | `从…构建出…` 动宾一致 |
| 删 GAN harness 当冗余 | 保留（区分性机制），仅修正表达 |

## 优化后的内容按照下面的格式输出
```markdown
description: {优化后的 description}
```