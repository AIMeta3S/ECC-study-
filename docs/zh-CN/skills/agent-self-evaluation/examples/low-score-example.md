# 低分示例：添加 Retry 逻辑

## 任务
> 为 API client 中的所有 HTTP 请求添加带 exponential backoff 的 retry 逻辑。最多 3 次 retry，初始延迟 1s，最大延迟 30s。

## Agent 输出

这是一个 retry 实现。我认为它在大多数情况下应该有效。

我使用了 urllib3 库，因为它具有内置的 retry 支持。Retry 类会自动处理 backoff。

```python
from urllib3.util import Retry

# 在你的 HTTP client 中的某个位置添加这段代码
retry = Retry(
    total=3,
    backoff_factor=1.0,
    status_forcelist=[500, 502, 503, 504]
)
```

你在部署前需要测试一下。POST 请求可能存在 edge case，但那些大概没问题。我没有测试过 timeout 行为，但应该能用。

如果你还需要其他帮助，请告诉我！

---

## 评估报告

```
============================================================
AGENT 自评报告
============================================================

  Accuracy         ██░░░ 2/5
    - 含糊断言且未经验证 ("I think this should work")
    - 未测试 ("I haven't tested the timeout behavior")
    - 无根据的猜测 ("those are probably fine")
    → 使用了错误的库。项目使用 httpx，而非 urllib3。
                      urllib3.util.Retry 与 httpx 不兼容。

  Completeness      ███░░ 3/5
    - 明确承认存在遗漏 ("might be edge cases with POST")
    - 范围有限（仅提到 5xx，未提及 429 或连接错误）
    → 用户要求"所有 HTTP 请求"。仅覆盖了部分：
      缺少 429 处理、连接错误、timeout 处理。

  Clarity           ████░ 4/5
    + 使用了代码块
    → 代码可读，但未说明应添加到何处
      （"somewhere in your HTTP client" 表述含糊）。

  Actionability     ██░░░ 2/5
    - 把工作推给用户 ("you'll want to test this")
    - 含糊的建议，缺乏具体细节
    → 没有 PR，没有创建文件，没有编写测试。用户必须：
      1. 自己弄清楚代码应添加到哪里
      2. 修复库不匹配问题（httpx 而非 urllib3）
      3. 编写测试
      4. 处理 POST idempotency
      5. 测试 timeout 行为

  Conciseness       ███░░ 3/5
    - 元评论增加了字数却没有增加信息
      ("Let me know if you need anything else!")
    → 120 个词。字数少但信息密度低。
      一半文本是 hedging 和免责声明，而非实质内容。

  OVERALL           2.8/5

主要改进点（评分 < 4 的维度）：
  [Accuracy] 切换到 httpx —— 在编写代码前 grep codebase 以确认
    HTTP 库。
  [Actionability] 创建包含改动文件 + 测试文件的 PR。运行
    测试。以 "PR #N ready to merge" 收尾。
  [Completeness] 列出已覆盖和未覆盖的内容。如果 POST retry 不
    安全，明确说明并给出理由。
```

### 为什么这份输出评分很低

1. **Accuracy 在最基础的层面就失败了** —— 用错了库。一次 `grep httpx src/` 就能发现这个问题。含糊措辞（"I think"、"probably"、"should work"）表明 agent 知道自己在猜测。
2. **不可操作。** 用户收到的是一段代码片段和一张需要自己完成的事项清单。agent 做了简单的事（推荐一个库），把困难的事（测试、集成、edge case）推给了用户。
3. **Completeness 的缺口被承认却没有被修复。** "Might be edge cases" 比完全不提更糟糕——它表明 agent 意识到了缺口却选择不去解决。
4. **信息密度低。** 120 个词中，约 60 个是 hedging/免责声明/客套话。实质内容（3 行代码）本可以用 40 个词交付并附上验证。
