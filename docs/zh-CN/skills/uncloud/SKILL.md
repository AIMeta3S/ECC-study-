---
name: uncloud
description: 在管理 Uncloud 集群时使用——通过 `uc` CLI 部署服务、配置 Caddy ingress、为非集群设备添加静态代理路由、发布端口、扩缩容、查看日志，或管理机器与卷。
metadata:
  origin: ECC
---

# Uncloud 集群管理

`uc` CLI 参考手册——一个使用 Docker 容器、WireGuard mesh 网络和 Caddy 反向代理的去中心化自托管平台。

## 何时激活

在使用 Uncloud 集群时使用本 skill，尤其是在以下场景：
- 使用 `uc machine` 引导或加入机器
- 使用 `uc deploy` 从 Compose 文件部署服务
- 通过 Uncloud 发布 HTTP、HTTPS、TCP 或 UDP 端口
- 通过 `x-caddy`、`x-ports` 或 `--caddyfile` 配置 Caddy ingress
- 通过集群代理路由外部局域网设备
- 查看日志、服务状态、卷、DNS 或机器放置位置

## 工作原理

Uncloud 在通过 WireGuard mesh 互联的对等机器上运行 Docker 服务。每台机器都是平等的集群成员；服务在 overlay 网络上通信，Caddy 以 global 模式运行以终结公共 HTTP/HTTPS 流量。Compose 文件可以使用 Uncloud 扩展来配置 ingress、放置策略和生成的 Caddy 配置，而 `uc` CLI 负责处理镜像分发、调度、扩缩容、日志和集群状态。

## 示例

```bash
uc machine init user@host --name machine-1
uc service run --name web -p app.example.com:8080/https nginx:latest
uc deploy
```

## 核心概念

- **无中心控制面** —— 所有机器都是通过 WireGuard 连接的、地位相同的 peer
- **Caddy** 在每台机器上作为 global 服务运行；自动从 Let's Encrypt 获取 TLS 证书
- **Overlay 网络** —— 服务默认通过 `10.210.0.0/16` 通信；DNS 在 mesh 内部提供
- **Caddyfile 为自动生成** —— 切勿直接编辑；请改用 `x-caddy` / `--caddyfile`

---

## CLI 快速参考

### 机器

| 命令 | 用途 |
|---------|---------|
| `uc machine init user@host` | 引导首台机器 / 新集群 |
| `uc machine add user@host` | 将机器加入现有集群 |
| `uc machine ls` | 列出机器 |
| `uc machine update NAME --public-ip IP` | 更新用于 ingress 的公共 IP |
| `uc machine rm NAME` | 移除机器 |

`init` 关键 flag：`--name`、`--network 10.210.0.0/16`、`--no-caddy`、`--no-dns`、`--public-ip auto\|IP\|none`

### 服务

| 命令 | 用途 |
|---------|---------|
| `uc service ls` / `uc ls` | 列出服务 |
| `uc service run IMAGE` | 运行单容器服务 |
| `uc deploy` | 从 `compose.yaml` 部署 |
| `uc deploy --no-build` | 部署已推送的镜像而不重新构建 |
| `uc deploy --recreate` | 强制重建服务 |
| `uc scale SERVICE N` | 设置副本数量 |
| `uc service logs SERVICE` | 查看日志 |
| `uc service exec SERVICE` | 进入容器的 shell |
| `uc service inspect SERVICE` | 查看详细信息 |
| `uc service rm SERVICE` | 移除服务（保留具名卷） |
| `uc ps` | 查看集群中所有容器 |

### 镜像

```bash
uc image push myapp:latest                    # 将本地镜像推送到所有机器
uc image push myapp:latest -m machine1,machine2  # 推送到指定机器
uc images                                     # 列出集群中的镜像
```

### 卷

```bash
uc volume ls                  # 所有卷
uc volume ls -m machine1      # 在指定机器上
uc volume create NAME -m MACHINE
uc volume rm NAME
```

### Caddy

```bash
uc caddy config    # 查看当前生成的 Caddyfile（只读）
uc caddy deploy    # 在整个集群中部署/升级 Caddy
```

### DNS 与 Context

```bash
uc dns show        # 查看已预留的 *.uncld.dev 域名
uc dns reserve     # 预留一个新域名
uc ctx ls          # 列出集群 context
uc ctx use prod    # 切换 context
```

---

## 端口发布

### HTTP/HTTPS（通过 Caddy 反向代理）

```
-p [hostname:]container_port[/protocol]
```

| 示例 | 含义 |
|---------|---------|
| `-p 8080/https` | HTTPS，自动生成 `service-name.cluster-domain` hostname |
| `-p app.example.com:8080/https` | HTTPS，使用自定义 hostname |
| `-p 8080/http` | 仅 HTTP，无 TLS |

### TCP/UDP（绑定到 host，绕过 Caddy）

```
-p [host_ip:]host_port:container_port[/protocol]@host
```

| 示例 | 含义 |
|---------|---------|
| `-p 5432:5432@host` | 在所有接口上的 TCP 5432 |
| `-p 127.0.0.1:5432:5432@host` | TCP 5432，仅 loopback |
| `-p 53:5353/udp@host` | UDP |

---

## Compose 文件扩展

Uncloud 在 Docker Compose 基础上添加了以下扩展：

### `x-ports` —— 发布带域名的端口

```yaml
services:
  app:
    image: app:latest
    x-ports:
      - example.com:8000/https
      - www.example.com:8000/https
      - api.example.com:9000/https
```

### `x-caddy` —— 服务的自定义 Caddy 配置

```yaml
services:
  app:
    image: app:latest
    x-caddy: |
      example.com {
        redir https://www.example.com{uri} permanent
      }
      www.example.com {
        reverse_proxy {{upstreams 8000}} {
          import common_proxy
        }
        basic_auth /admin/* {
          admin $2a$14$...
        }
      }
```

`x-caddy` 内部可用的模板函数：
- `{{upstreams [service] [port]}}` —— 健康容器的 IP
- `{{.Name}}` —— 服务名
- `{{.Upstreams}}` —— 所有服务 → IP 的映射

### `x-machines` —— 放置约束

```yaml
services:
  db:
    image: postgres:18
    x-machines: db-machine          # 单个机器名
  app:
    image: app:latest
    x-machines:
      - machine-1
      - machine-2
```

### 完整的多服务示例

```yaml
services:
  api:
    build: ./api
    x-ports:
      - api.example.com:3000/https
    environment:
      DATABASE_URL: postgres://db:5432/mydb

  web:
    build: ./web
    x-ports:
      - example.com:8000/https
      - www.example.com:8000/https
    environment:
      API_URL: http://api:3000

  db:
    image: postgres:18
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - db-data:/var/lib/postgresql/data
    x-machines: db-machine

volumes:
  db-data:
```

---

## 路由到外部（非集群）设备

要通过 Caddy 暴露一台外部设备（例如 BMC、NAS、路由器管理界面）而无需运行真实容器：

**1. 创建一个 Caddyfile 片段**（例如 `~/device.caddyfile`）：

```caddyfile
https://device.example.com {
    reverse_proxy https://192.168.1.x {
        transport http {
            tls_insecure_skip_verify   # 自签名 BMC 证书所需
        }
    }
    log
}
```

对于明文 upstream：`reverse_proxy http://192.168.1.x:port`

**2. 注册为一个带 no-op 容器的具名服务：**

```bash
uc service run \
  --name device-bmc \
  --caddyfile ~/device.caddyfile \
  registry.k8s.io/pause:3.9
```

`pause` 是一个最小化的 no-op 容器——它什么都不做，只是给 Uncloud 一个服务条目来挂载 Caddyfile。

**3. 验证：**

```bash
uc caddy config   # 应出现 device.example.com 配置块
```

> `--caddyfile` 不能与非 `@host` 的已发布端口组合使用。

**DNS 技巧：** 一条通配符记录（`*.yourdomain.com → cluster-public-ip`）意味着任何新子域名都能立即生效——无需为每个服务更改 DNS。

---

## 服务 DNS（内部）

集群内部的服务通过名称相互解析：

| DNS 名称 | 解析为 |
|----------|------------|
| `service-name` | 任意健康容器 |
| `service-name.internal` | 同上 |
| `rr.service-name.internal` | round-robin |
| `nearest.service-name.internal` | 优先本机 |

---

## 扩缩容与 Global 服务

```bash
uc scale web 5    # 5 个副本（分散到各机器）
uc scale web 1    # 缩容
```

```yaml
services:
  caddy:
    deploy:
      mode: global   # 每台机器上一个容器
```

---

## 镜像 Tag 模板（在 compose.yaml 中）

```yaml
image: myapp:{{gitdate "20060102"}}.{{gitsha 7}}
image: myapp:{{gitsha 7}}.${GITHUB_RUN_ID:-local}
```

| 函数 | 输出 |
|----------|--------|
| `{{gitsha N}}` | commit SHA 的前 N 个字符 |
| `{{gitdate "format"}}` | Go 格式的 git commit 日期 |
| `{{date "format"}}` | 当前日期 |

---

## 常见工作流

**从源码部署：**
```bash
uc deploy                          # 构建 + 推送 + 部署
uc build --push && uc deploy --no-build   # 分步执行
```

**查看一个服务：**
```bash
uc inspect web
uc logs -f web
uc logs --since 1h web
uc exec web                        # 打开 shell
uc exec web /bin/sh -c "env"       # 运行指定命令
```

**零停机部署**会自动进行；Uncloud 会在终止旧容器之前等待健康检查通过。

**强制重建：**
```bash
uc deploy --recreate
```

---

## 常见错误

| 错误 | 修复方法 |
|---------|-----|
| 直接编辑 Caddyfile | 在 compose 中使用 `x-caddy`，或在 `uc service run` 上使用 `--caddyfile` |
| 代理使用自签名证书的 HTTPS upstream | 添加 `transport http { tls_insecure_skip_verify }` |
| `uc caddy config` 未显示用户自定义配置块 | Caddy 的 admin socket 不可达——检查 `uc inspect caddy` 和 `uc logs caddy` |
| 服务无法从容器访问外部局域网 IP | 验证 Caddy 容器所在的 host 能路由到目标网络 |
| `uc service rm` 后卷丢失 | 具名卷会保留；只有匿名卷会被自动删除 |
