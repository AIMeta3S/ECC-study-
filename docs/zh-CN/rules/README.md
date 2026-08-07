# Rules

## 结构

Rules 被组织为一个 **common** 层加上若干 **language-specific** 目录：

```
rules/
├── common/          # 与语言无关的原则（始终安装）
│   ├── coding-style.md
│   ├── git-workflow.md
│   ├── testing.md
│   ├── performance.md
│   ├── patterns.md
│   ├── hooks.md
│   ├── agents.md
│   └── security.md
├── typescript/      # TypeScript/JavaScript 专属
├── angular/         # Angular 专属
├── vue/             # Vue 3 专属
├── nuxt/            # Nuxt 4 专属
├── python/          # Python 专属
├── golang/          # Go 专属
├── web/             # Web 与前端专属
├── react-native/    # React Native / Expo 专属
├── swift/           # Swift 专属
├── php/             # PHP 专属
├── ruby/            # Ruby / Rails 专属
└── arkts/           # HarmonyOS / ArkTS 专属
```

- **common/** 包含通用原则——没有语言专属的代码示例。
- **语言目录**用框架相关模式、工具和代码示例扩展 common 规则。每个文件都引用其在 common 中的对应文件。

## 安装

### 选项 1：安装脚本（推荐）

```bash
# 安装 common + 一个或多个语言专属规则集
./install.sh typescript
./install.sh angular
./install.sh vue
./install.sh nuxt
./install.sh python
./install.sh golang
./install.sh web
./install.sh react-native
./install.sh swift
./install.sh php
./install.sh ruby
./install.sh arkts

# 一次安装多种语言
./install.sh typescript python
```

### 选项 2：手动安装

> **重要：**请复制整个目录——不要用 `/*` 扁平化。
> common 和语言专属目录包含同名文件。
> 将它们扁平化到同一目录会导致语言专属文件覆盖 common 规则，并破坏语言专属文件使用的相对 `../common/` 引用。
>
> 对于用户级 Claude 安装，请使用下方 ECC 专有的 namespace。扁平的 package 级目标位置可能会与非 ECC rule packs 冲突，且与主 README 指导不一致。

```bash
# 创建一次 ECC 规则 namespace。
mkdir -p ~/.claude/rules/ecc

# 安装 common 规则（所有项目必需）
cp -r rules/common ~/.claude/rules/ecc/

# 根据你的项目技术栈安装语言专属规则
cp -r rules/typescript ~/.claude/rules/ecc/
cp -r rules/angular ~/.claude/rules/ecc/
cp -r rules/vue ~/.claude/rules/ecc/
cp -r rules/nuxt ~/.claude/rules/ecc/
cp -r rules/python ~/.claude/rules/ecc/
cp -r rules/golang ~/.claude/rules/ecc/
cp -r rules/web ~/.claude/rules/ecc/
cp -r rules/react-native ~/.claude/rules/ecc/
cp -r rules/swift ~/.claude/rules/ecc/
cp -r rules/php ~/.claude/rules/ecc/
cp -r rules/ruby ~/.claude/rules/ecc/
cp -r rules/arkts ~/.claude/rules/ecc/

# 注意！！！请根据实际项目需求进行配置；此处的配置仅供参考。
```

对于项目本地规则，请在项目根目录下使用相同的 namespace：

```bash
mkdir -p .claude/rules/ecc
cp -r rules/common .claude/rules/ecc/
cp -r rules/typescript .claude/rules/ecc/
```

## Rules 与 Skills

- **Rules** 定义广泛适用的标准、约定和清单（例如"80% 测试覆盖率"、"禁止硬编码 secrets"）。
- **Skills**（`skills/` 目录）为特定任务提供深入、可操作的参考资料（例如 `python-patterns`、`golang-testing`）。

语言专属规则文件会在合适的地方引用相关的 skills。Rules 告诉你_做什么_；skills 告诉你_怎么做_。

## 添加新语言

要添加对一种新语言的支持（例如 `rust/`）：

1. 创建一个 `rules/rust/` 目录
2. 添加扩展 common 规则的文件：
   - `coding-style.md`——格式化工具、idioms、错误处理模式
   - `testing.md`——测试框架、覆盖率工具、测试组织
   - `patterns.md`——语言专属的设计模式
   - `hooks.md`——用于格式化工具、linters、类型检查器的 PostToolUse hooks
   - `security.md`——secret 管理、安全扫描工具
3. 每个文件都应以如下内容开头：
   ```
   > This file extends [common/xxx.md](../common/xxx.md) with <Language> specific content.
   ```
4. 引用已有的 skills（如果可用），或者在 `skills/` 下创建新的 skills。

对于像 `web/` 这样的非语言领域，当存在足够多可复用的领域相关指导、足以支撑一个独立规则集时，请遵循同样的分层模式。

## Rule 优先级

当语言专属规则与 common 规则发生冲突时，**语言专属规则优先**（具体覆盖通用）。这遵循标准的分层配置模式（类似于 CSS specificity 或 `.gitignore` 的优先级）。

- `rules/common/` 定义适用于所有项目的通用默认规则。
- `rules/golang/`、`rules/python/`、`rules/swift/`、`rules/php/`、`rules/typescript/`、`rules/react-native/` 等会在语言 idioms 不同时覆盖这些默认规则。

### 示例

`common/coding-style.md` 推荐将 immutability 作为默认原则。语言专属的 `golang/coding-style.md` 可以覆盖这一点：

> Idiomatic Go 使用 pointer receivers 进行 struct mutation——通用原则请参见 [common/coding-style.md](../common/coding-style.md)，但此处首选 Go-idiomatic 的 mutation。

### 带覆盖说明的 Common rules

`rules/common/` 中可能被语言专属文件覆盖的规则会带有以下标记：

> **Language note**：对于该模式不属于 idiomatic 用法的语言，此规则可能会被语言专属规则覆盖。
