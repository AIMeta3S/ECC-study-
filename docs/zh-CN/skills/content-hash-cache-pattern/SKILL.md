---
name: content-hash-cache-pattern
description: 使用 SHA-256 内容哈希缓存高成本的文件处理结果——与路径无关、内容变更时自动失效,并实现 service layer 分离。
metadata:
  origin: ECC
---

# 基于内容哈希的文件缓存模式

使用 SHA-256 内容哈希作为缓存键,缓存高成本的文件处理结果(PDF 解析、文本提取、图像分析)。与基于路径的缓存不同,这种方法在文件移动/重命名后仍然有效,并在内容变更时自动失效。

## 何时启用

- 构建文件处理 pipeline(PDF、图像、文本提取)
- 处理成本高,且相同文件会被反复处理
- 需要 `--cache/--no-cache` CLI 选项
- 希望在不修改现有 pure function 的前提下为其添加缓存

## 核心模式

### 1. 基于内容哈希的缓存键

使用文件内容(而非路径)作为缓存键:

```python
import hashlib
from pathlib import Path

_HASH_CHUNK_SIZE = 65536  # 64KB 块,适用于大文件

def compute_file_hash(path: Path) -> str:
    """文件内容的 SHA-256(对大文件分块处理)。"""
    if not path.is_file():
        raise FileNotFoundError(f"File not found: {path}")
    sha256 = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(_HASH_CHUNK_SIZE)
            if not chunk:
                break
            sha256.update(chunk)
    return sha256.hexdigest()
```

**为什么用内容哈希?** 文件重命名/移动 = cache hit。内容变更 = 自动失效。无需索引文件。

### 2. 用作 cache entry 的 frozen dataclass

```python
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class CacheEntry:
    file_hash: str
    source_path: str
    document: ExtractedDocument  # 缓存的结果
```

### 3. 基于文件的 cache storage

每个 cache entry 以 `{hash}.json` 的形式存储——可按哈希进行 O(1) 查找,无需索引文件。

```python
import json
from typing import Any

def write_cache(cache_dir: Path, entry: CacheEntry) -> None:
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / f"{entry.file_hash}.json"
    data = serialize_entry(entry)
    cache_file.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

def read_cache(cache_dir: Path, file_hash: str) -> CacheEntry | None:
    cache_file = cache_dir / f"{file_hash}.json"
    if not cache_file.is_file():
        return None
    try:
        raw = cache_file.read_text(encoding="utf-8")
        data = json.loads(raw)
        return deserialize_entry(data)
    except (json.JSONDecodeError, ValueError, KeyError):
        return None  # 将损坏视为 cache miss
```

### 4. service layer 包装器(SRP)

保持处理函数 pure。将缓存作为独立的 service layer 添加进来。

```python
def extract_with_cache(
    file_path: Path,
    *,
    cache_enabled: bool = True,
    cache_dir: Path = Path(".cache"),
) -> ExtractedDocument:
    """Service layer:缓存检查 -> 提取 -> 写入缓存。"""
    if not cache_enabled:
        return extract_text(file_path)  # Pure function,不感知缓存

    file_hash = compute_file_hash(file_path)

    # 检查缓存
    cached = read_cache(cache_dir, file_hash)
    if cached is not None:
        logger.info("Cache hit: %s (hash=%s)", file_path.name, file_hash[:12])
        return cached.document

    # Cache miss -> 提取 -> 存储
    logger.info("Cache miss: %s (hash=%s)", file_path.name, file_hash[:12])
    doc = extract_text(file_path)
    entry = CacheEntry(file_hash=file_hash, source_path=str(file_path), document=doc)
    write_cache(cache_dir, entry)
    return doc
```

## 关键设计决策

| 决策 | 理由 |
|----------|-----------|
| SHA-256 内容哈希 | 与路径无关,内容变更时自动失效 |
| `{hash}.json` 文件命名 | O(1) 查找,无需索引文件 |
| service layer 包装器 | SRP:提取逻辑保持 pure,缓存是独立的关注点 |
| 手动 JSON 序列化 | 完全掌控 frozen dataclass 的序列化 |
| 损坏时返回 `None` | 优雅降级,下次运行时重新处理 |
| `cache_dir.mkdir(parents=True)` | 首次写入时懒创建目录 |

## 最佳实践

- **对内容做哈希,而非对路径**——路径会变,内容标识不变
- 对大文件做哈希时**分块处理**——避免将整个文件加载进内存
- **保持处理函数 pure**——它们不应感知缓存的存在
- 记录 cache hit/miss 日志时**使用截断的哈希值**,便于调试
- **优雅处理损坏**——将无效的 cache entry 视为 miss,绝不崩溃

## 应避免的反模式

```python
# 反面示例:基于路径的缓存(文件移动/重命名时会失效)
cache = {"/path/to/file.pdf": result}

# 反面示例:在处理函数内部添加缓存逻辑(违反 SRP)
def extract_text(path, *, cache_enabled=False, cache_dir=None):
    if cache_enabled:  # 现在这个函数承担了两个职责
        ...

# 反面示例:对嵌套的 frozen dataclass 使用 dataclasses.asdict()
# (在复杂的嵌套类型上可能出问题)
data = dataclasses.asdict(entry)  # 请改用手动序列化
```

## 何时使用

- 文件处理 pipeline(PDF 解析、OCR、文本提取、图像分析)
- 受益于 `--cache/--no-cache` 选项的 CLI 工具
- 相同文件会在多次运行中重复出现的 batch 处理
- 在不修改现有 pure function 的前提下为其添加缓存

## 何时不使用

- 必须始终保持新鲜的数据(实时数据流)
- 体积极大的 cache entry(应考虑流式处理)
- 依赖于文件内容以外参数的结果(例如不同的提取配置)
