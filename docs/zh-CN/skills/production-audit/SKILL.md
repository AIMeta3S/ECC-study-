---
name: production-audit
description: 面向已发布应用的本地证据生产就绪审计，用于上线前评审、合并后检查以及「生产环境会出什么问题？」类排查，且无需将仓库数据发送至外部审计服务。
metadata:
  origin: community
---

# 生产就绪审计

当用户询问应用是否可以发布、生产环境可能出现什么问题、或上线前必须修复哪些问题时，使用此 skill。这是对已过期的社区 production-audit 想法的维护者安全重写版本：保留了有用的生产就绪视角，移除了未锁定的外部执行和第三方数据共享。

## 何时使用

- 用户询问"这可以上生产了吗"、"生产环境会出什么问题"、"我们遗漏了什么"、"审计这个仓库"或"准备好发布了吗？"
- 某个 feature 已合并，需要进行 deploy 前或合并后的风险检查。
- 即将进行公开发布、demo、客户推送或投资者演示。
- CI 已绿，但用户关注的是生产风险，而不仅是测试状态。
- 存在已部署的 URL、release branch、PR 或当前 checkout 可用于收集证据。

## 何时不使用

- 在正在实现代码的阶段，合适的视角是行级安全编码；优先使用 `security-review`。
- 对于纯库、模板、仅文档的仓库或脚手架，除非用户关注的是打包/release 就绪度而非应用就绪度。
- 当用户要求正式的合规审计时。此 skill 是工程分诊，而非法律、财务、医疗或监管认证。
- 当仅有的证据是一个产品想法，而没有仓库、部署、CI 或运行时入口时。

## 工作原理

基于本地证据和用户授权的证据构建审计。除非用户明确批准特定的工具和数据流，否则不要运行未锁定的远程代码、将仓库内容上传至第三方服务或调用外部扫描器。

按以下顺序执行：

1. 确定发布影响面。
2. 阅读近期变更和当前分支状态。
3. 检查仓库中实际存在的运行时、认证、数据、支付、后台任务、AI 和部署边界。
4. 检查 CI、测试、migration、环境文档和 rollback 路径。
5. 产出一份简短的发布/阻断建议，包含具体的修复项。

## 证据检查清单

先从低成本的本地信号开始：

```text
git status --short --branch
git log --oneline --decorate -20
git diff --stat origin/main...HEAD
```

然后检查项目特有的入口：

- package 脚本、CI workflow、release 脚本、Docker 文件和部署 manifest。
- API 路由、webhook、认证中间件、后台 worker、cron job 和数据库 migration。
- 环境变量文档和启动检查。
- observability hook、错误上报、日志、health check 和 dashboard。
- rollback、seed、migration 和 backfill 的说明。
- 针对最重要用户路径的 E2E 覆盖。

如果已部署的 URL 属于审计范围，仅对该 URL 使用浏览器或 HTTP 检查，并避免执行需要凭据的操作，除非用户提供了一个安全的测试账号。

## 风险视角

### 安全与认证

- 公开路由、API 路由和管理路由是否清晰分离？
- 认证和授权是否在服务端强制执行？
- secret 是否被排除在 client bundle、日志、示例输出和已签入文件之外？
- 在应用需要的环节，是否具备 rate limit、CSRF 防护、CORS 策略和上传校验？
- AI 或 agent 入口是否防御 prompt injection、tool 滥用以及不可信内容渗入特权操作？

### 数据完整性

- migration 能否顺畅地正向执行，并具备 rollback 或恢复方案？
- 破坏性 migration、backfill 和数据导入是否安全地分阶段进行？
- 数据库 policy、grant 和 service-role 边界是否与应用的 tenancy 模型匹配？
- 写入操作、job 和 webhook handler 的重试是否 idempotent？

### 支付与 Webhook

- 是否在解析可信 payload 字段之前验证了 webhook 签名？
- 每个支付、订阅或履约 webhook 是否 idempotent？
- 是否处理了重放、重复投递和乱序投递？
- test-mode 和 live-mode 凭据是否分离？

### 运维

- 应用能否使用文档记录的命令从干净的 checkout 启动？
- 必需的环境变量是否已命名、已校验，并 fail-fast？
- 是否有 health check 能证明依赖项可达？
- deploy、rollback 和 incident 负责人路径是否已文档化？
- 日志是否有用且不泄露 secret 或个人数据？

### 用户体验

- 上线关键路径是否在桌面端和移动端都已覆盖？
- 表单在移动端是否可用，不会出现输入框自动缩放、布局重叠或提交被卡住的状态？
- 加载中、空、错误和权限拒绝状态是否向用户说明了发生了什么？
- 当关键操作失败时，是否存在支持或恢复路径？

## 评分

使用分数来强制排定优先级，而非暗示数学上的确定性。

| 等级 | 分数 | 含义 |
| --- | --- | --- |
| 阻断 | 0-49 | 在修复首要风险之前不要发布 |
| 有风险 | 50-69 | 仅在小范围 rollout 或内部 beta 之后发布 |
| 可上线（有保留） | 70-84 | 若负责人接受所列风险则可发布 |
| 强健 | 85-100 | 从现有证据看无明显的上线阻断项 |

如果以下任一情况成立，将分数上限锁定为 `69`：

- 敏感数据缺少认证或授权。
- 支付或履约 webhook 不 idempotent。
- 必需的 migration 无法安全执行。
- secret 暴露在 client bundle、日志或已提交文件中。
- 高影响的 release 缺少 rollback 路径。

如果 CI 未变绿，或上线关键路径未经过端到端测试，将分数上限锁定为 `84`。

## 输出格式

以一句话开头：

```text
生产就绪审计：76/100，可上线（有保留），webhook idempotency 和 rollback 文档是公开发布前需修复的两项风险。
```

然后列出：

- `Blockers`：deploy 前必须修复的项。
- `High-value fixes`：用户希望提高分数时的下一步修复项。
- `Evidence checked`：检查过的文件、命令、CI、已部署 URL 或 PR。
- `Evidence missing`：若提供会改变置信度的内容。
- `Next action`：一个具体的修复或验证步骤。

对优势的描述要简短。用户询问的是就绪度，因此有用的回答是剩余风险和下一步行动。

## 示例

用户：

```text
这准备好发布了吗？
```

回复：

```text
生产就绪审计：68/100，有风险，因为 Stripe webhook 已验证签名但非 idempotent，且待处理的 migration 没有 rollback 说明。

Blockers:
- 在履行订单前为 `checkout.session.completed` 增加 idempotency。
- 编写并测试 `20260511_add_billing_state.sql` 的 rollback 路径。

High-value fixes:
- 增加 health check，校验数据库和支付提供商的可达性。
- 针对 upgrade、webhook 履约和账单页刷新新增一条 E2E 路径。

Evidence checked:
- `api/stripe/webhook.ts`
- `db/migrations/20260511_add_billing_state.sql`
- release branch 的 GitHub Actions 运行记录

Next action: 要我先修复 webhook idempotency 吗？
```

## 反模式

- 将 `npx <package>@latest` 或远程扫描器作为默认审计路径。
- 未经明确批准，将源代码、secret、客户数据或私有拓扑上传至外部审计服务。
- 给出分数却未列明所检查的证据。
- 将 CI 变绿等同于生产就绪。
- 以泛泛的"告诉我你想怎么做"收尾。

## 另请参阅

- Skill：`security-review`
- Skill：`deployment-patterns`
- Skill：`e2e-testing`
- Skill：`tdd-workflow`
- Skill：`verification-loop`
