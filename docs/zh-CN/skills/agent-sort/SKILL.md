---
name: agent-sort
description: 通过并行的、面向仓库的审查轮次，将 skills、commands、rules、hooks 及附加项归类到 DAILY 与 LIBRARY 两个桶中，为特定仓库构建基于证据的 ECC 安装计划。当需要将 ECC 裁剪到项目实际所需、而不是加载完整 bundle 时使用。
metadata:
  origin: ECC
---

# Agent Sort

当仓库需要项目专属的 ECC surface 而非默认的完整安装时，使用此 skill。

目标不是猜测什么"看起来有用"。目标是基于真实 codebase 的证据对 ECC 组件进行分类。

## 适用场景

- 项目只需要 ECC 的一个子集，完整安装噪声过多
- 仓库技术栈清晰，但没有人愿意逐一手动筛选 skills
- 团队希望有基于 grep 证据而非主观判断的可重复安装决策
- 需要将每次都加载的日常工作流 surface 与可搜索的 library/reference surface 分开
- 仓库已经漂移到错误的语言、rule 或 hook 集合，需要清理

## 不可妥协的规则

- 以当前仓库作为唯一事实来源，而非通用偏好
- 每个 DAILY 决策都必须引用具体的仓库证据
- LIBRARY 不意味着"删除"；它意味着"保持可访问，但默认不加载"
- 不要安装当前仓库无法使用的 hooks、rules 或 scripts
- 优先使用 ECC 原生 surface；不要引入第二套安装系统

## 输出

按顺序产出以下制品：

1. DAILY 清单
2. LIBRARY 清单
3. 安装计划
4. 验证报告
5. 可选的 `skill-library` router（如果项目需要）

## 分类模型

只使用两个桶：

- `DAILY`
  - 应在该仓库的每次 session 中加载
  - 与仓库的语言、框架、工作流或 operator surface 强匹配
- `LIBRARY`
  - 值得保留，但不值得默认加载
  - 应保持可通过搜索、router skill 或选择性手动使用访问

## 证据来源

在进行任何分类之前，先使用仓库本地证据：

- 文件扩展名
- 包管理器和 lockfile
- 框架配置
- CI 和 hook 配置
- build/test 脚本
- import 和依赖清单
- 明确描述技术栈的仓库文档

有用的命令包括：

```bash
rg --files
rg -n "typescript|react|next|supabase|django|spring|flutter|swift"
cat package.json
cat pyproject.toml
cat Cargo.toml
cat pubspec.yaml
cat go.mod
```

## 并行审查轮次

如果可使用并行 subagent，将审查拆分为以下轮次：

1. Agents
   - 分类 `agents/*`
2. Skills
   - 分类 `skills/*`
3. Commands
   - 分类 `commands/*`
4. Rules
   - 分类 `rules/*`
5. Hooks 和脚本
   - 分类 hook surface、MCP health check、辅助脚本和 OS 兼容性
6. Extras
   - 分类 context、示例、MCP 配置、模板和指引文档

如果不可使用 subagent，则按顺序执行相同的轮次。

## 核心工作流

### 1. 阅读仓库

在对任何东西进行分类之前，先确立真实的技术栈：

- 使用中的语言
- 使用中的框架
- 主要包管理器
- 测试栈
- lint/format 栈
- deployment/runtime surface
- 已存在的 operator 集成

### 2. 构建证据表

为每个候选 surface 记录：

- 组件路径
- 组件类型
- 拟归入的桶
- 仓库证据
- 简短理由

使用此格式：

```text
skills/frontend-patterns | skill | DAILY | 84 .tsx files, next.config.ts present | core frontend stack
skills/django-patterns   | skill | LIBRARY | no .py files, no pyproject.toml       | not active in this repo
rules/typescript/*       | rules | DAILY | package.json + tsconfig.json            | active TS repo
rules/python/*           | rules | LIBRARY | zero Python source files             | keep accessible only
```

### 3. 决定 DAILY 还是 LIBRARY

在以下情况下提升为 `DAILY`：

- 仓库明确使用匹配的技术栈
- 组件足够通用，能对每次 session 都有帮助
- 仓库已依赖相应的 runtime 或工作流

在以下情况下降级为 `LIBRARY`：

- 组件不在技术栈上
- 仓库以后可能需要它，但不是每天都需要
- 它增加了 context 开销却无即时相关性

### 4. 构建安装计划

将分类转化为行动：

- DAILY skills -> 安装或保留在 `.claude/skills/`
- DAILY commands -> 仅在仍然有用时作为显式 shim 保留
- DAILY rules -> 仅安装匹配的语言集合
- DAILY hooks/scripts -> 仅保留兼容的
- LIBRARY surface -> 通过搜索或 `skill-library` 保持可访问

如果仓库已使用选择性安装，更新该计划而不是创建另一套系统。

### 5. 创建可选的 library router

如果项目希望有一个可搜索的 library surface，创建：

- `.claude/skills/skill-library/SKILL.md`

该 router 应包含：

- 关于 DAILY 与 LIBRARY 的简短说明
- 分组的 trigger 关键词
- library 引用的存放位置

不要在 router 内部复制每个 skill 的主体。

### 6. 验证结果

在计划应用后，验证：

- 每个 DAILY 文件都存在于预期位置
- 没有遗留过期的语言 rule 处于激活状态
- 没有安装不兼容的 hook
- 最终的安装确实匹配仓库技术栈

返回一份简洁报告，包含：

- DAILY 数量
- LIBRARY 数量
- 已移除的过期 surface
- 未解决的问题

## 交接

如果下一步是交互式安装或修复，交接给：

- `configure-ecc`

如果下一步是重叠清理或目录审查，交接给：

- `skill-stocktake`

如果下一步是更大范围的 context 裁剪，交接给：

- `strategic-compact`

## 输出格式

按以下顺序返回结果：

```text
STACK
- 语言/框架/runtime 摘要

DAILY
- 始终加载的项及其证据

LIBRARY
- 可搜索/参考的项及其证据

INSTALL PLAN
- 应安装、移除或路由的内容

VERIFICATION
- 已运行的检查和剩余的差距
```
