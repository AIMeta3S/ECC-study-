---
name: homelab-pihole-dns
description: Pi-hole 安装、blocklist 管理、DNS-over-HTTPS 设置、DHCP 集成、本地 DNS 记录，以及家庭网络中 DNS 解析故障的排查。
metadata:
  origin: community
---

# Homelab Pi-hole DNS

Pi-hole 是一个网络级的 DNS 广告拦截器，可运行在 Raspberry Pi 或任何 Linux 主机上。
你网络上的每一台设备都会自动获得广告和恶意软件域名拦截——无需浏览器扩展。

## 何时使用

- 在 Raspberry Pi 或 Linux 主机上安装 Pi-hole
- 将 Pi-hole 配置为家庭网络的 DNS 服务器
- 添加或管理 blocklists
- 设置 DNS-over-HTTPS (DoH) 上游 resolver
- 创建本地 DNS 记录（例如 `nas.home.lan`、`pi.home.lan`）
- 排查安装 Pi-hole 后设备无法访问互联网的问题
- 将 Pi-hole 与 DHCP 并行运行或替代 DHCP 运行

## Pi-hole 工作原理

```
正常流程（没有 Pi-hole）：
  设备 → 请求 ads.tracker.com → ISP DNS → 真实 IP → 广告加载

使用 Pi-hole：
  设备 → 请求 ads.tracker.com → Pi-hole DNS → 被拦截（返回 0.0.0.0）→ 无广告

所有 DNS 查询都先经过 Pi-hole。
Pi-hole 对照 blocklists 进行检查。
被拦截的域名返回空响应——广告/追踪器永远不会加载。
允许的域名会被转发到你的上游 resolver（Cloudflare、Google 等）。
```

## 安装

### Docker（推荐）

Docker 是安装 Pi-hole 最简单的方式，也让更新和备份变得简单。

```yaml
# docker-compose.yml
services:
  pihole:
    image: pihole/pihole:<pinned-release-tag>
    container_name: pihole
    ports:
      - "53:53/tcp"
      - "53:53/udp"
      - "80:80/tcp"          # Web 管理界面
    environment:
      TZ: "America/New_York"
      WEBPASSWORD: "${PIHOLE_WEBPASSWORD}"   # 通过 .env 文件或 secret 设置
      PIHOLE_DNS_: "1.1.1.1;1.0.0.1"
      DNSMASQ_LISTENING: "all"
    volumes:
      - "./etc-pihole:/etc/pihole"
      - "./etc-dnsmasq.d:/etc/dnsmasq.d"
    restart: unless-stopped
    cap_add:
      - NET_ADMIN              # 仅当 Pi-hole 将提供 DHCP 服务时需要
```

在部署前，将 `<pinned-release-tag>` 替换为当前的 Pi-hole 发布标签。
对于长期运行的 DNS 基础设施，避免使用 `latest`，这样升级是可控且可审查的。

在 `docker-compose.yml` 旁边的 `.env` 文件中设置 `PIHOLE_WEBPASSWORD`，将其 chmod 为
`600`，并使其远离 git——不要将密码直接放在 compose 文件中。

访问 Web 管理界面：`http://<pi-ip>/admin`

### 裸机安装（Raspberry Pi OS / Debian / Ubuntu）

Pi-hole 安装前需要一个静态 IP。

```bash
# 步骤 1：分配静态 IP（在 Pi OS 上编辑 /etc/dhcpcd.conf）
sudo nano /etc/dhcpcd.conf
# 在文件末尾添加：
interface eth0
static ip_address=192.168.3.2/24
static routers=192.168.3.1
static domain_name_servers=192.168.3.1

# 步骤 2：在运行前下载并检查安装脚本。
# 优先使用 Pi-hole 为你的操作系统/版本记录的包或安装路径。
curl -sSL https://install.pi-hole.net -o pi-hole-install.sh
less pi-hole-install.sh   # 在继续前审查

# 步骤 3：运行
bash pi-hole-install.sh

# 按照交互式安装程序的提示：
# 1. 选择网络接口（有线用 eth0——推荐）
# 2. 选择上游 DNS（Cloudflare 或保持默认——之后可以更改）
# 3. 确认静态 IP
# 4. 安装 Web 管理界面（推荐）
# 5. 记下最后显示的管理员密码
```

## 将你的网络指向 Pi-hole

```
# 方法 1：在路由器 DHCP 设置中更改 DNS（推荐）
  路由器管理界面 → DHCP Settings → DNS Server
  Primary DNS：192.168.3.2  (Pi-hole IP)
  Secondary DNS：留空表示严格拦截，或使用第二台 Pi-hole。
                 公共回退 DNS（如 1.1.1.1）能提高推广期间的可用性，
                 但可能绕过拦截，因为客户端可能会查询它。

  所有设备在下一次 DHCP 续约时自动获得 Pi-hole 作为 DNS。
  强制续约：重新连接 Wi-Fi，或在 Linux 上运行 'sudo dhclient -r && sudo dhclient'

# 方法 2：逐设备设置 DNS（适合在全网推广前进行测试）
  Windows：Control Panel → Network Adapter → IPv4 Properties → 手动设置 DNS
  macOS：System Settings → Network → Details → DNS → 手动设置
  Linux：/etc/resolv.conf 或 NetworkManager

# 方法 3：Pi-hole 作为 DHCP 服务器（替代路由器 DHCP）
  Pi-hole admin → Settings → DHCP → Enable
  先在路由器上禁用 DHCP——同一网络上的两台 DHCP 服务器会导致冲突
  优点：主机名解析自动工作（设备会注册自己的名称）
```

## Blocklist 管理

```
# Pi-hole admin → Adlists → Add new adlist

# 推荐的 blocklists：
  https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts
  # 默认——20万+ 域名

  https://blocklistproject.github.io/Lists/malware.txt
  # 恶意软件域名

  https://blocklistproject.github.io/Lists/tracking.txt
  # 追踪/遥测

# 添加列表后：
  Tools → Update Gravity（下载并编译所有 blocklists）

# 如果某个本不应被拦截的站点被拦截了（误报）：
  Pi-hole admin → Whitelist → Add domain
  示例：api.my-legitimate-service.com

# 实时查看正在被拦截的内容：
  Dashboard → Query Log（实时 DNS 查询流，含拦截/允许状态）
```

## DNS-over-HTTPS 上游

DNS-over-HTTPS 会加密你的 DNS 查询，这样你的 ISP 就看不到你解析了哪些站点。

```bash
# 安装 cloudflared（Cloudflare 的 DoH 代理）。
# 优先使用 Cloudflare 的包仓库，以便自动进行签名包验证。
# 如果直接下载二进制文件，请固定某个发布版本并校验其 checksum。
CLOUDFLARED_VERSION="<pinned-version>"
curl -LO "https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/cloudflared-linux-arm64"
# 安装前，从 Cloudflare 的发布说明中校验 checksum/签名。
sudo mv cloudflared-linux-arm64 /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared

# 创建 cloudflared 配置
sudo mkdir -p /etc/cloudflared
sudo tee /etc/cloudflared/config.yml << EOF
proxy-dns: true
proxy-dns-port: 5053
proxy-dns-upstream:
  - https://1.1.1.1/dns-query
  - https://1.0.0.1/dns-query
EOF

# 创建 systemd 服务
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# 现在将 Pi-hole 指向本地 DoH 代理：
# Pi-hole admin → Settings → DNS → Custom upstream DNS
# 设置为：127.0.0.1#5053
# 取消勾选所有其他上游 resolver
```

## 本地 DNS 记录

让你的服务可以通过名称访问（例如 `nas.home.lan`、`grafana.home.lan`）。

> **域名说明：** `.home.lan` 在 homelab 中被广泛使用，实际也能正常工作。
> IETF 为本地用途保留的后缀是 `.home.arpa` (RFC 8375)——使用它可以
> 遵循标准。避免在 Pi-hole DNS 记录中使用 `.local`，因为它与
> mDNS/Bonjour 冲突。

```
# Pi-hole admin → Local DNS → DNS Records

  Domain              IP
  nas.home.lan        192.168.30.10
  pi.home.lan         192.168.30.2
  grafana.home.lan    192.168.30.3
  proxmox.home.lan    192.168.30.4

# 从你网络上的任何设备：
  ping nas.home.lan        → 192.168.30.10
  http://grafana.home.lan  → 你的 Grafana dashboard

# 对于子域名，添加 CNAME：
  Pi-hole admin → Local DNS → CNAME Records
  Domain: portainer.home.lan → Target: pi.home.lan
```

## 故障排查

```bash
# Pi-hole 拦截了不应拦截的内容
pihole -q example.com          # 检查域名是否被拦截以及属于哪个列表
pihole -w example.com          # 立即 Whitelist

# DNS 完全无法解析
pihole status                  # 检查 pihole-FTL 是否在运行
dig @192.168.3.2 google.com   # 直接对 Pi-hole 测试 DNS

# 重启 Pi-hole DNS
pihole restartdns

# 查看特定设备的查询日志
pihole -t                      # 实时 tail 所有查询
# 或在 Web 管理界面的 Query Log 中按客户端筛选

# Pi-hole gravity 更新（刷新 blocklists）
pihole -g
```

## Anti-Patterns

```
# BAD：只依赖一台 Pi-hole 而没有恢复路径
# 如果 Pi-hole 崩溃或 Pi 断电，DNS 可能停止工作
# GOOD：保留一个已记录的路由器回退方案，以便在设置期间回滚
# BETTER：运行两台 Pi-hole 实例以实现冗余；对于严格拦截，避免使用公共回退 DNS

# BAD：在没有静态 IP 的情况下安装 Pi-hole
# 如果 Pi 获得了新的 DHCP IP，所有设备都会失去 DNS
# GOOD：先设置静态 IP，再安装 Pi-hole

# BAD：没有先禁用路由器 DHCP 就启用 Pi-hole DHCP
# 同一网络上的两台 DHCP 服务器会分配冲突的 IP
# GOOD：先禁用路由器 DHCP，再启用 Pi-hole DHCP

# BAD：从不更新 gravity（blocklists）
# 新的广告和恶意软件域名不断积累——过时的列表会漏掉它们
# GOOD：安排每周 gravity 更新：pihole -g（或在 Settings → API 中启用）
```

## 最佳实践

- 在安装 Pi-hole 之前，给 Pi 分配静态 IP 或 DHCP 预留
- 将 Pi-hole 作为主 DNS；如果需要严格拦截，为冗余考虑，增加第二台 Pi-hole 而不是公共 resolver
- 使用 cloudflared 启用 DoH (DNS-over-HTTPS)，以实现加密的上游查询
- 将 `home.lan` 设为你的本地域名，并为所有服务创建 DNS 记录
- 偶尔查看 Query Log——被拦截的查询能告诉你各设备在做什么

## 相关 Skills

- homelab-network-setup
- homelab-vlan-segmentation
- homelab-wireguard-vpn
