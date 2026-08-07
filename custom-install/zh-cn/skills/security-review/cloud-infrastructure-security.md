| name | description |
|------|-------------|
| cloud-infrastructure-security | 当部署到云平台、配置基础设施、管理 IAM 策略、设置日志/监控，或实现 CI/CD 流水线时使用此 skill。提供与最佳实践对齐的云安全检查清单。 |

# 云与基础设施安全 Skill

此 skill 确保云基础设施、CI/CD 流水线和部署配置遵循安全最佳实践，并符合行业标准。

## 何时启用

- 将应用部署到云平台（AWS、Vercel、Railway、Cloudflare）
- 配置 IAM 角色与权限
- 设置 CI/CD 流水线
- 实现基础设施即代码（Terraform、CloudFormation）
- 配置日志与监控
- 在云环境中管理 secrets
- 设置 CDN 与边缘安全
- 实现灾难恢复与备份策略

## 云安全检查清单

### 1. IAM 与访问控制

#### 最小权限原则

```yaml
# PASS: 正确：最小权限
iam_role:
  permissions:
    - s3:GetObject  # 仅读取访问
    - s3:ListBucket
  resources:
    - arn:aws:s3:::my-bucket/*  # 仅限特定 bucket

# FAIL: 错误：权限过于宽泛
iam_role:
  permissions:
    - s3:*  # 所有 S3 操作
  resources:
    - "*"  # 所有资源
```

#### 多因素认证（MFA）

```bash
# 始终为 root/admin 账户启用 MFA
aws iam enable-mfa-device \
  --user-name admin \
  --serial-number arn:aws:iam::123456789:mfa/admin \
  --authentication-code1 123456 \
  --authentication-code2 789012
```

#### 验证步骤

- [ ] 生产环境不使用 root 账户
- [ ] 所有特权账户启用 MFA
- [ ] 服务账户使用角色，而非长期有效的凭证
- [ ] IAM 策略遵循最小权限
- [ ] 定期进行访问审查
- [ ] 轮换或删除未使用的凭证

### 2. Secrets 管理

#### 云 Secrets 管理器

```typescript
// PASS: 正确：使用云 secrets 管理器
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManager({ region: 'us-east-1' });
const secret = await client.getSecretValue({ SecretId: 'prod/api-key' });
const apiKey = JSON.parse(secret.SecretString).key;

// FAIL: 错误：硬编码或仅放在环境变量中
const apiKey = process.env.API_KEY; // 未轮换、未审计
```

#### Secrets 轮换

```bash
# 为数据库凭证设置自动轮换
aws secretsmanager rotate-secret \
  --secret-id prod/db-password \
  --rotation-lambda-arn arn:aws:lambda:region:account:function:rotate \
  --rotation-rules AutomaticallyAfterDays=30
```

#### 验证步骤

- [ ] 所有 secrets 存储在云 secrets 管理器中（AWS Secrets Manager、Vercel Secrets）
- [ ] 数据库凭证启用自动轮换
- [ ] API key 至少每季度轮换一次
- [ ] 代码、日志或错误消息中不含 secrets
- [ ] secret 访问启用审计日志

### 3. 网络安全

#### VPC 与防火墙配置

```terraform
# PASS: 正确：受限的安全组
resource "aws_security_group" "app" {
  name = "app-sg"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]  # 仅内部 VPC
  }

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # 仅出站 HTTPS
  }
}

# FAIL: 错误：对互联网开放
resource "aws_security_group" "bad" {
  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # 所有端口、所有 IP！
  }
}
```

#### 验证步骤

- [ ] 数据库不可公开访问
- [ ] SSH/RDP 端口仅限 VPN/bastion 访问
- [ ] 安全组遵循最小权限
- [ ] 已配置网络 ACL
- [ ] 已启用 VPC 流日志

### 4. 日志与监控

#### CloudWatch/日志配置

```typescript
// PASS: 正确：全面的日志记录
import { CloudWatchLogsClient, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';

const logSecurityEvent = async (event: SecurityEvent) => {
  await cloudwatch.putLogEvents({
    logGroupName: '/aws/security/events',
    logStreamName: 'authentication',
    logEvents: [{
      timestamp: Date.now(),
      message: JSON.stringify({
        type: event.type,
        userId: event.userId,
        ip: event.ip,
        result: event.result,
        // 切勿记录敏感数据
      })
    }]
  });
};
```

#### 验证步骤

- [ ] 所有服务启用 CloudWatch/日志
- [ ] 记录失败的认证尝试
- [ ] 审计管理员操作
- [ ] 已配置日志保留（合规要求 90 天以上）
- [ ] 已针对可疑活动配置告警
- [ ] 日志集中化且防篡改

### 5. CI/CD 流水线安全

#### 安全的流水线配置

```yaml
# PASS: 正确：安全的 GitHub Actions workflow
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read  # 最小权限

    steps:
      - uses: actions/checkout@v4

      # 扫描 secrets
      - name: Secret scanning
        uses: trufflesecurity/trufflehog@main

      # 依赖审计
      - name: Audit dependencies
        run: npm audit --audit-level=high

      # 使用 OIDC，而非长期 token
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/GitHubActionsRole
          aws-region: us-east-1
```

#### 供应链安全

```json
// package.json - 使用 lock file 与完整性校验
{
  "scripts": {
    "install": "npm ci",  // 使用 ci 以实现可复现的构建
    "audit": "npm audit --audit-level=moderate",
    "check": "npm outdated"
  }
}
```

#### 验证步骤

- [ ] 使用 OIDC 而非长期有效的凭证
- [ ] 流水线中包含 secrets 扫描
- [ ] 依赖漏洞扫描
- [ ] 容器镜像扫描（如适用）
- [ ] 已强制执行分支保护规则
- [ ] 合并前必须进行 code review
- [ ] 已强制执行签名 commit

### 6. Cloudflare 与 CDN 安全

#### Cloudflare 安全配置

```typescript
// PASS: 正确：带安全 header 的 Cloudflare Workers
export default {
  async fetch(request: Request): Promise<Response> {
    const response = await fetch(request);

    // 添加安全 header
    const headers = new Headers(response.headers);
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'geolocation=(), microphone=()');

    return new Response(response.body, {
      status: response.status,
      headers
    });
  }
};
```

#### WAF 规则

```bash
# 启用 Cloudflare WAF 托管规则集
# - OWASP Core Ruleset
# - Cloudflare Managed Ruleset
# - 限流规则
# - 机器人防护
```

#### 验证步骤

- [ ] 启用 WAF 并配置 OWASP 规则
- [ ] 已配置限流
- [ ] 机器人防护已启用
- [ ] 已启用 DDoS 防护
- [ ] 已配置安全 header
- [ ] 已启用 SSL/TLS 严格模式

### 7. 备份与灾难恢复

#### 自动化备份

```terraform
# PASS: 正确：自动化的 RDS 备份
resource "aws_db_instance" "main" {
  allocated_storage     = 20
  engine               = "postgres"

  backup_retention_period = 30  # 保留 30 天
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql"]

  deletion_protection = true  # 防止意外删除
}
```

#### 验证步骤

- [ ] 已配置每日自动备份
- [ ] 备份保留期满足合规要求
- [ ] 已启用时间点恢复
- [ ] 每季度进行备份测试
- [ ] 已将灾难恢复计划文档化
- [ ] 已定义并测试 RPO 与 RTO

## 部署前云安全检查清单

在任何生产云部署之前：

- [ ] **IAM**：不使用 root 账户，启用 MFA，最小权限策略
- [ ] **Secrets**：所有 secrets 置于云 secrets 管理器中并启用轮换
- [ ] **Network**：安全组受限，无公开数据库
- [ ] **Logging**：启用 CloudWatch/日志并设置保留
- [ ] **Monitoring**：针对异常配置告警
- [ ] **CI/CD**：OIDC 认证，secrets 扫描，依赖审计
- [ ] **CDN/WAF**：启用 Cloudflare WAF 并配置 OWASP 规则
- [ ] **Encryption**：数据静态加密与传输中加密
- [ ] **Backups**：自动化备份并经过恢复测试
- [ ] **Compliance**：满足 GDPR/HIPAA 要求（如适用）
- [ ] **Documentation**：基础设施已文档化，已创建 runbook
- [ ] **Incident Response**：已制定安全事件应急方案

## 常见云安全错误配置

### S3 Bucket 暴露

```bash
# FAIL: 错误：公开 bucket
aws s3api put-bucket-acl --bucket my-bucket --acl public-read

# PASS: 正确：私有 bucket 并限定特定访问
aws s3api put-bucket-acl --bucket my-bucket --acl private
aws s3api put-bucket-policy --bucket my-bucket --policy file://policy.json
```

### RDS 公开访问

```terraform
# FAIL: 错误
resource "aws_db_instance" "bad" {
  publicly_accessible = true  # 绝不要这样做！
}

# PASS: 正确
resource "aws_db_instance" "good" {
  publicly_accessible = false
  vpc_security_group_ids = [aws_security_group.db.id]
}
```

## 资源

- [AWS 安全最佳实践](https://aws.amazon.com/security/best-practices/)
- [CIS AWS Foundations Benchmark](https://www.cisecurity.org/benchmark/amazon_web_services)
- [Cloudflare 安全文档](https://developers.cloudflare.com/security/)
- [OWASP 云安全](https://owasp.org/www-project-cloud-security/)
- [Terraform 安全最佳实践](https://www.terraform.io/docs/cloud/guides/recommended-practices/)

**切记**：云错误配置是数据泄露的首要原因。单个暴露的 S3 bucket 或过于宽松的 IAM 策略就可能危及你的整个基础设施。务必始终遵循最小权限原则与纵深防御。
