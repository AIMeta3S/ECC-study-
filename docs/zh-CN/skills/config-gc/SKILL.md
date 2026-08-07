---
name: config-gc
description: Claude Code 配置的垃圾回收（garbage collection）。定期扫描 ~/.claude（skills、memory、hooks、permissions、MCP servers、caches），查找冗余、过期、孤立或低价值的条目，然后引导用户完成逐一确认删除的清理。当用户说"清理我的配置"、"config GC"、"skills 太多了"、"审计我的设置"、"我的 .claude 太臃肿了"，或要求进行定期配置审查时使用。
metadata:
  origin: ECC
---

# Config GC — Claude Code 配置的垃圾回收

借鉴运行时垃圾回收（garbage collection）的思想：定期扫描不再被引用、冗余、过期或低价值的对象，并回收其占用空间。关键区别在于：**在这里，回收必须有人工介入。绝不自动删除。**

## 何时激活

- 用户要求清理、审计或精简其 Claude Code 配置
- 用户抱怨 skills 过多、hooks 噪音太大或 session 启动缓慢
- 到了每月/定期配置审查的时间
- 安装大型 skill 包（例如本仓库）后，需要处理与既有设置的重叠

以下场景不要激活：清理项目源代码（那是重构）、清除聊天历史或卸载 Claude Code 本身。

## 设计哲学

1. **只增不减的配置会泄漏。** Skills、memory 文件、hooks 和 permission 条目只会被不断添加。如果没有定期审查，它们会悄无声息地腐坏。
2. **定期审计胜过一次性清剿。** 每隔约 30 天扫描一次，每次提出一小批候选项。
3. **分通道策略。** 每种堆积类型（skills、hooks、permissions 等）都有各自的过期信号——不要一刀切。
4. **先软删除。** 重命名为 `.disabled` > 移动到 `~/.claude/_gc_trash/` > 真正删除。始终保留撤销路径。
5. **强制人工介入。** 每个候选项都有独立的 `[y/n/skip]` 确认。没有"全部同意"快捷方式。
6. **保留日志。** 每次 GC 运行都追加到 `~/.claude/gc_log.md`：动了什么、为什么、如何撤销。

## 扫描通道

| # | 通道 | 路径 | 过期 / 冗余信号 |
|---|---------|------|--------------------------------|
| 1 | Skills | `~/.claude/skills/*/` | 名称严重重叠；最近 transcripts 中从未触发；与用户实际工作领域不匹配；SKILL.md 损坏或为空 |
| 2 | Memory | `~/.claude/**/memory/*.md` + 其 index | 同一主题对应多个 index 条目；内容与较新条目相矛盾；日期已过期；缺失 index 的孤立文件；应合并的不足百字片段 |
| 3 | Hooks | `~/.claude/hooks/` + settings | 脚本存在于磁盘但未被任何 hook 配置引用；被重写所取代的旧版本 |
| 4 | Permissions | `permissions.allow` in `settings.json` / `settings.local.json` | 重复条目；已被通配符覆盖的具体条目（例如已允许 `Bash(*)` 时的 `Bash(git push)`）；过去实验留下的一次性授权 |
| 5 | MCP servers | `~/.claude.json` 或项目 `.mcp.json` | 连接失败的服务器；功能重复；长期未使用 |
| 6 | 计划提醒 / 作业 | 用户存放它们的任何位置 | 超过 30 天的已触发一次性任务；目标脚本已不存在的作业 |
| 7 | 项目历史 | `~/.claude/projects/*/` | 过期的 handoff 快照；被更新状态所取代的 session 记录 |
| 8 | 运行时 caches | `cache/`、`file-history/`、`logs/`、`shell-snapshots/` | 按大小和 mtime 排序；提出超过 30 天且较大的条目 |

## 工作流

1. **扫描**所有通道（或用户指定的子集）。收集候选项，包含：路径、通道、标记它的信号、大小、最后修改时间。
2. **排序**按置信度（损坏/孤立 = 高；仅仅陈旧 = 低），以编号表格形式呈现。每次运行上限约 20 个候选项——GC 是定期的，不是穷尽的。
3. **逐一确认。** 对每个候选项展示证据，然后询问 `[y/n/skip]`。用户可随时停止。
4. **软删除已确认条目**：skills/hooks 优先重命名为 `.disabled`，文件则移动到 `_gc_trash/<date>/`。Permission 条目存在于 JSON 中（无法加注释）：备份 settings 文件，在 `gc_log.md` 中逐字记录每个被移除的条目，然后用 `jq` 从 `allow` 数组中移除。仅当用户明确要求时才硬删除。
5. **记录**本次运行到 `~/.claude/gc_log.md`：时间戳、处理的条目、撤销说明。
6. **报告**：回收的空间大小、仍然健康的通道、建议的下次审查日期。

## 示例扫描命令

孤立 hook 脚本（通道 3）——磁盘上存在但未被任何 hook 配置引用的脚本：

```bash
for f in ~/.claude/hooks/*; do
  name=$(basename "$f")
  grep -rq "$name" ~/.claude/settings.json ~/.claude/settings.local.json 2>/dev/null \
    || echo "ORPHAN: $f"
done
```

冗余 permission 条目（通道 4）——重复项，以及被通配符遮蔽的具体授权：

```bash
jq -r '.permissions.allow[]' ~/.claude/settings.local.json | sort | uniq -d
if jq -e '.permissions.allow | index("Bash(*)")' ~/.claude/settings.local.json >/dev/null; then
  jq -r '.permissions.allow[]' ~/.claude/settings.local.json \
    | grep '^Bash(' | grep -vF 'Bash(*)'
fi
```

最大的陈旧 caches（通道 8）——使用 `du -k` 而非仅 GNU 支持的 `find -printf`，以兼容 macOS/BSD：

```bash
find ~/.claude/file-history ~/.claude/shell-snapshots -type f -mtime +30 \
  -exec du -k {} + 2>/dev/null | sort -rn | head -20
```

保留撤销路径的软删除（日期只取一次，以避免日志与目录不一致）：

```bash
gc_date=$(date +%Y-%m-%d)
mkdir -p ~/.claude/_gc_trash/$gc_date
mv ~/.claude/skills/dead-skill ~/.claude/_gc_trash/$gc_date/
echo "$(date -Iseconds) moved skills/dead-skill -> _gc_trash/$gc_date/ (undo: mv back)" >> ~/.claude/gc_log.md
```

移除已确认冗余的 permission 条目（JSON 没有注释——备份、记录、再编辑）：

```bash
cp ~/.claude/settings.local.json ~/.claude/settings.local.json.bak
echo "$(date -Iseconds) removed permission entry: Bash(git push) (undo: restore from .bak or re-add)" >> ~/.claude/gc_log.md
jq '.permissions.allow -= ["Bash(git push)"]' ~/.claude/settings.local.json.bak \
  > ~/.claude/settings.local.json
```

## 反模式

- **批量批准。** 询问"删除全部 15 个？[y/n]"违背了本设计。一个条目，一个决策。
- **第一轮就硬删除。** 如果没有 `_gc_trash/` 副本或 `.disabled` 重命名，你就做错了。
- **把"陈旧"当成"死亡"。** 一个 60 天未触发的 skill 可能是季节性的（报税季、季度审查）。年龄是信号，不是裁决——这就是为什么要由人工确认。
- **用截断方式清理 memory。** 合并两个相互矛盾的 memory 文件需要阅读两者并保留较新的真相，而不是删除较长的那个。
- **触碰 `~/.claude`（或项目的 `.claude/`）以外的任何东西。** Config GC 绝不涉足源代码树。

## 最佳实践

- 在大型添加之后运行，而不仅仅按日历：安装 50 个 skill 的包正是与既有 skills 出现重叠的时候。
- 当两个 skills 重叠时，优先禁用 trigger 描述较弱的那个——它很可能本来就从未触发过。
- Permission 清理是单位时间价值最高的通道：冗余的 allow 条目会让安全审查更困难。
- 永远保留 `gc_log.md`。它很小，而"我什么时候禁用了那个 hook 以及为什么"这个问题出现得比你想象的更频繁。

## 相关 Skills

- `skill-stocktake` —— 审查 skill 的*质量*；config-gc 审查 skill 的*存在性*。对 GC 后存活下来的项运行 stocktake。
- `workspace-surface-audit` —— 加法式的对应工具：推荐安装什么。config-gc 是同一生命周期的减法式一半。
- `configure-ecc` —— 用它安装 skills 后，运行 config-gc 以处理与既有设置的重叠。
- `continuous-learning` —— 产出本 skill 稍后要审查的 memory 文件。
- `security-review` —— 与 permissions 通道配合良好。
