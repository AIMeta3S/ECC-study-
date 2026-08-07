---
name: kubernetes-patterns
description: Kubernetes 工作负载模式、资源管理、RBAC、探针、自动扩缩容、ConfigMap/Secret 处理，以及面向生产级部署的 kubectl 调试。
metadata:
  origin: ECC
---

# Kubernetes 模式

用于可靠地部署、管理和调试工作负载的生产级 Kubernetes 模式。

## 何时激活

- 编写 Kubernetes manifests（Deployments、Services、Ingress、Jobs）
- 配置资源 requests/limits、liveness/readiness 探针
- 设置 RBAC、namespace 或 ServiceAccount
- 管理 K8s 中的配置和 Secret
- 调试 CrashLoopBackOff、OOMKilled、pending 的 pod 或镜像拉取错误
- 配置 HPA（Horizontal Pod Autoscaler）或 PodDisruptionBudget
- 审查 K8s YAML 的安全性或正确性

## 何时使用

> 同上面的 **何时激活**。此别名用于满足仓库的 skill 格式规范。在编写、审查或调试 Kubernetes YAML 和工作负载时，均可使用本 skill。

## 工作原理

本 skill 提供按任务组织的**可直接复制使用的生产级 YAML 模式**和**kubectl 调试命令**：

1. **Deployment 模板** —— 一个完整配置的生产级 `Deployment`，包含 security context、rolling update 策略、全部三种探针类型、资源 limits 以及从 ConfigMap/Secret 注入的环境变量。
2. **探针** —— startup、liveness 与 readiness 的选择决策表，并给出正确的 `failureThreshold × periodSeconds` 计算。
3. **Services 和 Ingress** —— ClusterIP、LoadBalancer 和带 cert-manager annotation 的 TLS Ingress 模式。
4. **ConfigMap 和 Secret** —— `envFrom`、文件挂载以及外部 secret 指引。
5. **资源管理** —— 按工作负载类型（web API、JVM、worker、sidecar）给出 requests 与 limits 的经验法则。
6. **RBAC** —— 最小权限的 ServiceAccount → Role → RoleBinding 链。
7. **HPA 和 PDB** —— 自动扩缩容和节点排空安全配置。
8. **Job 和 CronJob** —— 一次性与定时工作负载模式，使用正确的 `restartPolicy`。
9. **kubectl 速查表** —— 日志、exec、回滚、port-forward、dry-run 以及常见错误诊断命令。
10. **反模式与检查清单** —— 不应做的事项，以及安全/可靠性/可观测性检查清单。

## 示例

以下各节提供了完整、可运行的示例。快速索引：

| 任务 | 跳转到 |
|------|---------|
| 完整的生产级 Deployment YAML | [核心工作负载模式](#core-workload-patterns) |
| 探针配置 | [探针](#probes--liveness-readiness-startup) |
| RBAC 最小权限配置 | [RBAC](#rbac--roles-and-serviceaccounts) |
| 调试 CrashLoopBackOff | [kubectl 调试速查表](#kubectl-debugging-cheatsheet) |
| 自动扩缩容 | [HPA](#horizontal-pod-autoscaler-hpa) |

---

## 核心工作负载模式

### Deployment — 生产模板

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-namespace
  labels:
    app: my-app
    version: "1.0.0"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1          # 更新期间允许 1 个额外 pod
      maxUnavailable: 0    # 永不低于期望副本数
  template:
    metadata:
      labels:
        app: my-app
        version: "1.0.0"
    spec:
      # pod 级别的 security context
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001

      # 优雅关闭
      terminationGracePeriodSeconds: 30

      containers:
        - name: my-app
          image: ghcr.io/org/my-app:1.0.0   # 切勿使用 :latest
          imagePullPolicy: IfNotPresent

          ports:
            - containerPort: 8080
              protocol: TCP

          # 必须同时设置 resource requests 和 limits
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"

          # container 级别的 security context
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL

          # 探针（见下文探针一节）
          startupProbe:
            httpGet:
              path: /health
              port: 8080
            failureThreshold: 30
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 0
            periodSeconds: 30
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 2

          # 来自 ConfigMap 和 Secret 的环境变量
          envFrom:
            - configMapRef:
                name: my-app-config
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: my-app-secrets
                  key: db-password

          # readOnlyRootFilesystem: true 时可写的 tmp 目录
          volumeMounts:
            - name: tmp
              mountPath: /tmp

      volumes:
        - name: tmp
          emptyDir: {}
```

---

## 探针 — Liveness、Readiness、Startup

理解每种探针的使用时机至关重要：

| 探针 | 失败时的行为 | 适用场景 |
|-------|---------------|---------|
| `startupProbe` | 启动过慢则杀死 container | 慢启动应用（JVM、Python） |
| `livenessProbe` | 重启 container | 死锁/进程挂起检测 |
| `readinessProbe` | 从 Service endpoints 中移除 | 临时不可用（DB 重连） |

```yaml
# 正确模式：startupProbe 覆盖慢启动阶段，
# 随后交由 liveness/readiness 接管
startupProbe:
  httpGet:
    path: /health
    port: 8080
  failureThreshold: 30  # 30 * 5s = 150s 最大启动时间
  periodSeconds: 5

livenessProbe:
  httpGet:
    path: /health
    port: 8080
  periodSeconds: 30
  failureThreshold: 3   # 3 * 30s = 90s 后重启

readinessProbe:
  httpGet:
    path: /ready         # 独立 endpoint：检查 DB、缓存等
    port: 8080
  periodSeconds: 10
  failureThreshold: 2
```

```yaml
# 错误：没有 startupProbe 而使用 initialDelaySeconds
# 如果应用需要 60s 启动，应改用 startupProbe
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 60   # 糟糕：盲目等待，存在竞争条件
```

---

## Services 和 Ingress

### Service 类型

```yaml
# ClusterIP（默认）— 仅内部访问
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: my-namespace
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
  type: ClusterIP
```

```yaml
# LoadBalancer — 外部流量（云服务商）
spec:
  type: LoadBalancer
  ports:
    - port: 443
      targetPort: 8080
```

### 带 TLS 的 Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  namespace: my-namespace
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - myapp.example.com
      secretName: my-app-tls
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```

---

## ConfigMap 和 Secret

### ConfigMap — 非敏感配置

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
  namespace: my-namespace
data:
  LOG_LEVEL: "info"
  APP_ENV: "production"
  MAX_CONNECTIONS: "100"
  # 复杂配置以文件形式挂载
  app.yaml: |
    server:
      port: 8080
      timeout: 30s
```

```yaml
# 将 ConfigMap 作为文件挂载
volumes:
  - name: config
    configMap:
      name: my-app-config
      items:
        - key: app.yaml
          path: app.yaml
volumeMounts:
  - name: config
    mountPath: /etc/app
    readOnly: true
```

### Secret — 敏感数据

```bash
# 从字面量创建 secret（CLI 操作，随后存入 Vault/SOPS）
kubectl create secret generic my-app-secrets \
  --from-literal=db-password='s3cr3t' \
  --namespace=my-namespace \
  --dry-run=client -o yaml | kubectl apply -f -
```

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
  namespace: my-namespace
type: Opaque
# 值为 base64 编码（并未加密——真正的加密请使用 Sealed Secrets 或 ESO）
data:
  db-password: czNjcjN0  # 's3cr3t' 的 base64
```

> **重要提示：** 原生的 Kubernetes Secret 仅做 base64 编码，除非集群配置了加密，否则不会进行静态加密。生产环境请使用 [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets) 或 [External Secrets Operator](https://external-secrets.io)。

---

## 资源 Requests 和 Limits

```yaml
resources:
  requests:       # Scheduler 据此调度 pod
    cpu: "100m"   # 100 millicores = 0.1 CPU
    memory: "128Mi"
  limits:         # 超过此值 container 会被杀死/限流
    cpu: "500m"
    memory: "256Mi"
```

**经验法则：**

| 工作负载类型 | CPU Request | Memory Request | 说明 |
|---------------|-------------|----------------|-------|
| Web API | 100–250m | 128–256Mi | limits 设为 requests 的 2-4 倍 |
| Worker/consumer | 250–500m | 256–512Mi | memory limit = request，以保证可预测性 |
| JVM 应用 | 500m–1 | 512Mi–2Gi | 在 `-Xmx` 之上为 JVM 额外开销留出余量 |
| Sidecar | 10–50m | 32–64Mi | 尽量保持最小 |

```yaml
# 错误：没有 requests 或 limits——调度不可预测，会出现 OOM 驱逐
containers:
  - name: app
    image: myapp:latest
    # 缺少 resources: {}——这在生产环境中很危险

# 错误：只有 limits 没有 requests——requests 默认等于 limits，会过度预留容量
resources:
  limits:
    cpu: "2"
    memory: "1Gi"
  # 缺少 requests——将默认取 limits 的值
```

---

## RBAC — Role 和 ServiceAccount

### 最小权限原则

**根据应用是否调用 Kubernetes API，分为两种模式：**

#### 模式 A — 应用不需要 Kubernetes API（大多数应用）

在 ServiceAccount 上禁用 token 自动挂载。不需要 Role/RoleBinding。

```yaml
# 禁用 token 的 ServiceAccount——最安全的默认配置
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app-sa
  namespace: my-namespace
automountServiceAccountToken: false   # 不向 pod 注入 K8s API token
```

```yaml
# 在 Deployment 中引用——无 token、无 API 访问
spec:
  template:
    spec:
      serviceAccountName: my-app-sa
      automountServiceAccountToken: false   # 双重保险：同时在 pod 级别设置
```

#### 模式 B — 应用需要 Kubernetes API（operator、controller、config watcher）

启用 token，并只授予实际所需的权限。

```yaml
# 1. ServiceAccount——为此 SA 启用 token
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app-sa
  namespace: my-namespace
automountServiceAccountToken: true    # 需要 token：应用调用 K8s API
```

```yaml
# 2. Role——只授予应用所需（namespace 范围内）
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: my-app-role
  namespace: my-namespace
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch"]    # 只读，限定具体资源
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["my-app-secrets"]  # 按名称限定到具体 secret
    verbs: ["get"]
```

```yaml
# 3. 将 Role 绑定到 ServiceAccount
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: my-app-rolebinding
  namespace: my-namespace
subjects:
  - kind: ServiceAccount
    name: my-app-sa
    namespace: my-namespace
roleRef:
  kind: Role
  apiGroup: rbac.authorization.k8s.io
  name: my-app-role
```

```yaml
# 4. 在 Deployment 中引用 SA
spec:
  template:
    spec:
      serviceAccountName: my-app-sa
      # automountServiceAccountToken 默认从 SA 继承为 true——token 会被注入
```

---

## Horizontal Pod Autoscaler（HPA）

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
  namespace: my-namespace
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2      # 为高可用至少保留 2 个
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70    # 平均 CPU > 70% 时扩容
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

> HPA 要求所有 container 都设置 `resources.requests`——它按 `current / request` 计算利用率。

---

## PodDisruptionBudget（PDB）

防止在节点排空或滚动更新期间过多 pod 同时下线：

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
  namespace: my-namespace
spec:
  minAvailable: 2           # 或使用 maxUnavailable: 1
  selector:
    matchLabels:
      app: my-app
```

---

## Namespace 和多租户

```bash
# 创建带 resource quota 的 namespace
kubectl create namespace my-namespace

# 应用 ResourceQuota 以限制 namespace 的资源消耗
kubectl apply -f - <<EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: my-namespace-quota
  namespace: my-namespace
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 4Gi
    limits.cpu: "8"
    limits.memory: 8Gi
    pods: "20"
EOF
```

---

## Job 和 CronJob

```yaml
# 一次性 Job（DB 迁移、数据处理）
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  namespace: my-namespace
spec:
  backoffLimit: 3          # 失败时最多重试 3 次
  ttlSecondsAfterFinished: 3600   # 1 小时后自动删除
  template:
    spec:
      restartPolicy: OnFailure    # Job 用 Never（而非 Always）
      containers:
        - name: migrate
          image: ghcr.io/org/my-app:1.0.0
          command: ["python", "manage.py", "migrate"]
          resources:
            requests:
              cpu: "100m"
              memory: "256Mi"
```

```yaml
# CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-job
  namespace: my-namespace
spec:
  schedule: "0 2 * * *"         # 每天凌晨 2 点
  concurrencyPolicy: Forbid      # 上一次仍在运行时不启动新任务
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: cleanup
              image: ghcr.io/org/cleanup:1.0.0
              resources:
                requests:
                  cpu: "50m"
                  memory: "64Mi"
```

---

## kubectl 调试速查表

```bash
# --- pod 状态与日志 ---
kubectl get pods -n my-namespace
kubectl get pods -n my-namespace -o wide          # 显示节点分配
kubectl describe pod <pod-name> -n my-namespace   # 事件和状态详情
kubectl logs <pod-name> -n my-namespace           # 当前日志
kubectl logs <pod-name> -n my-namespace --previous  # 崩溃 container 的日志
kubectl logs <pod-name> -n my-namespace -c <container>  # 多 container 的 pod

# --- 进入运行中的 container ---
kubectl exec -it <pod-name> -n my-namespace -- sh
kubectl exec -it <pod-name> -n my-namespace -- bash

# --- 检查资源使用情况 ---
kubectl top pods -n my-namespace
kubectl top nodes

# --- Deployment 操作 ---
kubectl rollout status deployment/my-app -n my-namespace
kubectl rollout history deployment/my-app -n my-namespace
kubectl rollout undo deployment/my-app -n my-namespace      # 回滚
kubectl rollout undo deployment/my-app --to-revision=2 -n my-namespace

# --- 手动扩缩容 ---
kubectl scale deployment my-app --replicas=5 -n my-namespace

# --- 查看事件（集群层面的问题） ---
kubectl get events -n my-namespace --sort-by='.lastTimestamp'

# --- 用于本地调试的 port-forward ---
kubectl port-forward pod/<pod-name> 8080:8080 -n my-namespace
kubectl port-forward svc/my-app 8080:80 -n my-namespace

# --- dry-run 校验 YAML ---
kubectl apply -f deployment.yaml --dry-run=client
kubectl apply -f deployment.yaml --dry-run=server   # 对照实时集群校验
```

### 诊断常见错误

```bash
# CrashLoopBackOff：container 不断崩溃
kubectl logs <pod-name> --previous -n my-namespace  # 检查崩溃日志
kubectl describe pod <pod-name> -n my-namespace     # 检查退出码和 OOMKilled

# ImagePullBackOff：无法拉取镜像
kubectl describe pod <pod-name> -n my-namespace     # 查看 Events 部分
# 可能原因：镜像 tag 错误、缺少 imagePullSecret、私有 registry

# Pending 的 pod：未被调度
kubectl describe pod <pod-name> -n my-namespace
# 可能原因：资源不足、无匹配的 node selector、taint/toleration 不匹配

# OOMKilled：内存不足
# 调大 memory limit，排查内存泄漏
kubectl describe pod <pod-name> -n my-namespace | grep -A5 "Last State"
```

---

## 反模式

```yaml
# 糟糕：使用 :latest tag——部署不可复现
image: myapp:latest

# 正确：固定到具体的不可变 tag（SHA 或 semver）
image: ghcr.io/org/myapp:1.4.2
# 或
image: ghcr.io/org/myapp@sha256:abc123...

# ---

# 糟糕：以 root 运行
securityContext: {}    # 默认以 root 运行

# 正确：显式指定 UID 的 non-root
securityContext:
  runAsNonRoot: true
  runAsUser: 1001

# ---

# 糟糕：没有 resource limits——单个 pod 可能耗尽整个节点资源
containers:
  - name: app
    image: myapp:1.0.0
    # 未定义 resources

# 正确：始终设置 requests 和 limits
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "500m"
    memory: "256Mi"

# ---

# 糟糕：在 ConfigMap 中存储明文 secret
apiVersion: v1
kind: ConfigMap
data:
  DB_PASSWORD: "mysecretpassword"   # 绝不可——请使用 Secret 或外部 secret manager

# ---

# 糟糕：为应用 ServiceAccount 分配 ClusterAdmin
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
roleRef:
  kind: ClusterRole
  name: cluster-admin    # 等于给了应用"上帝模式"权限

# ---

# 糟糕：PDB 中 minAvailable: 0——失去了意义
spec:
  minAvailable: 0

# ---

# 糟糕：Job 中 restartPolicy: Always（会导致无限重启循环）
spec:
  restartPolicy: Always   # Job 应使用 OnFailure 或 Never
```

---

## 最佳实践检查清单

### 安全
- [ ] Container 以 non-root 运行（设置 `runAsNonRoot: true`、`runAsUser`）
- [ ] `readOnlyRootFilesystem: true`，可写路径使用 `emptyDir`
- [ ] `allowPrivilegeEscalation: false`
- [ ] 丢弃所有 capabilities（`capabilities.drop: [ALL]`）
- [ ] 每个应用使用专用 ServiceAccount，而非 `default`
- [ ] 除非必要，否则设置 `automountServiceAccountToken: false`
- [ ] RBAC 遵循最小权限（除非必要，否则使用 `Role` 而非 `ClusterRole`）
- [ ] 通过 Sealed Secrets 或 External Secrets Operator 管理 Secret

### 可靠性
- [ ] 配置全部 3 种探针（startup + liveness + readiness）
- [ ] 每个 container 都设置资源 requests 和 limits
- [ ] 任何生产工作负载 `minReplicas: 2+`
- [ ] 为有状态或关键 Service 定义 PodDisruptionBudget
- [ ] `RollingUpdate` 策略且 `maxUnavailable: 0`
- [ ] 为负载波动的 Service 配置 HPA

### 可观测性
- [ ] 应用暴露 `/health`（liveness）和 `/ready`（readiness）endpoint
- [ ] 结构化 JSON 日志（日志中不含 PII）
- [ ] 资源 label：`app`、`version`、`environment`

---

## 相关 skill

- `docker-patterns` — 多阶段 Dockerfile 和镜像安全
- `deployment-patterns` — CI/CD pipeline、回滚策略、health check endpoint
- `security-review` — 更广泛的安全加固上下文
- `git-workflow` — GitOps 与 K8s 集成（ArgoCD / Flux 模式）
