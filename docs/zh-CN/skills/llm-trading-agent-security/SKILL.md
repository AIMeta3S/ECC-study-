---
name: llm-trading-agent-security
description: 面向拥有 wallet 或 transaction 权限的自主交易 agent 的安全模式。涵盖 prompt injection、支出限额、发送前 simulation、circuit breaker、MEV 防护与 key 处理。
metadata:
  origin: ECC 直接移植改编
version: "1.0.0"
---

# LLM 交易 Agent 安全

自主交易 agent 比普通 LLM 应用面临更严苛的威胁模型：一次 injection 或错误的 tool path 会直接转化为资产损失。

## 适用场景

- 构建会签名并发送 transactions 的 AI agent
- 审计 trading bot 或链上执行助手
- 为 agent 设计 wallet key 管理方案
- 让 LLM 拥有下单、swaps 或 treasury 操作的权限

## 工作原理

采取分层防御。单一检查不够。将 prompt 卫生、支出策略、simulation、执行限制和 wallet 隔离视为相互独立的控制措施。

## 示例

### 将 prompt injection 视为金融攻击

```python
import re

INJECTION_PATTERNS = [
    r'ignore (previous|all) instructions',
    r'new (task|directive|instruction)',
    r'system prompt',
    r'send .{0,50} to 0x[0-9a-fA-F]{40}',
    r'transfer .{0,50} to',
    r'approve .{0,50} for',
]

def sanitize_onchain_data(text: str) -> str:
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            raise ValueError(f"Potential prompt injection: {text[:100]}")
    return text
```

不要盲目地将 token 名称、交易对标签、webhook 或社交信息流注入到具备执行能力的 prompt 中。

### 硬性支出限额

```python
from decimal import Decimal

MAX_SINGLE_TX_USD = Decimal("500")
MAX_DAILY_SPEND_USD = Decimal("2000")

class SpendLimitError(Exception):
    pass

class SpendLimitGuard:
    def check_and_record(self, usd_amount: Decimal) -> None:
        if usd_amount > MAX_SINGLE_TX_USD:
            raise SpendLimitError(f"Single tx ${usd_amount} exceeds max ${MAX_SINGLE_TX_USD}")

        daily = self._get_24h_spend()
        if daily + usd_amount > MAX_DAILY_SPEND_USD:
            raise SpendLimitError(f"Daily limit: ${daily} + ${usd_amount} > ${MAX_DAILY_SPEND_USD}")

        self._record_spend(usd_amount)
```

### 发送前先 simulate

```python
class SlippageError(Exception):
    pass

async def safe_execute(self, tx: dict, expected_min_out: int | None = None) -> str:
    sim_result = await self.w3.eth.call(tx)

    if expected_min_out is None:
        raise ValueError("min_amount_out is required before send")

    actual_out = decode_uint256(sim_result)
    if actual_out < expected_min_out:
        raise SlippageError(f"Simulation: {actual_out} < {expected_min_out}")

    signed = self.account.sign_transaction(tx)
    return await self.w3.eth.send_raw_transaction(signed.raw_transaction)
```

### Circuit breaker

```python
class TradingCircuitBreaker:
    MAX_CONSECUTIVE_LOSSES = 3
    MAX_HOURLY_LOSS_PCT = 0.05

    def check(self, portfolio_value: float) -> None:
        if self.consecutive_losses >= self.MAX_CONSECUTIVE_LOSSES:
            self.halt("Too many consecutive losses")

        if self.hour_start_value <= 0:
            self.halt("Invalid hour_start_value")
            return

        hourly_pnl = (portfolio_value - self.hour_start_value) / self.hour_start_value
        if hourly_pnl < -self.MAX_HOURLY_LOSS_PCT:
            self.halt(f"Hourly PnL {hourly_pnl:.1%} below threshold")
```

### Wallet 隔离

```python
import os
from eth_account import Account

private_key = os.environ.get("TRADING_WALLET_PRIVATE_KEY")
if not private_key:
    raise EnvironmentError("TRADING_WALLET_PRIVATE_KEY not set")

account = Account.from_key(private_key)
```

使用专用 hot wallet，只存放本次 session 所需资金。绝不要让 agent 直连主 treasury wallet。

### MEV 与 deadline 保护

```python
import time

PRIVATE_RPC = "https://rpc.flashbots.net"
MAX_SLIPPAGE_BPS = {"stable": 10, "volatile": 50}
deadline = int(time.time()) + 60
```

## 部署前检查清单

- 外部数据在进入 LLM context 前必须经过 sanitize
- 支出限额独立于模型输出强制执行
- transactions 在发送前先 simulate
- `min_amount_out` 为必填项
- Circuit breaker 在回撤或非法状态下触发停机
- key 来自 env 或 secret manager，绝不来自代码或日志
- 适当时使用 private mempool 或受保护的路由
- slippage 与 deadline 按策略分别设置
- 所有 agent 决策都记入 audit log，而不仅仅是成功的发送
