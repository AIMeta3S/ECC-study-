# change log

## v2.1 的新特性

| 特性 | v2.0 | v2.1 |
|------|------|------|
| 存储 | 全局 (`~/.claude/homunculus/`) | 项目作用域 (`${XDG_DATA_HOME:-~/.local/share}/ecc-homunculus/projects/<hash>/`) |
| 作用域 | 所有本能应用在任何地方 | 项目作用域 + 全局 |
| 检测 | 无 | git remote URL / repo path |
| 提升 | N/A | 当在2个以上项目中出现时，项目→全局 |
| 命令数 | 4 (status/evolve/export/import) | 6 (+promote/projects) |
| 跨项目 | 污染风险 | 默认隔离 |

## v2 的新特性（对比 v1）

| 特性 | v1 | v2 |
|---------|----|----|
| 观察 | Stop hook（session 结束时） | PreToolUse/PostToolUse（100% 可靠） |
| 分析 | 主 context | Background agent（Haiku） |
| 粒度 | 完整 skills | 原子化的 "instincts" |
| Confidence | 无 | 0.3-0.9 加权 |
| 演化 | 直接到 skill | Instincts -> 聚类 -> skill/command/agent |
| 共享 | 无 | 导出/导入 instincts |

## 为什么用 Hooks 而不是 Skills 来做 Observation？

> "v1 依赖 skills 来观察。Skills 是概率性的——它们根据 Claude 的判断大约在 50-80% 的时间触发。"

Hooks **100% 会触发**，是确定性的。这意味着：
- 每一次 tool call 都会被观察到
- 不会遗漏任何模式
- 学习是全面的

## 向后兼容

v2.1 与 v2.0 和 v1 完全兼容：
- 现有的 global instincts 可以通过 `scripts/migrate-homunculus.sh` 从 `~/.claude/homunculus/instincts/` 迁移
- v1 现有的 `~/.claude/skills/learned/` skills 仍然可用
- Stop hook 仍然运行（但现在也会馈送到 v2）
- 渐进式迁移：两者并行运行

## 相关

- [ECC-Tools GitHub App](https://github.com/apps/ecc-tools) - 从 repo 历史生成 instincts
- Homunculus - 启发了 v2 基于 instinct 架构的社区项目（原子化 observations、confidence scoring、instinct 演化 pipeline）
- [The Longform Guide](https://x.com/affaanmustafa/status/2014040193557471352) - 持续学习章节