---
name: evm-token-decimals
description: 防止跨 EVM 链出现悄无声息的 decimals 不一致 bug。涵盖运行时 decimals 查询、按链感知的 cache、bridged-token 精度漂移，以及面向 bot、dashboard 与 DeFi 工具的安全归一化处理。
metadata:
  origin: ECC 直接移植改编
version: "1.0.0"
---

# EVM Token Decimals

悄无声息的 decimals 不一致是最容易导致余额或 USD 数值偏差若干个数量级却不抛出错误的隐患之一。

## 使用场景

- 使用 Python、TypeScript 或 Solidity 读取 ERC-20 余额
- 根据链上余额计算法币价值
- 跨多条 EVM 链比较 token 数量
- 处理 bridged 资产
- 构建投资组合追踪器、bot 或聚合器

## 工作原理

绝不要假设稳定币在所有地方都使用相同的 decimals。在运行时查询 `decimals()`，按 `(chain_id, token_address)` 进行 cache，并在数值计算中使用对 decimals 安全的数学运算。

## 示例

### 运行时查询 decimals

```python
from decimal import Decimal
from web3 import Web3

ERC20_ABI = [
    {"name": "decimals", "type": "function", "inputs": [],
     "outputs": [{"type": "uint8"}], "stateMutability": "view"},
    {"name": "balanceOf", "type": "function",
     "inputs": [{"name": "account", "type": "address"}],
     "outputs": [{"type": "uint256"}], "stateMutability": "view"},
]

def get_token_balance(w3: Web3, token_address: str, wallet: str) -> Decimal:
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(token_address),
        abi=ERC20_ABI,
    )
    decimals = contract.functions.decimals().call()
    raw = contract.functions.balanceOf(Web3.to_checksum_address(wallet)).call()
    return Decimal(raw) / Decimal(10 ** decimals)
```

不要硬编码 `1_000_000`，因为某个 symbol 通常会在其他地方使用 6 位 decimals。

### 按 chain 和 token 进行 cache

```python
from functools import lru_cache

@lru_cache(maxsize=512)
def get_decimals(chain_id: int, token_address: str) -> int:
    w3 = get_web3_for_chain(chain_id)
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(token_address),
        abi=ERC20_ABI,
    )
    return contract.functions.decimals().call()
```

### 防御性地处理异常 token

```python
try:
    decimals = contract.functions.decimals().call()
except Exception:
    logging.warning(
        "decimals() reverted on %s (chain %s), defaulting to 18",
        token_address,
        chain_id,
    )
    decimals = 18
```

记录 fallback 日志并保持可见。老旧或非标准的 token 依然存在。

### 在 Solidity 中归一化为 18-decimal 的 WAD

```solidity
interface IERC20Metadata {
    function decimals() external view returns (uint8);
}

function normalizeToWad(address token, uint256 amount) internal view returns (uint256) {
    uint8 d = IERC20Metadata(token).decimals();
    if (d == 18) return amount;
    if (d < 18) return amount * 10 ** (18 - d);
    return amount / 10 ** (d - 18);
}
```

### 搭配 ethers 的 TypeScript

```typescript
import { Contract, formatUnits } from 'ethers';

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
];

async function getBalance(provider: any, tokenAddress: string, wallet: string): Promise<string> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  const [decimals, raw] = await Promise.all([
    token.decimals(),
    token.balanceOf(wallet),
  ]);
  return formatUnits(raw, decimals);
}
```

### 链上快速检查

```bash
cast call <token_address> "decimals()(uint8)" --rpc-url <rpc>
```

## 规则

- 始终在运行时查询 `decimals()`
- 按 chain 加 token 地址进行 cache，而非按 symbol
- 使用 `Decimal`、`BigInt` 或等价的精确数学运算，而非浮点数
- 在 bridging 或 wrapper 变更后重新查询 decimals
- 在比较或定价之前，对内部记账进行一致的归一化
