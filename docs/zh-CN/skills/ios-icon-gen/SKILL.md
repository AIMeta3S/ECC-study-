---
name: ios-icon-gen
description: 为 Xcode asset catalog 生成 iOS app 图标的 PNG imageset，图标来源为 SF Symbols（5000+ Apple 原生符号）或 Iconify API（来自 200+ 图标集的 275k+ 开源图标）。当需要生成图标、创建图标资源、向 asset catalog 添加图标或为 iOS 项目搜索图标时使用。
metadata:
  origin: community
---

# iOS 图标生成器

从两个来源生成用于 Xcode asset catalog 的 PNG 图标 imageset。

## 何时激活

- 为 iOS/macOS Xcode 项目生成图标资源
- 在开源图标集中搜索图标
- 为 asset catalog 创建 PNG imageset（1x、2x、3x）
- 用生产质量的资源替换占位图标
- 匹配 Xcode 项目中已有的图标样式

## 核心原则

### 1. 两个来源，一种输出格式

两个来源都生成相同的 Xcode 兼容 imageset。按需选择：

| 来源 | 图标 | 需要 | 最适合 |
|--------|-------|----------|----------|
| **Iconify API** | 来自 200+ 图标集的 275,000+ 个 | 网络连接 | 广泛选择、特定样式、开源图标 |
| **SF Symbols** | 5,000+ Apple 符号 | 仅 macOS | Apple 原生样式、离线使用 |

### 2. 始终匹配已有样式

生成前，检查项目中已有图标的尺寸、颜色和粗细一致性。

### 3. 输出结构

两种方法都会生成完整的 Xcode imageset：

```
<output-dir>/<asset-name>.imageset/
  Contents.json
  <asset-name>.png        # 1x（默认 68px）
  <asset-name>@2x.png     # 2x（默认 136px）
  <asset-name>@3x.png     # 3x（默认 204px）
```

## 示例

### 步骤 1：评估需求

确定图标需求：图标代表什么、偏好的样式、目标颜色和尺寸。

如果项目已有图标，检查已有样式：
```bash
# 检查已有图标的尺寸
sips -g pixelWidth -g pixelHeight path/to/existing@2x.png
```

### 步骤 2：搜索图标

**Iconify API（推荐用于广泛选择）：**
```bash
# 搜索所有图标集
$SKILL_DIR/scripts/iconify_gen.sh search "receipt"

# 在特定图标集内搜索
$SKILL_DIR/scripts/iconify_gen.sh search "business card" --prefix mdi

# 列出可用的图标集
$SKILL_DIR/scripts/iconify_gen.sh collections
```

**SF Symbols（用于 Apple 原生样式）：**
浏览 SF Symbols 应用或参考常用名称：

| 用例 | 符号名称 |
|----------|-------------|
| 文档 | `doc.text`, `doc.fill` |
| 收据 | `doc.text.below.ecg`, `receipt` |
| 人物 | `person.crop.rectangle`, `person.text.rectangle` |
| 相机 | `camera`, `camera.fill` |
| 扫描 | `doc.viewfinder`, `qrcode.viewfinder` |
| 设置 | `gearshape`, `slider.horizontal.3` |

### 步骤 3：预览（可选）

```bash
# Iconify 预览
$SKILL_DIR/scripts/iconify_gen.sh preview mdi:receipt-text-outline
```

### 步骤 4：生成

**Iconify API：**
```bash
# 基本生成
$SKILL_DIR/scripts/iconify_gen.sh mdi:receipt-text-outline editTool_expenseReport

# 自定义颜色和输出位置
$SKILL_DIR/scripts/iconify_gen.sh mdi:receipt-text-outline myIcon --color 007AFF --output ./Assets.xcassets/icons
```

选项：`--size <pt>`（默认：68）、`--color <hex>`（默认：8E8E93）、`--output <dir>`（默认：/tmp/icons）

**SF Symbols：**
```bash
# 基本生成
swift $SKILL_DIR/scripts/generate_icons.swift doc.text.below.ecg editTool_expenseReport

# 自定义颜色、粗细和输出
swift $SKILL_DIR/scripts/generate_icons.swift person.crop.rectangle myIcon --color 007AFF --weight regular --output ./Assets.xcassets/icons
```

选项：`--size <pt>`（默认：68）、`--color <hex>`（默认：8E8E93）、`--weight <name>`（默认：thin）、`--output <dir>`（默认：/tmp/icons）

### 步骤 5：验证并集成

1. 读取生成的 @2x PNG 进行视觉验证
2. 如果未直接输出到 asset catalog，则复制到 asset catalog：
   ```bash
   cp -r /tmp/icons/<name>.imageset path/to/Assets.xcassets/<group>/
   ```
3. 构建项目以验证 Xcode 是否识别新资源

## 常用 Iconify 图标集

| 前缀 | 名称 | 数量 | 样式 |
|--------|------|-------|-------|
| `mdi` | Material Design Icons | 7400+ | 填充 + 线框变体 |
| `ph` | Phosphor | 9000+ | 每个图标 6 种粗细 |
| `solar` | Solar | 7400+ | 粗体、线性、线框 |
| `tabler` | Tabler Icons | 6000+ | 一致的描边宽度 |
| `lucide` | Lucide | 1700+ | 简洁、极简 |
| `ri` | Remix Icon | 3100+ | 填充 + 线条变体 |
| `carbon` | Carbon | 2400+ | IBM 设计语言 |
| `heroicons` | HeroIcons | 1200+ | Tailwind CSS 配套 |

浏览全部：<https://icon-sets.iconify.design/>

## 脚本参考

| 脚本 | 来源 | 路径 |
|--------|--------|------|
| `iconify_gen.sh` | Iconify API（275k+ 图标） | `$SKILL_DIR/scripts/iconify_gen.sh` |
| `generate_icons.swift` | SF Symbols（5k+ 图标） | `$SKILL_DIR/scripts/generate_icons.swift` |

## 最佳实践

- **生成前先搜索** —— 浏览可用图标以找到最佳匹配
- **匹配已有项目样式** —— 生成新图标前检查已有图标的尺寸、颜色和粗细
- **用 Iconify 获取多样性** —— 200+ 图标集意味着你能找到所需的精确样式
- **用 SF Symbols 保持 Apple 一致性** —— 它们与系统 UI 完美匹配
- **直接生成到 asset catalog** —— 使用 `--output ./Assets.xcassets/icons` 跳过手动复制
- **视觉验证** —— 提交前始终预览 @2x PNG

## 反模式

- 生成图标前未检查已有项目图标样式
- 当项目已有定义好的调色板时仍使用默认颜色
- 以错误尺寸生成（先检查已有图标）
- 未进行视觉验证就提交生成的图标
