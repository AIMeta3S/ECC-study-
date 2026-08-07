---
description: 检测项目的技术栈，并基于仓库的 install manifests 和 stack mappings 生成 dry-run 模式的 ECC 接入计划。
---

# /project-init

为当前项目创建一份安全、可审查的 ECC 接入计划。此命令应以 dry-run 模式启动，仅在用户明确批准后才写入文件。

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

1. 默认采用 dry-run 。在用户批准具体方案之前，不得修改 `CLAUDE.md`、settings 文件、rules、skills 或安装状态。
2. 保留现有项目指引。如果 `CLAUDE.md`、`.claude/settings.local.json`、`.cursor/`、`.codex/`、`.gemini/`、`.opencode/`、`.codebuddy/`、`.joycode/` 或 `.qwen/` 已存在，应检查其内容并提议合并/追加方案，而不是直接覆盖。
3. 使用 ECC 的installer and manifest tooling。不要手动复制文件或克隆任意远程仓库作为安装快捷方式。
4. 保持最小权限。生成的任何 settings 都应匹配检测到的 build/test/lint 工具，并避免赋予宽泛的 shell 访问权限。
5. 在执行任何操作前，请先准确报告将会发生哪些变化(包括影响)。

## 检测输入

读取当前项目根目录，并从以下文件中检测技术栈信号：

- 包管理器文件：`package.json`、`package-lock.json`、`pnpm-lock.yaml`、`yarn.lock`、`bun.lockb`
- 语言清单：`pyproject.toml`、`requirements.txt`、`go.mod`、`Cargo.toml`、`pom.xml`、`build.gradle`、`build.gradle.kts`
- 框架文件：`next.config.*`、`vite.config.*`、`tailwind.config.*`、`Dockerfile`、`docker-compose.yml`
- ECC 配置：`ecc-install.json`
- 可选的技术栈映射：ECC 仓库中的 `config/project-stack-mappings.json`

当 ECC 检出可用时，使用 `config/project-stack-mappings.json` 作为技术栈到 rules/skills 的参考。若该文件不可用，则回退到已安装的 ECC 清单及用户明确指定的选项。

## 规划流程

1. 确定目标 harness。除非用户指定 `cursor`、`codex`、`gemini`、`opencode`、`codebuddy`、`joycode` 或 `qwen`，否则默认为 `claude`。
2. 从项目文件检测技术栈，并展示每项匹配的依据。
3. 解析出最小可用的 ECC 方案：
   - 项目已有 `ecc-install.json`：`node scripts/install-plan.js --config ecc-install.json --json`
   - 用户指定了 profile：`node scripts/install-plan.js --profile <profile> --target <target> --json`
   - 用户指定了 skills：`node scripts/install-plan.js --skills <skill-ids> --target <target> --json`
   - 仅检测到语言技术栈：则对这些语言名称执行旧版语言安装 dry-run
4. 在实际写入前，执行 dry-run 应用命令：

```bash
node scripts/install-apply.js --target <target> --dry-run --json <language-or-profile-args>
```

5. 汇总检测到的技术栈、选定的模块/组件/skills、目标路径、已跳过的未支持模块以及将变更的文件。
6. 在执行非 dry-run 命令前征求用户批准。

## 输出约定

返回：

1. 检测到的技术栈证据
2. 建议的目标 harness
3. 所执行的确切 dry-run 命令
4. 批准后执行的准确应用命令
5. 将创建或变更的文件/目录
6. 关于现有文件、权限过大、脚本缺失或目标不受支持的警告

## CLAUDE.md 指引

如果用户想要一个 `CLAUDE.md` 起始模板，请与安装方案分开生成，并保持其精简：

- build 命令（如检测到）
- test 命令（如检测到）
- lint/typecheck 命令（如检测到）
- dev server 命令（如检测到）
- 来自现有包脚本或清单的仓库特定说明

未经展示 diff 并获得批准，绝不替换已存在的 `CLAUDE.md`。

## 相关

- `config/project-stack-mappings.json`：提供技术栈到 surface 的提示
- `scripts/install-plan.js`：用于确定性的方案解析
- `scripts/install-apply.js`：用于 dry-run 和 aapply operations
- `/ecc-guide`：在安装前进行交互式功能发现
