---
name: deployment-patterns
description: 面向 Web 应用的部署工作流、CI/CD pipeline 模式、Docker 容器化、health check、rollback 策略，以及生产就绪清单。
metadata:
  origin: ECC
---

# 部署模式

Production 部署工作流与 CI/CD 最佳实践。

## 何时激活

- 搭建 CI/CD pipeline
- 将应用 Docker 化
- 规划部署策略（blue-green、canary、rolling）
- 实现 health check 与 readiness probe
- 准备 production release
- 配置环境特定的设置

## 部署策略

### Rolling Deployment（默认）

逐步替换实例——在 rollout 期间，新旧版本同时运行。

```
Instance 1: v1 → v2  (先更新)
Instance 2: v1        (仍在运行 v1)
Instance 3: v1        (仍在运行 v1)

Instance 1: v2
Instance 2: v1 → v2  (第二个更新)
Instance 3: v1

Instance 1: v2
Instance 2: v2
Instance 3: v1 → v2  (最后更新)
```

**优点：** 零停机、逐步 rollout
**缺点：** 两个版本同时运行——需要向后兼容的变更
**适用场景：** 标准部署、向后兼容的变更

### Blue-Green Deployment

运行两个完全相同的环境。以原子方式切换流量。

```
Blue  (v1) ← traffic
Green (v2)   空闲，运行新版本

# 验证之后：
Blue  (v1)   空闲（成为备用）
Green (v2) ← traffic
```

**优点：** 即时 rollback（切回 blue）、干净利落的切换
**缺点：** 部署期间需要两倍的基础设施
**适用场景：** 关键服务、对问题零容忍

### Canary Deployment

先将小比例流量路由到新版本。

```
v1: 95% of traffic
v2:  5% of traffic  (canary)

# 若指标良好：
v1: 50% of traffic
v2: 50% of traffic

# 最终：
v2: 100% of traffic
```

**优点：** 在全面 rollout 前用真实流量发现问题
**缺点：** 需要流量分流基础设施和监控
**适用场景：** 高流量服务、高风险变更、feature flag

## Docker

### Multi-Stage Dockerfile（Node.js）

```dockerfile
# 阶段 1：安装依赖
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false

# 阶段 2：构建
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --production

# 阶段 3：生产镜像
FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001
USER appuser

COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

### Multi-Stage Dockerfile（Go）

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/server

FROM alpine:3.19 AS runner
RUN apk --no-cache add ca-certificates
RUN adduser -D -u 1001 appuser
USER appuser

COPY --from=builder /server /server

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["/server"]
```

### Multi-Stage Dockerfile（Python/Django）

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
RUN pip install --no-cache-dir uv
COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

FROM python:3.12-slim AS runner
WORKDIR /app

RUN useradd -r -u 1001 appuser
USER appuser

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY . .

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/')" || exit 1
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

### Docker 最佳实践

```
# GOOD 实践
- 使用具体的版本 tag（node:22-alpine，而非 node:latest）
- 使用 multi-stage build 以最小化镜像体积
- 以非 root 用户运行
- 先复制依赖文件（layer caching）
- 使用 .dockerignore 排除 node_modules、.git、tests
- 添加 HEALTHCHECK 指令
- 在 docker-compose 或 k8s 中设置资源限制

# BAD 实践
- 以 root 运行
- 使用 :latest tag
- 在一个 COPY 层中复制整个仓库
- 在生产镜像中安装开发依赖
- 在镜像中存储 secret（应使用环境变量或 secrets manager）
```

## CI/CD Pipeline

### GitHub Actions（标准 Pipeline）

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Deploy to production
        run: |
          # 平台特定的部署命令
          # Railway: railway up
          # Vercel: vercel --prod
          # K8s: kubectl set image deployment/app app=ghcr.io/${{ github.repository }}:${{ github.sha }}
          echo "Deploying ${{ github.sha }}"
```

### Pipeline 阶段

```
PR 创建后：
  lint → typecheck → unit tests → integration tests → preview deploy

合并到 main 后：
  lint → typecheck → unit tests → integration tests → build image → deploy staging → smoke tests → deploy production
```

## Health Check

### Health Check 端点

```typescript
// 简单 health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// 详细 health check（用于内部监控）
app.get("/health/detailed", async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    externalApi: await checkExternalApi(),
  };

  const allHealthy = Object.values(checks).every(c => c.status === "ok");

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "unknown",
    uptime: process.uptime(),
    checks,
  });
});

async function checkDatabase(): Promise<HealthCheck> {
  try {
    await db.query("SELECT 1");
    return { status: "ok", latency_ms: 2 };
  } catch (err) {
    return { status: "error", message: "Database unreachable" };
  }
}
```

### Kubernetes Probe

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 30
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 2

startupProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 0
  periodSeconds: 5
  failureThreshold: 30    # 30 * 5s = 150s 最大启动时间
```

## 环境配置

### Twelve-Factor App 模式

```bash
# 所有配置通过环境变量传递——绝不写入代码
DATABASE_URL=postgres://user:pass@host:5432/db
REDIS_URL=redis://host:6379/0
API_KEY=${API_KEY}           # 由 secrets manager 注入
LOG_LEVEL=info
PORT=3000

# 环境特定行为
NODE_ENV=production          # 或 staging、development
APP_ENV=production           # 显式的应用环境
```

### 配置校验

```typescript
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

// 在启动时校验——配置有误则 fail fast
export const env = envSchema.parse(process.env);
```

## Rollback 策略

### 即时 Rollback

```bash
# Docker/Kubernetes：指向 previous image
kubectl rollout undo deployment/app

# Vercel：提升 previous deployment
vercel rollback

# Railway：重新部署 previous commit
railway up --commit <previous-sha>

# Database：rollback migration（若可逆）
npx prisma migrate resolve --rolled-back <migration-name>
```

### Rollback 清单

- [ ] previous image/artifact 已可用并打好 tag
- [ ] database migration 向后兼容（无破坏性变更）
- [ ] feature flag 能在不部署的情况下禁用新功能
- [ ] 已为错误率突增配置监控告警
- [ ] 已在 production release 前于 staging 测试 rollback

## Production 就绪清单

在任何 production 部署之前：

### 应用
- [ ] 所有测试通过（unit、integration、E2E）
- [ ] 代码或配置文件中没有硬编码的 secret
- [ ] 错误处理覆盖所有 edge case
- [ ] 日志是结构化的（JSON）且不含 PII
- [ ] health check 端点返回有意义的状态

### 基础设施
- [ ] Docker image 可复现地构建（版本已锁定）
- [ ] 环境变量已文档化并在启动时校验
- [ ] 已设置资源限制（CPU、memory）
- [ ] 已配置水平伸缩（最小/最大实例数）
- [ ] 所有端点已启用 SSL/TLS

### 监控
- [ ] 应用 metrics 已导出（请求率、latency、错误数）
- [ ] 已为错误率超过 threshold 配置告警
- [ ] 已设置日志聚合（结构化日志、可搜索）
- [ ] 已对 health 端点进行 uptime 监控

### 安全
- [ ] 依赖已扫描 CVE
- [ ] CORS 仅对允许的 origin 配置
- [ ] 公共端点已启用 rate limiting
- [ ] 认证与授权已验证
- [ ] 已设置安全 header（CSP、HSTS、X-Frame-Options）

### 运维
- [ ] rollback 计划已文档化并经过测试
- [ ] database migration 已针对生产规模数据测试
- [ ] 针对常见故障场景的 runbook
- [ ] 已定义 on-call 轮值与升级路径
