---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python 模式

> 本文件在 [common/patterns.md](../common/patterns.md) 基础上扩展了 Python 特定内容。

## Protocol (Duck Typing)

```python
from typing import Protocol

class Repository(Protocol):
    def find_by_id(self, id: str) -> dict | None: ...
    def save(self, entity: dict) -> dict: ...
```

## Dataclasses as DTOs

```python
from dataclasses import dataclass

@dataclass
class CreateUserRequest:
    name: str
    email: str
    age: int | None = None
```

## Context Managers & Generators

- 使用 context manager（`with` 语句）进行资源管理
- 使用 generators 实现 lazy evaluation 和内存高效的迭代

## 参考

参见 skill：`python-patterns`，了解涵盖 decorators、并发和包组织的全面模式。
