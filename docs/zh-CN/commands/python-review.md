---
description: 全面的 Python 代码审查，涵盖 PEP 8 合规性、type hints、安全性和 Pythonic 惯用法。调用 python-reviewer agent。
---

# Python 代码审查

此命令调用 **python-reviewer** agent，进行全面的 Python 专项代码审查。

## 此命令的功能

1. **识别 Python 改动**：通过 `git diff` 查找修改过的 `.py` 文件
2. **运行静态分析**：执行 `ruff`、`mypy`、`pylint`、`black --check`
3. **安全扫描**：检查 SQL injection、command injection、不安全的反序列化
4. **类型安全审查**：分析 type hints 和 mypy 错误
5. **Pythonic 代码检查**：验证代码遵循 PEP 8 和 Python 最佳实践
6. **生成报告**：按 severity 对 issue 进行分类

## 何时使用

在以下情况使用 `/python-review`：
- 编写或修改 Python 代码之后
- 提交 Python 改动之前
- 审查包含 Python 代码的 pull request
- 接手新的 Python 代码库时
- 学习 Pythonic 模式和惯用法

## 审查类别

### CRITICAL（必须修复）
- SQL/Command injection 漏洞
- 不安全的 eval/exec 使用
- Pickle 不安全的反序列化
- hardcoded credentials
- YAML unsafe load
- 裸 except 子句掩盖错误

### HIGH（应该修复）
- public function 缺少 type hints
- mutable default argument
- 静默吞掉异常
- 未对资源使用 context manager
- 使用 C 风格循环而非 comprehension
- 使用 type() 而非 isinstance()
- 无锁的 race condition

### MEDIUM（可考虑）
- PEP 8 格式违规
- public function 缺少 docstring
- 使用 print 语句而非 logging
- 低效的字符串操作
- magic number 未使用具名常量
- 格式化时未使用 f-string
- 不必要的 list 创建

## 自动化检查

```bash
# 类型检查
mypy .

# Lint 与格式化
ruff check .
black --check .
isort --check-only .

# 安全扫描
bandit -r .

# 依赖审计
pip-audit
safety check

# 测试
pytest --cov=app --cov-report=term-missing
```

## 示例用法

```text
User: /python-review

Agent:
# Python 代码审查报告

## 已审查的文件
- app/routes/user.py（已修改）
- app/services/auth.py（已修改）

## 静态分析结果
✓ ruff: 无 issue
✓ mypy: 无错误
WARNING: black: 2 个文件需要重新格式化
✓ bandit: 无安全问题

## 发现的 issue

[CRITICAL] SQL Injection 漏洞
文件：app/routes/user.py:42
Issue：用户输入被直接插入 SQL 查询
```python
query = f"SELECT * FROM users WHERE id = {user_id}"  # 不好
```
修复：使用参数化查询
```python
query = "SELECT * FROM users WHERE id = %s"  # 好
cursor.execute(query, (user_id,))
```

[HIGH] mutable default argument
文件：app/services/auth.py:18
Issue：mutable default argument 会导致共享状态
```python
def process_items(items=[]):  # 不好
    items.append("new")
    return items
```
修复：使用 None 作为默认值
```python
def process_items(items=None):  # 好
    if items is None:
        items = []
    items.append("new")
    return items
```

[MEDIUM] 缺少 type hints
文件：app/services/auth.py:25
Issue：public function 没有 type annotation
```python
def get_user(user_id):  # 不好
    return db.find(user_id)
```
修复：添加 type hints
```python
def get_user(user_id: str) -> Optional[User]:  # 好
    return db.find(user_id)
```

[MEDIUM] 未使用 context manager
文件：app/routes/user.py:55
Issue：异常时文件未关闭
```python
f = open("config.json")  # 不好
data = f.read()
f.close()
```
修复：使用 context manager
```python
with open("config.json") as f:  # 好
    data = f.read()
```

## 总结
- CRITICAL: 1
- HIGH: 1
- MEDIUM: 2

建议：FAIL：在 CRITICAL issue 修复前阻止合并

## 需要格式化
运行：`black app/routes/user.py app/services/auth.py`
```

## 审批标准

| 状态 | 条件 |
|--------|-----------|
| PASS: Approve | 无 CRITICAL 或 HIGH issue |
| WARNING: Warning | 仅有 MEDIUM issue（谨慎合并） |
| FAIL: Block | 发现 CRITICAL 或 HIGH issue |

## 与其他命令的集成

- 首先使用 `tdd-workflow` skill 以确保测试通过
- 使用 `/code-review` 处理非 Python 专属的关注点
- 在提交前使用 `/python-review`
- 如果静态分析工具失败，使用 `/build-fix`

## 框架专项审查

### Django 项目
审查器会检查：
- N+1 query issue（使用 `select_related` 和 `prefetch_related`）
- 模型改动缺少 migration
- 本可使用 ORM 时却使用原始 SQL
- 多步操作缺少 `transaction.atomic()`

### FastAPI 项目
审查器会检查：
- CORS 配置错误
- 使用 Pydantic 模型进行请求校验
- 响应模型的正确性
- 正确使用 async/await
- dependency injection 模式

### Flask 项目
审查器会检查：
- Context 管理（app context、request context）
- 正确的错误处理
- Blueprint 组织
- 配置管理

## 相关

- Agent：`agents/python-reviewer.md`
- Skills：`skills/python-patterns/`、`skills/python-testing/`

## 常见修复

### 添加 type hints
```python
# 修改前
def calculate(x, y):
    return x + y

# 修改后
from typing import Union

def calculate(x: Union[int, float], y: Union[int, float]) -> Union[int, float]:
    return x + y
```

### 使用 context manager
```python
# 修改前
f = open("file.txt")
data = f.read()
f.close()

# 修改后
with open("file.txt") as f:
    data = f.read()
```

### 使用 list comprehension
```python
# 修改前
result = []
for item in items:
    if item.active:
        result.append(item.name)

# 修改后
result = [item.name for item in items if item.active]
```

### 修复 mutable default
```python
# 修改前
def append(value, items=[]):
    items.append(value)
    return items

# 修改后
def append(value, items=None):
    if items is None:
        items = []
    items.append(value)
    return items
```

### 使用 f-string（Python 3.6+）
```python
# 修改前
name = "Alice"
greeting = "Hello, " + name + "!"
greeting2 = "Hello, {}".format(name)

# 修改后
greeting = f"Hello, {name}!"
```

### 修复循环中的字符串拼接
```python
# 修改前
result = ""
for item in items:
    result += str(item)

# 修改后
result = "".join(str(item) for item in items)
```

## Python 版本兼容性

当代码使用较新 Python 版本的功能时，审查器会给出提示：

| 特性 | 最低 Python 版本 |
|---------|----------------|
| type hints | 3.5+ |
| f-string | 3.6+ |
| Walrus operator（`:=`） | 3.8+ |
| Position-only parameters | 3.8+ |
| Match 语句 | 3.10+ |
| Type union（&#96;x &#124; None&#96;） | 3.10+ |

请确保你的项目的 `pyproject.toml` 或 `setup.py` 指定了正确的最低 Python 版本。
