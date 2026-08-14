# AIMeta3S 版安装说明

本目录的 `install.js` 是一个**独立、零依赖**的安装器，把 `install-src/` 里的精简版插件内容（agents / commands / docs / hooks / rules / scripts / skills）按 ECC 的 claude target 映射规则装到 `~/.claude/`。

- **零第三方依赖**：只用 Node 内置模块（`fs` / `path` / `os` / `crypto`），无需 `npm install`。
- **跨平台**：核心逻辑 `install.js` 三平台通用；入口脚本按系统二选一（`install.sh` / `install.ps1`）。
- **可预览、可卸载**：`--dry-run` 先看计划，`--uninstall` 按清单干净移除。

---

## 一、前置条件

- **Node.js ≥ 18**（与 ECC 主仓一致）。验证：`node -v`
- 目标目录默认 `~/.claude/`（Windows 为 `%USERPROFILE%\.claude`），需有读写权限。

> 不需要 git、不需要 bash（Windows 原生即可）、不需要任何 npm 包。

---

## 二、快速开始

### macOS / Linux

```bash
# 进入安装目录
cd {安装包所在目录}/aimeta3s

# 方式 1：bash 入口（推荐）
chmod +x install.sh
bash install.sh

# 方式 2：直接用 node（最通用）
node install.js
```

> `./install.sh` 需要先 `chmod +x install.sh`；用 `bash install.sh` 或 `node install.js` 无此要求。

### Windows（PowerShell）

```powershell
# 进入安装目录
cd {安装包所在目录}\aimeta3s

# 方式 1：PowerShell 入口
.\install.ps1

# 方式 2：直接用 node
node install.js
```

> 若 PowerShell 报执行策略错误，先执行一次：
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### 通用：先预览，再安装（强烈建议）

```bash
node install.js --dry-run      # 只打印计划，不写盘
node install.js                # 确认无误后正式安装
```

---

## 三、命令行参数

| 用法 | 作用 |
|---|---|
| `node install.js` | 安装（**直接覆盖**同名文件，幂等可重跑） |
| `node install.js --dry-run` | 只打印安装计划，不写盘 |
| `node install.js --uninstall` | 按状态清单卸载（内容被改过的文件会跳过） |
| `node install.js --gen-manifest` | 只生成 `/aimeta3s-help` 资源清单到仓库 `install-src/docs/aimeta3s/manifest.json`（不安装） |
| `node install.js --gen-paths` | 只生成运行时产物路径索引到仓库 `install-src/docs/aimeta3s/paths.json`（不安装；`resolved` 为占位） |
| `node install.js --help` / `-h` | 显示帮助 |

所有参数同样适用于 `bash install.sh ...` 和 `.\install.ps1 ...`（入口脚本仅透传参数）。

### 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `AI_META_3S_HOME` | `~/.claude` | 覆盖安装目标根。用于测试或多套配置隔离 |

示例：装到隔离目录试水
```bash
AI_META_3S_HOME=/tmp/aimeta3s-trial node install.js --dry-run
```

---

## 四、安装机制

### 4.1 目录映射规则

`install-src/` 源 → `~/.claude/` 目标（对应官方 `claude-home.js`）：

| 源目录 | 目标目录 | 说明 |
|---|---|---|
| `agents/` | `agents/` | 平铺 |
| `commands/` | `commands/` | 平铺 |
| `docs/` | `aimeta3s/docs/` | ⭐ 装到 `aimeta3s/` 子树下，`/aimeta3s-help` 的资料目录 |
| `hooks/` | `hooks/` | 平铺（含 `hooks.json`） |
| `rules/` | `rules/ecc/` | ⭐ 加 `ecc/` 命名空间，避免与用户自有 rules 冲突 |
| `scripts/` | `scripts/` | 平铺 |
| `skills/` | `skills/` | ⭐ 扁平（Claude Code 只发现 `skills/` 直接子目录） |

安装时还会**动态生成** `aimeta3s/docs/manifest.json`——`/aimeta3s-help` 命令的资源清单（白名单 + 资源名→路径翻译表）。它不在 `install-src/` 源中，由安装器遍历实际安装文件后产出。资源增减后用 `node install.js --gen-manifest` 重新生成仓库内版本。文件总数随资源变化，用 `--dry-run` 查看准确数量。

同时**动态生成** `aimeta3s/docs/paths.json`——运行时落盘产物路径索引（manifest 的姊妹篇：manifest 管「装了什么」，paths 管「运行时往哪写」）。它登记所有运行时产物（`~/.claude/` 下的 metrics/session-data、`$HOMUNCULUS/` 的 observer/instinct、`$TMPDIR/` 的瞬态 IPC、`~/.gateguard/` 等）的实际位置，含当前机器解析后的字面路径（`resolved`），**不移动任何数据**。`/aimeta3s-help` 据此回答"数据存在哪/怎么清理"。`paths.json` 的 `resolved` 反映 ECC 运行时真实根（由 `ECC_AGENT_DATA_HOME` / `os.tmpdir()` / `CLV2_HOMUNCULUS_DIR` 解析），与安装位置无关；用 `node install.js --gen-paths` 生成仓库内占位版本。

### 4.2 覆盖策略：直接覆盖

同名文件**直接覆盖**，不备份、不交互确认。这是刻意设计（幂等，重跑即更新）。如果你在 `~/.claude/` 下有同名自配置，会被替换——见下方「注意事项」。

### 4.3 Markdown 链接自动重写

`rules/` 是唯一变形目录（→ `rules/ecc/`）。安装时会对每个 `.md` 的内联链接自动重算相对路径：

- **rules 内部互链**：两端同移一层，结果不变（no-op）。
- **跨出 rules 的链接**（如 rules 里链接 `../../commands/tdd.md`）：自动补一个 `../` → `../../../commands/tdd.md`。
- **外部链接 / 锚点 / 代码块内链接**：原样不动。

非 `.md` 文件按字节原样复制。

### 4.4 安装状态文件

每次安装写入 `~/.claude/aimeta3s/install-state.json`（AIMeta3S 版**自有命名空间**，与官方 `~/.claude/ecc/` 互不干扰）：

```json
{
  "schemaVersion": "aimeta3s.install.v1",
  "installedAt": "2026-08-12T...",
  "target": { "root": "~/.claude", "installStatePath": "..." },
  "source": { "sourceRoot": ".../install-src" },
  "operations": [
    { "sourceRelativePath": "rules/common/agents.md",
      "destinationPath": "~/.claude/rules/ecc/common/agents.md",
      "contentSha256": "..." }
  ]
}
```

`contentSha256` 是安装时写入内容的 sha256，卸载时据此判断文件是否被用户改过。

---

## 五、卸载

```bash
node install.js --uninstall
```

行为：
1. 读取 `install-state.json`，逐个核对目标文件的当前 sha256 与记录值。
2. **hash 一致 → 删除**；**hash 不一致（你改过）→ 跳过并警告**（保护你的修改）。
3. 向上清理因卸载变空的目录，**绝不删除 `~/.claude/` 本身**及任何非空目录。
4. 删除状态文件本身。

先预览卸载计划：
```bash
node install.js --uninstall --dry-run
```

---

## 六、安全设计

- **trusted-root 边界**：任何写入路径必须落在目标根（`~/.claude/`）之内；越界直接抛错。
- **拒绝符号链接穿越**：从目标根逐级 `lstatSync`，路径上遇 symlink 立即中止（防 symlink 劫持）。
- **卸载只删本安装器记录的文件**，按 sha256 二次确认，不动其他任何东西。

---

## 七、注意事项（必读）

1. **直接覆盖，无备份**。安装前若 `~/.claude/` 已有同名文件（尤其 `skills/` 扁平目录、`commands/`、`agents/`），会被覆盖。建议先 `--dry-run` 核对，或把现有配置备份一份。
   - `rules/` 因加了 `ecc/` 命名空间，**不会**碰你在 `~/.claude/rules/` 下自有的 rules。
2. **只增不删**。安装器不会清理此前（包括官方全量 `install.sh --profile full`）装过的旧文件。想清空旧安装，需用官方卸载工具，或手动处理。
3. **与官方全量安装可共存**。本安装器写到独立状态文件 `~/.claude/aimeta3s/install-state.json`，卸载互不影响。但同一目标文件（如 `~/.claude/commands/plan.md`）后装者覆盖先装者。
4. **幂等**。重复运行安全——每次覆盖并刷新 `installedAt`，文件清单不变。
5. **Node 版本**。低于 Node 18 未测试；`fs.readdirSync({withFileTypes})` / `mkdirSync({recursive})` 至少需 Node 10.12+，但建议跟随主仓用 18 LTS+。

---

## 八、故障排查

| 现象 | 原因 / 处理 |
|---|---|
| `rm: Permission denied` 或 `EACCES` | `~/.claude/` 权限不足；检查目录属主与读写权限 |
| `command not found: node` | 未装 Node；装 Node 18+ |
| Windows `.\install.ps1` 无法加载 | 执行策略限制：`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `Refusing to write outside trusted root` / `through symlinked path` | 目标路径越界或被 symlink 劫持；检查 `~/.claude/` 下是否有异常符号链接，或改用 `AI_META_3S_HOME` 指向干净目录 |
| `--uninstall` 报「找不到安装状态文件」 | 从未安装，或已卸载过 |
| 卸载时大量「跳过(内容已修改)」 | 这些文件在安装后被改动过；卸载器故意保留，确认后可手动删 |

---

## 九、本目录文件一览

| 文件 | 作用 |
|---|---|
| [install.js](install.js) | 主安装逻辑（零依赖，Node 内置模块） |
| [install.sh](install.sh) | macOS / Linux 入口（透传参数给 install.js） |
| [install.ps1](install.ps1) | Windows PowerShell 入口（透传参数给 install.js） |
| [install-src/](install-src/) | 安装源：7 个子目录（含 `docs/`），安装器的唯一资源依赖 |
| [使用建议.md](使用建议.md) | **装好之后** 39 条命令的使用指南（与本文档正交） |

> `使用建议.md` 与 5 个 `资源依赖检查报告*.md` 是参考文档，**不参与安装**（不在 `install-src/` 内）。

---

## 十、独立性说明

整个 `aimeta3s/` 目录可整体拷走独立运行——`install.js` 只从自身同级的 `install-src/` 读取资源，不依赖仓库根的任何文件。把本目录复制到任意位置，`node install.js` 即可工作。

验证独立性：
```bash
cp -r custom-install/aimeta3s /tmp/aimeta3s-standalone
AI_META_3S_HOME=/tmp/aimeta3s-trial node /tmp/aimeta3s-standalone/install.js --dry-run
```
