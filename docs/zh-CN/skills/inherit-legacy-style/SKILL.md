---
name: inherit-legacy-style
description: 遗留项目风格继承 skill。当用户输入 /inherit-legacy-style，或将 AI coding agent 引入到手写遗留项目且需要防止"style drift"（即模型将其预训练的主流惯用法强加于项目）时使用。与语言和框架无关——仅对齐 meta-architecture，不涉及语法。一旦运行，即成为所有后续编码任务的行为约束。不要用于与代码风格对齐无关的纯研究或一次性提问。
metadata:
  origin: community
allowed-tools: Read, Glob, Grep, Bash, Edit, Write, AskUserQuestion
---

# 继承遗留风格

通过扫描代码库以发现跨 4 个 meta-architecture 维度的隐式约定、与用户逐一解决冲突、并将共识固化为可执行的 `.ai-style-rules.md`，防止遗留项目中 AI 代码的 style drift。完全与语言和框架无关。

## 何时激活

- 用户输入 `/inherit-legacy-style`
- 用户提到要将 AI 引入到手写遗留项目
- 用户担心 AI 生成的代码会从现有项目约定中"drift"
- 用户希望提取并编纂项目的隐式编码规则

## 何时使用

当需要保留遗留项目风格、防止 AI 生成 style drift 时使用此 skill。触发条件见上文 **何时激活**。

## 前提条件

- Git（推荐；非 Git 项目在增量模式下回退到文件时间戳）
- 对项目根目录的 Read/Write 权限（生成 `.ai-style-rules.md`，可选生成 `CLAUDE.md`）

## 工作流

### Step 0 — 自动检测模式

静默检查项目根目录下是否存在 `.ai-style-rules.md`：

| 文件是否存在？ | 模式 |
|---|---|
| 否 | **Branch A — 首次全量扫描** |
| 是 | **Branch B — 增量嗅探** |

用一行宣布模式并继续——绝不让用户选择。

### Branch A — 首次全量扫描

**1. 衡量规模，选择扫描层级**

```bash
git ls-files | grep -cE '\.(js|ts|jsx|tsx|vue|py|go|rs|java|kt|rb|php|cs|swift|c|cpp|h)$'
```

| 层级 | 源文件数 | 策略 |
|---|---|---|
| Small | ≲ 50 | 对每个源文件完整精读 |
| Medium | 50–500 | 基础设施层 = 完整阅读；业务层 = 每个维度抽样 2–3 个 |
| Large | ≳ 500 | 严格抽样 + 预算上限；先看 `--stat` 摘要，再定向阅读 |

**2. 沿 4 个维度扫描**

1. **File Anatomy** — 文件内声明顺序（imports → types → 主逻辑 → helpers → export）
2. **State & Control Flow** — async state、pagination、flags 的命名约定
3. **Infrastructure** — 横切 utils 的存放位置（interceptors、formatters、middleware）
4. **Error Handling** — try/catch vs 全局 interceptor vs Result 返回；null-check 习惯

**3. 应用信号阈值降噪**

在打断用户之前，评估信号强度：

- **弱信号** → 自动抑制：少数派 <5% 且数量 <10 → 多数派胜出，少数派归入 DONTs
- **强信号** → 追问：接近均分，或在核心维度上的语义分叉
- **小项目例外**：源文件 ≲50 时，"3 对 2"不算多数 → 追问

**4. 逐一解决冲突（Grilling Protocol）**

对每个强信号冲突，精确地只呈现一个问题，含 4 个选项：

> 证据：`pathA` 使用风格 X，`pathB` 使用风格 Y
> WARNING：风险：混用两者会破坏项目风格
> 选择：`1` 遵循 X  `2` 遵循 Y  `3` 这是演进，更新规则  `4` 我有一条新规则

挂起直到用户回答，然后继续下一个冲突。绝不堆叠问题。

**5. 生成 `.ai-style-rules.md`**，包含三个必选章节：
- **[Golden Files]** — 真实示例路径，标注它们所展示的内容
- **[Naming & State-Control Rules]** — 具体、可检查的约定
- **[DONTs]** — 不得传播的 anti-patterns

**6. 安装持久 hook**

向用户询问执行强度（使用 `AskUserQuestion`）：

| 选项 | 机制 |
|---|---|
| **1** Soft hook（推荐） | 将 `@.ai-style-rules.md` 引用写入项目 `CLAUDE.md` |
| **2** Hard hook | Soft hook + 在 `settings.json` 中添加 `PreToolUse[Write\|Edit\|MultiEdit]` Hook |
| **3** No hook | 保留规则文件；用户手动引用 |

### Branch B — 增量嗅探

1. 读取现有 `.ai-style-rules.md`；如果它含 commit fingerprint，执行 `git diff <last_hash> HEAD --stat` 以定位 delta
2. 读取最近的 Git 变更（`git log -3 --stat` → 按需检查可疑文件）
3. 对于超大 diff（>数百个文件）：仅 `--stat` 摘要 + 抽样最大的变更
4. 将新代码与记录的规则对比 → 冲突进入 Grilling Protocol
5. 在 `.ai-style-rules.md` 末尾追加 evolution log（绝不覆盖旧规则）

### 每轮执行

当 `.ai-style-rules.md` 处于 context（通过 CLAUDE.md 加载）时，每个代码编写任务必须在推理链开头给出 **compliance declaration**，指出所遵循的 exemplar 和所避免的 DONTs。

## 工作原理

此 skill 通过 `.ai-style-rules.md` 是否存在来自动检测是首次运行还是增量运行：

- **首次（Branch A）** — 衡量项目规模，沿 4 个 meta-architecture 维度（File Anatomy、State & Control Flow、Infrastructure、Error Handling）扫描代码库，应用信号阈值降噪以抑制弱冲突，与用户逐一解决强信号冲突，生成包含 Golden Files / Naming Rules / DONTs 的 `.ai-style-rules.md`，并提供可选的执行 hooks。
- **增量（Branch B）** — 读取现有规则，检查最近的 Git diff 以发现新的或冲突的模式，对发现的任何冲突运行同样的逐一追问协议，并追加 evolution log 而不覆盖现有规则。
- **每轮执行** — 通过 `CLAUDE.md` 接入后，每个代码编写任务都以 compliance declaration 开头，指出所遵循的 exemplar 和所避免的 DONTs。

## 输出规范

- 项目根目录下的 `.ai-style-rules.md`（header 中含 commit fingerprint + scale tier）
- 可选的 `CLAUDE.md`，含 `@.ai-style-rules.md` 引用
- 以 `### [YYYY-MM-DD] Style Evolution Log` 条目形式追加 evolution log

## Anti-Patterns

- FAIL：绝不要跳过规模衡量步骤——对 30 个文件的项目抽样会"饿死"它；对 5000 个文件的仓库全量扫描会爆炸
- FAIL：绝不要一次堆叠多个冲突问题——追问严格逐一进行
- FAIL：绝不要在增量模式下覆盖旧规则——始终追加 evolution log
- FAIL：绝不要未经询问就默认"hard hook"——执行强度由用户决定
- FAIL：绝不要评判语法或 tech-stack 质量——此 skill 仅对齐 meta-architecture
- FAIL：绝不要从 exemplar 文件中复制 bug——复用结构，标记缺陷

## 最佳实践

- 扫描前用一行宣布检测到的模式（首次 vs 增量）和 scale tier
- 对于大型项目，先读 `--stat` 摘要，再对可疑文件进行定向 `Read`
- 让信号阈值处理噪声——843 对 8 的命名分裂应自动解决，无需打断用户
- 对信号强度存疑时，倾向于询问
- CLAUDE.md soft hook（`@.ai-style-rules.md`）通常足够；仅当用户想要机械执行时才用 hard hook

## 相关 Skills

- `init` — 用代码库文档初始化新的 CLAUDE.md
- `code-review` — 审查 diff 的正确性和风格问题
- `simplify` — 审查代码的复用和简化机会

## 示例

1. **首次引入**
   - 用户："帮我把 AI 引入到这个较旧的代码库，不改变它的风格。"
   - 动作：运行 Branch A 全量扫描 → 衡量规模 → 扫描 4 个维度 → 追问冲突 → 生成 `.ai-style-rules.md` → 提供 hook 强度（soft/hard/none）。

2. **团队变更后的增量更新**
   - 用户："我们新增了一个模块；保持现有风格规则不变。"
   - 动作：运行 Branch B 增量嗅探 → 将 Git delta 与记录的规则对比 → 追问任何新冲突 → 追加 evolution log 而不覆盖。

3. **通过 CLAUDE.md 执行 DONTs**
   - 用户："确保所有新代码与项目规则保持一致。"
   - 动作：安装 Soft hook → 每个会话自动加载 `.ai-style-rules.md` → 每个代码编写任务以 compliance declaration 开头，复用 exemplar 模式并避免 DONTs。
