---
name: workspace-surface-audit
description: 审计当前仓库、MCP server、plugin、connector、env surface 以及 harness 配置，然后推荐价值最高的 ECC 原生 skill、hook、agent 和 operator workflow。当用户希望获得 Claude Code 配置帮助，或了解其环境中实际可用的能力时使用。
metadata:
  origin: ECC
---

# 工作区 surface 审计

只读审计 skill，用于回答“这个工作区和机器当前实际能做什么，我们接下来应该添加或启用什么？”

这是 ECC 针对 setup-audit plugin 的原生答案。除非用户明确要求后续实施，否则不会修改任何文件。

## 何时使用

- 用户说“配置 Claude Code”、“推荐自动化”、“我该用什么 plugin 或 MCP？”或“我缺什么？”
- 在安装更多 skill、hook 或 connector 之前，先审计机器或仓库
- 将官方 marketplace plugin 与 ECC 原生覆盖范围进行对比
- 审查 `.env`、`.mcp.json`、plugin 设置或已连接 app 的 surface，找出缺失的 workflow 层
- 决定某项能力应当是 skill、hook、agent、MCP，还是外部 connector

## 不可妥协的规则

- 永不打印 secret 的值。只呈现 provider 名、能力名、文件路径，以及某个 key 或 config 是否存在。
- 当 ECC 能够合理掌控该 surface 时，优先采用 ECC 原生 workflow，而非“再装一个 plugin”这种通用建议。
- 将外部 plugin 视为基准和灵感，而非权威的产品边界。
- 清晰区分以下三件事：
  - 当前已经可用
  - 可用但 ECC 尚未良好封装
  - 不可用，需要新的集成

## 审计输入

只检查为充分回答问题所需的文件和设置：

1. 仓库 surface
   - `package.json`、lockfile、语言标记、框架 config、`README.md`
   - `.mcp.json`、`.lsp.json`、`.claude/settings*.json`、`.codex/*`
   - `AGENTS.md`、`CLAUDE.md`、install manifest、hook 配置
2. 环境 surface
   - 当前仓库以及明显的相邻 ECC workspace 中的 `.env*` 文件
   - 只呈现 key 名，例如 `STRIPE_API_KEY`、`TWILIO_AUTH_TOKEN`、`FAL_KEY`
3. 已连接工具 surface
   - 已安装的 plugin、已启用的 connector、MCP server、LSP 以及 app 集成
4. ECC surface
   - 已有的、能覆盖该需求的 skill、command、hook、agent 和 install module

## 审计流程

### 阶段 1：清点现有内容

产出一份简洁清单：

- 当前生效的 harness 目标
- 已安装的 plugin 和已连接的 app
- 已配置的 MCP server
- 已配置的 LSP server
- 由 key 名暗示的、基于 env 的服务
- 已与该 workspace 相关的现有 ECC skill

如果某个 surface 仅以 primitive 形式存在，要明确指出。例如：

- “Stripe 通过已连接的 app 可用，但 ECC 缺少 billing-operator skill”
- “Google Drive 已连接，但没有 ECC 原生的 Google Workspace operator workflow”

### 阶段 2：与官方及已安装的 surface 基准对比

将该 workspace 与以下各项对比：

- 与 setup、review、docs、design 或 workflow 质量相重叠的官方 Claude plugin
- Claude 或 Codex 中本地安装的 plugin
- 用户当前已连接的 app surface

不要只列名字。对每项对比回答：

1. 它们实际做什么
2. ECC 是否已具备对等能力
3. ECC 是否仅有 primitive
4. ECC 是否完全缺失该 workflow

### 阶段 3：将缺口转化为 ECC 决策

对每一个真实缺口，推荐正确的 ECC 原生形态：

| 缺口类型 | 推荐的 ECC 形态 |
|----------|---------------------|
| 可复用的 operator workflow | Skill |
| 自动强制执行或副作用 | Hook |
| 专门的委派角色 | Agent |
| 外部工具桥接 | MCP server 或 connector |
| 安装/bootstrap 指导 | Setup 或 audit skill |

当需求偏运营而非基础架构时，默认采用面向用户、用于编排现有工具的 skill。

## 输出格式

按以下顺序返回五个小节：

1. **当前 surface**
   - 当前已经可用的内容
2. **对等能力**
   - ECC 已经匹配或超越基准的地方
3. **仅有 primitive 的缺口**
   - 工具存在，但 ECC 缺少一个干净的 operator skill
4. **缺失的集成**
   - 尚不可用的能力
5. **前 3-5 项下一步行动**
   - 具体的 ECC 原生增补，按影响力排序

## 推荐规则

- 每个类别最多推荐 1-2 个最高价值的想法。
- 偏好具有明确用户意图和业务价值的 skill：
  - setup 审计
  - 计费/客户运营
  - issue/项目运营
  - Google Workspace 运营
  - 部署/运维控制
- 如果某个 connector 是公司专属的，仅当它确实可用或明显对用户 workflow 有用时才推荐。
- 如果 ECC 已经有强力的 primitive，提出一个 wrapper skill，而不是另起炉灶发明一个全新子系统。

## 良好结果

- 用户能立即看清什么已连接、什么缺失、ECC 接下来应当掌控什么。
- 推荐足够具体，可以直接在仓库中实施，无需再做一次探索。
- 最终答案围绕 workflow 组织，而非围绕 API 品牌。
