---
name: network-interface-health
description: 诊断路由器、交换机和 Linux 主机上的接口错误、丢包、CRC、双工不匹配、抖动、速率协商问题以及计数器趋势。
metadata:
  origin: community
---

# 网络接口健康

当网络症状可能由物理链路、交换机端口、线缆、光模块、双工设置或拥塞的接口引起时，使用此 skill。

## 何时使用

- 主机或 VLAN 出现丢包、延迟尖峰或间歇性不可达。
- 交换机或路由器接口出现 CRC、runts、giants、丢包、复位或抖动。
- 在更换硬件之前需要对比链路两端。
- 变更窗口需要变更前后的接口计数器证据。
- 监控报告 `ifInErrors`、`ifOutErrors` 或 `ifOutDiscards` 上升。

## 工作原理

接口计数器是证据，但趋势比绝对数值更重要。先捕获基线，等待一个测量间隔，再次捕获，然后比较增量。

```text
show interfaces <interface>
show interfaces <interface> status
show logging | include <interface>|changed state|line protocol
```

在 Linux 主机上：

```text
ip -s link show <interface>
ethtool <interface>
ethtool -S <interface>
```

## 计数器参考

| 计数器 | 含义 | 常见原因 |
| --- | --- | --- |
| CRC | 接收到的帧校验失败 | 线缆故障、光纤脏污、光模块故障、双工不匹配 |
| input errors | 接收侧错误总数 | 下结论前检查子计数器 |
| runts | 小于最小以太网帧长的帧 | 双工不匹配、冲突域、NIC 故障 |
| giants | 大于预期 MTU 的帧 | MTU 不匹配或巨型帧边界 |
| input drops | 设备无法接受入站数据包 | 突发流量、超订、CPU 路径、队列压力 |
| output drops | 出口队列丢弃的数据包 | 拥塞、QoS 策略、上行链路过小 |
| resets | 接口硬件复位 | 抖动、keepalive、驱动、光模块、电源 |
| collisions | 以太网冲突计数器 | 半双工或协商不匹配 |

## 诊断流程

### CRC 或 input errors

1. 确认计数器正在增长，而非仅仅是历史数据。
2. 检查链路两端。接收侧错误通常指向到达该侧的信号，而不一定是报告错误的端口。
3. 更换跳线，或清洁/更换光纤和光模块。
4. 确认两端的速率/双工设置匹配。
5. 检查日志中是否有相近时间戳的抖动事件。

### Drops

1. 区分 input drops 和 output drops。
2. 将接口速率与带宽容量进行对比。
3. 检查 QoS 策略、队列计数器，以及该链路是否为超订的上行链路。
4. 将队列调优视为次要事项。首先证明链路是否拥塞。

### 双工与速率

当现代以太网链路两端都支持自动协商时，优先使用自动协商。如果一端必须固定，则显式配置两端并记录原因。绝不要在一端固定速率/双工的同时，另一端使用自动协商。

```text
show interfaces <interface> | include duplex|speed
```

## 安全解析器示例

从一个 header 截取到下一个 header 来切分每个接口块。不要使用任意字符窗口；过大的接口块可能导致计数器被遗漏或被错误地归属到其他端口。

```python
import re
from typing import Any

HEADER_RE = re.compile(
    r"^(?P<name>\S+) is (?P<status>(?:administratively )?down|up), "
    r"line protocol is (?P<protocol>up|down)",
    re.I | re.M,
)
ERROR_RE = re.compile(r"(?P<input>\d+) input errors, (?P<crc>\d+) CRC", re.I)
DROP_RE = re.compile(r"(?P<output>\d+) output errors", re.I)
DUPLEX_RE = re.compile(r"(?P<duplex>Full|Half|Auto)-duplex,\s+(?P<speed>[^,]+)", re.I)

def parse_show_interfaces(raw: str) -> list[dict[str, Any]]:
    headers = list(HEADER_RE.finditer(raw))
    interfaces = []
    for index, header in enumerate(headers):
        end = headers[index + 1].start() if index + 1 < len(headers) else len(raw)
        block = raw[header.start():end]
        errors = ERROR_RE.search(block)
        drops = DROP_RE.search(block)
        duplex = DUPLEX_RE.search(block)
        interfaces.append({
            "name": header.group("name"),
            "status": header.group("status"),
            "protocol": header.group("protocol"),
            "duplex": duplex.group("duplex") if duplex else "unknown",
            "speed": duplex.group("speed").strip() if duplex else "unknown",
            "input_errors": int(errors.group("input")) if errors else 0,
            "crc_errors": int(errors.group("crc")) if errors else 0,
            "output_errors": int(drops.group("output")) if drops else 0,
        })
    return interfaces
```

## 示例

### 单个交换机端口上的 CRC

1. 捕获本地端口的计数器。
2. 捕获对端远程端口的计数器。
3. 在更改路由或防火墙规则之前，先更换线缆或光模块。
4. 仅在记录基线之后才清零计数器。
5. 在固定间隔后复查。

### 互联网慢但 LAN 正常

1. 检查 WAN 接口的丢包/错误。
2. 检查 LAN 上行链路利用率以及 output drops。
3. 如果 WAN 链路干净但吞吐量仍然很低，检查网关 CPU。
4. 在归咎于上游服务之前，对比有线和无线测试。

## 反模式

- 在保存基线之前清零计数器。
- 只查看链路的一端。
- 不加时间窗口就假定所有历史 CRC 都是当前存在的问题。
- 一端使用自动协商而另一端使用固定速率/双工混用。
- 在检查拥塞之前就把 output drops 当作线缆问题处理。

## 另请参阅

- Agent: `network-troubleshooter`
- Skill: `network-config-validation`
- Skill: `homelab-network-setup`
