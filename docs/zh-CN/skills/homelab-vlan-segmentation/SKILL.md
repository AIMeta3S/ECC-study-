---
name: homelab-vlan-segmentation
description: 使用 UniFi、pfSense/OPNsense 和 MikroTik 将家庭网络划分为面向 IoT、访客、可信和服务器流量的 VLAN 分段——包括交换机 trunk 配置、防火墙规则和无线 SSID 映射。
metadata:
  origin: community
---

# 家庭实验室 VLAN 分段

如何将家庭网络划分为相互隔离的 VLAN，使 IoT 设备、访客和你的主 PC 之间无法互相通信。这是家庭网络最有效的安全升级措施。

此处展示的所有防火墙规则都是在各分段之间增加隔离——它们不会移除已有的保护。请在维护窗口内应用变更，并在每一步之后、继续下一步之前，验证各分段之间的连通性。

## 何时使用

- 首次在家庭网络上设置 VLAN
- 将 IoT 设备（智能灯泡、摄像头、电视）与可信设备隔离
- 创建一个无法访问家庭设备的访客 Wi-Fi 网络
- 向不熟悉该概念的人讲解 VLAN 的工作原理
- 配置 trunk port、access port 以及 SSID 到 VLAN 的映射
- 排查 pfSense/OPNsense/UniFi 上的 VLAN 间路由或防火墙规则问题

## 工作原理

```
没有 VLAN —— 扁平网络：
  所有设备都在 192.168.1.0/24
  智能电视（潜在恶意软件）→ 可以访问你的 NAS、PC 和所有设备

使用 VLAN：
  VLAN 10 — Trusted    192.168.10.0/24  （PC、手机、笔记本）
  VLAN 20 — IoT        192.168.20.0/24  （智能电视、灯泡、摄像头）
  VLAN 30 — Servers    192.168.30.0/24  （NAS、Pi、VM）
  VLAN 40 — Guest      192.168.40.0/24  （访客 Wi-Fi）
  VLAN 99 — Management 192.168.99.0/24  （交换机/AP 的 web UI）

  智能电视 → 被阻止访问 192.168.10.0/24 和 192.168.30.0/24
  访客 → 仅可上网，看不到任何家庭设备
```

## VLAN 设计模板

```
VLAN  名称        子网                网关             用途
10    trusted     192.168.10.0/24     192.168.10.1     PC、手机、笔记本
20    iot         192.168.20.0/24     192.168.20.1     智能家居设备
30    servers     192.168.30.0/24     192.168.30.1     NAS、Pi、自托管服务
40    guest       192.168.40.0/24     192.168.40.1     访客 Wi-Fi
99    management  192.168.99.0/24     192.168.99.1     网络设备的 web UI
```

## 示例

**使用 UniFi AP 和网管型交换机的典型家庭实验室：**

```
场景：三居室住宅，UniFi Dream Machine + UniFi 8 口交换机 + 2 个 AP

VLAN 10 — Trusted    192.168.10.0/24   MacBook、iPhone、iPad
VLAN 20 — IoT        192.168.20.0/24   Nest 恒温器、Philips Hue、Ring 门铃、智能电视
VLAN 30 — Servers    192.168.30.0/24   Synology NAS (192.168.30.10)、Pi-hole (192.168.30.2)
VLAN 40 — Guest      192.168.40.0/24   访客 Wi-Fi —— 仅可上网

SSID → VLAN 映射：
  "Home"      → VLAN 10（WPA2、强密码、仅限可信设备）
  "IoT"       → VLAN 20（WPA2、独立密码、打印在路由器上以便设置）
  "Guest"     → VLAN 40（WPA2、简单密码、可随意分享）

交换机端口行为：
  端口 1  → 到路由器的 trunk（tagged VLAN 10,20,30,40,99）
  端口 2  → 到 AP 的 trunk（tagged VLAN 10,20,40；AP 按每个 SSID 处理打标签）
  端口 3  → access VLAN 30（NAS —— untagged，无需 VLAN 感知）
  端口 4  → access VLAN 30（Pi-hole —— untagged）
  端口 5–8 → access VLAN 10（有线工作站）

应用的防火墙规则（所有规则都增加隔离，不移除已有保护）：
  IoT → Trusted: BLOCK
  IoT → Servers: BLOCK except 192.168.30.2:53（允许 Pi-hole DNS）
  IoT → Internet: ALLOW
  Guest → Local networks: BLOCK
  Guest → Internet: ALLOW
  Trusted → everywhere: ALLOW
```

## UniFi 配置

### 在 UniFi Controller 中创建网络

```
Settings → Networks → Create New Network

对每个 VLAN：
  Name: IoT
  Purpose: Corporate  （提供 DHCP + 路由）
  VLAN ID: 20
  Network: 192.168.20.0/24
  Gateway IP: 192.168.20.1
  DHCP: Enable
  DHCP Range: 192.168.20.100 – 192.168.20.254
```

### 将 SSID 映射到 VLAN（UniFi）

```
Settings → WiFi → Create New WiFi

  Name: IoT-Network
  Password: <独立密码>
  Network: IoT  ← 在此选择你的 VLAN
  # 连接到此 SSID 的所有设备都会落入 VLAN 20

  Name: Guest
  Password: <访客密码>
  Network: Guest
  Guest Policy: Enable  ← 同时将访客之间互相隔离
```

### UniFi 防火墙规则（Traffic Rules）

```
Settings → Traffic & Security → Traffic Rules

# 阻止 IoT 访问 Trusted VLAN
  Action: Block
  Category: Local Network
  Source: IoT (192.168.20.0/24)
  Destination: Trusted (192.168.10.0/24)

# 仅允许 IoT 访问互联网
  Action: Allow
  Source: IoT
  Destination: Internet

# 阻止 Guest 访问所有本地网络
  Action: Block
  Source: Guest
  Destination: Local Networks
```

## pfSense / OPNsense 配置

### 创建 VLAN

```
Interfaces → Assignments → VLANs → Add

  Parent Interface: em1  （你的 LAN NIC）
  VLAN Tag: 20
  Description: IoT

# 对每个 VLAN 重复上述操作，然后将每个 VLAN 分配到一个接口：
Interfaces → Assignments → Add
  选择你创建的 VLAN → 点击 Add
  启用该接口，将 IP 设置为网关地址（192.168.20.1/24）
```

### 每个 VLAN 的 DHCP

```
Services → DHCP Server → 选择你的 VLAN 接口

  Enable DHCP
  Range: 192.168.20.100 to 192.168.20.254
  DNS Servers: 192.168.30.2  ← 如果你有 Pi-hole，填此 IP
```

### 防火墙规则（pfSense/OPNsense）

```
# 规则自上而下处理，首条匹配生效。

# 在 IoT 接口（VLAN 20）上：
  Rule 1: Allow IoT → Pi-hole DNS  ← 必须位于 RFC1918 阻断规则之前
    Protocol: UDP/TCP
    Source: IoT net
    Destination: 192.168.30.2 port 53
    Action: Allow

  Rule 2: Block IoT → RFC1918（所有私有 IP 范围）
    Protocol: any
    Source: IoT net
    Destination: RFC1918  (192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12)
    Action: Block

  Rule 3: Allow IoT → 互联网
    Protocol: any
    Source: IoT net
    Destination: any
    Action: Allow

# 在 Trusted 接口（VLAN 10）上：
  Allow all（可信设备可以访问所有内容）
    Source: Trusted net
    Destination: any
    Action: Allow

# 为需要访问特定本地服务的 IoT 设备添加额外例外：
  插入到 Rule 2（RFC1918 阻断规则）之前：
    Protocol: TCP
    Source: IoT net
    Destination: 192.168.30.x port 8123  ← Home Assistant
    Action: Allow
```

## MikroTik 配置

```
# 第 1 步：创建一个启用 VLAN 过滤的 bridge
/interface bridge
add name=bridge vlan-filtering=yes

# 第 2 步：将物理端口添加到 bridge
# 到路由器/上行链路的 trunk port（为所有 VLAN 打标签）
/interface bridge port
add bridge=bridge interface=ether1 frame-types=admit-only-vlan-tagged

# 用于可信设备的 access port（untagged VLAN 10）
/interface bridge port
add bridge=bridge interface=ether2 pvid=10 frame-types=admit-only-untagged-and-priority-tagged

# 用于 IoT 设备的 access port（untagged VLAN 20）
/interface bridge port
add bridge=bridge interface=ether3 pvid=20 frame-types=admit-only-untagged-and-priority-tagged

# 第 3 步：定义哪些端口允许哪些 VLAN
/interface bridge vlan
add bridge=bridge tagged=ether1 untagged=ether2 vlan-ids=10
add bridge=bridge tagged=ether1 untagged=ether3 vlan-ids=20

# 第 4 步：在 bridge 上创建 VLAN 接口（网关 IP）
/interface vlan
add interface=bridge name=vlan10 vlan-id=10
add interface=bridge name=vlan20 vlan-id=20

# 第 5 步：分配网关 IP
/ip address
add interface=vlan10 address=192.168.10.1/24
add interface=vlan20 address=192.168.20.1/24

# 第 6 步：DHCP 地址池和服务器
/ip pool
add name=pool-trusted ranges=192.168.10.100-192.168.10.254
add name=pool-iot ranges=192.168.20.100-192.168.20.254

/ip dhcp-server
add interface=vlan10 address-pool=pool-trusted name=dhcp-trusted
add interface=vlan20 address-pool=pool-iot name=dhcp-iot

/ip dhcp-server network
add address=192.168.10.0/24 gateway=192.168.10.1
add address=192.168.20.0/24 gateway=192.168.20.1

# 第 7 步：防火墙 —— 阻止 IoT 访问 Trusted VLAN
/ip firewall filter
add chain=forward src-address=192.168.20.0/24 dst-address=192.168.10.0/24 \
    action=drop comment="Block IoT to Trusted"
```

## 交换机 Trunk 与 Access 端口对比

```
# Trunk port：承载多个 VLAN（tagged）—— 用于交换机到交换机、交换机到路由器、交换机到 AP 的连接
# Access port：承载单个 VLAN（untagged）—— 用于连接终端设备（PC、摄像头、NAS）

# 连接到你路由器的网管型交换机端口应该是 trunk：
  Allowed VLANs: 10, 20, 30, 40, 99

# 连接到 PC 的端口应该是 access port：
  VLAN: 10 (trusted)
  无需打标签 —— PC 不需要也不关心 VLAN

# 连接到 AP 的端口必须是 trunk：
  AP 会将每个 SSID 的流量打上正确的 VLAN ID 标签
  Allowed VLANs: 10, 20, 40  （AP 服务的那些 SSID）
```

## 反模式

```
# BAD：创建了 VLAN 却没有添加防火墙规则
# 没有防火墙规则的 VLAN 不提供安全性 —— VLAN 间路由默认是开放的
# GOOD：创建 VLAN 后立即添加显式的阻断规则

# BAD：将 Pi-hole 放在 IoT VLAN 中
# IoT 设备可以访问它，但可信设备却不能（除非添加额外规则）
# GOOD：将 Pi-hole 放在 Servers VLAN 中，并添加一条规则允许所有 VLAN 访问 53 端口

# BAD：Native VLAN 等于 Management VLAN
# Untagged 流量落入你的 Management VLAN 会引发 VLAN hopping 攻击
# GOOD：使用一个专用的、未使用的 VLAN 作为 native（例如 VLAN 999），让管理流量保持 tagged

# BAD：IoT SSID 和可信 SSID 使用相同的 Wi-Fi 密码
# 任何得知密码的人都可以将 IoT 设备连接到错误的分段
```

## 最佳实践

- 从 4 个 VLAN 开始：Trusted、IoT、Servers、Guest —— 按需增加更多
- 将 Pi-hole 放在 Servers VLAN（192.168.30.x）中
- 添加一条防火墙规则，允许所有 VLAN 到 Pi-hole IP 的 DNS（53 端口）访问 —— 该规则要位于任何 RFC1918 阻断规则之前
- 每次更改规则后都测试隔离性：从 IoT VLAN 尝试 ping 一台可信设备 —— 应该失败
- 为交换机和 AP 的 web UI 使用一个 management VLAN，并将访问权限限制为仅 Trusted VLAN
- 用表格记录你的 VLAN 设计（VLAN ID、名称、子网、用途）

## 相关 Skill

- homelab-network-setup
- homelab-pihole-dns
- homelab-wireguard-vpn
