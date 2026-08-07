---
name: windows-desktop-e2e
description: 使用 pywinauto 和 Windows UI Automation 对 Windows 原生桌面应用（WPF、WinForms、Win32/MFC、Qt）进行 E2E 测试。
metadata:
  origin: ECC
---

# Windows 桌面 E2E 测试

使用由 Windows UI Automation (UIA) 支撑的 **pywinauto** 对 Windows 原生桌面应用进行 End-to-end 测试。覆盖 WPF、WinForms、Win32/MFC 以及 Qt（5.x / 6.x）——其中 Qt 专属指南作为独立章节。

## 何时启用

- 为 Windows 原生桌面应用编写或运行 E2E 测试
- 从零搭建桌面 GUI 测试套件
- 诊断 flaky 或失败的桌面自动化测试
- 为现有应用添加可测试性（AutomationId、accessible name）
- 将桌面 E2E 集成到 CI/CD pipeline（GitHub Actions `windows-latest`）

### 何时不使用

- Web 应用 → 使用 `e2e-testing` skill（Playwright）
- Electron / CEF / WebView2 应用 → 其 HTML 层需要浏览器自动化，而非 UIA
- 移动应用 → 使用平台专属工具（UIAutomator、XCUITest）
- 不需要运行中 GUI 的纯 unit test 或 integration test

## 核心概念

所有 Windows 桌面自动化都依赖 **UI Automation (UIA)**——Windows 内置的 accessibility API。每个受支持的框架都会暴露一棵 UIA 元素树，其属性可被 Claude 读取并操作：

```
你的测试（Python）
    └── pywinauto（UIA backend）
        └── Windows UI Automation API   ← Windows 内置，与框架无关
            └── 应用的 UIA provider      ← 每个框架自带
                └── 运行中的 .exe
```

**按框架看的 UIA 质量：**

| 框架 | AutomationId | 可靠性 | 备注 |
|-----------|-------------|-------------|-------|
| WPF | 5/5 | 优秀 | `x:Name` 直接映射为 AutomationId |
| WinForms | 4/5 | 良好 | `AccessibleName` = AutomationId |
| UWP / WinUI 3 | 5/5 | 优秀 | Microsoft 完整支持 |
| Qt 6.x | 5/5 | 优秀 | 默认启用 accessibility；class 名变为 `Qt6*` |
| Qt 5.15+ | 4/5 | 良好 | 改进的 Accessibility 模块 |
| Qt 5.7–5.14 | 3/5 | 一般 | 需要 `QT_ACCESSIBILITY=1`；objectName 需手动设置 |
| Win32 / MFC | 3/5 | 一般 | Control ID 可访问；文本匹配常见 |

## 环境搭建与前置条件

```bash
# Python 3.8+，仅限 Windows
pip install pywinauto pytest pytest-html Pillow pytest-timeout
# 可选：屏幕录制
# 安装 ffmpeg 并添加到 PATH：https://ffmpeg.org/download.html
```

验证 UIA 可达：

```python
from pywinauto import Desktop
Desktop(backend="uia").windows()  # 列出所有顶层窗口
```

安装 **Accessibility Insights for Windows**（免费，来自 Microsoft）——它相当于你的 DevTools，用于在编写任何测试前检查 UIA 元素树。

## 可测试性设置（按框架）

你能做的最具影响力的一件事，就是在编写测试前**为每个交互控件赋予稳定的 AutomationId**。

### WPF

```xml
<!-- XAML：x:Name 自动成为 AutomationId -->
<TextBox x:Name="usernameInput" />
<PasswordBox x:Name="passwordInput" />
<Button x:Name="btnLogin" Content="Login" />
<TextBlock x:Name="lblError" />
```

### WinForms

```csharp
// 在 designer 或代码中设置
usernameInput.AccessibleName = "usernameInput";
passwordInput.AccessibleName = "passwordInput";
btnLogin.AccessibleName = "btnLogin";
lblError.AccessibleName = "lblError";
```

### Win32 / MFC

```cpp
// .rc 文件中的 Control resource ID 会作为 AutomationId 字符串暴露
// IDC_EDIT_USERNAME -> AutomationId "1001"
// 优先用 SetWindowText 设置 Name；添加 IAccessible 以获得更丰富的支持
```

### Qt ——见下方专属章节

---

## Page Object Model

```
tests/
├── conftest.py          # 应用启动 fixture，失败截图
├── pytest.ini
├── config.py
├── pages/
│   ├── __init__.py      # 导入所必需
│   ├── base_page.py     # locator、wait、screenshot 辅助方法
│   ├── login_page.py
│   └── main_page.py
├── tests/
│   ├── __init__.py
│   ├── test_login.py
│   └── test_main_flow.py
└── artifacts/           # 截图、视频、日志
```

### base_page.py

```python
import os, time
from pywinauto import Desktop
from config import ACTION_TIMEOUT, ARTIFACT_DIR

class BasePage:
    def __init__(self, window):
        self.window = window

    # --- Locator（优先级顺序）---

    def by_id(self, auto_id, **kw):
        """AutomationId ——最稳定。作为首选。"""
        return self.window.child_window(auto_id=auto_id, **kw)

    def by_name(self, name, **kw):
        """可见文本 / accessible name。"""
        return self.window.child_window(title=name, **kw)

    def by_class(self, cls, index=0, **kw):
        """Control class + index ——脆弱，尽可能避免。"""
        return self.window.child_window(class_name=cls, found_index=index, **kw)

    # --- 等待 ---

    def wait_visible(self, spec, timeout=ACTION_TIMEOUT):
        spec.wait("visible", timeout=timeout)
        return spec

    def wait_gone(self, spec, timeout=ACTION_TIMEOUT):
        spec.wait_not("visible", timeout=timeout)
        return spec

    def wait_window(self, title, timeout=ACTION_TIMEOUT):
        """等待新的顶层窗口（对话框、子窗口）。"""
        dlg = Desktop(backend="uia").window(title=title)
        dlg.wait("visible", timeout=timeout)
        return dlg

    def wait_until(self, fn, timeout=ACTION_TIMEOUT, interval=0.3):
        """轮询任意条件——当 UIA 事件不可靠时使用。"""
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                if fn():
                    return True
            except Exception:
                pass
            time.sleep(interval)
        raise TimeoutError(f"Condition not met within {timeout}s")

    # --- 操作 ---

    def click(self, spec):
        self.wait_visible(spec)
        spec.click_input()

    def type_text(self, spec, text):
        self.wait_visible(spec)
        ctrl = spec.wrapper_object()
        try:
            ctrl.set_edit_text(text)
        except Exception as e:
            # Qt 5.x 回退方案：UIA Value Pattern 可能不完整
            import sys, pywinauto.keyboard as kb
            print(f"[windows-desktop-e2e] set_edit_text failed ({e}), using keyboard fallback", file=sys.stderr)
            ctrl.click_input()
            kb.send_keys("^a")
            kb.send_keys(text, with_spaces=True)

    def get_text(self, spec):
        ctrl = spec.wrapper_object()
        for attr in ("window_text", "get_value"):
            try:
                v = getattr(ctrl, attr)()
                if v:
                    return v
            except Exception:
                pass
        return ""

    # --- Artifact ---

    def screenshot(self, name):
        os.makedirs(ARTIFACT_DIR, exist_ok=True)
        path = os.path.join(ARTIFACT_DIR, f"{name}.png")
        self.window.capture_as_image().save(path)
        return path
```

### login_page.py

```python
from pages.base_page import BasePage

class LoginPage(BasePage):
    @property
    def username(self): return self.by_id("usernameInput")

    @property
    def password(self): return self.by_id("passwordInput")

    @property
    def btn_login(self): return self.by_id("btnLogin")

    @property
    def error_label(self): return self.by_id("lblError")

    def login(self, user, pwd):
        self.type_text(self.username, user)
        self.type_text(self.password, pwd)
        self.click(self.btn_login)

    def login_ok(self, user, pwd, main_title="Main Window"):
        self.login(user, pwd)
        return self.wait_window(main_title)

    def login_fail(self, user, pwd):
        self.login(user, pwd)
        self.wait_visible(self.error_label)
        return self.get_text(self.error_label)
```

### conftest.py

> 对于新项目，推荐使用 **Tier 1 sandbox fixture**（见下文）——它以零额外成本增加了文件系统隔离。这个基础 fixture 仅用于极简或遗留场景。

```python
import os, pytest
os.environ["QT_ACCESSIBILITY"] = "1"  # Qt 5.x UIA 支持所必需

from pywinauto import Application
from config import APP_PATH, MAIN_WINDOW_TITLE, LAUNCH_TIMEOUT, ARTIFACT_DIR

@pytest.fixture
def app(request):
    if not APP_PATH:
        pytest.exit("APP_PATH environment variable is not set", returncode=1)
    proc = Application(backend="uia").start(APP_PATH, timeout=LAUNCH_TIMEOUT)
    win  = proc.window(title=MAIN_WINDOW_TITLE)
    win.wait("visible", timeout=LAUNCH_TIMEOUT)
    yield win
    # 失败时截图
    if getattr(getattr(request.node, "rep_call", None), "failed", False):
        os.makedirs(ARTIFACT_DIR, exist_ok=True)
        try:
            win.capture_as_image().save(
                os.path.join(ARTIFACT_DIR, f"FAIL_{request.node.name}.png")
            )
        except Exception:
            pass
    # 先优雅退出，回退到强制终止
    # proc 是 pywinauto Application ——使用 wait_for_process_exit()，而非 wait_for_process()
    try:
        win.close()
        proc.wait_for_process_exit(timeout=5)
    except Exception:
        proc.kill()

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    setattr(item, f"rep_{outcome.get_result().when}", outcome.get_result())
```

### config.py

```python
import os
APP_PATH          = os.environ.get("APP_PATH", "")           # 通过 env 设置——无默认路径
MAIN_WINDOW_TITLE = os.environ.get("APP_TITLE", "")
LAUNCH_TIMEOUT    = int(os.environ.get("LAUNCH_TIMEOUT", "15"))
ACTION_TIMEOUT    = int(os.environ.get("ACTION_TIMEOUT", "10"))
ARTIFACT_DIR      = os.path.join(os.path.dirname(__file__), "artifacts")
```

### pytest.ini

```ini
[pytest]
testpaths = tests
markers =
    smoke: 针对关键路径的快速 smoke test
    flaky: 已知不稳定的测试
addopts = -v --tb=short --html=artifacts/report.html --self-contained-html
```

## Locator 策略

```
AutomationId  >  Name（文本）  >  ClassName + index  >  XPath
  （稳定）          （可读）         （脆弱）              （最后手段）
```

用 Accessibility Insights 检查 → **Properties** 面板 → 首先查找 `AutomationId`。

```python
# 运行时检查——粘贴到 REPL 中以探索树结构
win.print_control_identifiers()
# 或缩小范围：
win.child_window(auto_id="groupBox1").print_control_identifiers()
```

## 等待模式

```python
# 等待控件出现
page.wait_visible(page.by_id("statusLabel"))

# 等待控件消失（如 loading spinner）
page.wait_gone(page.by_id("spinnerOverlay"))

# 等待对话框弹出
dlg = page.wait_window("Confirm Delete")

# 自定义条件（如文本变化）
page.wait_until(lambda: page.get_text(page.by_id("lblStatus")) == "Ready")
```

**永远不要将 `time.sleep()` 作为主要的同步手段**——使用 `wait()` 或 `wait_until()`。

## Artifact 管理

```python
# 按需截图
page.screenshot("after_login")

# 全屏捕获（当窗口离屏或最小化时）
import pyautogui
pyautogui.screenshot("artifacts/fullscreen.png")

# 用 ffmpeg 录屏（测试前开始，测试后停止）
import subprocess

def start_recording(name):
    return subprocess.Popen([
        "ffmpeg", "-f", "gdigrab", "-framerate", "10",
        "-i", "desktop", "-y", f"artifacts/videos/{name}.mp4"
    ], stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def stop_recording(proc):
    proc.stdin.write(b"q"); proc.stdin.flush(); proc.wait(timeout=10)
```

## 逐步 Trace（可选启用）

默认的失败截图对诊断 flaky 测试而言往往信息不足。下方的 step 级 trace **默认关闭**——仅在复现 flaky 场景时启用。

### 启用

```bash
E2E_TRACE=1 pytest tests/test_login.py -v
# 在 JSONL 日志中包含输入的文本（请勿用于输入凭据/PII 的测试）：
E2E_TRACE=1 E2E_TRACE_INCLUDE_TEXT=1 pytest ...
```

### 注入 BasePage

```python
import os, json, time
TRACE_ENABLED      = os.environ.get("E2E_TRACE") == "1"
TRACE_INCLUDE_TEXT = os.environ.get("E2E_TRACE_INCLUDE_TEXT") == "1"

class BasePage:
    _step = 0

    def _trace(self, action, spec=None, text=None):
        if not TRACE_ENABLED:
            return
        BasePage._step += 1
        idx = f"{BasePage._step:03d}"
        os.makedirs(ARTIFACT_DIR, exist_ok=True)
        try:
            self.window.capture_as_image().save(
                os.path.join(ARTIFACT_DIR, f"step_{idx}_{action}.png"))
        except Exception:
            pass  # 捕获失败不得中断测试
        rec = {
            "ts": time.time(), "step": BasePage._step, "action": action,
            "locator": getattr(spec, "criteria", None),
            "text": text if TRACE_INCLUDE_TEXT else ("<redacted>" if text else None),
        }
        with open(os.path.join(ARTIFACT_DIR, "trace.jsonl"), "a") as f:
            f.write(json.dumps(rec) + "\n")

    def click(self, spec):
        self.wait_visible(spec); self._trace("click_before", spec)
        spec.click_input();      self._trace("click_after",  spec)

    def type_text(self, spec, text):
        self.wait_visible(spec); self._trace("type_before", spec, text)
        # ... 既有的 set_edit_text / keyboard 回退方案 ...
        self._trace("type_after", spec)
```

### 注意事项

- **PII / 凭据**：`type_text` 内容默认为 `<redacted>`。切勿在登录或支付流程中设置 `E2E_TRACE_INCLUDE_TEXT=1`。
- **开销**：每个动作约 50–200ms + 每步一个 PNG 写入磁盘。不要在默认 CI matrix 上启用——仅用于专门的 flake 复现 job。
- **Artifact 膨胀**：一个长流程会产生数十 MB；相应调整 `retention-days`。
- **并行/重跑卫生**：这个简单示例向 `trace.jsonl` 追加内容并使用类级计数器。重跑前清空 artifact 目录，并行测试时使用按 worker 的 artifact 目录。
- **覆盖盲区**：在 `BasePage` 之外执行的动作（测试代码中直接调用 `pywinauto`）不会被 trace。

## Flaky 测试处理

```python
# Quarantine ——相当于 Playwright 的 test.fixme()
@pytest.mark.skip(reason="Flaky: animation race on slow CI. Issue #42")
def test_animated_transition(self, app): ...

# 仅在 CI 中跳过
@pytest.mark.skipif(os.environ.get("CI") == "true", reason="Flaky in CI #43")
def test_heavy_load(self, app): ...
```

常见原因与修复：

| 原因 | 修复 |
|-------|-----|
| 控件未就绪 | 用 `wait_visible` 替换 `time.sleep` |
| 窗口未聚焦 | 在交互前添加 `win.set_focus()` |
| 动画进行中 | `wait_until(lambda: not loading_indicator.exists())` |
| 对话框时序 | `wait_window(title, timeout=15)` |
| CI 显示未就绪 | 在 CI 中设置 `DISPLAY` 或使用虚拟桌面 |
| `set_edit_text` 抛出 NotImplementedError | UIA ValuePattern 缺失（常见于 Qt 5.x）——`BasePage.type_text` 已回退到 `keyboard.send_keys` |
| 控件存在但 `wait_visible` 超时 | 窗口最小化或离屏——等待前调用 `win.restore()` + `win.set_focus()` |

## 测试隔离与 Sandbox

三个隔离层级——使用能满足需求的、最轻量的那一层。

### Tier 1 ——文件系统隔离（默认，始终使用）

每个测试通过 `subprocess.Popen` 和 `Application.connect()` 获得自己的 `APPDATA` / `LOCALAPPDATA` / `TEMP`。pytest 的 `tmp_path` fixture 会自动处理清理。

```python
# conftest.py ——用此替换基础的 `app` fixture
import os, subprocess, pytest
from pywinauto import Application
from config import APP_PATH, APP_ARGS, APP_TITLE, LAUNCH_TIMEOUT, ACTION_TIMEOUT, ARTIFACT_DIR

@pytest.fixture(scope="function")
def app(request, tmp_path):
    """每个测试使用全新进程 + 隔离的用户数据目录。"""
    if not APP_PATH:
        pytest.exit("APP_PATH not set", returncode=1)

    # 将所有按用户划分的存储重定向到隔离的 tmp 目录
    sandbox_env = os.environ.copy()
    sandbox_env["QT_ACCESSIBILITY"]  = "1"
    sandbox_env["APPDATA"]           = str(tmp_path / "AppData" / "Roaming")
    sandbox_env["LOCALAPPDATA"]      = str(tmp_path / "AppData" / "Local")
    sandbox_env["TEMP"] = sandbox_env["TMP"] = str(tmp_path / "Temp")
    for p in (sandbox_env["APPDATA"], sandbox_env["LOCALAPPDATA"], sandbox_env["TEMP"]):
        os.makedirs(p, exist_ok=True)

    if not APP_TITLE:
        pytest.exit("APP_TITLE environment variable is not set", returncode=1)

    # shlex.split 能处理带空格的引号参数；plain split() 会将其拆断
    import shlex
    # 通过 subprocess 启动以便传入 env；按 PID 连接 pywinauto
    proc = subprocess.Popen(
        [APP_PATH] + shlex.split(APP_ARGS),
        env=sandbox_env,
    )
    pw_app = Application(backend="uia").connect(process=proc.pid, timeout=LAUNCH_TIMEOUT)
    win    = pw_app.window(title=APP_TITLE)
    win.wait("visible", timeout=LAUNCH_TIMEOUT)
    yield win

    if getattr(getattr(request.node, "rep_call", None), "failed", False):
        os.makedirs(ARTIFACT_DIR, exist_ok=True)
        try:
            win.capture_as_image().save(
                os.path.join(ARTIFACT_DIR, f"FAIL_{request.node.name}.png")
            )
        except Exception:
            pass
    try:
        win.close()
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
    # tmp_path 由 pytest 自动清理

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    setattr(item, f"rep_{outcome.get_result().when}", outcome.get_result())
```

### Tier 2 ——Windows Job Object（可选：进程生命周期管控）

将进程附加到 Job Object，使其在测试 fixture 的 job handle 被 GC 时**自动终止**。同时也防止应用生成逃脱 fixture 清理的子进程。

> **隔离范围：**Job Object 不会虚拟化文件系统访问，也不会阻断网络流量。文件写入和网络的隔离需要 AppContainer、Windows Firewall 规则或 Tier 3（Windows Sandbox）。Tier 2 仅用于进程生命周期和子进程管控。

无需额外依赖。

```python
import ctypes, ctypes.wintypes as wt

def restrict_process(pid: int):
    """
    将进程附加到 Job Object，阻止其：
    - 在 job 之外生成进程（LIMIT_KILL_ON_JOB_CLOSE）
    不会阻断网络——请使用 Windows Firewall 规则实现网络阻断。
    """
    JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000
    # 最小权限：SET_QUOTA (0x0100) | TERMINATE (0x0001)
    PROCESS_SET_QUOTA_AND_TERMINATE    = 0x0101

    kernel32 = ctypes.windll.kernel32
    job   = kernel32.CreateJobObjectW(None, None)
    hproc = kernel32.OpenProcess(PROCESS_SET_QUOTA_AND_TERMINATE, False, pid)

    # 正确的 struct 布局——LimitFlags 在偏移 +16 处，而非 +44
    class JOBOBJECT_BASIC_LIMIT_INFORMATION(ctypes.Structure):
        _fields_ = [
            ("PerProcessUserTimeLimit", wt.LARGE_INTEGER),
            ("PerJobUserTimeLimit",     wt.LARGE_INTEGER),
            ("LimitFlags",             wt.DWORD),
            ("MinimumWorkingSetSize",   ctypes.c_size_t),
            ("MaximumWorkingSetSize",   ctypes.c_size_t),
            ("ActiveProcessLimit",      wt.DWORD),
            ("Affinity",               ctypes.c_size_t),
            ("PriorityClass",          wt.DWORD),
            ("SchedulingClass",        wt.DWORD),
        ]

    info = JOBOBJECT_BASIC_LIMIT_INFORMATION()
    info.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    ok = kernel32.SetInformationJobObject(job, 2, ctypes.byref(info), ctypes.sizeof(info))
    if not ok:
        raise ctypes.WinError()
    kernel32.AssignProcessToJobObject(job, hproc)
    kernel32.CloseHandle(hproc)
    return job  # 保持存活——job 在被 GC 时关闭（终止进程）

# 在 proc = subprocess.Popen(...) 之后：job = restrict_process(proc.pid)
```

### Tier 3 ——Windows Sandbox（CI 完整 OS 隔离）

当你需要每次运行使用干净的 Windows 镜像（无遗留的注册表项、无共享的 GPU 状态、真正的隔离）时，请在 [Windows Sandbox](https://learn.microsoft.com/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-overview) 内运行**整个测试套件**。

**要求：**Windows 10/11 Pro 或 Enterprise，已启用虚拟化。

在项目根目录创建 `e2e-sandbox.wsb`：

```xml
<Configuration>
  <MappedFolders>
    <!-- 应用二进制文件（只读） -->
    <MappedFolder>
      <HostFolder>C:\path\to\your\build\Release</HostFolder>
      <SandboxFolder>C:\app</SandboxFolder>
      <ReadOnly>true</ReadOnly>
    </MappedFolder>
    <!-- 测试套件（读写，用于 artifact） -->
    <MappedFolder>
      <HostFolder>C:\path\to\your\e2e_test</HostFolder>
      <SandboxFolder>C:\e2e_test</SandboxFolder>
      <ReadOnly>false</ReadOnly>
    </MappedFolder>
  </MappedFolders>
  <LogonCommand>
    <!--
      Windows Sandbox 启动时没有 Python。先静默安装 Python，
      然后安装依赖并运行测试。Artifact 通过上面的 MappedFolder 回写到宿主机。
    -->
    <Command>powershell -Command "
      winget install --id Python.Python.3.11 --silent --accept-package-agreements;
      $env:PATH += ';' + $env:LOCALAPPDATA + '\Programs\Python\Python311\Scripts';
      cd C:\e2e_test;
      pip install -r requirements.txt;
      pytest tests\ -v
    "</Command>
  </LogonCommand>
</Configuration>
```

启动：`WindowsSandbox.exe e2e-sandbox.wsb`

> pywinauto 和应用都运行在 sandbox **内部**（要求同一 session）。
> Artifact 通过映射文件夹回写到宿主机。

### Tier 对比

| Tier | 隔离方式 | 搭建成本 | CI 可用 | 适用场景 |
|------|-----------|-----------|-------------|----------|
| 1 ——`tmp_path` env 重定向 | 文件系统 | 零 | 始终 | 所有测试的默认选择 |
| 2 ——Job Object | 进程树 | 低 | 始终 | 防止子进程逃脱 |
| 3 ——Windows Sandbox | 完整 OS | 中等 | 需要 Pro/Enterprise 镜像 | 每晚的 clean-room 运行 |

### 防止测试挂起

添加 `pytest-timeout` 来限制任何单个测试。在 `pytest.ini` 中设置 `timeout = 60` 和 `timeout_method = thread`。注意：`thread` 方法在 Windows 上无法终止 Qt 应用的子进程——在 `conftest.py` 中添加 `atexit.register(lambda: [p.kill() for p in psutil.Process().children(recursive=True)])` 来回收孤儿进程。

## CI/CD 集成

```yaml
# .github/workflows/e2e-desktop.yml
name: Desktop E2E
on: [push, pull_request]

jobs:
  e2e:
    runs-on: windows-latest   # 真实 GUI 环境，无需 Xvfb
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }

      - name: Install deps
        run: pip install pywinauto pytest pytest-html Pillow

      - name: Build app
        run: cmake --build build --config Release  # 按你的构建系统调整

      - name: Run E2E
        env:
          APP_PATH: ${{ github.workspace }}\build\Release\MyApp.exe
          APP_TITLE: "My Application"
          CI: "true"
        run: pytest tests/ --html=artifacts/report.html --self-contained-html --junitxml=artifacts/results.xml -v

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-artifacts
          path: artifacts/
          retention-days: 14
```

## Qt 专属

### 在 Qt 5.x 中启用 UIA

Qt 5.x 的 accessibility 在某些构建中默认关闭（尤其是 5.7–5.14）。请在启动**之前**设置环境变量。Qt 6.x 默认启用 accessibility——Qt 6 可跳过此步骤。

```python
# conftest.py ——添加到模块顶部
import os
os.environ["QT_ACCESSIBILITY"] = "1"
```

或者在 CI 中导出：

```yaml
env:
  QT_ACCESSIBILITY: "1"
```

### 为 Qt widget 添加稳定标识符

```cpp
// 推荐：同时设置 objectName 和 accessibleName
void setTestId(QWidget* w, const char* id) {
    w->setObjectName(id);
    w->setAccessibleName(id);  // 成为 UIA Name 属性
}

// 在你的 dialog 构造函数中：
setTestId(ui->usernameEdit, "usernameInput");
setTestId(ui->passwordEdit, "passwordInput");
setTestId(ui->loginButton,  "btnLogin");
setTestId(ui->errorLabel,   "lblError");
```

将所有 ID 集中到一个头文件中以避免拼写错误：

```cpp
// test_ids.h
#define TID_USERNAME   "usernameInput"
#define TID_PASSWORD   "passwordInput"
#define TID_BTN_LOGIN  "btnLogin"
#define TID_LBL_ERROR  "lblError"
```

### Qt 的特殊行为

**QComboBox** ——下拉列表是一个独立的顶层窗口：

```python
from pywinauto import Desktop

def select_combo_item(page, combo_spec, item_text):
    page.click(combo_spec)
    # 下拉列表以新的根级窗口出现
    # class_name 随 Qt 版本变化——用 Accessibility Insights 验证
    # Qt 5.x："Qt5QWindowIcon"  |  Qt 6.x："Qt6QWindowIcon" ——用 Accessibility Insights 验证
    popup = Desktop(backend="uia").window(class_name_re="Qt[56]QWindowIcon")
    popup.wait("visible", timeout=5)
    popup.child_window(title=item_text).click_input()
```

**QMessageBox / QDialog** ——同样是独立的顶层窗口：

```python
dlg = page.wait_window("Confirm")          # 等待对话框标题
dlg.child_window(title="OK").click_input() # 点击其中的按钮
```

**QTableWidget / QTableView** ——行/单元格访问：

```python
table = page.by_id("tblUsers").wrapper_object()
cell  = table.cell(row=0, column=1)
print(cell.window_text())
```

**自绘控件**（仅 `paintEvent`、`QGraphicsView`、`QOpenGLWidget`）——UIA 看不到其内部。使用下方的 Fallback 章节。

## Fallback：截图模式

当控件无法通过 UIA 触达时（自绘、第三方、游戏引擎）：

```bash
pip install pyautogui Pillow opencv-python
```

```python
import pyautogui, cv2, numpy as np
from PIL import Image

def find_image_on_screen(template_path, confidence=0.85):
    """在屏幕上定位模板图像。返回 (x, y) 中心点或 None。"""
    screen   = np.array(pyautogui.screenshot())
    template = np.array(Image.open(template_path))
    result   = cv2.matchTemplate(
        cv2.cvtColor(screen, cv2.COLOR_RGB2BGR),
        cv2.cvtColor(template, cv2.COLOR_RGB2BGR),
        cv2.TM_CCOEFF_NORMED,
    )
    _, max_val, _, max_loc = cv2.minMaxLoc(result)
    if max_val >= confidence:
        h, w = template.shape[:2]
        return max_loc[0] + w // 2, max_loc[1] + h // 2
    return None

def click_image(template_path, confidence=0.85):
    pos = find_image_on_screen(template_path, confidence)
    if pos is None:
        raise RuntimeError(f"Image not found on screen: {template_path}")
    pyautogui.click(*pos)
```

### DPI / 缩放规则（仅截图模式）

截图匹配对 Windows 显示缩放（100% / 125% / 150%）极其敏感。三条硬性规则：

1. **在与目标机器相同的缩放比例下捕获模板。**不要试图用 `PIL.Image.resize` 挽救不匹配——`cv2.matchTemplate` 对重采样伪影非常脆弱。
2. **固定 CI 的显示缩放。**在 `windows-latest` 上添加类似 `Set-DisplayResolution 1920 1080 -Force` 的步骤，并禁用按显示器的 DPI 缩放，使截图尺寸可复现。
3. **在每个 artifact 旁记录缩放比例。**捕获时，将 `GetDpiForWindow(hwnd) / 96` 写入 `artifacts/<test>/metadata.json`——事后分析变得显而易见，而非猜测。

> 当被测应用基于 Qt 时，进程级 DPI awareness（`SetProcessDpiAwarenessContext`）**可能与 Qt 自身的 DPI 处理冲突**。优先采用"相同缩放模板 + CI 固定"，而非在 fixture 中翻转全进程的 DPI 模式。

### 调试匹配置信度

在调优 `confidence` 阈值时，唯一合理的工作流是**看见**匹配落在哪里。下方的辅助函数仅用于诊断——不要从测试代码中调用它。

```python
def debug_match(template_path, out="artifacts/match_debug.png", confidence=0.85):
    """仅用于诊断。在当前屏幕上回绘最佳匹配矩形 + 分数。

    不用于生产测试——在校准 confidence 或追踪错误匹配时使用。
    """
    import os, cv2, pyautogui, numpy as np
    screen = np.array(pyautogui.screenshot())[:, :, ::-1]
    tpl    = cv2.imread(template_path)
    if tpl is None:
        raise RuntimeError(f"Template unreadable: {template_path}")
    res    = cv2.matchTemplate(screen, tpl, cv2.TM_CCOEFF_NORMED)
    _, mv, _, ml = cv2.minMaxLoc(res)
    h, w   = tpl.shape[:2]
    colour = (0, 255, 0) if mv >= confidence else (0, 0, 255)  # 绿色通过 / 红色失败
    cv2.rectangle(screen, ml, (ml[0]+w, ml[1]+h), colour, 2)
    cv2.putText(screen, f"score={mv:.3f} thr={confidence}",
                (ml[0], max(20, ml[1]-6)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, colour, 2)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    cv2.imwrite(out, screen)
    return mv
```

**谨慎使用**——图像匹配会在 DPI 变化、主题切换和部分遮挡时失效。
始终先尝试 UIA；仅对真正无法触达的控件回退到截图。

## Anti-Pattern

```python
# 反例：固定 sleep
time.sleep(3)
page.click(page.by_id("btnSubmit"))

# 正例：条件等待
page.wait_visible(page.by_id("btnSubmit"))
page.click(page.by_id("btnSubmit"))
```

```python
# 反例：将脆弱的 class+index locator 作为主策略
page.by_class("Edit", index=2).type_keys("hello")

# 正例：AutomationId
page.by_id("usernameInput").set_edit_text("hello")
```

```python
# 反例：断言像素坐标
assert btn.rectangle().left == 120

# 正例：断言内容 / 状态
assert page.get_text(page.by_id("lblStatus")) == "Logged in"
assert page.by_id("btnLogout").is_enabled()
```

```python
# 反例：在所有测试间共享 app 实例（状态泄漏）
@pytest.fixture(scope="session")
def app(): ...

# 正例：每个测试使用全新进程（或至多按类共享）
@pytest.fixture(scope="function")
def app(): ...
```

## 运行测试

```bash
# 全部测试
pytest tests/ -v

# 仅 smoke
pytest tests/ -m smoke -v

# 特定文件
pytest tests/test_login.py -v

# 自定义应用路径
APP_PATH="C:\build\Release\MyApp.exe" APP_TITLE="MyApp" pytest tests/ -v

# 检测 flaky 测试（每个用例重复 5 次）
pip install pytest-repeat
pytest tests/test_login.py --count=5 -v
```

## 相关 skill

- `e2e-testing` ——面向 Web 应用的 Playwright E2E
- `cpp-testing` ——用 GoogleTest 进行 C++ unit/integration 测试
- `cpp-coding-standards` ——C++ 代码风格与模式
