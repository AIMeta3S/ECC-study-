---
name: docker-patterns
description: 用于本地开发、容器安全、网络、volume 策略和多服务编排的 Docker 与 Docker Compose 模式。
metadata:
  origin: ECC
---

# Docker 模式

面向容器化开发的 Docker 与 Docker Compose 最佳实践。

## 何时激活

- 为本地开发设置 Docker Compose
- 设计多容器架构
- 排查容器网络或 volume 问题
- 审查 Dockerfile 的安全性和体积
- 从本地开发迁移到容器化工作流

## 用于本地开发的 Docker Compose

### 标准 Web App 技术栈

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      target: dev                     # 使用 multi-stage Dockerfile 的 dev 阶段
    ports:
      - "3000:3000"
    volumes:
      - .:/app                        # 用于 hot reload 的 bind mount
      - /app/node_modules             # Anonymous volume —— 保留容器依赖
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/app_dev
      - REDIS_URL=redis://redis:6379/0
      - NODE_ENV=development
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    command: npm run dev

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

  mailpit:                            # 本地邮件测试
    image: axllent/mailpit
    ports:
      - "8025:8025"                   # Web UI
      - "1025:1025"                   # SMTP

volumes:
  pgdata:
  redisdata:
```

### 开发环境与生产环境的 Dockerfile

```dockerfile
# 阶段:dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 阶段:dev(hot reload、debug 工具)
FROM node:22-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# 阶段:build
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --production

# 阶段:production(最小镜像)
FROM node:22-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001
USER appuser
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/package.json ./
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
```

### Override 文件

```yaml
# docker-compose.override.yml(自动加载,仅用于开发环境的配置)
services:
  app:
    environment:
      - DEBUG=app:*
      - LOG_LEVEL=debug
    ports:
      - "9229:9229"                   # Node.js debugger

# docker-compose.prod.yml(显式用于生产环境)
services:
  app:
    build:
      target: production
    restart: always
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
```

```bash
# 开发环境(自动加载 override)
docker compose up

# 生产环境
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 网络

### 服务发现

同一 Compose 网络中的服务通过服务名进行解析:
```
# 从 "app" 容器内:
postgres://postgres:postgres@db:5432/app_dev    # "db" 解析为 db 容器
redis://redis:6379/0                             # "redis" 解析为 redis 容器
```

### 自定义网络

```yaml
services:
  frontend:
    networks:
      - frontend-net

  api:
    networks:
      - frontend-net
      - backend-net

  db:
    networks:
      - backend-net              # 仅可从 api 访问,frontend 不可达

networks:
  frontend-net:
  backend-net:
```

### 仅暴露必要的端口

```yaml
services:
  db:
    ports:
      - "127.0.0.1:5432:5432"   # 仅可从 host 访问,网络不可达
    # 生产环境中完全省略 ports —— 仅在 Docker 网络内可访问
```

## Volume 策略

```yaml
volumes:
  # Named volume:跨容器重启持久化,由 Docker 管理
  pgdata:

  # Bind mount:将 host 目录映射到容器(用于开发)
  # - ./src:/app/src

  # Anonymous volume:保护容器生成的内容不被 bind mount 覆盖
  # - /app/node_modules
```

### 常见模式

```yaml
services:
  app:
    volumes:
      - .:/app                   # 源代码(用于 hot reload 的 bind mount)
      - /app/node_modules        # 保护容器的 node_modules 不受 host 影响
      - /app/.next               # 保护 build cache

  db:
    volumes:
      - pgdata:/var/lib/postgresql/data          # 持久化数据
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql  # 初始化脚本
```

## 容器安全

### Dockerfile 加固

```dockerfile
# 1. 使用具体的 tag(绝不用 :latest)
FROM node:22.12-alpine3.20

# 2. 以 non-root 用户运行
RUN addgroup -g 1001 -S app && adduser -S app -u 1001
USER app

# 3. 丢弃 capabilities(在 compose 中)
# 4. 尽可能使用只读 root filesystem
# 5. 镜像层中不存放 secrets
```

### Compose 安全

```yaml
services:
  app:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
      - /app/.cache
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE          # 仅当绑定到小于 1024 的端口时
```

### Secret 管理

```yaml
# 正确做法:使用环境变量(运行时注入)
services:
  app:
    env_file:
      - .env                     # 切勿将 .env 提交到 git
    environment:
      - API_KEY                  # 从 host 环境继承

# 正确做法:Docker secrets(Swarm mode)
secrets:
  db_password:
    file: ./secrets/db_password.txt

services:
  db:
    secrets:
      - db_password

# 错误做法:硬编码在镜像中
# ENV API_KEY=sk-proj-xxxxx      # 绝不要这样做
```

## .dockerignore

```
node_modules
.git
.env
.env.*
dist
coverage
*.log
.next
.cache
docker-compose*.yml
Dockerfile*
README.md
tests/
```

## 调试

### 常用命令

```bash
# 查看日志
docker compose logs -f app           # 跟踪 app 日志
docker compose logs --tail=50 db     # db 的最后 50 行

# 在运行中的容器执行命令
docker compose exec app sh           # 进入 app 的 shell
docker compose exec db psql -U postgres  # 连接到 postgres

# 检查
docker compose ps                     # 运行中的服务
docker compose top                    # 每个容器中的进程
docker stats                          # 资源使用情况

# 重新构建
docker compose up --build             # 重新构建镜像
docker compose build --no-cache app   # 强制完整重新构建

# 清理
docker compose down                   # 停止并移除容器
docker compose down -v                # 同时移除 volume(具有破坏性)
docker system prune                   # 移除未使用的镜像/容器
```

### 调试网络问题

```bash
# 在容器内检查 DNS 解析
docker compose exec app nslookup db

# 检查连通性
docker compose exec app wget -qO- http://api:3000/health

# 检查网络
docker network ls
docker network inspect <project>_default
```

## 反模式

```
# 错误做法:在生产环境中使用 docker compose 而无编排
# 生产环境的多容器工作负载请使用 Kubernetes、ECS 或 Docker Swarm

# 错误做法:在容器中存储数据而不使用 volume
# 容器是短暂的 —— 没有 volume 时重启会丢失所有数据

# 错误做法:以 root 运行
# 始终创建并使用 non-root 用户

# 错误做法:使用 :latest tag
# 固定到具体版本以实现可复现的构建

# 错误做法:用一个巨型容器承载所有服务
# 分离关注点:每个容器一个进程

# 错误做法:将 secrets 放入 docker-compose.yml
# 使用 .env 文件(已 gitignore)或 Docker secrets
```
