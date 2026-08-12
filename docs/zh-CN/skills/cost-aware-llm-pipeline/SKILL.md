---
name: cost-aware-llm-pipeline
description: 针对 LLM API 使用的成本优化模式——按任务复杂度进行 model routing、预算跟踪、retry 逻辑和 prompt caching。
metadata:
  origin: ECC
---

# 成本感知 LLM Pipeline

在维持质量的同时控制 LLM API 成本的模式。将 model routing、预算跟踪、retry 逻辑和 prompt caching 结合成一个可组合的 pipeline。

## 何时激活

- 构建调用 LLM API（Claude、GPT 等）的应用
- 处理由不同复杂度项目组成的 batch
- 需要将 API 花费控制在预算之内
- 在复杂任务上优化成本而不牺牲质量

## 核心概念

### 1. 按任务复杂度进行 Model Routing

自动为简单任务选择更便宜的 model，将昂贵的 model 留给复杂任务。

```python
MODEL_SONNET = "claude-sonnet-5"
MODEL_HAIKU = "claude-haiku-4-5-20251001"

_SONNET_TEXT_THRESHOLD = 10_000  # 字符数
_SONNET_ITEM_THRESHOLD = 30     # 项目数

def select_model(
    text_length: int,
    item_count: int,
    force_model: str | None = None,
) -> str:
    """Select model based on task complexity."""
    if force_model is not None:
        return force_model
    if text_length >= _SONNET_TEXT_THRESHOLD or item_count >= _SONNET_ITEM_THRESHOLD:
        return MODEL_SONNET  # 复杂任务
    return MODEL_HAIKU  # 简单任务（便宜 3-4 倍）
```

### 2. Immutable 成本跟踪

用 frozen dataclass 跟踪累计花费。每次 API 调用返回一个新的 tracker——绝不修改状态。

```python
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class CostRecord:
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float

@dataclass(frozen=True, slots=True)
class CostTracker:
    budget_limit: float = 1.00
    records: tuple[CostRecord, ...] = ()

    def add(self, record: CostRecord) -> "CostTracker":
        """Return new tracker with added record (never mutates self)."""
        return CostTracker(
            budget_limit=self.budget_limit,
            records=(*self.records, record),
        )

    @property
    def total_cost(self) -> float:
        return sum(r.cost_usd for r in self.records)

    @property
    def over_budget(self) -> bool:
        return self.total_cost > self.budget_limit
```

### 3. 受限的 Retry 逻辑

仅在 transient 错误时 retry。遇到 authentication 或 bad request 错误时 fail fast。

```python
from anthropic import (
    APIConnectionError,
    InternalServerError,
    RateLimitError,
)

_RETRYABLE_ERRORS = (APIConnectionError, RateLimitError, InternalServerError)
_MAX_RETRIES = 3

def call_with_retry(func, *, max_retries: int = _MAX_RETRIES):
    """Retry only on transient errors, fail fast on others."""
    for attempt in range(max_retries):
        try:
            return func()
        except _RETRYABLE_ERRORS:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)  # Exponential backoff
    # AuthenticationError、BadRequestError 等 → 立即抛出
```

### 4. Prompt Caching

缓存长 system prompt，避免每次请求都重新发送。

```python
messages = [
    {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},  # 缓存此项
            },
            {
                "type": "text",
                "text": user_input,  # 可变部分
            },
        ],
    }
]
```

## 组合

将这四种技术组合到一个 pipeline 函数中：

```python
def process(text: str, config: Config, tracker: CostTracker) -> tuple[Result, CostTracker]:
    # 1. 路由 model
    model = select_model(len(text), estimated_items, config.force_model)

    # 2. 检查预算
    if tracker.over_budget:
        raise BudgetExceededError(tracker.total_cost, tracker.budget_limit)

    # 3. 使用 retry + caching 调用
    response = call_with_retry(lambda: client.messages.create(
        model=model,
        messages=build_cached_messages(system_prompt, text),
    ))

    # 4. 跟踪成本（immutable）
    record = CostRecord(model=model, input_tokens=..., output_tokens=..., cost_usd=...)
    tracker = tracker.add(record)

    return parse_result(response), tracker
```

## 定价参考（2025-2026）

| Model | Input（$/1M tokens） | Output（$/1M tokens） | 相对成本 |
|-------|---------------------|----------------------|---------------|
| Haiku 4.5 | $0.80 | $4.00 | 1x |
| Sonnet 4.6 | $3.00 | $15.00 | ~4x |
| Opus 4.5 | $15.00 | $75.00 | ~19x |

## 最佳实践

- **从最便宜的 model 开始**，仅当达到复杂度 threshold 时才路由到昂贵的 model
- 在处理 batch 之前**设置明确的预算上限**——fail early 而非超支
- **记录 model 选择决策**，以便根据真实数据调优 threshold
- 对超过 1024 token 的 system prompt **使用 prompt caching**——既节省成本又降低延迟
- **绝不在 authentication 或 validation 错误时 retry**——仅对 transient 故障（网络、rate limit、服务器错误）进行 retry

## 要避免的 Anti-Pattern

- 无论复杂度如何，对所有请求都使用最昂贵的 model
- 对所有错误都 retry（在永久性故障上浪费预算）
- 修改成本跟踪状态（让 debug 和审计变得困难）
- 在整个 codebase 中硬编码 model 名（应使用常量或 config）
- 对重复的 system prompt 忽略 prompt caching

## 何时使用

- 任何调用 Claude、OpenAI 或类似 LLM API 的应用
- 成本会迅速累积的 batch 处理 pipeline
- 需要智能路由的多 model 架构
- 需要预算 guardrail 的生产系统
