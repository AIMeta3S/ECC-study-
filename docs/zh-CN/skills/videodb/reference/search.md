# 搜索与索引指南

搜索功能允许你通过自然语言查询、精确关键词或视觉场景描述，在视频中查找特定时刻。

## 前置条件

视频在被搜索之前**必须先建立索引**。索引是每个视频针对每种索引类型的一次性操作。

## 索引

### 语音内容索引

对视频转录后的语音内容建立索引，以便进行语义搜索和关键词搜索：

```python
video = coll.get_video(video_id)

# force=True 让索引操作幂等 —— 如果已建立索引则跳过
video.index_spoken_words(force=True)
```

这会转录音轨并基于语音内容构建可搜索的索引。语义搜索和关键词搜索需要此索引。

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|-----------|------|---------|-------------|
| `language_code` | `str\|None` | `None` | 视频的语言代码 |
| `segmentation_type` | `SegmentationType` | `SegmentationType.sentence` | 分段类型（`sentence` 或 `llm`） |
| `force` | `bool` | `False` | 设为 `True` 时若已索引则跳过（避免 "already exists" 错误） |
| `callback_url` | `str\|None` | `None` | 用于异步通知的 webhook URL |

### 场景索引

通过生成场景的 AI 描述来对视觉内容建立索引。与语音索引一样，如果场景索引已存在，也会抛出错误。从错误信息中提取已有的 `scene_index_id`。

```python
import re
from videodb import SceneExtractionType

try:
    scene_index_id = video.index_scenes(
        extraction_type=SceneExtractionType.shot_based,
        prompt="Describe the visual content, objects, actions, and setting in this scene.",
    )
except Exception as e:
    match = re.search(r"id\s+([a-f0-9]+)", str(e))
    if match:
        scene_index_id = match.group(1)
    else:
        raise
```

**抽取类型：**

| 类型 | 说明 | 适用场景 |
|------|-------------|----------|
| `SceneExtractionType.shot_based` | 按视觉镜头边界切分 | 通用场景、动作类内容 |
| `SceneExtractionType.time_based` | 按固定时间间隔切分 | 均匀采样、长时间静态内容 |
| `SceneExtractionType.transcript` | 按转录文本段切分 | 以语音驱动的场景边界 |

**`time_based` 的参数：**

```python
video.index_scenes(
    extraction_type=SceneExtractionType.time_based,
    extraction_config={"time": 5, "select_frames": ["first", "last"]},
    prompt="Describe what is happening in this scene.",
)
```

## 搜索类型

### 语义搜索

用自然语言查询匹配语音内容：

```python
from videodb import SearchType

results = video.search(
    query="explaining the benefits of machine learning",
    search_type=SearchType.semantic,
)
```

返回按语音内容与查询语义匹配度排序的片段。

### 关键词搜索

在转录语音中进行精确词条匹配：

```python
results = video.search(
    query="artificial intelligence",
    search_type=SearchType.keyword,
)
```

返回包含精确关键词或短语的片段。

### 场景搜索

将视觉内容查询与已索引的场景描述进行匹配。需要先调用 `index_scenes()`。

`index_scenes()` 返回一个 `scene_index_id`。将其传给 `video.search()` 以指向特定的场景索引（当视频有多个场景索引时尤其重要）：

```python
from videodb import SearchType, IndexType
from videodb.exceptions import InvalidRequestError

# 使用语义搜索查询场景索引。
# 使用 score_threshold 过滤低相关性的噪声（推荐：0.3 以上）。
try:
    results = video.search(
        query="person writing on a whiteboard",
        search_type=SearchType.semantic,
        index_type=IndexType.scene,
        scene_index_id=scene_index_id,
        score_threshold=0.3,
    )
    shots = results.get_shots()
except InvalidRequestError as e:
    if "No results found" in str(e):
        shots = []
    else:
        raise
```

**重要说明：**

- 将 `SearchType.semantic` 与 `index_type=IndexType.scene` 搭配使用 —— 这是最可靠的组合，在所有套餐上均可用。
- `SearchType.scene` 虽然存在，但可能并非所有套餐都支持（例如 Free tier）。优先使用 `SearchType.semantic` 配合 `IndexType.scene`。
- `scene_index_id` 参数是可选的。如果省略，搜索会针对视频上所有的场景索引执行。传入该参数可指向特定的索引。
- 你可以为每个视频创建多个场景索引（使用不同的 prompt 或抽取类型），并通过 `scene_index_id` 独立搜索它们。

### 带元数据过滤的场景搜索

在对带自定义元数据的场景建立索引时，可以将语义搜索与元数据过滤器结合使用：

```python
from videodb import SearchType, IndexType

results = video.search(
    query="a skillful chasing scene",
    search_type=SearchType.semantic,
    index_type=IndexType.scene,
    scene_index_id=scene_index_id,
    filter=[{"camera_view": "road_ahead"}, {"action_type": "chasing"}],
)
```

关于自定义元数据索引和过滤搜索的完整示例，请参见 [scene_level_metadata_indexing cookbook](https://github.com/video-db/videodb-cookbook/blob/main/quickstart/scene_level_metadata_indexing.ipynb)。

## 处理结果

### 获取镜头

访问单个结果片段：

```python
results = video.search("your query")

for shot in results.get_shots():
    print(f"Video: {shot.video_id}")
    print(f"Start: {shot.start:.2f}s")
    print(f"End: {shot.end:.2f}s")
    print(f"Text: {shot.text}")
    print("---")
```

### 播放拼接后的结果

将所有匹配的片段作为单个拼接视频进行流式播放：

```python
results = video.search("your query")
stream_url = results.compile()
results.play()  # 在浏览器中打开拼接后的流
```

### 提取剪辑片段

下载或流式播放特定的结果片段：

```python
for shot in results.get_shots():
    stream_url = shot.generate_stream()
    print(f"Clip: {stream_url}")
```

## 跨集合搜索

在一个集合的所有视频中进行搜索：

```python
coll = conn.get_collection()

# 在集合中的所有视频中进行搜索
results = coll.search(
    query="product demo",
    search_type=SearchType.semantic,
)

for shot in results.get_shots():
    print(f"Video: {shot.video_id} [{shot.start:.1f}s - {shot.end:.1f}s]")
```

> **注意：** 集合级搜索只支持 `SearchType.semantic`。在 `coll.search()` 中使用 `SearchType.keyword` 或 `SearchType.scene` 会抛出 `NotImplementedError`。如需关键词搜索或场景搜索，请改用针对单个视频的 `video.search()`。

## 搜索 + 拼接

建立索引、搜索，并将匹配的片段拼接成一个可播放的流：

```python
video.index_spoken_words(force=True)
results = video.search(query="your query", search_type=SearchType.semantic)
stream_url = results.compile()
print(stream_url)
```

## 提示

- **索引一次，多次搜索**：索引是开销较大的操作。一旦建立索引，搜索就很快。
- **组合多种索引类型**：同时索引语音和场景，即可在同一视频上启用所有搜索类型。
- **优化查询**：语义搜索使用描述性的自然语言短语效果最佳，而非单个关键词。
- **精确匹配时使用关键词搜索**：当需要精确词条匹配时，关键词搜索可避免语义漂移。
- **处理 "No results found"**：当没有匹配结果时，`video.search()` 会抛出 `InvalidRequestError`。始终将搜索调用放在 try/except 中，并将 `"No results found"` 视为空结果集。
- **过滤场景搜索噪声**：对于模糊查询，语义场景搜索可能返回低相关性的结果。使用 `score_threshold=0.3`（或更高）来过滤噪声。
- **幂等索引**：使用 `index_spoken_words(force=True)` 可安全地重新索引。`index_scenes()` 没有 `force` 参数 —— 用 try/except 包裹，并通过 `re.search(r"id\s+([a-f0-9]+)", str(e))` 从错误信息中提取已有的 `scene_index_id`。
