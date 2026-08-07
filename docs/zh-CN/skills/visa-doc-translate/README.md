# 签证文档翻译器

自动将签证申请文件从图片翻译为专业的英文 PDF。

## 功能特性

- **自动 OCR**：尝试多种 OCR 方法（macOS Vision、EasyOCR、Tesseract）
- **双语 PDF**：原始图片 + 专业英文翻译
- **多语言**：支持中文及其他语言
- **专业格式**：适用于正式签证申请
- **全自动**：无需人工干预

## 支持的文件类型

- 银行存款证明
- 在职证明
- 退休证明
- 收入证明
- 房产证明
- 营业执照
- 身份证和护照

## 使用方法

```bash
/visa-doc-translate <image-file>
```

### 示例

```bash
/visa-doc-translate RetirementCertificate.PNG
/visa-doc-translate BankStatement.HEIC
/visa-doc-translate EmploymentLetter.jpg
```

## 输出

生成 `<filename>_Translated.pdf`，包含：
- **第 1 页**：原始文件图片（居中，A4 尺寸）
- **第 2 页**：专业英文翻译

## 环境要求

### Python 库

```bash
pip install pillow reportlab
```

### OCR（以下任选其一）

**macOS（推荐）**：
```bash
pip install pyobjc-framework-Vision pyobjc-framework-Quartz
```

**跨平台**：
```bash
pip install easyocr
```

**Tesseract**：
```bash
brew install tesseract tesseract-lang
pip install pytesseract
```

## 工作原理

1. 如需要，将 HEIC 转换为 PNG
2. 检查并应用 EXIF 旋转
3. 使用可用的 OCR 方法提取文本
4. 翻译为专业英文
5. 生成双语 PDF

## 适用场景

- 澳大利亚签证申请
- 美国签证申请
- 加拿大签证申请
- 英国签证申请
- 欧盟签证申请

## 许可证

MIT
