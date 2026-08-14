---
name: instinct-import
description: 从文件或 URL 导入 instincts 到 project/global scope
command: true
---

# Instinct 导入命令

## Implementation
运行 instinct CLI 从本地文件路径或 HTTP(S) URL 导入 instincts（未设置 `CLAUDE_PLUGIN_ROOT` 时回退到 `~/.claude`）：

   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT:-$HOME/.claude}/skills/continuous-learning-v2/scripts/instinct-cli.py" import <file-or-url> [--dry-run] [--force] [--min-confidence 0.7] [--scope project|global]
   ```

## Usage

```
/instinct-import team-instincts.yaml
/instinct-import https://github.com/org/repo/instincts.yaml
/instinct-import team-instincts.yaml --dry-run
/instinct-import team-instincts.yaml --scope global --force
```

## What to Do

1. 获取 instinct 文件（本地路径或 URL）
2. 解析并验证格式
3. 检查与现有 instincts 是否重复
4. 合并或添加新 instincts
5. 保存到 inherited instincts 目录：
   - Project scope：`${XDG_DATA_HOME:-~/.local/share}/ecc-homunculus/projects/<project-id>/instincts/inherited/`
   - Global scope：`${XDG_DATA_HOME:-~/.local/share}/ecc-homunculus/instincts/inherited/`

## Import Process

```
 从 team-instincts.yaml 导入 instinct
================================================

Found 12 instincts to import.

Analyzing conflicts...

## 新的 Instincts (8)
这些将被添加：
  ✓ use-zod-validation (confidence: 0.7)
  ✓ prefer-named-exports (confidence: 0.65)
  ✓ test-async-functions (confidence: 0.8)
...

## 重复 Instincts (3)
已存在相似的 instinct：
  WARNING: prefer-functional-style
     Local: 0.8 confidence, 12 observations
     Import: 0.7 confidence
     → Keep local (higher confidence)

  WARNING: test-first-workflow
     Local: 0.75 confidence
     Import: 0.9 confidence
     → Update to import (higher confidence)

导入 8 条新 instinct，更新 1 条？
```

## Merge Behavior

当导入的 instinct 与现有 ID 重复时：
- 更高 confidence 的导入成为更新候选
- 相同/更低 confidence 的导入会被跳过
- 除非使用 `--force`，否则需要用户确认

## Source Tracking

导入的 instincts 会标记为：
```yaml
source: inherited
scope: project
imported_from: "team-instincts.yaml"
project_id: "a1b2c3d4e5f6"
project_name: "my-project"
```

## Flags

- `--dry-run`：预览而不导入
- `--force`：跳过确认提示
- `--min-confidence <n>`：只导入高于 threshold 的 instincts
- `--scope <project|global>`：选择目标 scope（默认：`project`）

## 输出

导入后：
```
PASS: Import complete!

新增: 8 instincts
更新: 1 instinct
跳过: 3 instincts (equal/higher confidence already exists)

新 instincts 已保存到: ${XDG_DATA_HOME:-~/.local/share}/ecc-homunculus/instincts/inherited/

运行 /instinct-status 查看所有 instincts。
```
