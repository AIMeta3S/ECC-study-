---
name: flox-environments
description: "使用 Flox（一个声明式的基于 Nix 的环境管理器）创建可复现的跨平台（macOS/Linux）开发环境。适用于：为任意语言搭建项目工具链；安装系统级依赖（编译器、数据库、openssl/BLAS 等原生库）；为团队锁定精确的包版本；运行本地服务（PostgreSQL、Redis、Kafka）；通过一条命令完成开发者上手；解决“works on my machine”问题——包括需要项目级工具但无需 sudo 的 agent/vibe-coding 设置。当用户提到 .flox/、manifest.toml、flox activate 或 FloxHub 时，同样应使用此 skill。"
metadata:
  origin: Flox
---

# Flox 环境

Flox 创建可复现的开发环境，这些环境定义在单个 TOML manifest 中。团队中的每个开发者都能获得相同的包、工具和配置——跨 macOS 和 Linux——无需容器或 VM。基于 Nix 构建，可访问超过 150,000 个包。

## 何时启用

当用户遇到环境管理问题时使用此 skill——即使他们没有提到 Flox。在以下情况，Flox 是合适的工具：

- 项目需要 **系统级包**（编译器、数据库、CLI 工具）以及特定语言的依赖
- **可复现性很重要**——该设置应在队友的机器上、CI 中或全新的笔记本电脑上以相同方式工作
- 用户需要 **多个工具共存**——例如，Python 3.11 + PostgreSQL 16 + Redis + Node.js 在一个环境中
- 需要 **跨平台支持**（同一配置支持 macOS 和 Linux）
- **AI agents 需要安装工具**——Flox 允许 agents 将包添加到项目级环境中，而无需 sudo、不会污染系统，也没有 sandbox 限制

如果用户只需要一个没有系统依赖的单一语言 runtime，标准工具（单独的 nvm、pyenv、rustup）可能就足够了。如果需要完整的 OS 级隔离，容器可能更合适。Flox 处于最佳平衡点：声明式、可复现的环境，且没有容器开销。

**前提条件：**必须先安装 Flox——请查阅 [flox.dev/docs](https://flox.dev/docs/install-flox/install/) 了解 macOS、Linux 和 Docker 的安装方式。

## 核心概念

Flox 环境定义在 `.flox/env/manifest.toml` 中，并通过 `flox activate` 激活。该 manifest 声明了包、环境变量、设置 hook 和 shell 配置——即在任何地方复现该环境所需的一切。

**关键路径：**
- `.flox/env/manifest.toml` — 环境定义（需提交）
- `$FLOX_ENV` — 已安装包的 runtime 路径（类似 `/usr`——包含 `bin/`、`lib/`、`include/`）
- `$FLOX_ENV_CACHE` — 用于 cache、venv 和数据的持久化本地存储（重建后依然存在）
- `$FLOX_ENV_PROJECT` — 项目根目录（`.flox/` 所在位置）

## 常用命令

```bash
flox init                       # 创建新环境
flox search <package> [--all]   # 搜索包
flox show <package>             # 显示可用版本
flox install <package>          # 添加一个包
flox list                       # 列出已安装的包
flox activate                   # 进入环境
flox activate -- <cmd>          # 在环境中运行命令，不启动子 shell
flox edit                       # 交互式编辑 manifest
```

## Manifest 结构

```toml
# .flox/env/manifest.toml

[install]
# 要安装的包——环境的核心
ripgrep.pkg-path = "ripgrep"
jq.pkg-path = "jq"

[vars]
# 静态环境变量
DATABASE_URL = "postgres://localhost:5432/myapp"

[hook]
# 非交互式设置脚本（每次激活时运行）
on-activate = """
  echo "Environment ready"
"""

[profile]
# Shell 函数和别名（在交互式 shell 中可用）
common = """
  alias dev="npm run dev"
"""

[options]
# 支持的平台
systems = ["x86_64-linux", "aarch64-linux", "x86_64-darwin", "aarch64-darwin"]
```

## 包安装模式

### 基础安装

```toml
[install]
nodejs.pkg-path = "nodejs"
python.pkg-path = "python311"
rustup.pkg-path = "rustup"
```

### 版本锁定

```toml
[install]
nodejs.pkg-path = "nodejs"
nodejs.version = "^20.0"          # Semver 范围：最新的 20.x

postgres.pkg-path = "postgresql"
postgres.version = "16.2"         # 精确版本
```

### 平台特定的包

```toml
[install]
# 仅 Linux 可用的工具
valgrind.pkg-path = "valgrind"
valgrind.systems = ["x86_64-linux", "aarch64-linux"]

# macOS framework
Security.pkg-path = "darwin.apple_sdk.frameworks.Security"
Security.systems = ["x86_64-darwin", "aarch64-darwin"]

# macOS 上的 GNU 工具（BSD 默认行为不同之处）
coreutils.pkg-path = "coreutils"
coreutils.systems = ["x86_64-darwin", "aarch64-darwin"]
```

### 解决包冲突

当两个包安装了相同的二进制文件时，使用 `priority`（数字越小优先级越高）：

```toml
[install]
gcc.pkg-path = "gcc12"
gcc.priority = 3

clang.pkg-path = "clang_18"
clang.priority = 5               # gcc 在文件冲突中胜出
```

使用 `pkg-group` 将应该一起解析版本的包分组：

```toml
[install]
python.pkg-path = "python311"
python.pkg-group = "python-stack"

pip.pkg-path = "python311Packages.pip"
pip.pkg-group = "python-stack"    # 与 python 一起解析
```

## 特定语言方案

### Python 与 uv

```toml
[install]
python.pkg-path = "python311"
uv.pkg-path = "uv"

[vars]
UV_CACHE_DIR = "$FLOX_ENV_CACHE/uv-cache"
PIP_CACHE_DIR = "$FLOX_ENV_CACHE/pip-cache"

[hook]
on-activate = """
  venv="$FLOX_ENV_CACHE/venv"
  if [ ! -d "$venv" ]; then
    uv venv "$venv" --python python3
  fi
  if [ -f "$venv/bin/activate" ]; then
    source "$venv/bin/activate"
  fi

  if [ -f requirements.txt ] && [ ! -f "$FLOX_ENV_CACHE/.deps_installed" ]; then
    uv pip install --python "$venv/bin/python" -r requirements.txt --quiet
    touch "$FLOX_ENV_CACHE/.deps_installed"
  fi
"""
```

### Node.js

```toml
[install]
nodejs.pkg-path = "nodejs"
nodejs.version = "^20.0"

[hook]
on-activate = """
  if [ -f package.json ] && [ ! -d node_modules ]; then
    npm install --silent
  fi
"""
```

### Rust

```toml
[install]
rustup.pkg-path = "rustup"
pkg-config.pkg-path = "pkg-config"
openssl.pkg-path = "openssl"

[vars]
RUSTUP_HOME = "$FLOX_ENV_CACHE/rustup"
CARGO_HOME = "$FLOX_ENV_CACHE/cargo"

[profile]
common = """
  export PATH="$CARGO_HOME/bin:$PATH"
"""
```

### Go

```toml
[install]
go.pkg-path = "go"
gopls.pkg-path = "gopls"
delve.pkg-path = "delve"

[vars]
GOPATH = "$FLOX_ENV_CACHE/go"
GOBIN = "$FLOX_ENV_CACHE/go/bin"

[profile]
common = """
  export PATH="$GOBIN:$PATH"
"""
```

### C/C++

```toml
[install]
gcc.pkg-path = "gcc13"
gcc.pkg-group = "compilers"

# 重要：单独的 gcc 不会暴露 libstdc++ 头文件——需要 gcc-unwrapped
gcc-unwrapped.pkg-path = "gcc-unwrapped"
gcc-unwrapped.pkg-group = "libraries"

cmake.pkg-path = "cmake"
cmake.pkg-group = "build"

gnumake.pkg-path = "gnumake"
gnumake.pkg-group = "build"

gdb.pkg-path = "gdb"
gdb.systems = ["x86_64-linux", "aarch64-linux"]
```

## Hook 与 Profile

### Hook——非交互式设置

Hook 在每次激活时运行。保持它们快速且幂等。经验法则：**如果某件事应该自动发生，放在 `[hook]` 中；如果用户应该能手动输入，放在 `[profile]` 中。**

```toml
[hook]
on-activate = """
  setup_database() {
    if [ ! -d "$FLOX_ENV_CACHE/pgdata" ]; then
      initdb -D "$FLOX_ENV_CACHE/pgdata" --no-locale --encoding=UTF8
    fi
  }
  setup_database
"""
```

### Profile——交互式 Shell 配置

Profile 代码在用户的 shell 会话中可用。

```toml
[profile]
common = """
  dev() { npm run dev; }
  test() { npm run test -- "$@"; }
"""
```

## 反模式

### 绝对路径

```toml
# 不好——在其他机器上会失效
[vars]
PROJECT_DIR = "/home/alice/projects/myapp"

# 好——使用 Flox 环境变量
[vars]
PROJECT_DIR = "$FLOX_ENV_PROJECT"
```

### 在 Hook 中使用 exit

```toml
# 不好——会终止 shell
[hook]
on-activate = """
  if [ ! -f config.json ]; then
    echo "Missing config"
    exit 1
  fi
"""

# 好——从 hook 中 return，不要 exit
[hook]
on-activate = """
  if [ ! -f config.json ]; then
    echo "Missing config — run setup first"
    return 1
  fi
"""
```

### 在 Manifest 中存储 secret

```toml
# 不好——manifest 会被提交到 git
[vars]
API_KEY = "<set-at-runtime>"

# 好——引用外部配置或在运行时传入
# 用法：API_KEY="<your-api-key>" flox activate
[vars]
API_KEY = "${API_KEY:-}"
```

### 没有幂等保护的慢 Hook

```toml
# 不好——每次激活都重新安装
[hook]
on-activate = """
  pip install -r requirements.txt
"""

# 好——已安装则跳过
[hook]
on-activate = """
  if [ ! -f "$FLOX_ENV_CACHE/.deps_installed" ]; then
    uv pip install -r requirements.txt --quiet
    touch "$FLOX_ENV_CACHE/.deps_installed"
  fi
"""
```

### 将用户命令放在 Hook 中

```toml
# 不好——hook 函数在交互式 shell 中不可用
[hook]
on-activate = """
  deploy() { kubectl apply -f k8s/; }
"""

# 好——使用 [profile] 定义用户可调用的函数
[profile]
common = """
  deploy() { kubectl apply -f k8s/; }
"""
```

## 全栈示例

一个搭配 PostgreSQL 的 Python API 完整环境：

```toml
[install]
python.pkg-path = "python311"
uv.pkg-path = "uv"
postgresql.pkg-path = "postgresql_16"
redis.pkg-path = "redis"
jq.pkg-path = "jq"
curl.pkg-path = "curl"

[vars]
UV_CACHE_DIR = "$FLOX_ENV_CACHE/uv-cache"
DATABASE_URL = "postgres://localhost:5432/myapp"
REDIS_URL = "redis://localhost:6379"

[hook]
on-activate = """
  if [ ! -d "$FLOX_ENV_CACHE/pgdata" ]; then
    initdb -D "$FLOX_ENV_CACHE/pgdata" --no-locale --encoding=UTF8
  fi

  venv="$FLOX_ENV_CACHE/venv"
  if [ ! -d "$venv" ]; then
    uv venv "$venv" --python python3
  fi
  if [ -f "$venv/bin/activate" ]; then
    source "$venv/bin/activate"
  fi

  if [ -f requirements.txt ] && [ ! -f "$FLOX_ENV_CACHE/.deps_installed" ]; then
    uv pip install --python "$venv/bin/python" -r requirements.txt --quiet
    touch "$FLOX_ENV_CACHE/.deps_installed"
  fi
"""

[profile]
common = """
  serve() { uvicorn app.main:app --reload --host 0.0.0.0 --port 8000; }
  migrate() { alembic upgrade head; }
"""

[services]
postgres.command = "postgres -D $FLOX_ENV_CACHE/pgdata -k $FLOX_ENV_CACHE"
redis.command = "redis-server --port 6379 --daemonize no"

[options]
systems = ["x86_64-linux", "aarch64-linux", "x86_64-darwin", "aarch64-darwin"]
```

激活并启动服务：`flox activate --start-services`

## 环境共享

Flox 环境是 git 原生的。提交 `.flox/` 目录，每个协作者都会获得相同的环境：

```bash
git add .flox/
git commit -m "Add Flox environment"
# 队友只需运行：
git clone <repo> && cd <repo> && flox activate
```

对于跨项目的可复用基础环境，推送到 FloxHub：

```bash
flox push                         # 将环境推送到 FloxHub
flox activate -r owner/env-name   # 在任意位置激活远程环境
```

使用 `[include]` 组合环境：

```toml
[include]
base.floxhub = "myorg/python-base"

[install]
# 在基础环境之上针对项目的额外添加
fastapi.pkg-path = "python311Packages.fastapi"
```

## AI 辅助与 Vibe Coding

Flox 非常适合 AI 辅助开发和 vibe coding 工作流。当 AI agent 需要一个当前环境中不可用的工具——编译器、数据库、linter、CLI 工具——时，它可以将其添加到项目的 Flox manifest 中，而无需 sudo 权限、不污染系统包，也不受 sandbox 限制。

**为什么这对 agent 很重要：**
- **无需 sudo**——`flox install` 完全在用户空间运行，因此 agent 无需提权即可添加包
- **项目级作用域**——包只安装到项目环境中，而非全局，因此不同项目可以拥有不同版本而不会冲突
- **对 sandbox 友好**——运行在 sandbox 或受限环境中的 agent 仍可通过 Flox 安装所需工具
- **可逆**——每次更改都记录在 `manifest.toml` 中，因此不需要的包可以被干净地移除，不会留下系统残留
- **可复现**——当 agent 搭建了一个环境时，该精确设置会被提交到 git 并对所有人都有效

**Agent 工作流模式：**

```bash
# Agent 发现它需要某个工具（例如用于 JSON 处理的 jq）
flox search jq                    # 验证该包是否存在
flox install jq                   # 安装到项目环境中

# 或者为了更多控制，直接编辑 manifest
tmp_manifest="$(mktemp)"
flox list -c > "$tmp_manifest"
# 将包添加到 [install] 段，然后应用
flox edit -f "$tmp_manifest"

# 在工具可用的情况下运行命令
flox activate -- jq '.results[]' data.json
```

这使得 Flox 天然适合任何需要 Claude Code 或其他 AI agent 即时搭建项目工具的工作流。

## 调试

```bash
flox list -c                      # 显示原始 manifest
flox activate -- which python     # 检查哪个二进制文件会被解析
flox activate -- env | grep FLOX  # 查看 Flox 环境变量
flox search <package> --all       # 更广范围的包搜索（区分大小写）
```

**常见问题：**
- **找不到包：**搜索区分大小写——尝试 `flox search --all`
- **包之间的文件冲突：**为应该胜出的包添加 `priority`
- **Hook 失败：**使用 `return` 而非 `exit`；用 `${FLOX_ENV_CACHE:-}` 做保护
- **过时的依赖：**删除 `$FLOX_ENV_CACHE/.deps_installed` 标志文件

## 相关 skill

以下 skill 作为 [Flox Claude Code plugin](https://github.com/flox/flox-agentic) 的一部分提供，用于更深度的集成：

- **flox-services** ——服务管理、数据库设置、后台进程
- **flox-builds** ——使用 Flox 进行可复现的构建和打包
- **flox-containers** ——从 Flox 环境创建 Docker/OCI 容器
- **flox-sharing** ——环境组合、远程环境、团队协作模式
- **flox-cuda** ——CUDA 和 GPU 开发环境

了解更多并安装，请访问 [flox.dev/docs](https://flox.dev/docs/install-flox/install/)
