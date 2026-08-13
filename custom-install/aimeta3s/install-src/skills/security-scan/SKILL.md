---
name: security-scan
description: 使用 AgentShield 扫描您的 Claude Code 配置（.claude/ 目录），查找安全漏洞、配置错误和注入风险。检查内容包括 CLAUDE.md、settings.json、MCP server、hooks 和 agent 定义。
metadata:
  origin: ECC
---

# Security Scan 技能

使用 [AgentShield](https://github.com/affaan-m/agentshield) 审计你的 Claude Code 配置，排查安全问题。

## 何时启用

- 搭建新的 Claude Code 项目时
- 修改 `.claude/settings.json`、`CLAUDE.md` 或 MCP 配置之后
- 提交配置变更之前
- 当使用现有的 Claude Code 配置迁移到新的代码仓库时
- 定期的安全健康检查

## 扫描范围

| 文件 | 检查项 |
|------|--------|
| `CLAUDE.md` | 硬编码 secret、自动运行指令、prompt injection 模式 |
| `settings.json` | 过于宽松的允许列表、缺失的拒绝列表、危险的绕过标志 |
| `mcp.json` | 存在风险的 MCP 服务器、硬编码的环境变量密钥、npx 供应链风险 |
| `hooks/` | 通过插值进行命令注入、数据泄露、静默错误抑制 |
| `agents/*.md` | 无限制工具访问、prompt injection surface、缺失的 model 规格 |

## 前置条件

必须安装 AgentShield。如有需要，先检查并安装：

```bash
# 检查是否已安装
npx ecc-agentshield --version

# 全局安装（推荐）
npm install -g ecc-agentshield

# 或通过 npx 直接运行（无需安装）
npx ecc-agentshield scan .
```

## 用法

### 基础扫描

针对当前项目的 `.claude/` 目录运行：

```bash
# 扫描当前项目
npx ecc-agentshield scan

# 扫描指定路径
npx ecc-agentshield scan --path /path/to/.claude

# 按最低 severity 过滤扫描
npx ecc-agentshield scan --min-severity medium
```

### 输出格式

```bash
# 终端输出（默认）— 带评级的彩色报告
npx ecc-agentshield scan

# JSON ——用于 CI/CD 集成
npx ecc-agentshield scan --format json

# Markdown ——用于文档
npx ecc-agentshield scan --format markdown

# HTML ——独立的深色主题报告
npx ecc-agentshield scan --format html > security-report.html
```

### 自动修复

自动应用安全修复（仅修复标记为 auto-fixable 的问题）：

```bash
npx ecc-agentshield scan --fix
```

此操作会：
- 将硬编码的 secret 替换为环境变量引用
- 将通配符权限收紧为限定范围的替代方案
- 绝不修改仅限手动处理的建议

### Opus 4.6 深度分析

运行对抗式 three-agent pipeline 以进行更深入的分析：

```bash
# 需要 ANTHROPIC_API_KEY
export ANTHROPIC_API_KEY=your-key
npx ecc-agentshield scan --opus --stream
```

该流程会运行：
1. **攻击者（红队）** —— 寻找攻击向量
2. **防御者（蓝队）** —— 推荐加固措施
3. **审计员（最终裁决）** —— 综合双方视角

### 初始化安全配置

从零开始搭建一份新的安全 `.claude/` 配置：

```bash
npx ecc-agentshield init
```

会创建：
- 带有范围限定权限和拒绝列表的 `settings.json`
- 包含安全最佳实践的 `CLAUDE.md`
- `mcp.json` 占位符

### GitHub Action

添加到你的 CI pipeline：

```yaml
- uses: affaan-m/agentshield@v1
  with:
    path: '.'
    min-severity: 'medium'
    fail-on-findings: true
```

## Severity 等级

| 评级 | 分数 | 含义 |
|-------|-------|---------|
| A | 90-100 | 安全配置 |
| B | 75-89 | 轻微问题 |
| C | 60-74 | 需要关注 |
| D | 40-59 | 重大风险 |
| F | 0-39 | 严重漏洞 |

## 解读结果

### Critical Findings（立即修复）
- 配置文件中硬编码的 API key 或 token
- allowlist 中的 `Bash(*)`（不受限的 shell 访问）
- hooks 中通过 `${file}` 插值进行的 command injection
- 可运行 shell 的 MCP servers

### High Findings（上线前修复）
- CLAUDE.md 中的自动运行指令（prompt injection vector）
- permissions 中缺失的 deny 列表
- agent 拥有不必要的 Bash 访问权限

### Medium Findings（建议处理）
- hooks 中的静默错误抑制（`2>/dev/null`、`|| true`）
- 缺失 PreToolUse security hook
- MCP server 配置中的 `npx -y` 自动安装

### Info Findings（知晓即可）
- MCP server 缺失描述
- 禁止性指令被正确标记为良好实践

## 链接

- **GitHub**: [github.com/affaan-m/agentshield](https://github.com/affaan-m/agentshield)
- **npm**: [npmjs.com/package/ecc-agentshield](https://www.npmjs.com/package/ecc-agentshield)
