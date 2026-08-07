---
name: pytorch-patterns
description: PyTorch 深度学习模式与最佳实践，用于构建健壮、高效且可复现的训练 pipeline、模型架构和数据加载。
metadata:
  origin: ECC
---

# PyTorch 开发模式

地道的 PyTorch 模式与最佳实践，用于构建健壮、高效且可复现的深度学习应用。

## 何时启用

- 编写新的 PyTorch 模型或训练脚本
- 审查深度学习代码
- 调试训练循环或数据 pipeline
- 优化 GPU 显存使用或训练速度
- 设置可复现的实验

## 核心原则

### 1. 设备无关的代码

始终编写在 CPU 和 GPU 上都能工作的代码，不要硬编码设备。

```python
# 好：设备无关
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = MyModel().to(device)
data = data.to(device)

# 差：硬编码设备
model = MyModel().cuda()  # 没有 GPU 时会崩溃
data = data.cuda()
```

### 2. 可复现性优先

设置所有随机种子以获得可复现的结果。

```python
# 好：完整的可复现性设置
def set_seed(seed: int = 42) -> None:
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    np.random.seed(seed)
    random.seed(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

# 差：没有种子控制
model = MyModel()  # 每次运行权重都不同
```

### 3. 显式 shape 管理

始终记录并校验 tensor 的 shape。

```python
# 好：带 shape 标注的 forward pass
def forward(self, x: torch.Tensor) -> torch.Tensor:
    # x: (batch_size, channels, height, width)
    x = self.conv1(x)    # -> (batch_size, 32, H, W)
    x = self.pool(x)     # -> (batch_size, 32, H//2, W//2)
    x = x.view(x.size(0), -1)  # -> (batch_size, 32*H//2*W//2)
    return self.fc(x)    # -> (batch_size, num_classes)

# 差：没有 shape 跟踪
def forward(self, x):
    x = self.conv1(x)
    x = self.pool(x)
    x = x.view(x.size(0), -1)  # 这是什么尺寸？
    return self.fc(x)           # 这样能行吗？
```

## 模型架构模式

### 整洁的 nn.Module 结构

```python
# 好：组织良好的 module
class ImageClassifier(nn.Module):
    def __init__(self, num_classes: int, dropout: float = 0.5) -> None:
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
        )
        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(64 * 16 * 16, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = x.view(x.size(0), -1)
        return self.classifier(x)

# 差：所有逻辑都堆在 forward 中
class ImageClassifier(nn.Module):
    def __init__(self):
        super().__init__()

    def forward(self, x):
        x = F.conv2d(x, weight=self.make_weight())  # 每次调用都创建权重！
        return x
```

### 正确的权重初始化

```python
# 好：显式初始化
def _init_weights(self, module: nn.Module) -> None:
    if isinstance(module, nn.Linear):
        nn.init.kaiming_normal_(module.weight, mode="fan_out", nonlinearity="relu")
        if module.bias is not None:
            nn.init.zeros_(module.bias)
    elif isinstance(module, nn.Conv2d):
        nn.init.kaiming_normal_(module.weight, mode="fan_out", nonlinearity="relu")
    elif isinstance(module, nn.BatchNorm2d):
        nn.init.ones_(module.weight)
        nn.init.zeros_(module.bias)

model = MyModel()
model.apply(model._init_weights)
```

## 训练循环模式

### 标准训练循环

```python
# 好：带最佳实践的完整训练循环
def train_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    optimizer: torch.optim.Optimizer,
    criterion: nn.Module,
    device: torch.device,
    scaler: torch.amp.GradScaler | None = None,
) -> float:
    model.train()  # 始终设置 train 模式
    total_loss = 0.0

    for batch_idx, (data, target) in enumerate(dataloader):
        data, target = data.to(device), target.to(device)

        optimizer.zero_grad(set_to_none=True)  # 比 zero_grad() 更高效

        # 混合精度训练
        with torch.amp.autocast("cuda", enabled=scaler is not None):
            output = model(data)
            loss = criterion(output, target)

        if scaler is not None:
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(optimizer)
            scaler.update()
        else:
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

        total_loss += loss.item()

    return total_loss / len(dataloader)
```

### 验证循环

```python
# 好：正确的评估
@torch.no_grad()  # 比用 torch.no_grad() 代码块包裹更高效
def evaluate(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> tuple[float, float]:
    model.eval()  # 始终设置 eval 模式 —— 禁用 dropout，使用 running BN 统计量
    total_loss = 0.0
    correct = 0
    total = 0

    for data, target in dataloader:
        data, target = data.to(device), target.to(device)
        output = model(data)
        total_loss += criterion(output, target).item()
        correct += (output.argmax(1) == target).sum().item()
        total += target.size(0)

    return total_loss / len(dataloader), correct / total
```

## 数据 pipeline 模式

### 自定义 Dataset

```python
# 好：带类型提示的整洁 Dataset
class ImageDataset(Dataset):
    def __init__(
        self,
        image_dir: str,
        labels: dict[str, int],
        transform: transforms.Compose | None = None,
    ) -> None:
        self.image_paths = list(Path(image_dir).glob("*.jpg"))
        self.labels = labels
        self.transform = transform

    def __len__(self) -> int:
        return len(self.image_paths)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int]:
        img = Image.open(self.image_paths[idx]).convert("RGB")
        label = self.labels[self.image_paths[idx].stem]

        if self.transform:
            img = self.transform(img)

        return img, label
```

### 高效的 DataLoader 配置

```python
# 好：经过优化的 DataLoader
dataloader = DataLoader(
    dataset,
    batch_size=32,
    shuffle=True,            # 训练时打乱顺序
    num_workers=4,           # 并行数据加载
    pin_memory=True,         # 更快的 CPU→GPU 传输
    persistent_workers=True, # 在多个 epoch 之间保持 worker 存活
    drop_last=True,          # 为 BatchNorm 保持一致的 batch 大小
)

# 差：缓慢的默认配置
dataloader = DataLoader(dataset, batch_size=32)  # num_workers=0，没有 pin_memory
```

### 针对变长数据的自定义 collate

```python
# 好：在 collate_fn 中对序列做 padding
def collate_fn(batch: list[tuple[torch.Tensor, int]]) -> tuple[torch.Tensor, torch.Tensor]:
    sequences, labels = zip(*batch)
    # padding 到 batch 内的最大长度
    padded = nn.utils.rnn.pad_sequence(sequences, batch_first=True, padding_value=0)
    return padded, torch.tensor(labels)

dataloader = DataLoader(dataset, batch_size=32, collate_fn=collate_fn)
```

## checkpoint 模式

### 保存和加载 checkpoint

```python
# 好：包含所有训练状态的完整 checkpoint
def save_checkpoint(
    model: nn.Module,
    optimizer: torch.optim.Optimizer,
    epoch: int,
    loss: float,
    path: str,
) -> None:
    torch.save({
        "epoch": epoch,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "loss": loss,
    }, path)

def load_checkpoint(
    path: str,
    model: nn.Module,
    optimizer: torch.optim.Optimizer | None = None,
) -> dict:
    checkpoint = torch.load(path, map_location="cpu", weights_only=True)
    model.load_state_dict(checkpoint["model_state_dict"])
    if optimizer:
        optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
    return checkpoint

# 差：只保存模型权重（无法恢复训练）
torch.save(model.state_dict(), "model.pt")
```

## 性能优化

### 混合精度训练

```python
# 好：使用 GradScaler 的 AMP
scaler = torch.amp.GradScaler("cuda")
for data, target in dataloader:
    with torch.amp.autocast("cuda"):
        output = model(data)
        loss = criterion(output, target)
    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()
    optimizer.zero_grad(set_to_none=True)
```

### 用于大模型的 gradient checkpointing

```python
# 好：用计算换显存
from torch.utils.checkpoint import checkpoint

class LargeModel(nn.Module):
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # 在 backward 时重新计算激活以节省显存
        x = checkpoint(self.block1, x, use_reentrant=False)
        x = checkpoint(self.block2, x, use_reentrant=False)
        return self.head(x)
```

### 用 torch.compile 提速

```python
# 好：编译模型以更快执行（PyTorch 2.0+）
model = MyModel().to(device)
model = torch.compile(model, mode="reduce-overhead")

# 模式："default"（安全）、"reduce-overhead"（更快）、"max-autotune"（最快）
```

## 速查表：PyTorch 惯用法

| 惯用法 | 说明 |
|-------|-------------|
| `model.train()` / `model.eval()` | 训练/评估前始终设置模式 |
| `torch.no_grad()` | 推理时禁用梯度 |
| `optimizer.zero_grad(set_to_none=True)` | 更高效的梯度清零 |
| `.to(device)` | 设备无关的 tensor/模型放置 |
| `torch.amp.autocast` | 混合精度，2 倍提速 |
| `pin_memory=True` | 更快的 CPU→GPU 数据传输 |
| `torch.compile` | 用于提速的 JIT 编译（2.0+） |
| `weights_only=True` | 安全的模型加载 |
| `torch.manual_seed` | 可复现的实验 |
| `gradient_checkpointing` | 用计算换显存 |

## 要避免的反模式

```python
# 差：验证时忘记 model.eval()
model.train()
with torch.no_grad():
    output = model(val_data)  # Dropout 仍然生效！BatchNorm 使用 batch 统计量！

# 好：始终设置 eval 模式
model.eval()
with torch.no_grad():
    output = model(val_data)

# 差：破坏 autograd 的 in-place 操作
x = F.relu(x, inplace=True)  # 可能破坏梯度计算
x += residual                  # in-place 加法会破坏 autograd 计算图

# 好：out-of-place 操作
x = F.relu(x)
x = x + residual

# 差：在训练循环内反复将数据移到 GPU
for data, target in dataloader:
    model = model.cuda()  # 每次迭代都移动模型！

# 好：在循环前一次性移动模型
model = model.to(device)
for data, target in dataloader:
    data, target = data.to(device), target.to(device)

# 差：在 backward 之前使用 .item()
loss = criterion(output, target).item()  # 会从计算图分离！
loss.backward()  # 错误：无法通过 .item() 反向传播

# 好：只为日志记录调用 .item()
loss = criterion(output, target)
loss.backward()
print(f"Loss: {loss.item():.4f}")  # backward 之后调用 .item() 没问题

# 差：未正确使用 torch.save
torch.save(model, "model.pt")  # 保存整个模型（脆弱、不可移植）

# 好：保存 state_dict
torch.save(model.state_dict(), "model.pt")
```

__记住__：PyTorch 代码应当设备无关、可复现且关注显存。当存疑时，使用 `torch.profiler` 做性能剖析，并用 `torch.cuda.memory_summary()` 检查 GPU 显存。
