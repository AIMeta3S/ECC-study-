---
name: google-workspace-ops
description: 将 Google Drive、Docs、Sheets 和 Slides 作为统一的工作界面，用于操作计划、跟踪表、演示文稿和共享文档。当用户需要查找、生成摘要、编辑、迁移或清理 Google Workspace 资源，而无需直接调用底层工具时使用。
metadata:
  origin: ECC
---

# Google Workspace 操作

本 skill 用于将共享文档、电子表格和演示文稿作为工作系统来操作，而不仅仅是孤立地编辑单个文件。

## 何时使用

- 用户需要找到某个文档、表格或演示文稿并就地更新
- 整合存储在 Google Drive 中的计划、跟踪表、笔记或客户列表
- 清理或重构共享电子表格
- 导入、修复或重新排版 Google Slides 演示文稿
- 从 Docs、Sheets 或 Slides 中生成摘要以辅助决策

## 首选工具操作面

以 Google Drive 作为入口，然后切换到合适的专用工具：

- Google Docs：用于以文字为主的文档
- Google Sheets：用于表格类工作、公式和图表
- Google Slides：用于演示文稿、导入、模板迁移和清理

不要仅凭文件名猜测结构。先进行检查。

## 工作流程

### 1. 定位资源

先用 Drive 的搜索界面来定位：

- 目标文件本身
- 同级的关联资源
- 可能的重复项
- 最近修改过的版本

如果多个文档看起来相似，通过标题、所有者、修改时间或所在文件夹来确认。

### 2. 编辑前先检查

在进行修改之前：

- 概括当前结构
- 识别标签页、标题或幻灯片数量
- 判断任务是局部清理还是结构性重构

选择能够安全完成工作的最小工具。

### 3. 精确编辑

- 对于 Docs：使用基于索引的编辑，而非模糊的重写
- 对于 Sheets：在明确的标签页和单元格区域上操作
- 对于 Slides：区分内容编辑、视觉清理与模板迁移

如果所请求的工作涉及视觉或对布局敏感，应通过检查和验证反复迭代，而不是一次性进行大规模盲目更新。

### 4. 保持工作系统整洁

当文件是更大工作流程的一部分时，还应指出：

- 重复的跟踪表
- 过时的演示文稿
- 陈旧文档与权威文档的对比
- 该资源是否应被归档、合并或重命名

## 输出格式

使用以下格式：

```text
ASSET
- file name
- type
- why this is the right file

CURRENT STATE
- structure summary
- key problems or blockers

ACTION
- edits made or recommended

FOLLOW-UPS
- archive / merge / duplicate cleanup / next file to update
```

## 典型用例

- "找到当前的计划文档并精简它"
- "清理这个客户电子表格，并向我展示有流失风险的行"
- "将这个演示文稿导入 Slides 并使其适合展示"
- "找到当前的跟踪表，而不是陈旧的重复项"
