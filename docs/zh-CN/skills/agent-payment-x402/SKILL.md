---
name: agent-payment-x402
description: 为 AI agents 添加 x402 支付执行能力，配备 per-task 预算、支出控制和 non-custodial wallets。通过 agentwallet-sdk 支持 Base，通过 OKX Payments / OKX Agent Payments Protocol 支持 X Layer。
metadata:
  origin: community
---

# Agent 支付执行（x402）

使 AI agents 能够进行受策略控制的支付，内置支出控制。使用 x402 HTTP 支付协议和 MCP 工具，使 agents 能够为外部服务、API 或其他 agents 付款，而无需承担托管风险。

## 何时使用

在以下场景使用：你的 agent 需要为 API 调用付费、购买服务、与另一个 agent 结算、强制执行 per-task 支出限制，或管理 non-custodial wallet。与 cost-aware-llm-pipeline 和 security-review skills 天然搭配。

## 决策树

根据你的 agent 是购买付费 API 的访问权，还是向他人收费提供 API，选择集成路径：

| 需求 | 推荐路径 |
|------|----------|
| Agent 在 Base 或其他 agentwallet 支持的链上支付 402-gated API | 使用 `agentwallet-sdk` 作为 MCP 支付服务器，配合严格的 spending policy |
| Agent 在 X Layer 上支付 402-gated API | 使用来自 `okx/onchainos-skills` 的 OKX Agent Payments Protocol；`okx-x402-payment` 是已弃用的旧别名 |
| TypeScript API 向 agents 收费 | 使用 OKX Payments TypeScript seller SDK 文档，适用于 Express、Hono、Fastify 或 Next.js |
| Go API 向 agents 收费 | 使用 OKX Payments Go seller SDK 文档，适用于 Gin、Echo 或 `net/http` |
| Rust API 向 agents 收费 | 使用 OKX Payments Rust seller SDK 文档，适用于 Axum |
| Java API 向 agents 收费 | 使用 OKX Payments Java seller SDK 文档，适用于 Spring Boot 2/3、Java EE 或 Jakarta |
| Python API 向 agents 收费 | 在实现前查看当前的 OKX Payments 仓库；可能没有 Python seller 指南 |

## 支持的网络

- `agentwallet-sdk`：在生产环境前查阅 package 文档以确认当前的网络覆盖范围。Base Sepolia 是最安全的开发默认选择；Base mainnet 是原始 skill 指定的生产路径。
- OKX Payments / X Layer：当前的 seller 文档面向 X Layer（`eip155:196`）和 USDT0 结算。在生成生产代码前获取当前的 SDK 文档，因为支付 package 和 facilitator 行为可能快速变化。

## 工作原理

### x402 协议
x402 将 HTTP 402（Payment Required）扩展为机器可协商的流程。当服务器返回 `402` 时，agent 的支付工具会协商价格、检查预算、签名交易，并仅在 orchestrator 设定的策略和确认边界内重试。

### 支出控制
每次支付工具调用都强制执行 `SpendingPolicy`：
- **Per-task budget** — 单次 agent 操作的最高支出
- **Per-session budget** — 整个 session 内的累计限额
- **Allowlisted recipients** — 限制 agent 可以向哪些地址/服务付款
- **Rate limits** — 每分钟/每小时的最大交易数

### Non-Custodial Wallets
Agents 通过 ERC-4337 智能账户持有自己的密钥。orchestrator 在委派前设定策略；agent 只能在边界内支出。无资金汇集，无托管风险。

## MCP 集成

支付层暴露标准 MCP 工具，可插入任何 Claude Code 或 agent harness 设置。

> **安全提示**：始终固定 package 版本。此工具管理私钥——未固定版本的 `npx` 安装会引入供应链风险。

### Option A: agentwallet-sdk（Base / 多链）

```json
{
  "mcpServers": {
    "agentpay": {
      "command": "npx",
      "args": ["agentwallet-sdk@6.0.0"]
    }
  }
}
```

### 可用工具（agent 可调用）

| 工具 | 用途 |
|------|------|
| `get_balance` | 检查 agent 钱包余额 |
| `send_payment` | 向地址或 ENS 发送付款 |
| `check_spending` | 查询剩余预算 |
| `list_transactions` | 所有支付的审计跟踪 |

> **注意**：Spending policy 由 **orchestrator** 在委派给 agent 之前设定——而非由 agent 自身设定。这防止 agents 自行提高支出限额。通过你的 orchestration 层或 pre-task hook 中的 `set_policy` 配置策略，绝不要将其作为 agent 可调用的工具。

### Option B: OKX Agent Payments Protocol（X Layer）

对于 X Layer x402、Multi-Party Payment (MPP)、session 支付、charge 和 A2A charge 流程，使用此路径。

对于买方侧的 agent 流程：

1. 安装或引用当前的 `okx/onchainos-skills` 仓库。
2. 使用 `skills/okx-agent-payments-protocol/SKILL.md` 作为 dispatcher。
3. 将 `skills/okx-x402-payment/SKILL.md` 视为已弃用的兼容别名，而非规范 skill。
4. 在钱包状态检查或支付操作前要求明确的用户确认。不要将支付执行隐藏在通用 tool call 之后。

对于卖方侧 API 流程，在生成代码前获取最新的特定语言指南：

| 运行时 | 当前指南 |
|--------|----------|
| TypeScript | `https://raw.githubusercontent.com/okx/payments/main/typescript/SELLER.md` |
| Go | `https://raw.githubusercontent.com/okx/payments/main/go/x402/SELLER.md` |
| Rust | `https://raw.githubusercontent.com/okx/payments/main/rust/x402/SELLER.md` |
| Java | `https://raw.githubusercontent.com/okx/payments/main/java/SELLER.md` |

不要在未查看当前 OKX 仓库的情况下从旧文档复制示例。当前的 OKX 指南使用 `okx-agent-payments-protocol` 作为 dispatcher，且 Java seller 文档现已可用。

## 示例

### 在 MCP client 中强制执行预算

在构建调用 agentpay MCP 服务器的 orchestrator 时，在分派付费 tool calls 之前强制执行预算。

> **前提条件**：在添加 MCP 配置前先安装 package——在非交互式环境中，不带 `-y` 的 `npx` 会提示确认，导致服务器挂起：`npm install -g agentwallet-sdk@6.0.0`

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  // 1. 在构造 transport 之前验证凭据。
  //    缺少密钥必须立即失败——绝不让 subprocess 在无认证的情况下启动。
  const walletKey = process.env.WALLET_PRIVATE_KEY;
  if (!walletKey) {
    throw new Error("WALLET_PRIVATE_KEY is not set — refusing to start payment server");
  }

  // 通过 stdio transport 连接到 agentpay MCP 服务器。
  // 仅白名单列出服务器需要的环境变量——绝不要将整个 process.env
  // 转发给管理私钥的第三方 subprocess。
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["agentwallet-sdk@6.0.0"],
    env: {
      PATH: process.env.PATH ?? "",
      NODE_ENV: process.env.NODE_ENV ?? "production",
      WALLET_PRIVATE_KEY: walletKey,
    },
  });
  const agentpay = new Client({ name: "orchestrator", version: "1.0.0" });
  await agentpay.connect(transport);

  // 2. 在委派给 agent 之前设定 spending policy。
  //    始终验证成功——静默失败意味着没有控制处于活动状态。
  const policyResult = await agentpay.callTool({
    name: "set_policy",
    arguments: {
      per_task_budget: 0.50,
      per_session_budget: 5.00,
      allowlisted_recipients: ["api.example.com"],
    },
  });
  if (policyResult.isError) {
    throw new Error(
      `Failed to set spending policy — do not delegate: ${JSON.stringify(policyResult.content)}`
    );
  }

  // 3. 在任何付费操作之前使用 preToolCheck
  await preToolCheck(agentpay, 0.01);
}

// Pre-tool hook：fail-closed 预算强制执行，包含四条不同的错误路径。
async function preToolCheck(agentpay: Client, apiCost: number): Promise<void> {
  // 路径 1：拒绝无效输入（NaN/Infinity 会绕过 < 比较）
  if (!Number.isFinite(apiCost) || apiCost < 0) {
    throw new Error(`Invalid apiCost: ${apiCost} — action blocked`);
  }

  // 路径 2：Transport/连接故障
  let result;
  try {
    result = await agentpay.callTool({ name: "check_spending" });
  } catch (err) {
    throw new Error(`Payment service unreachable — action blocked: ${err}`);
  }

  // 路径 3：工具返回错误（例如，认证失败、钱包未初始化）
  if (result.isError) {
    throw new Error(
      `check_spending failed — action blocked: ${JSON.stringify(result.content)}`
    );
  }

  // 路径 4：解析并验证响应结构
  let remaining: number;
  try {
    const parsed = JSON.parse(
      (result.content as Array<{ text: string }>)[0].text
    );
    if (!Number.isFinite(parsed?.remaining)) {
      throw new TypeError("missing or non-finite 'remaining' field");
    }
    remaining = parsed.remaining;
  } catch (err) {
    throw new Error(
      `check_spending returned unexpected format — action blocked: ${err}`
    );
  }

  // 路径 5：预算超支
  if (remaining < apiCost) {
    throw new Error(
      `Budget exceeded: need $${apiCost} but only $${remaining} remaining`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

## 最佳实践

- **在委派前设定预算**：在生成 sub-agents 时，通过你的 orchestration 层附加 SpendingPolicy。绝不要给 agent 无限的支出权限。
- **固定你的依赖**：始终在 MCP 配置中指定确切版本（例如 `agentwallet-sdk@6.0.0`）。在部署到生产环境前验证 package 完整性。
- **审计跟踪**：在 post-task hooks 中使用 `list_transactions` 记录支出了什么以及为什么。
- **Fail closed**：如果支付工具不可达，阻止付费操作——不要回退到未计量的访问。
- **与 security-review 搭配**：支付工具是高权限的。应用与 shell 访问相同的审查。
- **先用 testnets 测试**：开发时使用 Base Sepolia；生产环境切换到 Base mainnet。

## 生产参考

- **npm**: [`agentwallet-sdk`](https://www.npmjs.com/package/agentwallet-sdk)
- **已合并到 NVIDIA NeMo Agent Toolkit**: [PR #17](https://github.com/NVIDIA/NeMo-Agent-Toolkit-Examples/pull/17) — 用于 NVIDIA agent 示例的 x402 支付工具
- **协议规范**: [x402.org](https://x402.org)
- **OKX Payments SDKs**: [`okx/payments`](https://github.com/okx/payments) — 用于 X Layer x402 的 TypeScript、Go、Rust 和 Java seller 集成
- **OKX Agent Payments Protocol skill**: [`okx/onchainos-skills`](https://github.com/okx/onchainos-skills/tree/main/skills/okx-agent-payments-protocol)
- **OKX Payments 概览**: [web3.okx.com/onchainos/dev-docs/payments/overview](https://web3.okx.com/onchainos/dev-docs/payments/overview)
