---
name: regex-vs-llm-structured-text
description: 用于在解析结构化文本时在 regex 和 LLM 之间做出选择的决策框架 —— 从 regex 开始，仅对低置信度的边缘情况使用 LLM。
metadata:
  origin: ECC
---

# 结构化文本解析中的 Regex 与 LLM

一个用于解析结构化文本（测验、表单、发票、文档）的实用决策框架。核心洞察：regex 能以低廉的成本、确定性地处理 95-98% 的情况。将昂贵的 LLM 调用保留给剩余的边缘情况。

## 何时启用

- 解析具有重复模式的结构化文本（问题、表单、表格）
- 在 regex 和 LLM 之间抉择用于文本提取
- 构建结合两种方法的混合 pipeline
- 优化文本处理中的成本/准确率权衡

## 决策框架

```
Is the text format consistent and repeating?
├── Yes (>90% follows a pattern) → Start with Regex
│   ├── Regex handles 95%+ → Done, no LLM needed
│   └── Regex handles <95% → Add LLM for edge cases only
└── No (free-form, highly variable) → Use LLM directly
```

## 架构模式

```
Source Text
    │
    ▼
[Regex Parser] ─── Extracts structure (95-98% accuracy)
    │
    ▼
[Text Cleaner] ─── Removes noise (markers, page numbers, artifacts)
    │
    ▼
[Confidence Scorer] ─── Flags low-confidence extractions
    │
    ├── High confidence (≥0.95) → Direct output
    │
    └── Low confidence (<0.95) → [LLM Validator] → Output
```

## 实现

### 1. Regex Parser（处理大多数情况）

```python
import re
from dataclasses import dataclass

@dataclass(frozen=True)
class ParsedItem:
    id: str
    text: str
    choices: tuple[str, ...]
    answer: str
    confidence: float = 1.0

def parse_structured_text(content: str) -> list[ParsedItem]:
    """使用 regex 模式解析结构化文本。"""
    pattern = re.compile(
        r"(?P<id>\d+)\.\s*(?P<text>.+?)\n"
        r"(?P<choices>(?:[A-D]\..+?\n)+)"
        r"Answer:\s*(?P<answer>[A-D])",
        re.MULTILINE | re.DOTALL,
    )
    items = []
    for match in pattern.finditer(content):
        choices = tuple(
            c.strip() for c in re.findall(r"[A-D]\.\s*(.+)", match.group("choices"))
        )
        items.append(ParsedItem(
            id=match.group("id"),
            text=match.group("text").strip(),
            choices=choices,
            answer=match.group("answer"),
        ))
    return items
```

### 2. 置信度评分

标记可能需要 LLM 审查的条目：

```python
@dataclass(frozen=True)
class ConfidenceFlag:
    item_id: str
    score: float
    reasons: tuple[str, ...]

def score_confidence(item: ParsedItem) -> ConfidenceFlag:
    """评估提取置信度并标记问题。"""
    reasons = []
    score = 1.0

    if len(item.choices) < 3:
        reasons.append("few_choices")
        score -= 0.3

    if not item.answer:
        reasons.append("missing_answer")
        score -= 0.5

    if len(item.text) < 10:
        reasons.append("short_text")
        score -= 0.2

    return ConfidenceFlag(
        item_id=item.id,
        score=max(0.0, score),
        reasons=tuple(reasons),
    )

def identify_low_confidence(
    items: list[ParsedItem],
    threshold: float = 0.95,
) -> list[ConfidenceFlag]:
    """返回低于置信度阈值的条目。"""
    flags = [score_confidence(item) for item in items]
    return [f for f in flags if f.score < threshold]
```

### 3. LLM Validator（仅用于边缘情况）

```python
def validate_with_llm(
    item: ParsedItem,
    original_text: str,
    client,
) -> ParsedItem:
    """使用 LLM 修复低置信度的提取结果。"""
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",  # 用于验证的最便宜模型
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": (
                f"Extract the question, choices, and answer from this text.\n\n"
                f"Text: {original_text}\n\n"
                f"Current extraction: {item}\n\n"
                f"Return corrected JSON if needed, or 'CORRECT' if accurate."
            ),
        }],
    )
    # 解析 LLM 响应并返回修正后的条目...
    return corrected_item
```

### 4. 混合 Pipeline

```python
def process_document(
    content: str,
    *,
    llm_client=None,
    confidence_threshold: float = 0.95,
) -> list[ParsedItem]:
    """完整 pipeline：regex -> 置信度检查 -> 边缘情况使用 LLM。"""
    # 步骤 1：regex 提取（处理 95-98%）
    items = parse_structured_text(content)

    # 步骤 2：置信度评分
    low_confidence = identify_low_confidence(items, confidence_threshold)

    if not low_confidence or llm_client is None:
        return items

    # 步骤 3：LLM 验证（仅针对被标记的条目）
    low_conf_ids = {f.item_id for f in low_confidence}
    result = []
    for item in items:
        if item.id in low_conf_ids:
            result.append(validate_with_llm(item, content, llm_client))
        else:
            result.append(item)

    return result
```

## 实际指标

来自一个生产环境的测验解析 pipeline（410 个条目）：

| 指标 | 值 |
|--------|-------|
| Regex 成功率 | 98.0% |
| 低置信度条目 | 8 (2.0%) |
| 所需 LLM 调用 | ~5 |
| 相比全 LLM 方案节省的成本 | ~95% |
| 测试覆盖率 | 93% |

## 最佳实践

- **从 regex 开始** —— 即使不完美的 regex 也能给你一个可改进的基线
- **使用置信度评分** 以程序化方式识别哪些内容需要 LLM 协助
- **使用最便宜的 LLM** 进行验证（Haiku 级别的模型即足够）
- **绝不修改**已解析的条目 —— 从清理/验证步骤中返回新的实例
- **TDD 很适合**解析器 —— 先为已知模式编写测试，再处理边缘情况
- **记录指标**（regex 成功率、LLM 调用次数）以追踪 pipeline 的健康状况

## 需要避免的反模式

- 当 regex 能处理 95%+ 的情况时，把所有文本都发送给 LLM（昂贵且缓慢）
- 对自由格式、高度可变的文本使用 regex（这种情况下 LLM 更好）
- 跳过置信度评分，指望 regex "碰巧能用"
- 在清理/验证步骤中修改已解析的对象
- 不测试边缘情况（格式错误的输入、缺失字段、编码问题）

## 何时使用

- 测验/考试题目解析
- 表单数据提取
- 发票/收据处理
- 文档结构解析（标题、章节、表格）
- 任何具有重复模式且成本敏感的结构化文本
