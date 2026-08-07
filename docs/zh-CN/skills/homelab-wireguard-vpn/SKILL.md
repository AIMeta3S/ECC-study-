---
name: homelab-wireguard-vpn
description: WireGuard VPN 服务器搭建、peer 配置、密钥生成、split tunneling 与 full tunnel 路由，以及从手机和笔记本电脑客户端远程访问家庭网络。
metadata:
  origin: community
---

# Homelab WireGuard VPN

WireGuard 是一种快速、现代的 VPN 协议。它是远程访问家庭网络的正确选择——比 OpenVPN 配置更简单，且比大多数替代方案更快。

所有配置示例展示的都是常见部署方案。在应用到你的系统之前，请逐一审查每条命令——尤其是 iptables 转发规则和密钥文件权限——并在维护窗口期内进行变更。

## 适用场景

- 在 Raspberry Pi、Linux 主机、pfSense 或路由器上搭建 WireGuard 服务器
- 生成 WireGuard 密钥对并编写 peer 配置文件
- 配置从手机或笔记本电脑到家庭网络的远程访问
- 解释 split tunneling（仅路由家庭流量）与 full tunnel（路由所有流量）的区别
- 排查无法建立的 WireGuard 连接问题
- 为多个客户端自动化生成 peer 配置

## WireGuard 工作原理

```
你的手机（WireGuard 客户端）
    │
    │  加密的 UDP 隧道（端口 51820）
    │
你的家庭路由器（WireGuard 服务器——需要公网 IP 或 DDNS）
    │
    你的家庭网络（192.168.1.0/24、NAS、Pi 等）

每台设备都有一个密钥对（公钥 + 私钥）。
服务器知道每个客户端的公钥。
客户端知道服务器的公钥 + endpoint（IP:端口）。
流量端到端加密，没有中心服务器或证书颁发机构。
```

## 服务器搭建（Linux）

```bash
# 安装 WireGuard
sudo apt update && sudo apt install wireguard -y

# 生成服务器密钥对——从一开始就以私有权限创建文件
sudo mkdir -p /etc/wireguard
sudo sh -c 'umask 077; wg genkey > /etc/wireguard/server_private.key'
sudo sh -c 'wg pubkey < /etc/wireguard/server_private.key > /etc/wireguard/server_public.key'

# 编写服务器配置——替换为实际的私钥值
# 不要将私钥存储在版本控制中或共享给他人
sudo tee /etc/wireguard/wg0.conf << 'EOF'
[Interface]
Address = 10.8.0.1/24              # VPN 子网——服务器使用 .1
ListenPort = 51820
PrivateKey = <paste_server_private_key_here>

# 限定范围的转发规则：允许 VPN 流量进出，而非一刀切的 FORWARD ACCEPT
PostUp   = iptables -A FORWARD -i wg0 -o eth0 -j ACCEPT
PostUp   = iptables -A FORWARD -i eth0 -o wg0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
PostUp   = iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -o eth0 -j ACCEPT
PostDown = iptables -D FORWARD -i eth0 -o wg0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
# 手机——替换为实际的手机公钥
PublicKey = <phone_public_key>
AllowedIPs = 10.8.0.2/32

[Peer]
# 笔记本电脑——替换为实际的笔记本公钥
PublicKey = <laptop_public_key>
AllowedIPs = 10.8.0.3/32
EOF
sudo chmod 600 /etc/wireguard/wg0.conf

# 将 eth0 替换为你实际的出站接口名
# 使用以下命令检查：ip route show default

# 启用 IP 转发（通过服务器路由流量时必需）
echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/99-wireguard.conf
sudo sysctl --system

# 启动 WireGuard 并设置开机自启
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0
```

## 客户端配置

```bash
# 为每个客户端设备生成唯一的密钥对
# 在客户端上运行，或在服务器上生成后通过安全方式传输私钥——绝不以明文传输
umask 077
wg genkey | tee phone_private.key | wg pubkey > phone_public.key

# 客户端配置文件（phone_wg0.conf）：
[Interface]
PrivateKey = <phone_private_key>
Address = 10.8.0.2/32
DNS = 192.168.1.2                  # 可选：通过隧道使用 Pi-hole 作为 DNS

[Peer]
PublicKey = <server_public_key>
Endpoint = your-home-ip.ddns.net:51820  # 你的公网 IP 或 DDNS 主机名
AllowedIPs = 192.168.1.0/24            # Split tunnel：仅家庭网络流量
# AllowedIPs = 0.0.0.0/0, ::/0        # Full tunnel：所有流量经 VPN

PersistentKeepalive = 25              # 保持 NAT 穿透孔开放（移动客户端必需）
```

## Split Tunnel 与 Full Tunnel

```
# Split tunnel：AllowedIPs = 192.168.1.0/24
  只有发往家庭网络的流量经过 VPN。
  互联网流量（YouTube、Spotify）直连——移动设备上性能更好。
  最适合："我只想从任何地方访问我的 NAS 和 Pi。"

# Full tunnel：AllowedIPs = 0.0.0.0/0, ::/0
  所有流量都经过你的家庭互联网连接。
  用途：蹭用家庭 DNS / Pi-hole 广告拦截。
  缺点：家庭上传速度会成为你所有流量的瓶颈。

# 多子网 split tunnel（最常见的 homelab 用例）：
  AllowedIPs = 192.168.10.0/24, 192.168.20.0/24, 192.168.30.0/24, 10.8.0.0/24
  将你所有的 VLAN 通过隧道路由；互联网保持直连。
```

## 密钥生成与 Peer 管理

```python
import subprocess

def generate_keypair() -> tuple[str, str]:
    """生成 WireGuard 密钥对。返回 (private_key, public_key)。"""
    private = subprocess.check_output(["wg", "genkey"]).decode().strip()
    public = subprocess.run(
        ["wg", "pubkey"], input=private.encode(), capture_output=True
    ).stdout.decode().strip()
    return private, public

def generate_preshared_key() -> str:
    return subprocess.check_output(["wg", "genpsk"]).decode().strip()

def build_client_config(
    client_private_key: str,
    client_vpn_ip: str,       # 例如 "10.8.0.3"
    server_public_key: str,
    server_endpoint: str,     # 例如 "home.example.com:51820"
    allowed_ips: str = "192.168.1.0/24",
    dns: str = "",
) -> str:
    dns_line = f"DNS = {dns}\n" if dns else ""
    return f"""[Interface]
PrivateKey = {client_private_key}
Address = {client_vpn_ip}/32
{dns_line}
[Peer]
PublicKey = {server_public_key}
Endpoint = {server_endpoint}
AllowedIPs = {allowed_ips}
PersistentKeepalive = 25
"""

def build_server_peer_block(
    client_public_key: str,
    client_vpn_ip: str,
    comment: str = "",
) -> str:
    comment_line = f"# {comment}\n" if comment else ""
    return f"""
{comment_line}[Peer]
PublicKey = {client_public_key}
AllowedIPs = {client_vpn_ip}/32
"""
```

不要将私钥放入版本控制。如果使用此脚本，请将密钥材料以 600 权限写入文件，切勿记录或打印。

## pfSense / OPNsense WireGuard

```
# pfSense：VPN → WireGuard → Add Tunnel
  Interface Keys：Generate（自动创建密钥对）
  Listen Port：51820
  Interface Address：10.8.0.1/24

# Add Peer（每个客户端一个）：
  Public Key：<client public key>
  Allowed IPs：10.8.0.2/32

# 分配 WireGuard 接口：
  Interfaces → Assignments → Add（选择 wg0）
  启用接口，无需 IP（已在隧道配置中设置）

# 防火墙规则：
  WAN → 入站允许 UDP 端口 51820（以便客户端可以访问服务器）
  WireGuard 接口 → 允许流量到达你希望可达的 LAN 网络
```

## 家庭服务器的 DDNS（Dynamic DNS）

大多数家庭互联网连接使用动态 IP。使用 DDNS，以便在 IP 变化后你的 VPN endpoint 仍然可达。

```bash
# 选项 1：Cloudflare DDNS——将凭证存储在 secrets 文件中，不要内联
# 使用 env 文件的 docker-compose 条目：
  ddns-updater:
    image: qmcgaw/ddns-updater
    env_file: ./ddns.env   # 将 zone_id 和 token 存放在这里，不要放在 compose 中
    restart: unless-stopped

# ddns.env（chmod 600，不提交到 git）：
# SETTINGS_CLOUDFLARE_ZONE_ID=your_zone_id
# SETTINGS_CLOUDFLARE_TOKEN=your_api_token

# 选项 2：DuckDNS（免费、简单）
  在 duckdns.org 注册 → 获取 token 和子域名（myhome.duckdns.org）
  将 token 存储在 /etc/ddns.env（权限 600），然后使用一个 root 所有的小脚本：

  # /usr/local/bin/update-duckdns
  #!/bin/sh
  set -eu
  . /etc/ddns.env
  curl --fail --silent --show-error --max-time 10 \
    --get "https://www.duckdns.org/update" \
    --data-urlencode "domains=myhome" \
    --data-urlencode "token=${DUCKDNS_TOKEN}" \
    --data-urlencode "ip="

  # Cron 任务：
  */5 * * * * /usr/local/bin/update-duckdns >/dev/null 2>&1
```

## 故障排查

```bash
# 检查 WireGuard 状态和最近一次握手
sudo wg show

# 如果 "latest handshake" 显示从未或非常久远，说明隧道未连接。
# 检查：
# 1. 路由器/防火墙上的 UDP 端口 51820 是否开放？
sudo ufw status  # 或检查 pfSense/UniFi 防火墙规则

# 2. 客户端配置中的服务器公钥是否正确？
sudo wg show wg0 public-key   # 与客户端配置中的内容对比

# 3. 服务器上是否启用了 IP 转发？
cat /proc/sys/net/ipv4/ip_forward  # 应为 1

# 4. 客户端的 AllowedIPs 是否覆盖了你要访问的 IP？
# 如果 AllowedIPs = 192.168.1.0/24 而你要访问 192.168.3.5，将无法路由。

# 检查内核日志中的 WireGuard 错误
dmesg | grep wireguard

# 重启 WireGuard
sudo wg-quick down wg0 && sudo wg-quick up wg0
```

## 反模式

```
# 反模式：将私钥存储在版本控制中或共享给他人
# 私钥等价于密码——绝不提交到 git

# 反模式：在移动端未考虑影响就使用 AllowedIPs = 0.0.0.0/0
# Full tunnel 会将所有移动流量经你的家庭上传链路路由——通常很慢

# 反模式：未在移动客户端上设置 PersistentKeepalive
# 位于 NAT 后的移动客户端如果没有此设置会断开空闲隧道

# 反模式：在防火墙开放了端口 51820 但忘记在服务器上启用 IP 转发
# 隧道能连接但无流量路由——调试时令人困惑

# 反模式：多个客户端设备共用一个密钥对
# 每台设备必须有自己的唯一密钥对——共用密钥会破坏安全模型

# 反模式：使用宽泛的 "FORWARD ACCEPT" iptables 规则
# 应将转发规则限定在 wg0 接口和方向上
```

## 最佳实践

- 为每个客户端设备生成唯一的密钥对——切勿复用密钥
- 在移动端使用 split tunneling（`AllowedIPs = <家庭子网>`）
- 在所有移动客户端上设置 `PersistentKeepalive = 25`
- 如果你的 ISP 分配动态 IP，使用 DDNS；将凭证存储在 env 文件中，不要内联
- 使用限定范围的 iptables 转发规则（仅 wg0 入站），而非一刀切的 FORWARD ACCEPT
- 在客户端配置中将 Pi-hole 的 IP 添加为 `DNS =`，以通过 VPN 获得广告拦截
- 定期轮换服务器密钥对并更新所有客户端配置

## 相关 Skills

- homelab-network-setup
- homelab-vlan-segmentation
- homelab-pihole-dns
