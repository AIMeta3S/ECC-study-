---
description: 通过进行 codebase analysis 和 pattern extraction，创建全面的 feature 实现计划。
argument-hint: <feature 描述 | path/to/prd.md>
---

> 属于 PRP 工作流系列的一部分。

**输入**: $ARGUMENTS

# PRP 计划

Create a detailed, self-contained implementation plan that captures all codebase patterns, conventions, and context needed to implement a feature in a single pass.

**核心理念**：一个优秀的计划包含了实现所需的一切，无需再问任何问题。每一个 pattern、每一个 convention、每一个 gotcha —— captured once，referenced throughout。

**黄金法则**：如果在实现期间你需要搜索 codebase，那么现在就把这些知识 capture 到计划中。

---

## 阶段 0 — DETECT

根据 `$ARGUMENTS` 判断输入类型：

| 输入模式 | 判定 | 动作 |
|---|---|---|
| 以 `.prd.md` 结尾的路径 | 指向 PRD 的文件路径 | 分析 PRD，找到下一个 `待开始` 的阶段 |
| 包含“实现阶段”的 .md 文件路径 | 类 PRD 的文件 | 分析各阶段，找到下一个 `待开始` 的阶段 |
| 指向其他任意文件的路径 | Reference file | 读取文件获取上下文，treat as free-form  |
| Free-form text | Feature 描述 | 直接进入阶段 1 |
| 为空 / 空白 | 无输入 | 询问用户想要计划的 feature |

### PRD 解析（当输入为 PRD 时）

1. 使用 `cat "$PRD_PATH"` 读取 PRD 文件
2. 解析 **实现阶段** 章节
3. 按状态查找阶段：
   - 查找 `待开始` 阶段
   - 检查依赖链（一个阶段可能需要前序的阶段处于 `已完成` 状态）
   - 选择**下一个符合条件的 `待开始` 阶段**
4. 从所选阶段中提取：
   - 阶段标识、名称和描述
   - 验收标准
   - 对前序阶段的依赖
   - 任何范围说明或约束
5. 将该阶段的描述作为要计划的 feature

如果没有剩余的 待开始 阶段，报告所有阶段均已完成。

---

## 阶段 1 — PARSE

Extract and clarify the feature requirements。

### Feature Understanding

根据输入内容（PRD 的阶段 或 free-form 描述），确定：

- 正在建设**什么** （具体交付成果）
- **为什么**很重要（用户价值）
- **谁**使用它（目标用户/系统）
- 它位于**哪里** （代码库的哪一部分）

### 用户故事

格式如下：
```
作为[用户类型]，
我想要[capability]，
这样就有了[benefit]。
```

### 复杂度评估

| 等级 | 指标 | 典型范围 |
|---|---|---|
| **Small** | 单个文件、独立变更、无新依赖 | 1-3 个文件，<100 行 |
| **Medium** | 多文件、遵循现有模式、少量新概念 | 3-10 个文件，100-500 行 |
| **Large** | 跨领域问题、新模式、外部集成 | 10+ 个文件，500+ 行 |
| **XL** | 架构级变更、新子系统、需要迁移 | 20+ 个文件，考虑拆分 |

### 歧义门

如果以下任一项不清楚，在继续之前 **STOP and ask the user**：

- 核心交付物模糊
- 成功标准未定义
- 存在多种有效解释
- 技术方案存在重要的未知因素

切勿猜测，直接询问。基于假设的计划在实现过程中注定失败。

---

## 阶段 2 — EXPLORE

Gather deep codebase intelligence。直接在代码库中搜索以下每个类别。

### 代码库搜索（8 个类别）

针对每个类别，使用 grep、find 和 file reading 进行搜索：

1. **Similar Implementations** — 查找与计划中 feature 相似的现有功能。寻找类似的 patterns、endpoints、components 或 modules。

2. **Naming Conventions** — 梳理代码库相关区域中 files、functions、variables、classes 和 exports 的命名方式。

3. **Error Handling** — 在类似的代码路径中查找 error 是如何被 caught、propagated、logged 以及 returned to users。

4. **Logging Patterns** — 明确日志输出的具体内容、日志级别及输出格式。

5. **Type Definitions** — 查找相关的 types、interfaces、schemas，以及它们如何组织。

6. **Test Patterns** — 查找相似 features 的测试方式。注意 测试文件位置、命名、setup/teardown patterns 和 assertion styles。并盘点与本次变更涉及的候选源文件相关的既有测试文件清单，供「测试策略 → 单元测试」的调整/删除行取用。

7. **Configuration** — 查找相关的 配置文件、环境变量、feature flags。

8. **Dependencies** — 梳理相似 features 使用的 packages、imports 和 internal modules。

### 代码库分析（5 Traces）

读取相关文件进行 trace：

1. **Entry Points** — 一个 request/action 如何进入系统并到达你要修改的区域？
2. **Data Flow** — 数据如何在相关 code paths 中流动？
3. **State Changes** — 什么 state 被修改，在哪里修改？
4. **Contracts** — 必须遵守哪些 interfaces、APIs 或 protocols？
5. **Patterns** — 使用了哪些 architectural patterns（repository、service、controller 等）？

### 统一发现表

将调研结果整理成一份参考：

| 类别 | 文件:行号 | 模式 | 关键片段 |
|---|---|---|---|
| 命名 | `src/services/userService.ts:1-5` | camelCase service、PascalCase type | `export class UserService` |
| 错误 | `src/middleware/errorHandler.ts:10-25` | 自定义 AppError 类 | `throw new AppError(...)` |
| ... | ... | ... | ... |

---

## 阶段 3 — RESEARCH

如果 feature 涉及外部 libraries、APIs 或不熟悉的技术：

1. 搜索网络查找官方文档
2. 查找 usage examples 和 best practices
3. 识别指定版本的 gotchas

将每条发现的格式化为：

```
KEY_INSIGHT: [你学到什么]
APPLIES_TO: [影响计划的哪一部分]
GOTCHA：[所有警告或指定版本的 issues]
```

如果该 feature 仅使用已充分理解的内部模式，跳过本阶段并注明："无需外部研究—— 该 Feature 使用已建立的内部模式。"

---

## 阶段 4 — DESIGN

### UX 改进(如适用)

记录 前/后 的用户体验：

**前：**
```
┌─────────────────────────────┐
│  [当前用户体验]               │
│  显示当前流程，                │
│  用户看到/做的是什么          │
└─────────────────────────────┘
```

**后：**
```
┌─────────────────────────────┐
│  [新用户体验]               │
│  显示改进后的流程，            │
│  用户会感受到哪些变化           │
└─────────────────────────────┘
```

### 交互变更

| 触点 | 前 | 后 | 备注 |
|---|---|---|---|
| ... | ... | ... | ... |

如果该 feature 是纯粹的 后端/内部 改动，并且没有 UX 变化，注明："内部改变——没有面向用户的 UX 改进。"

---

## 阶段 5 — ARCHITECT

### Strategic Design

Define the implementation approach:

- **Approach**：High-level strategy（例如，“按照当前的 repository pattern 添加新的服务层”）
- **Alternatives Considered**: 评估了哪些其他方案，以及为什么被拒绝
- **Scope**: 将要构建内容的具体边界
- **NOT Building**: 明确列出哪些是 OUT OF SCOPE 的内容（防止实现期间 scope creep）

---

## 阶段 6 — GENERATE

使用下方模板编写完整的计划文档。保存到 `.claude/PRPs/plans/{kebab-case-feature-name}.plan.md`。

如果目录不存在则创建：
```bash
mkdir -p .claude/PRPs/plans
```

### 计划模板

````markdown
# 计划: [Feature 名称]

## 摘要
[2-3 句子的概述]

## 用户故事
作为 [用户] ，我想要 [能力] ，以便 [收益] 。

## 问题  → 解决方案
[当前状态] → [期望状态]

## Metadata
- **复杂度**: [Small | Medium | Large | XL]
- **来源 PRD**: [路径 or "N/A"]
- **PRD 阶段**: [阶段名称 or "N/A"]
- **预计文件**: [数量]

---

## UX 设计

### 前
[ASCII 图 或 “N/A — 内部更改”]

### 后
[ASCII 图 或 “N/A — 内部更改”]

### 交互变更
| 接触点 | 前 | 后 | 备注 |
|---|---|---|---|
| ... | ... | ... | ... |

---

## 必读材料

实现前必须阅读的文件：

| 优先级 | 文件 | Lines | Why |
| --- | --- | --- | --- |
| P0（关键） | ` 文件路径 ` | 1-50 | 必须遵循的核心模式 |
| P1（重要） | ` 文件路径 ` | 10-30 | 相关类型 |
| P2（参考） | ` 文件路径 ` | 全部 | 相识的实现 |

## 外部文档

| 主题 | 来源 | 关键洞察 |
|---|---|---|
| ... | ... | ... |

---

## Patterns to Mirror

在 codebase 中发现的 code patterns。必须严格遵循。

### 命名规范
// SOURCE: [file:lines]
[展示 naming pattern 的实际代码片段]

### 错误处理
// SOURCE: [file:lines]
[展示 error handling 的实际代码片段]

### 日志模式
// SOURCE: [file:lines]
[展示 logging 的实际代码片段]

### 存储模式
// SOURCE: [file:lines]
[展示 data access 的实际代码片段]

### 服务模式
// SOURCE: [file:lines]
[展示 service layer 的实际代码片段]

### 测试结构
// SOURCE: [file:lines]
[展示  test setup 的实际代码片段]
---

## Files to Change

| 文件 | 动作 | Justification |
|---|---|---|
| `path/to/file.ts` | 新建 | 为 feature 创建新的 service |
| `path/to/existing.ts` | 修改 | 添加新方法 |

---

## 不构建的内容

- [Explicit item 1 that is out of scope]
- [Explicit item 2 that is out of scope]

---

## 分步任务

### 任务1：[名称]
- **IDENTIFIER**：[任务的唯一标识，格式：{阶段标识}-{任务编号}]
- **ACTION**：[What to do]
- **IMPLEMENT**：[Specific code/logic to write]
- **MIRROR**：[“Patterns to Mirror”章节中需要 follow 的 pattern]
- **IMPORTS**：[所需的 imports]
- **GOTCHA**：[需要避免的已知的 pitfall]
- **VALIDATE**：[如何验证此任务是 correct]

### 任务2：[名称]
- **IDENTIFIER**：[任务的唯一标识，格式：{阶段标识}-{任务编号}]
- **ACTION**：[What to do]
- **IMPLEMENT**：[Specific code/logic to write]
- **MIRROR**：[“Patterns to Mirror”章节中需要 follow 的 pattern]
- **IMPORTS**：[所需的 imports]
- **GOTCHA**：[需要避免的已知的 pitfall]
- **VALIDATE**：[如何验证此任务是 correct]

[继续所有任务...]

---

## 测试策略

### 单元测试

按照如下规则定义本次需要**新增**的单元测试，以及因行为变更须**调整/删除**的既有单元测试：
   - 对每行「先行验证」（test-first）标注。判定规则：
      - **是**：高逻辑密度行为——算法、解析、计价、状态转换、边界条件丰富的纯逻辑。此类测试必须在实现之前编写并确认失败（red 证明）
      - **否**：CRUD、UI、配置、胶水代码。实现后按常规流程编写测试
   - 「先行验证」标注「是」的行须填写「关联任务」（对应「分步任务」的 IDENTIFIER 或名称）——/prp-implement 的先行测试判定按此列机械对应
   - 每行「动作」与「先行验证」均不允许留空——须有明确标注
   - 「测试文件」按项目既有单元测试的位置与命名约定填写，且须在「验证命令 → 单元测试」命令的收集范围内（如 jest testMatch / pytest 收集规则）
   - 「调整/删除」行的「测试文件」列须指向既有用例所在文件——规划时以「Files to Change」中被改源文件的导出符号（函数/类/模块名）为关键词在测试目录定位，无符号命中时按测试文件与源文件的路径约定映射确认
   - 若本次变更既无新增单元场景、也不影响既有用例，注明“无变化——复用既有单元测试”——「不影响既有用例」以上面两条的定位方法（导出符号搜索、路径约定映射）零命中为准；「无新增单元场景」以按「先行验证」判定规则扫描「Files to Change」无高逻辑密度新行为（算法、解析、计价、状态转换）为准

| 动作 | 测试 | 关联任务 | 测试文件 | 输入 | 预期输出 | Edge Case？ | 先行验证 |
|---|---|---|---|---|---|---|---|
| 新增/调整/删除 | ... | ... | `tests/unit/xxx.spec.ts` | ... | ... | ... | 是/否 |

### 集成测试

定义本次需要**新增**的集成测试，以及因接缝变更须**调整/删除**的既有集成测试：
   - 「测试文件」按项目既有集成测试的位置与命名约定填写，且须在「验证命令 → 集成测试」命令的收集范围内（如 jest testMatch / pytest 收集规则）
   - 「调整/删除」行的「测试文件」列须指向既有用例所在文件——规划时以「Files to Change」中被改接缝的关键词（路由路径/函数名/表名）在测试目录定位，定位失败时在「风险」表登记
   - 若本次变更既无新增集成场景、也不影响既有用例，注明“无变化——复用既有集成测试”——「不影响既有用例」以上一条的接缝关键词搜索既有集成测试目录零命中为准，有命中即须逐条评估列「调整/删除」行；「无新增集成场景」以「Files to Change」不新增接缝（路由/端点、跨模块调用、表/列读写）且变更涉及的全部接缝均已在既有用例「涉及接缝」列中为准
   - 项目缺少集成测试基建时，用例与「验证命令 → 集成测试」命令**照常定义**——按基建补全后的应然形态填写，不因当前缺基建而省略或降级，并在「风险」表登记补建集成测试基建的跟进项（含缺口与补建方向），供实现前决策补建时机
   - 用例编写后由「验证命令 → 集成测试」中的命令运行


| 动作 | 场景 | 涉及接缝 | 测试文件 | 操作/请求 | 预期结果 |
|---|---|---|---|---|---|
| 新增/调整/删除 | ... | 模块×数据库 | `tests/integration/xxx.spec.ts` | ... | ... |

### Edge Cases 检查清单
- [ ] 空输入
- [ ] 最大输入尺寸
- [ ] 无效类型
- [ ] 并发访问
- [ ] 网络故障（如适用）
- [ ] 没有权限

---

## 验证命令

### 静态分析
``` bash
# 运行类型检查器
[项目特定的类型检查命令]
```
预期：零类型错误

### 单元测试

编写测试命令：
   - 即使「测试策略 → 单元测试」的表中注明“无变化——复用既有单元测试” → 照常填写命令，执行时运行既有用例以防回归。

``` bash
# 对受影响区域进行测试
# 收集范围不得包含集成测试文件；无法通过路径/过滤器排除时，在命令中显式排除并在计划中注明
[项目特定的单元测试命令]
```
预期结果：所有测试均通过

隔离说明：否则单元测试阶段会连带运行集成用例——HTTP 形态在无服务器下直接失败、其余形态拖慢单元阶段，并混淆单元/集成两层信号。

### 集成测试

项目无既有集成测试可复跑、且变更无接缝（变更内容不被任何运行时路径读取/加载/执行，如 README、代码注释）→ 本小节注明“不适用——无接缝变更”，不虚构命令；
「测试策略 → 集成测试」表注明“无变化——复用既有集成测试” → 本小节照常完整填写——运行形态按既有用例的实际形态勾选，命令照常填写以复跑既有用例（HTTP 形态时含端口/健康检查配置）；
其余情况填写运行形态与命令：

**运行形态**（可多选，必填）：
- [ ] HTTP 服务 —— 起服务器打请求，须填下方端口/健康检查配置
- [ ] 进程内 —— 测试框架直调应用对象（如 supertest），无需服务器
- [ ] CLI —— 运行构建产物，断言 stdout / exit code / 产出文件
- [ ] 编译装配 —— 构建产物完整性验证（如小程序 dist 产物）

``` bash
# 每条命令上方注释标明所属运行形态；仅保留已勾选形态的命令行，
# 未勾选形态的命令行（含非 HTTP 形态时的 dev server 行）整行删除，不留占位符（形态标注注释随其命令一并删除）

# —— HTTP 服务形态 · 启动服务器：
[项目特定的 dev server 命令]
# —— HTTP 服务形态 · 运行「测试策略 → 集成测试」表中的测试（测试基建支持时用过滤器限定范围）：
[HTTP 形态测试命令]
# —— 进程内形态 · 运行测试：
[进程内测试命令]
# —— CLI / 编译装配形态 · 运行验证：
[CLI 或编译装配验证命令]

```

配置（勾选 HTTP 服务形态时填写）：
- **端口**：[端口号，如 3000]
- **健康检查路径**：[如 /health；无健康端点则填“无”]
- **启动等待（秒）**：[可选，默认 30——应用启动慢（如首次编译）时调大；按探测轮数计，每轮最多 curl 2s + sleep 1，实际墙钟可达约 3 倍]

预期：集成场景全部通过

### 数据库验证（如适用）
``` bash
# 验证 结构/迁移
[项目特定的数据库命令]
```
预期：结构已更新

### 浏览器验证（如适用）
``` bash
# 启动开发服务器并验证
[项目特定的开发服务器命令]
```
预期结果：Feature works as designed

---

## 验收标准
- [ ] 所有任务已完成
- [ ] 所有验证命令均通过
- [ ] 测试已编写并通过
- [ ] 无类型错误
- [ ] 无 lint 错误
- [ ] 与 UX 设计相符（如适用）

## 完成清单
- [ ] 代码遵循已发现的模式
- [ ] 错误处理符合代码库风格
- [ ] 日志遵循代码库约定
- [ ] 测试遵循测试模式
- [ ] 无硬编码的值
- [ ] 文档已更新（如有需要）
- [ ] 无不必要的范围增加
- [ ] 独立式——实现过程中无需提问

## 风险
| 风险 | 可能性 | 影响 | 缓解措施 |
| --- | --- | --- | --- |
| ... | ... | ... | ... |

## 备注
[任何额外的上下文、决策或观察结果]

````

---

## 输出

### 保存当前计划

将生成的计划写入：
```
.claude/PRPs/plans/{kebab-case-feature-name}.plan.md
```

### 更新 PRD（如果输入是 PRD）

如果此计划是为 PRD 阶段生成的：
1. 将阶段状态从 `待开始` 更新为 `进行中`
2. 在阶段中添加计划文件路径作为参考

### 向用户报告

```markdown
## 计划已创建

- **文件** ：.claude/PRPs/plans/{kebab-case-feature-name}.plan.md
- **源 PRD** : [路径 或 “N/A”]
- **阶段** ： [阶段名称 或 “独立”]
- **复杂度** ： [级别]
- **范围** ： [N 个文件，M 个任务]
- **关键模式** ： [排名前3的已发现模式]
- **外部研究** ： [已研究主题 或 “无需研究”]
- **风险** ： [首要风险 或 “未识别”]
- **置信度评分** ： [1-10] — 单次实现通过的可能性

## 下一步

运行 `/prp-implement .claude/PRPs/plans/{kebab-case-feature-name}.plan.md` 来执行此计划。

[「风险」表含实现前跟进项（如测试基建补建、既有用例定位失败）时] 先决策跟进项的处理时机再执行——计划中的集成测试命令按基建补全后的应然形态填写，未补建即运行会在 Level 4 失败。

```

---

## 验证

在最终定稿之前，请对照以下清单核对计划：

### 上下文完整性
- [ ] 所有相关文件已发现并记录
- [ ] 命名约定已通过示例捕获
- [ ] 错误处理模式已记录
- [ ] 测试模式已识别
- [ ] 依赖项已列出

### 实现准备情况
- [ ] 每个任务都有 IDENTIFIER、ACTION、IMPLEMENT、MIRROR 和 VALIDATE 字段，且每个字段都有值
- [ ] 没有任务需要额外的代码库搜索
- [ ] Import 路径已指定
- [ ] 在适用的位置都记录注意事项

### 模式忠实度
- [ ] 代码片段是实际代码库示例（非虚构）
- [ ] 来源引用指向真实文件和行号
- [ ] 模式涵盖命名、错误、日志、数据访问和测试
- [ ] 新代码将与现有代码融为一体，难以区分。

### 验证覆盖范围
- [ ] 静态分析命令已指定
- [ ] 单元测试命令已指定
- [ ] 单元测试用例已定义（或已注明“无变化”）；「测试文件」列在单元测试命令收集范围内、「调整/删除」行指向既有文件，且命令收集范围不含集成测试文件
- [ ] 构建验证已包含
- [ ] 集成测试命令已指定
- [ ] 集成测试用例已定义（或已注明“无变化”）
- [ ] 集成测试运行形态已勾选，且命令块与勾选形态严格双向对应——每个已勾选形态至少有一条对应命令行（HTTP 服务形态须同时含 dev server 行与测试命令行），且不含未勾选形态的命令行

### UX 清晰度
- [ ] 之前/之后状态已记录（或标记为“N/A”）
- [ ] 交互变更已列出
- [ ] UX 的 Edge Cases 已识别

###  No Prior Knowledge Test
不熟悉此代码库的开发人员应能够仅凭此计划实现 feature，无需搜索代码库或提问。若不能，请补充缺失的 context。

---

## 后续步骤

- 运行 `/prp-implement <plan-path>` 来执行此计划
