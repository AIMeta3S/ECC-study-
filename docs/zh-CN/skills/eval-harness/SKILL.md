---
name: eval-harness
description: Claude Code 会话的正式评估框架，实现 eval-driven development (EDD) 原则
metadata:
  origin: ECC
tools: Read, Write, Edit, Bash, Grep, Glob
---

# Eval Harness Skill

Claude Code 会话的正式评估框架，实现 eval-driven development (EDD) 原则。

## When to Activate

- 为 AI 辅助的工作流搭建 eval-driven development (EDD)
- 为 Claude Code 任务完成定义 pass/fail 标准
- 用 pass@k 指标衡量 agent 可靠性
- 为 prompt 或 agent 变更创建 regression test 套件
- 跨 model 版本对 agent 性能进行 benchmark

## Philosophy

Eval-Driven Development 将 eval 视为“AI 开发的 unit test”：
- 在实现之前定义预期行为
- 在开发过程中持续运行 eval
- 每次变更跟踪 regression
- 使用 pass@k 指标衡量可靠性

## Eval Types

### Capability Evals
测试 Claude 能否完成之前做不到的事：
```markdown
[CAPABILITY EVAL: feature-name]
Task: Description of what Claude should accomplish
Success Criteria:
  - [ ] Criterion 1
  - [ ] Criterion 2
  - [ ] Criterion 3
Expected Output: Description of expected result
```

### Regression Evals
确保变更不会破坏现有功能：
```markdown
[REGRESSION EVAL: feature-name]
Baseline: SHA or checkpoint name
Tests:
  - existing-test-1: PASS/FAIL
  - existing-test-2: PASS/FAIL
  - existing-test-3: PASS/FAIL
Result: X/Y passed (previously Y/Y)
```

## Grader Types

### 1. Code-Based Grader
使用代码进行确定性检查：
```bash
# 检查文件是否包含预期的 pattern
grep -q "export function handleAuth" src/auth.ts && echo "PASS" || echo "FAIL"

# 检查测试是否通过
npm test -- --testPathPattern="auth" && echo "PASS" || echo "FAIL"

# 检查 build 是否成功
npm run build && echo "PASS" || echo "FAIL"
```

### 2. Model-Based Grader
使用 Claude 评估开放式输出：
```markdown
[MODEL GRADER PROMPT]
Evaluate the following code change:
1. Does it solve the stated problem?
2. Is it well-structured?
3. Are edge cases handled?
4. Is error handling appropriate?

Score: 1-5 (1=poor, 5=excellent)
Reasoning: [explanation]
```

### 3. Human Grader
标记为人工 review：
```markdown
[HUMAN REVIEW REQUIRED]
Change: Description of what changed
Reason: Why human review is needed
Risk Level: LOW/MEDIUM/HIGH
```

## Metrics

### pass@k
“k 次尝试中至少成功一次”
- pass@1：首次尝试成功率
- pass@3：3 次尝试内成功
- 典型目标：pass@3 > 90%

### pass^k
“k 次试验全部成功”
- 更高的可靠性标准
- pass^3：连续 3 次成功
- 用于关键路径

## Eval Workflow

### 1. Define（编码之前）
```markdown
## EVAL DEFINITION: feature-xyz

### Capability Evals
1. Can create new user account
2. Can validate email format
3. Can hash password securely

### Regression Evals
1. Existing login still works
2. Session management unchanged
3. Logout flow intact

### Success Metrics
- pass@3 > 90% for capability evals
- pass^3 = 100% for regression evals
```

### 2. Implement
编写代码以通过已定义的 eval。

### 3. Evaluate
```bash
# 运行 capability eval
[Run each capability eval, record PASS/FAIL]

# 运行 regression eval
npm test -- --testPathPattern="existing"

# 生成报告
```

### 4. Report
```markdown
EVAL REPORT: feature-xyz
========================

Capability Evals:
  create-user:     PASS (pass@1)
  validate-email:  PASS (pass@2)
  hash-password:   PASS (pass@1)
  Overall:         3/3 passed

Regression Evals:
  login-flow:      PASS
  session-mgmt:    PASS
  logout-flow:     PASS
  Overall:         3/3 passed

Metrics:
  pass@1: 67% (2/3)
  pass@3: 100% (3/3)

Status: READY FOR REVIEW
```

## Integration Patterns

### Pre-Implementation
```
/eval define feature-name
```
在 `.claude/evals/feature-name.md` 创建 eval 定义文件

### During Implementation
```
/eval check feature-name
```
运行当前 eval 并报告状态

### Post-Implementation
```
/eval report feature-name
```
生成完整的 eval 报告

## Eval Storage

在项目中存储 eval：
```
.claude/
  evals/
    feature-xyz.md      # Eval 定义
    feature-xyz.log     # Eval 运行历史
    baseline.json       # Regression baseline
```

## Best Practices

1. **在编码之前定义 eval** —— 强迫清晰思考成功标准
2. **频繁运行 eval** —— 尽早发现 regression
3. **随时间跟踪 pass@k** —— 监控可靠性趋势
4. **尽可能使用 code grader** —— 确定性优于概率性
5. **安全相关由人工 review** —— 永远不要完全自动化安全检查
6. **保持 eval 快速** —— 慢的 eval 不会被执行
7. **eval 与代码一起版本化** —— eval 是一等制品

## Example: Adding Authentication

```markdown
## EVAL: add-authentication

### Phase 1: Define (10 min)
Capability Evals:
- [ ] User can register with email/password
- [ ] User can login with valid credentials
- [ ] Invalid credentials rejected with proper error
- [ ] Sessions persist across page reloads
- [ ] Logout clears session

Regression Evals:
- [ ] Public routes still accessible
- [ ] API responses unchanged
- [ ] Database schema compatible

### Phase 2: Implement (varies)
[Write code]

### Phase 3: Evaluate
Run: /eval check add-authentication

### Phase 4: Report
EVAL REPORT: add-authentication
==============================
Capability: 5/5 passed (pass@3: 100%)
Regression: 3/3 passed (pass^3: 100%)
Status: SHIP IT
```

## Product Evals (v1.8)

当行为质量无法仅靠 unit test 捕获时，使用 product eval。

### Grader Types

1. Code grader（确定性断言）
2. Rule grader（regex/schema 约束）
3. Model grader（LLM-as-judge rubric）
4. Human grader（对模糊输出的人工裁决）

### pass@k Guidance

- `pass@1`：直接可靠性
- `pass@3`：受控重试下的实际可靠性
- `pass^3`：稳定性测试（3 次运行必须全部通过）

推荐 threshold：
- Capability eval：pass@3 >= 0.90
- Regression eval：release-critical 路径 pass^3 = 1.00

### Eval Anti-Patterns

- 将 prompt 过拟合到已知 eval 样例
- 只衡量 happy-path 输出
- 在追求 pass 率时忽视成本和延迟漂移
- 在 release gate 中允许 flaky grader

### Minimal Eval Artifact Layout

- `.claude/evals/<feature>.md` 定义
- `.claude/evals/<feature>.log` 运行历史
- `docs/releases/<version>/eval-summary.md` release 快照
