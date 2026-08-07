---
description: 检测项目的技术栈，并基于仓库的安装清单和技术栈映射生成试运行的 ECC 接入方案。
---

# /project-init

为当前项目创建安全、可审查的 ECC 接入方案。此命令应以试运行模式启动，仅在用户明确批准后才写入文件。

## 用法

```text
/project-init
/project-init --dry-run
/project-init --target claude
/project-init --target cursor
/project-init --skills continuous-learning-v2,security-review
/project-init --config ecc-install.json
```

## 安全规则

1. 默认采用试运行。在用户批准具体方案之前，不得修改 `CLAUDE.md`、settings 文件、rules、skills 或安装状态。
2. 保留现有项目指引。如果 `CLAUDE.md`、`.claude/settings.local.json`、`.cursor/`、`.codex/`、`.gemini/`、`.opencode/`、`.codebuddy/`、`.joycode/` 或 `.qwen/` 已存在，应检查其内容并提议合并/追加方案，而不是直接覆盖。
3. 使用 ECC 的安装器与清单工具。不要手动复制文件或克隆任意远程仓库作为安装捷径。
4. 保持权限最小化。任何生成的 settings 都应匹配检测到的 build/test/lint 工具，并避免过宽的 shell 访问。
5. 在应用任何变更之前，精确报告将会发生哪些变更。

## 检测输入

读取当前项目根目录，并从以下来源检测技术栈信号：

- 包管理器文件：`package.json`、`package-lock.json`、`pnpm-lock.yaml`、`yarn.lock`、`bun.lockb`
- 语言清单：`pyproject.toml`、`requirements.txt`、`go.mod`、`Cargo.toml`、`pom.xml`、`build.gradle`、`build.gradle.kts`
- 框架配置文件：`next.config.*`、`vite.config.*`、`tailwind.config.*`、`Dockerfile`、`docker-compose.yml`
- ECC 配置：`ecc-install.json`
- 可选的技术栈映射：ECC 仓库中的 `config/project-stack-mappings.json`

当 ECC 仓库已检出到本地时，使用 `config/project-stack-mappings.json` 作为技术栈到 rules/skills 的映射参考。如果该文件不可用，则回退到已安装的 ECC 清单以及用户的明确选择。

## 规划流程

1. 确定目标 harness。除非用户指定 `cursor`、`codex`、`gemini`、`opencode`、`codebuddy`、`joycode` 或 `qwen`，否则默认为 `claude`。
2. 从项目文件检测技术栈，并展示每项匹配的依据。
3. 解析出最小可用的 ECC 方案：
   - 项目已有 `ecc-install.json`：`node scripts/install-plan.js --config ecc-install.json --json`
   - 用户指定了 profile：`node scripts/install-plan.js --profile <profile> --target <target> --json`
   - 用户指定了 skills：`node scripts/install-plan.js --skills <skill-ids> --target <target> --json`
   - 仅检测到语言技术栈：使用旧版语言安装试运行，并传入这些语言名称
4. 在写入之前，运行试运行的 apply 命令：

```bash
node scripts/install-apply.js --target <target> --dry-run --json <language-or-profile-args>
```

5. 汇总检测到的技术栈、选中的 modules/components/skills、目标路径、跳过的不受支持模块，以及将会变更的文件。
6. 在应用非试运行命令之前，请求用户批准。

## 输出约定

返回：

1. 检测到的技术栈依据
2. 拟使用的目标 harness
3. 实际使用的试运行命令
4. 批准后将要执行的 apply 命令
5. 将被创建或变更的文件/目录
6. 针对已存在文件、过宽权限、缺失脚本或不受支持目标的警告

## CLAUDE.md 指引

如果用户想要一个 `CLAUDE.md` 起始模板，应与安装器方案分开生成，并保持最简：

- build 命令（如检测到）
- test 命令（如检测到）
- lint/typecheck 命令（如检测到）
- dev server 命令（如检测到）
- 来自现有 package scripts 或清单的仓库专属说明

未经展示 diff 并获得批准，绝不替换已存在的 `CLAUDE.md`。

## 相关

- `config/project-stack-mappings.json`：提供技术栈到 surface 的提示
- `scripts/install-plan.js`：用于确定性的方案解析
- `scripts/install-apply.js`：用于试运行和 apply 操作
- `/ecc-guide`：在安装前进行交互式功能发现
