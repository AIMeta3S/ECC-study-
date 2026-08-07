---
name: opensource-pipeline
description: "开源 pipeline：fork、sanitize、package 私有项目以实现安全的公开发布。串联 3 个 agent（forker、sanitizer、packager）。触发词：'/opensource'、'open source this'、'make this public'、'prepare for open source'。"
metadata:
  origin: ECC
---

# 开源 pipeline Skill

通过 3 阶段 pipeline 安全地开源任何项目：**Fork**（清除 secrets）→ **Sanitize**（验证已清洁）→ **Package**（CLAUDE.md + setup.sh + README）。

## 何时激活

- 用户说 "open source this project" 或 "make this public"
- 用户想要将私有 repo 准备为公开发布
- 用户需要在 push 到 GitHub 之前清除 secrets
- 用户调用 `/opensource fork`、`/opensource verify` 或 `/opensource package`

## 命令

| 命令 | 操作 |
|---------|--------|
| `/opensource fork PROJECT` | 完整 pipeline：fork + sanitize + package |
| `/opensource verify PROJECT` | 在现有 repo 上运行 sanitizer |
| `/opensource package PROJECT` | 生成 CLAUDE.md + setup.sh + README |
| `/opensource list` | 显示所有 staged 项目 |
| `/opensource status PROJECT` | 显示某个 staged 项目的报告 |

## 协议

### /opensource fork PROJECT

**完整 pipeline——主工作流。**

#### 步骤 1：收集参数

解析项目路径。如果 PROJECT 包含 `/`，则视为路径（绝对或相对）。否则依次检查：当前工作目录、`$HOME/PROJECT`，然后询问用户。

```
SOURCE_PATH="<resolved absolute path>"
STAGING_PATH="$HOME/opensource-staging/${PROJECT_NAME}"
```

询问用户：
1. "哪个项目？"（如果未找到）
2. "许可证？（MIT / Apache-2.0 / GPL-3.0 / BSD-3-Clause）"
3. "GitHub 组织或用户名？"（默认：通过 `gh api user -q .login` 检测）
4. "GitHub repo 名称？"（默认：项目名称）
5. "README 的描述？"（分析项目以提供建议）

#### 步骤 2：创建 staging 目录

```bash
mkdir -p $HOME/opensource-staging/
```

#### 步骤 3：运行 forker agent

生成 `opensource-forker` agent：

```
Agent(
  description="为开源 fork {PROJECT}",
  subagent_type="opensource-forker",
  prompt="""
为开源发布 fork 项目。

源：{SOURCE_PATH}
目标：{STAGING_PATH}
许可证：{chosen_license}

遵循完整的 forking 协议：
1. 复制文件（排除 .git、node_modules、__pycache__、.venv）
2. 清除所有 secrets 和 credentials
3. 将内部引用替换为占位符
4. 生成 .env.example
5. 清理 git history
6. 在 {STAGING_PATH}/FORK_REPORT.md 生成 FORK_REPORT.md
"""
)
```

等待完成。读取 `{STAGING_PATH}/FORK_REPORT.md`。

#### 步骤 4：运行 sanitizer agent

生成 `opensource-sanitizer` agent：

```
Agent(
  description="验证 {PROJECT} 的 sanitization",
  subagent_type="opensource-sanitizer",
  prompt="""
验证开源 fork 的 sanitization。

项目：{STAGING_PATH}
源（供参考）：{SOURCE_PATH}

运行全部扫描类别：
1. Secrets 扫描（CRITICAL）
2. PII 扫描（CRITICAL）
3. 内部引用扫描（CRITICAL）
4. 危险文件检查（CRITICAL）
5. 配置完整性（WARNING）
6. Git history 审计

在 {STAGING_PATH}/ 内生成 SANITIZATION_REPORT.md，给出 PASS/FAIL 结论。
"""
)
```

等待完成。读取 `{STAGING_PATH}/SANITIZATION_REPORT.md`。

**如果 FAIL：** 向用户展示 findings。询问："修复这些问题并重新扫描，还是中止？"
- 如果修复：应用修复，重新运行 sanitizer（最多重试 3 次——3 次 FAIL 后，展示所有 findings 并要求用户手动修复）
- 如果中止：清理 staging 目录

**如果 PASS 或 PASS WITH WARNINGS：** 继续步骤 5。

#### 步骤 5：运行 packager agent

生成 `opensource-packager` agent：

```
Agent(
  description="为开源 package {PROJECT}",
  subagent_type="opensource-packager",
  prompt="""
为项目生成开源 packaging。

项目：{STAGING_PATH}
许可证：{chosen_license}
项目名称：{PROJECT_NAME}
描述：{description}
GitHub repo：{github_repo}

生成：
1. CLAUDE.md（命令、架构、关键文件）
2. setup.sh（单命令 bootstrap，设为可执行）
3. README.md（或增强已有文件）
4. LICENSE
5. CONTRIBUTING.md
6. .github/ISSUE_TEMPLATE/（bug_report.md、feature_request.md）
"""
)
```

#### 步骤 6：最终审查

向用户展示：
```
开源 fork 已就绪：{PROJECT_NAME}

位置：{STAGING_PATH}
许可证：{license}
生成的文件：
  - CLAUDE.md
  - setup.sh（可执行）
  - README.md
  - LICENSE
  - CONTRIBUTING.md
  - .env.example（{N} 个变量）

Sanitization：{sanitization_verdict}

后续步骤：
  1. 审查：cd {STAGING_PATH}
  2. 创建 repo：gh repo create {github_org}/{github_repo} --public
  3. Push：git remote add origin ... && git push -u origin main

是否继续创建 GitHub repo？（yes/no/review first）
```

#### 步骤 7：发布到 GitHub（经用户批准）

```bash
cd "{STAGING_PATH}"
gh repo create "{github_org}/{github_repo}" --public --source=. --push --description "{description}"
```

---

### /opensource verify PROJECT

独立运行 sanitizer。解析路径：如果 PROJECT 包含 `/`，则视为路径。否则依次检查 `$HOME/opensource-staging/PROJECT`、`$HOME/PROJECT`，然后是当前目录。

```
Agent(
  subagent_type="opensource-sanitizer",
  prompt="验证 {resolved_path} 的 sanitization。运行全部 6 个扫描类别并生成 SANITIZATION_REPORT.md。"
)
```

---

### /opensource package PROJECT

独立运行 packager。询问 "许可证？" 和 "描述？"，然后：

```
Agent(
  subagent_type="opensource-packager",
  prompt="Package：{resolved_path} ..."
)
```

---

### /opensource list

```bash
ls -d $HOME/opensource-staging/*/
```

展示每个项目及其 pipeline 进度（FORK_REPORT.md、SANITIZATION_REPORT.md、CLAUDE.md 的存在情况）。

---

### /opensource status PROJECT

```bash
cat $HOME/opensource-staging/${PROJECT}/SANITIZATION_REPORT.md
cat $HOME/opensource-staging/${PROJECT}/FORK_REPORT.md
```

## Staging 布局

```
$HOME/opensource-staging/
  my-project/
    FORK_REPORT.md           # 来自 forker agent
    SANITIZATION_REPORT.md   # 来自 sanitizer agent
    CLAUDE.md                # 来自 packager agent
    setup.sh                 # 来自 packager agent
    README.md                # 来自 packager agent
    .env.example             # 来自 forker agent
    ...                      # 已 sanitize 的项目文件
```

## 反模式

- **绝不**在未经用户批准的情况下 push 到 GitHub
- **绝不**跳过 sanitizer——它是安全关卡
- **绝不**在 sanitizer FAIL 后未修复所有 critical findings 的情况下继续
- **绝不**将 `.env`、`*.pem` 或 `credentials.json` 留在 staging 目录

## 最佳实践

- 对于新发布，始终运行完整 pipeline（fork → sanitize → package）
- staging 目录会一直保留，直到显式清理——可用它进行审查
- 发布前，在任何手动修复之后重新运行 sanitizer
- 将 secrets 参数化而非删除——保留项目功能

## 相关 skill

参见 `security-review`，了解 sanitizer 所使用的 secret 检测模式。
