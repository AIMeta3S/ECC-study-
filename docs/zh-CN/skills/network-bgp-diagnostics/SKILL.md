---
name: network-bgp-diagnostics
description: 仅用于诊断的 BGP 故障排查模式，涵盖邻居状态、路由交换、前缀策略、AS path 检查以及安全的证据收集。
metadata:
  origin: community
---

# 网络 BGP 诊断

当 BGP 会话 down、flapping、已 Established 但缺少路由，或正在通告非预期前缀时，请使用此 skill。默认工作流程是只读的证据收集；策略和重置操作应在经过评审的变更窗口中进行。

## 何时使用

- BGP 邻居卡在 Idle、Connect、Active、OpenSent 或 OpenConfirm 状态。
- 会话已 Established，但缺少预期的前缀。
- route-map、prefix-list、max-prefix 限制或 AS path policy 可能在过滤路由。
- 你需要 BGP 变更前后的证据。
- 你正在评审解析 BGP summary 输出的自动化。

## 只读分诊流程

1. 确定具体的邻居、address family、VRF 以及本地/远程 ASN。
2. 捕获 summary 状态和上次 reset 的原因。
3. 验证到对端源地址的可达性。
4. 在假定传输故障之前，先检查路由策略引用。
5. 在平台支持相应命令的情况下，比较已通告、已接收和已安装的路由。

```text
show bgp summary
show bgp neighbors <peer>
show ip route <peer>
show tcp brief | include <peer>|:179
show logging | include BGP|<peer>
show running-config | section router bgp
show ip prefix-list
show route-map
```

当设备使用 VRF、IPv6、VPNv4 或 EVPN 时，请使用平台特定的 address-family 命令。不要假定使用全局 IPv4 单播。

## 状态解读

| 状态 | 首要检查项 |
| --- | --- |
| Established 且前缀数非零 | 路由交换正常；检查策略和表选择 |
| Established 且前缀数为零 | 检查入站策略、max-prefix、advertised routes 和 AFI/SAFI |
| Active | TCP 会话未能完成建立；检查路由、source、ACL 和对端可达性 |
| Connect | TCP 连接正在进行中；检查路径和远程监听端 |
| OpenSent/OpenConfirm | TCP 正常；检查 ASN、认证、timers、capabilities 和日志 |
| Idle | 邻居可能被禁用、缺少配置、被策略阻止，或处于 backoff timer 中 |

## 传输检查

```text
ping <peer> source <local-source>
traceroute <peer> source <local-source>
show ip route <peer>
show bgp neighbors <peer> | include BGP state|Last reset|Local host|Foreign host
```

如果对端使用 loopback 作为源地址，请确认双向都有到 loopback 地址的路由，并且邻居配置使用了预期的 update source。

避免将禁用 ACL 或防火墙策略作为诊断捷径。应先读取 hit counters、日志和路径状态。

## 路由策略检查

```text
show bgp neighbors <peer> advertised-routes
show bgp neighbors <peer> routes
show ip prefix-list <name>
show route-map <name>
show bgp <prefix>
```

某些平台在 `received-routes` 可用之前需要额外的配置。在事件分诊期间，除非运维人员批准该变更，否则不要添加该配置。

## AS Path 与前缀审查

```text
show bgp regexp _65001_
show bgp regexp ^65001$
show bgp <prefix>
show bgp neighbors <peer> advertised-routes | include Network|Path|<prefix>
```

谨慎使用 AS-path regex。`_65001_` 将 AS 65001 作为一个 token 匹配。单独的 `65001` 可能匹配更长的 ASN 或无关文本。

## 解析器模式

```python
import re
from typing import Any

BGP_SUMMARY_RE = re.compile(
    r"^(?P<neighbor>\d{1,3}(?:\.\d{1,3}){3})\s+"
    r"(?P<version>\d+)\s+"
    r"(?P<remote_as>\d+)\s+"
    r"(?P<msg_rcvd>\d+)\s+"
    r"(?P<msg_sent>\d+)\s+"
    r"(?P<table_version>\d+)\s+"
    r"(?P<input_queue>\d+)\s+"
    r"(?P<output_queue>\d+)\s+"
    r"(?P<uptime>\S+)\s+"
    r"(?P<state_or_prefixes>\S+)$",
    re.M,
)

def parse_bgp_summary(raw: str) -> list[dict[str, Any]]:
    rows = []
    for match in BGP_SUMMARY_RE.finditer(raw):
        state_or_prefixes = match.group("state_or_prefixes")
        if state_or_prefixes.isdigit():
            state = "Established"
            prefixes_received = int(state_or_prefixes)
        else:
            state = state_or_prefixes
            prefixes_received = None
        rows.append({
            "neighbor": match.group("neighbor"),
            "remote_as": int(match.group("remote_as")),
            "state": state,
            "prefixes_received": prefixes_received,
            "uptime": match.group("uptime"),
        })
    return rows
```

在可用时优先使用结构化的解析器输出，但应将原始输出与事件记录一起存储，因为 BGP summary 格式因平台和 address family 而异。

## 仅限变更窗口

以下操作可能影响路由，不应作为自动诊断手段提出：

- 清除 BGP 会话。
- 更改邻居认证、timers、update source、route-maps 或 prefix-lists。
- 启用额外的 received-route 存储。
- 放宽防火墙、ACL 或控制面策略。

如果重置获得批准，请优先选择平台支持的、影响最小的 soft 或 route-refresh 选项，并准确记录它为何是安全的。

## 反模式

- 假定 `Active` 总是意味着远端已 down。
- 忽略 VRF、address family 或 update-source 的差异。
- 使用宽泛的 AS-path regex 且不带 token 边界。
- 在读取上次 reset 原因和日志之前就 hard-reset 对端。
- 将缺失 `received-routes` 输出视为没有路由到达的证据。

## 另请参阅

- Skill：`cisco-ios-patterns`
- Skill：`network-config-validation`
- Skill：`network-interface-health`
