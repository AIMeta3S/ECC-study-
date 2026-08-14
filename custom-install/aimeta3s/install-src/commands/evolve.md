---
name: evolve
description: 分析 instincts 并建议或生成进化后的结构
command: true
---

# Evolve Command

## 实现

使用 plugin 根路径运行 instinct CLI（未设置 `CLAUDE_PLUGIN_ROOT` 时回退到 `~/.claude`）：

```bash
python3 "${CLAUDE_PLUGIN_ROOT:-$HOME/.claude}/skills/continuous-learning-v2/scripts/instinct-cli.py" evolve [--generate]
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
- 带有诸如“当创建新的 X 时”之类触发条件的 instincts
- 遵循可重复序列的 instincts

示例：
- `new-table-step1`：“当添加数据库表时，创建 migration”
- `new-table-step2`：“当添加数据库表时，更新 schema”
- `new-table-step3`：“当添加数据库表时，重新生成 types”

→ 创建：**new-table** command

### → Skill（自动触发）
当 instincts 描述应当自动发生的行为时：
- 模式匹配触发器
- 错误处理响应
- 代码风格强制规则

示例：
- `prefer-functional`：“当编写函数时，优先使用函数式风格”
- `use-immutable`：“当修改状态时，使用不可变模式”
- `avoid-classes`：“当设计模块时，避免基于类的设计”

→ 创建：`functional-patterns` skill

### → Agent（需要深度/隔离）
当本能描述复杂的、多步骤的流程且适合隔离运行时：
- 调试工作流
- 重构序列
- 研究任务

示例：
- `debug-step1`：“调试时，首先检查 logs”
- `debug-step2`：“调试时，隔离出失败的组件”
- `debug-step3`：“调试时，创建最小复现”
- `debug-step4`：“调试时，通过测试验证修复”

→ 创建：**debugger** agent

## What to Do

1. 检测当前项目上下文
2. 读取项目和全局 instincts（ID 冲突时项目优先）
3. 按 触发/领域 模式对 instincts 分组
4. Identify:
   - Skill candidates (trigger clusters with 2+ instincts)
   - Command candidates (high-confidence workflow instincts)
   - Agent candidates (larger, high-confidence clusters)
5. Show promotion candidates (project -> global) when applicable
6. 如果传入 `--generate`，将文件写入：
   - 项目范围：`${XDG_DATA_HOME:-~/.local/share}/ecc-homunculus/projects/<project-id>/evolved/`
   - 全局回退：`${XDG_DATA_HOME:-~/.local/share}/ecc-homunculus/evolved/`

## 输出格式示例

```
============================================================
  EVOLVE 分析 - 12 条 instincts
  项目：my-app (a1b2c3d4e5f6)
  项目范围：8 | 全局：4
============================================================

高置信度 instincts（>=80%）：5

## SKILL 候选项
1. 聚类："adding tests"
   Instincts：3
   平均置信度：82%
   领域：testing
   范围：project

## COMMAND 候选项（2）
  /adding-tests
    来源：test-first-workflow [project]
    置信度：84%

## AGENT 候选项（1）
  adding-tests-agent
    涵盖 3 条 instincts
    平均置信度：82%
```

## Flags

- `--generate`：除了分析输出外，还生成进化后的文件

## 生成文件格式示例

### Command
```markdown
---
name: new-table
description: 创建新的数据库表，包含迁移、schema 更新及类型生成
command: /new-table
evolved_from:
  - new-table-migration
  - update-schema
  - regenerate-types
---

# New Table Command

[基于聚类 instincts 生成的内容]

## 步骤
1. ...
2. ...
```

### Skill
```markdown
---
name: functional-patterns
description: 强制执行函数式编程模式
evolved_from:
  - prefer-functional
  - use-immutable
  - avoid-classes
---

# Functional Patterns Skill

[基于聚类 instincts 生成的内容]
```

### Agent
```markdown
---
name: debugger
description: 系统化调试 agent
model: sonnet
evolved_from:
  - debug-check-logs
  - debug-isolate
  - debug-reproduce
---

# Debugger Agent

[基于聚类 instincts 生成的内容]
```
