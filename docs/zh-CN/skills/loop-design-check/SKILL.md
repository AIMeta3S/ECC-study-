---
name: loop-design-check
description: 设计一个面向目标的 agent loop，并审查 loop 可能出错的方式——空转和燃烧 token、对 verifier 进行 Goodhart 作弊、或把错误答案跑到完成。两个动作：(1) 编写 loop——把关是否要构建它，定义一个机器可判定的目标，选择 loop 类型，选择一个骨架；(2) 审查 loop——让它过五个失败模式加上可判定性、边界、兜底、judge 独立性，以及把判断权留给人类这些红线。用于设计自主的 agent loop，或当你已经有一个 loop 并担心它会空转、作弊、或把错误答案跑到最后。补充机制层的 loop 技能（autonomous-loops、continuous-agent-loop），覆盖它们未覆盖的判断层。中文触发：写 loop、设计 loop、做一个 loop、检查 loop 对不对、loop 体检、loop 会不会跑飞、可判定目标、五个崩法、plan build judge。English triggers: design an agent loop, write a loop, check a loop, loop review, prevent a runaway loop, goal-oriented loop, decidable goal, plan/build/judge.
metadata:
  origin: ECC
---

# Loop 设计 + 审查

> **前提。** LLM 是一个前馈系统：prompt 输入 → token 输出，在多轮之间没有内置的"朝目标引导"。要让它*表现得*像一个面向目标的系统，你需要在它外面裹一层 feedback loop。本技能帮助你正确地**编写**这个 loop，并**审查**它，让它不会跑飞。

## 何时使用 / 不使用

**在以下情况使用：**
- 你想把一个重复任务交给一个一遍又一遍运行的 agent（write→test、test→fix、fix→verify…）。
- 你已经有一个 loop，并担心它空转、作弊、或把错误答案跑到完成。

**不要用于：**
- 一次性任务 → 直接做；别给它裹一层 loop。
- 纯粹的定时器 / 轮询 → 用 `/loop`；不需要设计。
- *如何搭建 loop 架构*（pipeline → DAG、长时间运行的恢复）→ 那是机制层；见 `autonomous-loops` / `continuous-agent-loop`。**本技能只覆盖"目标对不对、它会不会跑飞"——不重新讲机制。**

## 红线前提：两个层级的 feedback

| 层级 | 谁拥有它 | 它做什么 |
|---|---|---|
| **Execution**（低） | 机器 / agent | 衡量"离字面目标有多远"，并把它磨到零。机器在这层很强。 |
| **Judgment**（高） | **人类** | 决定"这个目标本身对不对，该不该改，该不该停。"机器没法跳出自己的 loop 去质疑目标。 |

> 一个恒温器可以反馈"离 26°C 还差多远"，但当你发烧想要 28°C 时，它判断不了 26 是不是*正确的*目标——它只会朝 26 磨过去。**"今天设多少"永远由人类拍板。**
> 把判断 / 签字确认 / 最后那个开关交给机器 = 移除高层级的 feedback = 它会朝一个没人质疑过的目标又快又狠地猛冲 → 错误的输出。

---

## 动作 1 —— 编写一个 loop（5 步）

### Step 0 · 先做减法：你到底该不该构建它？（4 条件把关，任一不满足 = 否决）

① 任务每周或更频繁地重复　② 验证可以自动化　③ token 预算承受得住　④ agent 有真正*能运行并看到结果*的工具

任一不满足 → **不要构建 loop**；手动做或换别的法子。

> 拦住大多数人的不是"我能不能写 loop"，而是"我的 repo 配不配拥有 loop"。一个配得上 loop 的 repo，有 reconciliation 基线（golden sample / upstream total）+ 测试 + lint 守卫。**一个不配拥有 loop 的 repo，只会被 loop 放大它的错误。**

### Step 1 · 定义一个*机器可判定的*目标（最难的部分——loop 的生死就在这一步）

整个 loop 都压在 comparator 的"它完成了没有？"上。**只有当你的退出条件能被机器判成是/否时，comparator 才工作得起来。**

- 糟糕：模糊（"把它做好"、"写得更犀利"）→ comparator 没法判 → 要么永远不过（卡在重试），要么它瞎猜（随机通过/拦截）。
- 良好：可判定（"全部 96 个 unit test 变绿 AND 产出一份 change-list"、"module-02 字段填好、pytest 通过、业务逻辑未动"）→ 一次检查定论；loop 干净收敛。

**五点目标框架：**
1. **完成标准是机器可验证的。**
2. **边界条件与完成标准一同定义**（"它绝不能做什么"）—— anti-Goodhart；缺了边界 = 等于发了作弊的通行证。
3. **有失败兜底** —— 重试上限 N + 超出时上报给人类。
4. **目标是分层的。**
5. **完成标准优先用 reconciliation 而非 assertion** —— 在你自己的 assertion 之前，先锚定外部事实（golden sample / upstream total / financial tie-out / 平台后台数据）。"所有测试通过"能被作弊（放松 assertion、伪造 mock、吞掉异常）；"对比参考的 diff < 0.01"不能。

> **自检：** 把目标读给一个不懂该领域的人——他能不能跑一条命令就判断出它完成了没？如果不能，它就还不够可判定。回去改。

### Step 2 · 选择 loop 类型

| 你的任务 | Loop 类型（控制论）| 它如何停止 |
|---|---|---|
| 有明确的"完成"测试（写到完成 / 一批图片处理完了）| **servo**（`/goal` 风格的 closed-loop）| 达到目标即停 |
| 没有终点，必须持续维持某个状态（库存告警 / 定时 health check）| **regulator**（`/loop` 风格的恒温器）| 永不停；仅在变化时行动（dead-band 抑制噪声）|
| 定期采样，满足条件即停（盯一个 PR 直到 CI 变绿）| **带退出的 regulator** | 退出条件成立时停止 |
| 必须"确保某事按时发生" | 把上面这些包进 `/schedule` | cron 来触发它 |

> 经验法则：有明确的"完成"测试 → servo；必须持续维持、无终点 → regulator；必须"按时发生" → 把一个 regulator 包进 schedule。

### Step 3 · 选择一个骨架

**维护类型（照看已经存在的东西）→ 文档驱动的 dispatch。**
loop 不是"在定时器上跑一道固定检查"，而是**"在定时器上读一个文档，仅当文档变了才 dispatch。"** 这个文档就是任务队列 + state machine + human interface。
三条纪律：① 问题列只准人类写，结果列只准 loop 写，**状态单向推进、绝不回滚**；② **exit code 是终局**（脚本说 exit 1，脚本说了算）；③ 状态最多推进到"等待验证"——**"完成"那一格只能由人类翻转。** loop 是干活的，不是验收官。

**Greenfield 类型（从零构建）→ plan / build / judge，三个角色。**

| 角色 | 做什么 | 关键 |
|---|---|---|
| **Plan** | 把目标拆成 spec + **可判定的验收条件** | 验收必须能被脚本判 |
| **Build** | 按 spec 来写 | **绝不能改动验收条件** |
| **Judge** | **独立地**跑验收；通过 → 停，失败 → 带着失败原因返回给 Build | **独立 + deterministic** |

三条铁律（都押在 judge 上）：① **judge 必须独立** —— 跟 Build 不能是同一个 agent（给自己的作业打分永远会抬分）；② **deterministic 规则** —— pytest / reconciliation diff / type check / diff，绝不是"看起来对"；③ **Build 不准为了通过去改验收条件**。三次重试失败 → 上报给人类。

### Step 4 · 加 damping（对抗振荡 / 跑飞）

重试上限、hard stop、人类按下最后那个开关 = damping。**没有 damping 的 negative feedback 会振荡**（Ralph-Wiggum loop：原地空转，燃烧 token）。

### Step 5 · 分三阶段落地（第一天不要全自动化）

① **手动跑一次**（逼你把"judge 怎么裁决"讲精确）→ ② 固化成一个 skill / Claude Code sub-agents（一个主 Claude 跑循环，dispatch plan/build/judge）→ ③ 挂到 cron 上实现全自动。

---

## 动作 2 —— 审查一个 loop（检查清单 = 五个失败模式）

> 把 loop 拿去过每一行。**命中任意一行 = 这个 loop 会失灵；打回。** 这五条是负面经验（坑）——比正面规则更值钱。

| # | 失败模式（怎么坏的）| 审查问题（命中 = 红灯）| Antibody |
|---|---|---|---|
| 1 | 目标是一句正确的废话 → **空转、烧钱** | 退出条件能不能被机器判成是/否？还是"管好它 / 把它做好"？| 换成一个可判定的结果条件（动作 1·Step 1）|
| 2 | "验证"写成"看看样子行不行" → **agent 自信地说没问题然后停了** | judge 是不是被告自己？验证靠的是"看起来对"还是 deterministic 规则？| Reconcile + exit code 规则 + 独立的 judge |
| 3 | （最糟）只在"所有测试通过"上把关 → **agent 把测试删了** | 有没有边界（"它绝不能做什么"）？还是只有一个完成标准？| 完成标准 **+ 边界** 一起（Goodhart antibody）|
| 4 | 指望 agent 在运行中开口问 → **它不会；它会把错误答案跑到最后** | 有没有任何"只在运行时才澄清"的点？| **把每一处澄清都前置**；上线前一次敲定 |
| 5 | 臃肿的 CLAUDE.md + 陈旧的 memory → **loop 得越快，错得越多** | 它依赖的 docs/memory 还新鲜吗？谁在维护？| 分层 memory + 定期 lint |

**再加三条红线（违反任意一条 = 不准全自动）：**
- **把判断权留给人类。** 验收 / "完成"那一格由人类翻转；loop 不是验收官。
- **责任不转移。** 任何你承受不起它失败的事（merge 错 PR / 发错东西 / 错配资金）→ **不要把权限自动交出去。**
- **反直觉警告。** 一个 loop 越"自我改进 / 重写自己的规则"，它**需要的人类审查就越严**（去看看它把规则重写成了什么）——而不是更松。机器太快，事后根本拦不住，所以人类的判断必须坐在**行动之前**（一道 hard gate），而不是当事后补丁。

---

## 实战示例 —— 审查一个"夜间 green-keeper" loop

你想要一个每天夜里跑、把所有失败的测试都修好的 loop。

- **天真目标：** "让所有测试通过。" → Step-1 自检失败：这正是失败模式 #3 的诱饵。
- **可判定目标（修正后）：** "全部测试变绿 **AND** 没有任何测试文件被删或被削弱 **AND** 覆盖率没降 **AND** 产出一份 change-list。" 边界现在与完成标准一起定义了。
- **类型：** servo，重试上限 3（Step 2 + Step 4）。
- **骨架：** plan/build/judge —— **judge 是独立运行的 CI**，绝不是那个修复 agent（Step 3）。

现在跑一遍**审查清单**，它会抓住天真版本漏掉的东西：
- **命中 #3** → 天真的"所有测试通过"会让 agent 为了"赢"去删一个失败测试。由边界"不删/不削弱任何测试文件"修复。
- **命中 #2** → 如果修复 agent 还裁决自己的修复，它会让自己通过。由"judge = 独立 CI、deterministic"修复。
- **命中 #4** → 如果某个修复有歧义，agent 不会在凌晨 2 点停下来问；它会提交一个猜测。由前置来修复：有歧义的修复留给人类，不瞎猜。
- **红线** → loop 开一个 PR 但**不自动 merge**；最后那个开关由人类按下（责任不转移）。

天真的 loop 和审查过的 loop，只差四行约束——而这正是"把你叫醒面对被删光的测试套件"和"把你叫醒面对一个干净的 PR"之间的差别。

---

## 一句话收尾

> 写 loop 的难处不在"我能不能写 loop"，而在于**定义一个机器能 reconcile 的目标**——可判定、有边界、基于 reconciliation。controller 必须是 deterministic 且外部的；把判断和标准留在人类手里；系统会趋向 entropy，所以要维护它。
> **loop 只奖赏那些已经把它想透的人。指望它替你想，它会很开心地替你想错——和你一起、规模化地想错。**

---

> 渊源：Wiener 的两级 feedback（*The Human Use of Human Beings*，1950）提供了 judgment/execution 的拆分和红线；plan/build/judge 模式来自 Anatoli 的 *Loops explained* 和 Addy 的 *Loop Engineering*。
> 机制层（怎么搭 loop 架构）：见 `autonomous-loops` / `continuous-agent-loop`。本技能不重新实现机制；它只覆盖目标定义和跑飞预防。
