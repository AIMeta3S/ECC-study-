---
name: repo-scan
description: 跨技术栈源码资产审计 —— 对每个文件进行分类，检测内嵌的第三方库，并按模块输出可执行的四级判定结论，配以交互式 HTML 报告。
metadata:
  origin: community
---

# repo-scan

> 每个生态都有自己的依赖管理器，但没有工具能横跨 C++、Android、iOS 和 Web 告诉你：究竟有多少代码是你自己的，多少是第三方的，又有多少是冗余无用。

## 何时使用

- 接手大型遗留代码库，需要一份结构总览
- 在大型重构之前——识别哪些是核心代码、哪些是重复代码、哪些是死代码
- 审计直接内嵌在源码中（未在包管理器中声明）的第三方依赖
- 为 monorepo 重组准备架构决策记录（ADR）

## 安装

```bash
# 仅拉取固定 commit 以保证可复现性
mkdir -p ~/.claude/skills/repo-scan
git init repo-scan
cd repo-scan
git remote add origin https://github.com/haibindev/repo-scan.git
git fetch --depth 1 origin 2742664
git checkout --detach FETCH_HEAD
cp -r . ~/.claude/skills/repo-scan
```

> 在安装任何 agent skill 之前，请先审查其源码。

## 核心能力

| 能力 | 说明 |
|---|---|
| **跨技术栈扫描** | 一次扫描覆盖 C/C++、Java/Android、iOS (OC/Swift)、Web (TS/JS/Vue) |
| **文件分类** | 每个文件被标记为项目代码、第三方代码或构建产物 |
| **库检测** | 识别 50+ 已知库（FFmpeg、Boost、OpenSSL…）并提取版本 |
| **四级判定** | Core Asset / Extract & Merge / Rebuild / Deprecate |
| **HTML 报告** | 暗色主题的交互式页面，支持下钻导航 |
| **Monorepo 支持** | 分层扫描，生成汇总报告 + 子项目报告 |

## 分析深度级别

| 级别 | 读取文件数 | 适用场景 |
|---|---|---|
| `fast` | 每个模块 1-2 个 | 超大型目录的快速盘点 |
| `standard` | 每个模块 2-5 个 | 默认审计，包含完整的依赖 + 架构检查 |
| `deep` | 每个模块 5-10 个 | 额外检查线程安全、内存管理、API 一致性 |
| `full` | 所有文件 | 合并前的全面审查 |

## 工作原理

1. **对仓库表层进行分类**：枚举所有文件，然后将每个文件标记为项目代码、内嵌第三方代码或构建产物。
2. **检测内嵌库**：检查目录名、头文件、license 文件和版本标记，识别捆绑的依赖及其可能的版本。
3. **为每个模块打分**：按模块或子系统对文件分组，然后基于归属、重复度和维护成本给出四级判定之一。
4. **突出结构性风险**：指出冗余无用的产物、重复的 wrapper、过期的 vendored 代码，以及应当被抽取、重建或弃用的模块。
5. **产出报告**：返回一份简明摘要，加上带分模块下钻的交互式 HTML 输出，便于异步审阅审计结果。

## 示例

以一个 5 万文件的 C++ monorepo 为例：
- 发现 FFmpeg 2.x（2015 年版本）仍在生产环境使用
- 发现同一个 SDK wrapper 被重复了 3 次
- 识别出 636 MB 已提交的 Debug/ipch/obj 构建产物
- 分类结果：3 MB 项目代码 对比 596 MB 第三方代码

## 最佳实践

- 首次审计时从 `standard` 深度开始
- 对包含 100+ 模块的 monorepo 使用 `fast` 快速盘点
- 对被标记需要重构的模块增量运行 `deep`
- 审阅跨模块分析以检测子项目之间的重复

## 链接

- [GitHub 仓库](https://github.com/haibindev/repo-scan)
