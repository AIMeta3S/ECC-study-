---
description: 针对 agent、hook、MCP、permission 和 secret 等攻击面运行 AgentShield。
agent: everything-claude-code:security-reviewer
subtask: true
---

# Security Scan 命令

对当前项目或目标路径运行 AgentShield，然后将发现项转化为按优先级排序的修复计划。

## 用法

`/security-scan [path] [--format text|json|markdown|html] [--min-severity low|medium|high|critical] [--fix]`

- `path`（可选）：默认为当前项目。可使用 `.claude/` 路径、repo 根目录或已签入的模板目录。
- `--format`：输出格式。CI 场景使用 `json`，handoff 场景使用 `markdown`，独立评审报告使用 `html`。
- `--min-severity`：过滤较低优先级的发现项。
- `--fix`：仅应用被明确标记为安全且可自动修复的 AgentShield 修复。

## 确定性引擎

优先使用随附的 scanner：

```bash
npx ecc-agentshield scan --path "${TARGET_PATH:-.}" --format text
```

对于本地 AgentShield 开发，在 AgentShield 的 checkout 目录下运行：

```bash
npm run scan -- --path "${TARGET_PATH:-.}" --format text
```

不要编造发现项。以 AgentShield 输出作为 source of truth，将 scanner 的事实与后续判断区分开。

## 评审清单

1. 首先识别实际生效的运行时发现项：
   - 硬编码 secrets
   - 宽泛的 permission
   - 可执行 hook
   - 带有 shell、文件系统、远程 transport 或未锁定版本 `npx` 的 MCP server
   - 在无防御措施的情况下处理不受信任内容的 agent prompt
2. 单独区分置信度较低的清单项：
   - 文档示例
   - 模板示例
   - plugin manifest
   - 项目本地的可选 settings
3. 对于每个 critical 或 high 发现项，返回：
   - 文件路径
   - 严重级别
   - 运行时置信度
   - 影响说明
   - 精确修复方案
   - 是否可安全自动修复
4. 如果请求了 `--fix`，在应用修复前先说明计划进行的修改。
5. 修复后重新运行扫描，并报告修复前后的得分。

## 输出契约

返回：

1. 安全评级与得分。
2. 按严重级别和运行时置信度统计的数量。
3. 带有精确路径的 Critical/high 发现项。
4. 单独分组的较低置信度发现项。
5. 修复顺序。
6. 运行的命令，以及扫描是在本地、CI 还是基于 npx 运行。

## CI 模式

在 GitHub Actions 中使用 AgentShield 以实现强制 gate：

```yaml
- uses: affaan-m/agentshield@v1
  with:
    path: "."
    min-severity: "medium"
    fail-on-findings: true
```

## 链接

- Skill：`skills/security-scan/SKILL.md`
- Agent：`agents/security-reviewer.md`
- Scanner：<https://github.com/affaan-m/agentshield>

## 参数

$ARGUMENTS：
- 可选的目标路径
- 可选的 AgentShield flag
