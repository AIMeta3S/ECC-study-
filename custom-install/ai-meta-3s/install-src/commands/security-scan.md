---
description: 运行 AgentShield 对 agent，hook，MCP，permission和secret surfaces 进行防护。
---

# 安全扫描命令

对当前项目或指定目标路径运行 AgentShield，然后将发现的问题转化为一份按优先级排序的修复计划。

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

不得凭空捏造发现项。应以 AgentShield 输出作为唯一事实来源，并将 scanner 发现的事实与后续的主观判断分开。

## 评审清单

1. 首先识别实际生效的运行时发现项：
   - 硬编码的 secrets
   - 宽泛的 permission
   - 可执行的 hook
   - 带有 shell、文件系统、远程传输、`npx`未锁定版本 的 MCP server
   - 处理不可信内容但缺乏防御措施的 agent 提示词
2. 将低确信度的信息单独归类：
   - 文档示例
   - 模板示例
   - plugin 清单
   - 项目本地的可选 settings
3. 对于安全等级为 critical 或 high 的每一项检测结果，返回：
   - 文件路径
   - 严重等级
   - 运行时确信度
   - 为何重要
   - 确切的修复方案
   - 是否可以安全地自动修复
4. 若指定了 `--fix`，在实施修复之前，先说明计划进行的修改。
5. 修复后重新运行扫描，并报告修复前后的评分。

## 输出约定

返回：

1. 安全等级和评分。
2. 按严重程度和运行时置信度计数。
3. critical/high 等级的发现项要标注确切的路径。
4. 置信度较低的发现结果单独归类。
5. 一份修复顺序清单。
6. 所运行的命令，以及扫描是在本地、CI 还是通过 npx 执行的。

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

- Scanner：<https://github.com/affaan-m/agentshield>

## 参数

$ARGUMENTS：
- 可选的目标路径
- 可选的 AgentShield flag
