---
name: evolve
description: 分析 instincts 并建议或生成进化后的结构
command: true
---

# Evolve 命令

## 实现

使用 plugin 根路径运行 instinct CLI：

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" evolve [--generate]
```

或者如果未设置 `CLAUDE_PLUGIN_ROOT`（手动安装）：

```bash
python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py evolve [--generate]
```

分析 instincts 并将相关的 instincts 聚类为更高层级的结构：
- **Commands**：当 instincts 描述用户主动调用的动作时
- **Skills**：当 instincts 描述自动触发的行为时
- **Agents**：当 instincts 描述复杂的多步骤流程时

## 用法

```
/evolve                    # 分析所有 instincts 并建议进化方案
/evolve --generate         # 同时在 evolved/{skills,commands,agents} 下生成文件
```

## 进化规则

### → Command（用户主动调用）
当 instincts 描述用户会显式请求的动作时：
- 多条关于“当用户要求……”的 instincts
- 带有诸如“当创建新的 X 时”之类 triggers 的 instincts
- 遵循可重复序列的 instincts

示例：
- `new-table-step1`：“当添加数据库表时，创建 migration”
- `new-table-step2`：“当添加数据库表时，更新 schema”
- `new-table-step3`：“当添加数据库表时，重新生成 types”

→ 创建：**new-table** command

### → Skill（自动触发）
当 instincts 描述应当自动发生的行为时：
- 模式匹配 triggers
- 错误处理响应
- 代码风格强制规则

示例：
- `prefer-functional`：“编写函数时，偏好函数式风格”
- `use-immutable`：“修改状态时，使用不可变模式”
- `avoid-classes`：“设计模块时，避免基于类的设计”

→ 创建：`functional-patterns` skill

### → Agent（需要深度/隔离）
当 instincts 描述能从隔离中受益的复杂多步骤流程时：
- 调试工作流
- 重构序列
- 研究任务

示例：
- `debug-step1`：“调试时，首先检查 logs”
- `debug-step2`：“调试时，隔离出失败的组件”
- `debug-step3`：“调试时，创建最小复现”
- `debug-step4`：“调试时，通过测试验证修复”

→ 创建：**debugger** agent

## 执行步骤

1. 检测当前项目上下文
2. 读取项目和全局 instincts（ID 冲突时项目优先）
3. 按 trigger/领域模式对 instincts 分组
4. 识别：
   - Skill 候选项（包含 2 条以上 instincts 的 trigger 聚类）
   - Command 候选项（高置信度的工作流 instincts）
   - Agent 候选项（更大、高置信度的聚类）
5. 适用时展示提升候选项（project -> global）
6. 如果传入 `--generate`，将文件写入：
   - 项目范围：`~/.claude/homunculus/projects/<project-id>/evolved/`
   - 全局回退：`~/.claude/homunculus/evolved/`

## 输出格式

```
============================================================
  EVOLVE ANALYSIS - 12 instincts
  Project: my-app (a1b2c3d4e5f6)
  Project-scoped: 8 | Global: 4
============================================================

High confidence instincts (>=80%): 5

## SKILL CANDIDATES
1. Cluster: "adding tests"
   Instincts: 3
   Avg confidence: 82%
   Domains: testing
   Scopes: project

## COMMAND CANDIDATES (2)
  /adding-tests
    From: test-first-workflow [project]
    Confidence: 84%

## AGENT CANDIDATES (1)
  adding-tests-agent
    Covers 3 instincts
    Avg confidence: 82%
```

## Flags

- `--generate`：除了分析输出外，还生成进化后的文件

## 生成文件格式

### Command
```markdown
---
name: new-table
description: Create a new database table with migration, schema update, and type generation
command: /new-table
evolved_from:
  - new-table-migration
  - update-schema
  - regenerate-types
---

# New Table Command

[Generated content based on clustered instincts]

## Steps
1. ...
2. ...
```

### Skill
```markdown
---
name: functional-patterns
description: Enforce functional programming patterns
evolved_from:
  - prefer-functional
  - use-immutable
  - avoid-classes
---

# Functional Patterns Skill

[Generated content based on clustered instincts]
```

### Agent
```markdown
---
name: debugger
description: Systematic debugging agent
model: sonnet
evolved_from:
  - debug-check-logs
  - debug-isolate
  - debug-reproduce
---

# Debugger Agent

[Generated content based on clustered instincts]
```
