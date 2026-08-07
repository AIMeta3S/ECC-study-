---
name: defi-amm-security
description: 面向 Solidity AMM 合约、liquidity pool 与 swap 流程的安全清单。涵盖 reentrancy、CEI 顺序、donation 或 inflation 攻击、oracle 操纵、slippage、admin 控制以及整数运算。
metadata:
  origin: ECC 直接移植适配
version: "1.0.0"
---

# DeFi AMM 安全

Solidity AMM 合约、LP vault 以及 swap 函数的关键漏洞模式与加固实现。

## 何时使用

- 编写或审计 Solidity AMM 或 liquidity pool 合约
- 实现 swap、deposit、withdraw、mint 或 burn 等持有 token 余额的流程
- 审查任何在 share 或 reserve 计算中使用 `token.balanceOf(address(this))` 的合约
- 为 DeFi 协议添加 fee 设置、暂停、oracle 更新等 admin 功能

## 工作原理

将其用作清单加模式库。对照下述类别审查每个用户 entrypoint，并优先采用加固示例而非自行手写的变体。

## 执行安全

本 skill 中的 shell 命令为本地审计示例。仅在可信的 checkout 或一次性 sandbox 中运行，且不要将不可信的合约名、路径、RPC URL、private key 或用户提供的 flag 拼接到 shell 命令中。在安装工具或运行可能消耗大量本地或付费资源的长时间 fuzzing / static-analysis 任务前先征得同意。

切勿在命令示例、log 或报告中包含 secrets、private key、seed phrase、API token 或 mainnet 签名凭证。

## 示例

### Reentrancy：强制 CEI 顺序

存在漏洞：

```solidity
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount);
    token.transfer(msg.sender, amount);
    balances[msg.sender] -= amount;
}
```

安全版本：

```solidity
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

using SafeERC20 for IERC20;

function withdraw(uint256 amount) external nonReentrant {
    require(balances[msg.sender] >= amount, "Insufficient");
    balances[msg.sender] -= amount;
    token.safeTransfer(msg.sender, amount);
}
```

当已存在加固库时，不要自行编写 guard。

### Donation 或 inflation 攻击

直接使用 `token.balanceOf(address(this))` 进行 share 计算，会让攻击者通过在预期路径之外向合约发送 token 来操纵分母。

```solidity
// 存在漏洞
function deposit(uint256 assets) external returns (uint256 shares) {
    shares = (assets * totalShares) / token.balanceOf(address(this));
}
```

```solidity
// 安全版本
uint256 private _totalAssets;

function deposit(uint256 assets) external nonReentrant returns (uint256 shares) {
    uint256 balBefore = token.balanceOf(address(this));
    token.safeTransferFrom(msg.sender, address(this), assets);
    uint256 received = token.balanceOf(address(this)) - balBefore;

    shares = totalShares == 0 ? received : (received * totalShares) / _totalAssets;
    _totalAssets += received;
    totalShares += shares;
}
```

维护内部账目并度量实际收到的 token。

### Oracle 操纵

现货价格易受 flash loan 操纵。优先使用 TWAP。

```solidity
uint32[] memory secondsAgos = new uint32[](2);
secondsAgos[0] = 1800;
secondsAgos[1] = 0;
(int56[] memory tickCumulatives,) = IUniswapV3Pool(pool).observe(secondsAgos);
int24 twapTick = int24(
    (tickCumulatives[1] - tickCumulatives[0]) / int56(uint56(30 minutes))
);
uint160 sqrtPriceX96 = TickMath.getSqrtRatioAtTick(twapTick);
```

### Slippage 保护

每条 swap 路径都需要调用方提供的 slippage 和 deadline。

```solidity
function swap(
    uint256 amountIn,
    uint256 amountOutMin,
    uint256 deadline
) external returns (uint256 amountOut) {
    require(block.timestamp <= deadline, "Expired");
    amountOut = _calculateOut(amountIn);
    require(amountOut >= amountOutMin, "Slippage exceeded");
    _executeSwap(amountIn, amountOut);
}
```

### 安全的 reserve 计算

```solidity
import {FullMath} from "@uniswap/v3-core/contracts/libraries/FullMath.sol";

uint256 result = FullMath.mulDiv(a, b, c);
```

对于大规模 reserve 计算，当存在 overflow 风险时应避免朴素的 `a * b / c` 写法。

### Admin 控制

```solidity
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

contract MyAMM is Ownable2Step {
    function setFee(uint256 fee) external onlyOwner { ... }
    function pause() external onlyOwner { ... }
}
```

所有权转移优先采用显式接受，并为每条特权路径设置访问控制门。

## 安全清单

- 暴露于 reentrancy 的 entrypoint 使用 `nonReentrant`
- 遵循 CEI 顺序
- share 计算不依赖原始的 `balanceOf(address(this))`
- ERC-20 转账使用 `SafeERC20`
- deposit 度量实际收到的 token
- oracle 读取使用 TWAP 或其他抗操纵来源
- swap 要求 `amountOutMin` 和 `deadline`
- 对 overflow 敏感的 reserve 计算使用 `mulDiv` 等安全原语
- admin 函数受访问控制
- 存在紧急暂停并经过测试
- 上线前运行 static analysis 和 fuzzing

## 审计工具

```bash
pip install slither-analyzer
slither . --exclude-dependencies

echidna-test . --contract YourAMM --config echidna.yaml

forge test --fuzz-runs 10000
```
