---
name: netmiko-ssh-automation
description: 安全的 Python Netmiko 模式，用于只读采集、有界 batch SSH、TextFSM 解析、受防护的配置变更、超时以及网络自动化错误处理。
metadata:
  origin: community
---

# Netmiko SSH Automation

当编写或审查使用 Netmiko 连接网络设备的 Python 自动化时，使用此 skill。保持默认路径为只读；配置变更需要单独的变更窗口、同行评审和 rollback 计划。

## 何时使用

- 在路由器、交换机或防火墙上采集 `show` 命令输出。
- 构建小型审计脚本以获取接口、路由或配置证据。
- 为网络 SSH 脚本添加超时和异常处理。
- 当模板存在时，使用 TextFSM 解析命令输出。
- 在自动化接触生产设备之前进行审查。

## 安全默认值

- 从只读的 `send_command()` 采集开始。
- 保持 inventory 小而明确；不要扫描整个地址范围。
- 使用环境变量、vault 或 `getpass`；永不硬编码凭据。
- 设置连接和读取超时。
- 限制并发，以免老旧设备过载。
- 在 `send_config_set()` 之前要求显式的操作员 flag。
- 在变更经过验证和批准之前，不要调用 `save_config()`。

## 只读连接模式

```python
import os
from getpass import getpass
from netmiko import ConnectHandler
from netmiko.exceptions import (
    NetmikoAuthenticationException,
    NetmikoTimeoutException,
    ReadTimeout,
)

device = {
    "device_type": "cisco_ios",
    "host": "192.0.2.10",
    "username": os.environ.get("NETMIKO_USERNAME") or input("Username: "),
    "password": os.environ.get("NETMIKO_PASSWORD") or getpass("Password: "),
    "secret": os.environ.get("NETMIKO_ENABLE_SECRET"),
    "conn_timeout": 10,
    "auth_timeout": 20,
    "banner_timeout": 15,
    "read_timeout_override": 30,
}

try:
    with ConnectHandler(**device) as conn:
        if device.get("secret") and not conn.check_enable_mode():
            conn.enable()
        output = conn.send_command("show ip interface brief", read_timeout=30)
        print(output)
except NetmikoAuthenticationException:
    print("Authentication failed")
except NetmikoTimeoutException:
    print("SSH connection timed out")
except ReadTimeout:
    print("Command read timed out")
```

在示例中使用来自文档地址范围的占位地址。将真实 inventory 保存在被忽略的本地文件或 secrets 管理系统中。

## Batch 采集

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

def collect_show(device: dict[str, Any], command: str) -> dict[str, Any]:
    host = device["host"]
    try:
        with ConnectHandler(**device) as conn:
            output = conn.send_command(command, read_timeout=45)
        return {"host": host, "ok": True, "output": output}
    except (NetmikoAuthenticationException, NetmikoTimeoutException, ReadTimeout) as exc:
        return {"host": host, "ok": False, "error": type(exc).__name__}

results = []
with ThreadPoolExecutor(max_workers=8) as pool:
    futures = [pool.submit(collect_show, device, "show version") for device in devices]
    for future in as_completed(futures):
        results.append(future.result())
```

除非已知设备群和 AAA 系统能处理更高的连接量，否则保持 `max_workers` 较低。

## 结构化解析

Netmiko 可以请求 TextFSM、TTP 或 Genie 来解析受支持的命令输出。将解析器输出视为一种优化，而非唯一的证据路径。

```python
with ConnectHandler(**device) as conn:
    parsed = conn.send_command(
        "show ip interface brief",
        use_textfsm=True,
        raise_parsing_error=False,
        read_timeout=30,
    )

if isinstance(parsed, str):
    print("No parser template matched; store raw output for review")
else:
    for row in parsed:
        print(row)
```

如果解析驱动一个阻塞性决策，则将原始命令输出与解析结果一同保留，以便操作员检查不匹配之处。

## 受防护的配置模式

```python
import os

commands = [
    "interface GigabitEthernet0/1",
    "description CHANGE-1234 UPLINK-TO-CORE",
]

apply_changes = os.environ.get("APPLY_NETWORK_CHANGES") == "1"

if not apply_changes:
    print("Dry run only. Candidate commands:")
    print("\n".join(commands))
else:
    with ConnectHandler(**device) as conn:
        conn.enable()
        before = conn.send_command("show running-config interface GigabitEthernet0/1")
        output = conn.send_config_set(commands)
        after = conn.send_command("show running-config interface GigabitEthernet0/1")
        print(before)
        print(output)
        print(after)
        print("Verify behavior before saving startup config.")
```

保存配置是一个单独的批准步骤。在生产环境中，应包含 rollback 代码片段，并在变更记录中捕获变更前/后的证据。

## 审查清单

- 脚本是否指定了显式的 inventory 来源？
- 凭据是否不存在于源代码、logs 和异常消息中？
- 是否设置了 `conn_timeout`、`auth_timeout` 和命令 `read_timeout`？
- 失败是否按设备逐个报告，而不会停止整个 batch？
- 脚本是否避免了广泛扫描和无限制并发？
- 配置变更是否在 dry-run 或显式操作员 flag 之后？
- `save_config()` 是否与初始推送分开，并与验证绑定？

## 反模式

- 在源代码中硬编码密码、enable secret 或私钥。
- 将配置命令作为默认代码路径发送。
- 对 CIDR 范围运行自动化，而非针对经过审查的 inventory。
- 将完整的 running-config 记录到共享系统而不进行脱敏。
- 将解析器成功视为设备状态正确的证明。

## 另请参阅

- Skill: `cisco-ios-patterns`
- Skill: `network-config-validation`
- Skill: `network-interface-health`
