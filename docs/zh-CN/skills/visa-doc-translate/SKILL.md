---
name: visa-doc-translate
description: 将签证申请文件（图片）翻译为英文，并生成包含原件与译文的 PDF
---

你正在协助翻译签证申请文件。

## 操作说明

当用户提供图片文件路径时，自动执行以下步骤，无需请求确认：

1. **图片转换**：如果文件是 HEIC，使用 `sips -s format png <input> --out <output>` 转换为 PNG

2. **图片旋转**：
   - 检查 EXIF 方向数据
   - 根据 EXIF 数据自动旋转图片
   - 如果 EXIF 方向值为 6，逆时针旋转 90 度
   - 按需应用额外旋转（若文件显示为倒置，尝试旋转 180 度）

3. **OCR 文本提取**：
   - 自动尝试多种 OCR 方法：
     - macOS Vision framework（macOS 上首选）
     - EasyOCR（跨平台，无需 tesseract）
     - Tesseract OCR（若可用）
   - 提取文件中的全部文本信息
   - 识别文件类型（存款证明、在职证明、退休证明等）

4. **翻译**：
   - 将全部文本内容专业地翻译为英文
   - 保持原件的结构与格式
   - 使用适合签证申请的专业术语
   - 专有名词保留原文，并在括号中附上英文
   - 中文姓名使用拼音格式（例如：WU Zhengye）
   - 准确保留所有数字、日期和金额

5. **PDF 生成**：
   - 使用 PIL 和 reportlab 库创建 Python 脚本
   - 第 1 页：显示旋转后的原件图片，居中并缩放以适配 A4 页面
   - 第 2 页：以规范格式显示英文译文：
     - 标题居中加粗
     - 内容左对齐，间距适当
     - 适用于正式文件的专业排版
   - 在底部添加一行说明："This is a certified English translation of the original document"
   - 执行脚本生成 PDF

6. **输出**：在同一目录下创建名为 `<original_filename>_Translated.pdf` 的 PDF 文件

## 支持的文件类型

- 银行存款证明（Bank deposit certificate）
- 收入证明（Income certificate）
- 在职证明（Employment certificate）
- 退休证明（Retirement certificate）
- 房产证明（Property certificate）
- 营业执照（Business license）
- 身份证与护照
- 其他官方文件

## 技术实现

### OCR 方法（按尝试顺序）

1. **macOS Vision Framework**（仅限 macOS）：
   ```python
   import Vision
   from Foundation import NSURL
   ```

2. **EasyOCR**（跨平台）：
   ```bash
   pip install easyocr
   ```

3. **Tesseract OCR**（若可用）：
   ```bash
   brew install tesseract tesseract-lang
   pip install pytesseract
   ```

### 所需的 Python 库

```bash
pip install pillow reportlab
```

针对 macOS Vision framework：
```bash
pip install pyobjc-framework-Vision pyobjc-framework-Quartz
```

## 重要准则

- 不要在每个步骤请求用户确认
- 自动确定最佳旋转角度
- 若某种 OCR 方法失败，尝试其他方法
- 确保所有数字、日期和金额翻译准确
- 使用简洁、专业的排版
- 完成整个流程并报告最终 PDF 的位置

## 使用示例

```bash
/visa-doc-translate RetirementCertificate.PNG
/visa-doc-translate BankStatement.HEIC
/visa-doc-translate EmploymentLetter.jpg
```

## 输出示例

本 skill 将：
1. 使用可用的 OCR 方法提取文本
2. 翻译为专业的英文
3. 生成 `<filename>_Translated.pdf`，包含：
   - 第 1 页：原件图片
   - 第 2 页：专业的英文译文

适用于向澳大利亚、美国、加拿大、英国及其他需要翻译文件的国家提交签证申请。
