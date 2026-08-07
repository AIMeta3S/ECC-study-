---
name: instinct-export
description: 从 project/global scope 导出 instinct 到文件
command: /instinct-export
---

# Instinct 导出命令

将 instinct 导出为可共享的格式。适用于：
- 与团队成员共享
- 迁移到新机器
- 贡献到项目规范

## 用法

```
/instinct-export                           # 导出所有个人 instinct
/instinct-export --domain testing          # 仅导出 testing 类 instinct
/instinct-export --min-confidence 0.7      # 仅导出高 confidence 的 instinct
/instinct-export --output team-instincts.yaml
/instinct-export --scope project --output project-instincts.yaml
```

## 操作步骤

1. 检测当前项目上下文
2. 按所选 scope 加载 instinct：
   - `project`：仅当前项目
   - `global`：仅全局
   - `all`：项目 + 全局合并（默认）
3. 应用过滤器（`--domain`、`--min-confidence`）
4. 将 YAML 格式的导出内容写入文件（若未提供输出路径则打印到 stdout）

## 输出格式

创建一个 YAML 文件：

```yaml
# Instinct 导出
# 生成时间：2025-01-22
# 来源：personal
# 数量：12 条 instinct

---
id: prefer-functional-style
trigger: "when writing new functions"
confidence: 0.8
domain: code-style
source: session-observation
scope: project
project_id: a1b2c3d4e5f6
project_name: my-app
---

# Prefer Functional Style

## Action
Use functional patterns over classes.
```

## Flags

- `--domain <name>`：仅导出指定 domain
- `--min-confidence <n>`：最低 confidence threshold
- `--output <file>`：输出文件路径（省略时打印到 stdout）
- `--scope <project|global|all>`：导出 scope（默认：`all`）
