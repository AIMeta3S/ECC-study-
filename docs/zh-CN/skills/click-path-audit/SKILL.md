---
name: click-path-audit
description: "追踪每个面向用户的按钮/触点，贯穿其完整的状态变更序列，以发现那些函数单独运行正常却相互抵消、产生错误的最终状态、或使 UI 处于不一致状态的 bug。适用场景：systematic debugging 未发现 bug 但用户报告按钮失效，或任何涉及共享状态 store 的重大 refactor 之后。"
metadata:
  origin: community
---

# /click-path-audit — 行为流程审计

发现静态代码阅读会遗漏的 bug：状态交互的 side effect、顺序调用之间的 race condition，以及相互悄然撤销的 handler。

## 本 skill 解决的问题

传统 debug 会检查：
- 函数是否存在？（缺少连接）
- 是否崩溃？（运行时错误）
- 返回类型是否正确？（数据流）

但它不会检查：
- **最终 UI 状态是否与按钮 label 所承诺的一致？**
- **函数 B 是否悄然撤销了函数 A 刚做的事？**
- **共享状态（Zustand/Redux/context）是否有抵消预期操作的 side effect？**

真实案例：一个 "New Email" 按钮先调用 `setComposeMode(true)` 再调用 `selectThread(null)`。两者单独运行都正常。但 `selectThread` 有一个重置 `composeMode: false` 的 side effect。按钮毫无作用。systematic debugging 发现了 54 个 bug——这一个被遗漏了。

---

## 工作原理

对目标区域内的每一个交互式触点：

```
1. IDENTIFY the handler (onClick, onSubmit, onChange, etc.)
2. TRACE every function call in the handler, IN ORDER
3. For EACH function call:
   a. What state does it READ?
   b. What state does it WRITE?
   c. Does it have SIDE EFFECTS on shared state?
   d. Does it reset/clear any state as a side effect?
4. CHECK: Does any later call UNDO a state change from an earlier call?
5. CHECK: Is the FINAL state what the user expects from the button label?
6. CHECK: Are there race conditions (async calls that resolve in wrong order)?
```

---

## 执行步骤

### Step 1：梳理状态 store

在审计任何触点之前，先为每个状态 store action 建立一份 side effect 映射图：

```
For each Zustand store / React context in scope:
  For each action/setter:
    - What fields does it set?
    - Does it RESET other fields as a side effect?
    - Document: actionName → {sets: [...], resets: [...]}
```

这是关键参考资料。在不知道 `selectThread` 会重置 `composeMode` 的情况下，"New Email" bug 是无法发现的。

**输出格式：**
```
STORE: emailStore
  setComposeMode(bool) → sets: {composeMode}
  selectThread(thread|null) → sets: {selectedThread, selectedThreadId, messages, drafts, selectedDraft, summary} RESETS: {composeMode: false, composeData: null, redraftOpen: false}
  setDraftGenerating(bool) → sets: {draftGenerating}
  ...

DANGEROUS RESETS (actions that clear state they don't own):
  selectThread → resets composeMode (owned by setComposeMode)
  reset → resets everything
```

### Step 2：审计每个触点

对目标区域内的每个按钮/toggle/表单提交：

```
TOUCHPOINT: [Button label] in [Component:line]
  HANDLER: onClick → {
    call 1: functionA() → sets {X: true}
    call 2: functionB() → sets {Y: null} RESETS {X: false}  ← CONFLICT
  }
  EXPECTED: User sees [description of what button label promises]
  ACTUAL: X is false because functionB reset it
  VERDICT: BUG — [description]
```

**逐一检查以下 bug 模式：**

#### Pattern 1: Sequential Undo
```
handler() {
  setState_A(true)     // 设置 X = true
  setState_B(null)     // side effect: 重置 X = false
}
// 结果：X 为 false。第一次调用毫无意义。
```

#### Pattern 2: Async Race
```
handler() {
  fetchA().then(() => setState({ loading: false }))
  fetchB().then(() => setState({ loading: true }))
}
// 结果：最终 loading 状态取决于哪个先 resolve
```

#### Pattern 3: Stale Closure
```
const [count, setCount] = useState(0)
const handler = useCallback(() => {
  setCount(count + 1)  // 捕获了 stale count
  setCount(count + 1)  // 同样的 stale count —— 只增加 1，而非 2
}, [count])
```

#### Pattern 4: Missing State Transition
```
// 按钮写着 "Save"，但 handler 只做校验，从不真正保存
// 按钮写着 "Delete"，但 handler 只设置 flag，未调用 API
// 按钮写着 "Send"，但 API endpoint 已被移除/损坏
```

#### Pattern 5: Conditional Dead Path
```
handler() {
  if (someState) {        // someState 在此处始终为 false
    doTheActualThing()    // 永远不会执行到这里
  }
}
```

#### Pattern 6: useEffect Interference
```
// 按钮设置 stateX = true
// 一个 useEffect 监听 stateX 并将其重置为 false
// 用户看到什么都没发生
```

### Step 3：报告

对发现的每个 bug：

```
CLICK-PATH-NNN: [severity: CRITICAL/HIGH/MEDIUM/LOW]
  Touchpoint: [Button label] in [file:line]
  Pattern: [Sequential Undo / Async Race / Stale Closure / Missing Transition / Dead Path / useEffect Interference]
  Handler: [function name or inline]
  Trace:
    1. [call] → sets {field: value}
    2. [call] → RESETS {field: value}  ← CONFLICT
  Expected: [what user expects]
  Actual: [what actually happens]
  Fix: [specific fix]
```

---

## 范围控制

本审计开销较大。需合理界定范围：

- **全应用审计：** 在发布或重大 refactor 之后使用。按页面并行启动多个 agent。
- **单页面审计：** 在构建新页面或用户报告按钮失效之后使用。
- **Store 专项审计：** 在修改某个 Zustand store 之后使用——审计所修改 action 的所有 consumer。

### 全应用审计推荐的 agent 切分：

```
Agent 1: Map ALL state stores (Step 1) — this is shared context for all other agents
Agent 2: Dashboard (Tasks, Notes, Journal, Ideas)
Agent 3: Chat (DanteChatColumn, JustChatPage)
Agent 4: Emails (ThreadList, DraftArea, EmailsPage)
Agent 5: Projects (ProjectsPage, ProjectOverviewTab, NewProjectWizard)
Agent 6: CRM (all sub-tabs)
Agent 7: Profile, Settings, Vault, Notifications
Agent 8: Management Suite (all pages)
```

Agent 1 必须最先完成。它的输出是所有其他 agent 的输入。

---

## 何时使用

- 在 systematic debugging 发现"没有 bug"但用户报告 UI 失效之后
- 在修改任何 Zustand store action 之后（检查所有 caller）
- 在任何涉及共享状态的 refactor 之后
- 发布前，针对关键用户流程
- 当某个按钮"毫无反应"时——本 skill 正是为此而生

## 何时不应使用

- API 层面的 bug（响应结构错误、缺少 endpoint）——使用 systematic-debugging
- 样式/布局问题——视觉检查
- 性能问题——profiling 工具

---

## 与其他 skill 的集成

- 在 `/superpowers:systematic-debugging` 之后运行（后者负责发现其余 54 类 bug）
- 在 `/superpowers:verification-before-completion` 之前运行（后者负责验证修复是否生效）
- 结果馈入 `/superpowers:test-driven-development`——此处发现的每个 bug 都应配对一个测试

---

## 示例：启发本 skill 的那个 bug

**ThreadList.tsx 的 "New Email" 按钮：**
```
onClick={() => {
  useEmailStore.getState().setComposeMode(true)   // ✓ 设置 composeMode = true
  useEmailStore.getState().selectThread(null)      // ✗ RESETS composeMode = false
}}
```

Store 定义：
```
selectThread: (thread) => set({
  selectedThread: thread,
  selectedThreadId: thread?.id ?? null,
  messages: [],
  drafts: [],
  selectedDraft: null,
  summary: null,
  composeMode: false,     // ← 正是这个 silent reset 让按钮失效
  composeData: null,
  redraftOpen: false,
})
```

**systematic debugging 之所以遗漏它**，是因为：
- 按钮有 onClick handler（未失活）
- 两个函数都存在（没有缺少连接）
- 两个函数都不崩溃（没有运行时错误）
- 数据类型都正确（没有类型不匹配）

**click-path audit 之所以能发现它**，是因为：
- Step 1 梳理出 `selectThread` 会重置 `composeMode`
- Step 2 追踪 handler：调用 1 设为 true，调用 2 重置为 false
- 结论：Sequential Undo——最终状态与按钮意图相矛盾
