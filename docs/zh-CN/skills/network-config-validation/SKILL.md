---
name: network-config-validation
description: 面向路由器和交换机配置的部署前检查，覆盖危险命令、重复地址、子网重叠、失效引用、管理面风险以及 IOS 风格的安全规范。
metadata:
  origin: community
---

# 网络配置校验

使用此 skill 在变更窗口之前、或在自动化运行触及生产设备之前，审查网络配置。

## 使用时机

- 在部署前审查 Cisco IOS 或 IOS-XE 风格的代码片段。
- 审计由脚本或模板生成的配置。
- 查找危险命令、重复 IP 地址或子网重叠。
- 检查 ACL、route-map、prefix-list 或 line 策略是否被引用但未定义。
- 为网络自动化构建轻量级的 pre-flight 脚本。

## 工作原理

将配置校验视为分层证据，而非完整的解析器。正则检查对 pre-flight 告警很有用，但最终批准仍需要网络工程师审查意图、平台语法和回滚步骤。

按以下顺序进行校验：

1. 破坏性命令。
2. 凭据与管理面（management-plane）暴露。
3. 重复地址与子网重叠。
4. 对 ACL、route-map、prefix-list 和接口的失效引用。
5. 运维规范（operational hygiene），例如 NTP、时间戳、远程日志和 banner。

## 危险命令检测

```python
import re

DANGEROUS_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\breload\b", re.I), "reload causes downtime"),
    (re.compile(r"\berase\s+(startup|nvram|flash)", re.I), "erases persistent storage"),
    (re.compile(r"\bformat\b", re.I), "formats a device filesystem"),
    (re.compile(r"\bno\s+router\s+(bgp|ospf|eigrp)\b", re.I), "removes a routing process"),
    (re.compile(r"\bno\s+interface\s+\S+", re.I), "removes interface configuration"),
    (re.compile(r"\baaa\s+new-model\b", re.I), "changes authentication behavior"),
    (re.compile(r"\bcrypto\s+key\s+(zeroize|generate)\b", re.I), "changes device SSH keys"),
]

def find_dangerous_commands(lines: list[str]) -> list[dict[str, str | int]]:
    findings = []
    for line_number, line in enumerate(lines, start=1):
        stripped = line.strip()
        for pattern, reason in DANGEROUS_PATTERNS:
            if pattern.search(stripped):
                findings.append({
                    "line": line_number,
                    "command": stripped,
                    "reason": reason,
                })
    return findings
```

## 重复 IP 与子网重叠

```python
import ipaddress
import re
from collections import Counter

IP_ADDRESS_RE = re.compile(
    r"^\s*ip address\s+"
    r"(?P<ip>\d{1,3}(?:\.\d{1,3}){3})\s+"
    r"(?P<mask>\d{1,3}(?:\.\d{1,3}){3})\b",
    re.I | re.M,
)

def extract_interfaces(config: str) -> list[dict[str, str]]:
    results = []
    current = None
    for line in config.splitlines():
        if line.startswith("interface "):
            current = line.split(maxsplit=1)[1]
            continue
        match = IP_ADDRESS_RE.match(line)
        if current and match:
            ip = match.group("ip")
            mask = match.group("mask")
            network = ipaddress.ip_interface(f"{ip}/{mask}").network
            results.append({"interface": current, "ip": ip, "network": str(network)})
    return results

def find_duplicate_ips(config: str) -> list[str]:
    ips = [entry["ip"] for entry in extract_interfaces(config)]
    counts = Counter(ips)
    return sorted(ip for ip, count in counts.items() if count > 1)

def find_subnet_overlaps(config: str) -> list[tuple[str, str]]:
    networks = [ipaddress.ip_network(entry["network"]) for entry in extract_interfaces(config)]
    overlaps = []
    for index, left in enumerate(networks):
        for right in networks[index + 1:]:
            if left.overlaps(right):
                overlaps.append((str(left), str(right)))
    return overlaps
```

## 管理面检查

按 section 解析 VTY 块，以避免 access-class 检查蔓延到无关行上。

```python
import re

def iter_blocks(config: str, starts_with: str) -> list[str]:
    blocks = []
    current: list[str] = []
    for line in config.splitlines():
        if line.startswith(starts_with):
            if current:
                blocks.append("\n".join(current))
            current = [line]
            continue
        if current:
            if line and not line.startswith(" "):
                blocks.append("\n".join(current))
                current = []
            else:
                current.append(line)
    if current:
        blocks.append("\n".join(current))
    return blocks

def check_vty_blocks(config: str) -> list[str]:
    issues = []
    for block in iter_blocks(config, "line vty"):
        if re.search(r"transport\s+input\s+.*telnet", block, re.I):
            issues.append("VTY allows Telnet; require SSH only.")
        if not re.search(r"\baccess-class\s+\S+\s+in\b", block, re.I):
            issues.append("VTY block has no inbound access-class source restriction.")
        if not re.search(r"\bexec-timeout\s+\d+\s+\d+\b", block, re.I):
            issues.append("VTY block has no explicit exec-timeout.")
    return issues
```

## 安全规范检查

```python
SECURITY_PATTERNS = [
    (re.compile(r"\bsnmp-server community\s+(public|private)\b", re.I),
     "default SNMP community configured"),
    (re.compile(r"\bsnmp-server community\s+\S+", re.I),
     "SNMPv2 community string configured; prefer SNMPv3 authPriv"),
    (re.compile(r"\bip ssh version 1\b", re.I),
     "SSH version 1 enabled"),
    (re.compile(r"\benable password\b", re.I),
     "enable password is present; use enable secret"),
    (re.compile(r"\busername\s+\S+\s+password\b", re.I),
     "local username uses password instead of secret"),
]

BEST_PRACTICE_PATTERNS = [
    (re.compile(r"\bntp server\b", re.I), "NTP server"),
    (re.compile(r"\bservice timestamps\b", re.I), "log timestamps"),
    (re.compile(r"\blogging\s+\S+", re.I), "logging destination or buffer"),
    (re.compile(r"\bsnmp-server group\s+\S+\s+v3\s+priv\b", re.I), "SNMPv3 authPriv group"),
    (re.compile(r"\bbanner\s+(login|motd)\b", re.I), "login banner"),
]

def check_security(config: str) -> list[str]:
    return [message for pattern, message in SECURITY_PATTERNS if pattern.search(config)]

def check_missing_hygiene(config: str) -> list[str]:
    return [
        f"Missing {description}"
        for pattern, description in BEST_PRACTICE_PATTERNS
        if not pattern.search(config)
    ]
```

## 示例

### 变更窗口预检

1. 对将要粘贴的确切代码片段运行危险命令检查。
2. 针对完整的候选配置运行重复 IP 与子网重叠检查。
3. 确认每个被引用的 ACL、route-map 和 prefix-list 都存在。
4. 在任何管理面变更之前，确认回滚命令和 out-of-band 访问方式。

### 自动化预检

将校验作为阻断性关卡（blocking gate），在 Netmiko、NAPALM、Ansible 或厂商 API 自动化推送生成的配置之前执行。对危险命令和凭据采取 fail closed 策略。对超出变更范围的最佳实践缺口发出告警。

## 反模式

- 将正则校验当作设备解析器。
- 不做 dry-run diff 就应用生成的配置。
- 将 SNMPv2 community string 作为监控要求推荐。
- 用可能意外跨越无关 section 的正则检查 VTY 块。
- 通过禁用 ACL 来测试防火墙行为，而非读取计数器/日志。

## 另见

- Agent: `network-config-reviewer`
- Agent: `network-troubleshooter`
- Skill: `network-interface-health`
