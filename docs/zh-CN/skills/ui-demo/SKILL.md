---
name: ui-demo
description: 使用 Playwright 录制精美的 UI demo 视频。当用户要求为 Web 应用创建 demo、流程演示、屏幕录制或教程视频时使用。生成带有可见光标、自然节奏和专业质感的 WebM 视频。
metadata:
  origin: ECC
---

# UI Demo 视频录制器

使用 Playwright 的视频录制功能录制 Web 应用的精美 demo 视频，配合注入的光标覆盖层、自然节奏和叙事流程。

## 何时使用

- 用户要求"demo 视频"、"屏幕录制"、"流程演示"或"教程"
- 用户希望通过可视方式展示某个功能或工作流
- 用户需要用于文档、onboarding 或向 stakeholder 展示的视频

## 三阶段流程

每个 demo 都要经历三个阶段：**探索 -> 排练 -> 录制**。绝不直接跳到录制阶段。

---

## 阶段 1：探索

在编写任何脚本之前，先探索目标页面，了解实际存在的内容。

### 为什么

你无法对未曾见过的内容编写脚本。字段可能是 `<input>` 而非 `<textarea>`，下拉框可能是自定义组件而非 `<select>`，评论框可能支持 `@mentions` 或 `#tags`。假设会悄无声息地破坏录制。

### 如何做

导航到流程中的每个页面，并转储其交互元素：

```javascript
// 在编写 demo 脚本之前，对流程中的每个页面运行此代码
const fields = await page.evaluate(() => {
  const els = [];
  document.querySelectorAll('input, select, textarea, button, [contenteditable]').forEach(el => {
    if (el.offsetParent !== null) {
      els.push({
        tag: el.tagName,
        type: el.type || '',
        name: el.name || '',
        placeholder: el.placeholder || '',
        text: el.textContent?.trim().substring(0, 40) || '',
        contentEditable: el.contentEditable === 'true',
        role: el.getAttribute('role') || '',
      });
    }
  });
  return els;
});
console.log(JSON.stringify(fields, null, 2));
```

### 需要关注的内容

- **表单字段**：是 `<select>`、`<input>`、自定义下拉框还是 combobox？
- **Select 选项**：转储 option 的 value 和 text。占位项通常带有 `value="0"` 或 `value=""`，看似非空。使用 `Array.from(el.options).map(o => ({ value: o.value, text: o.text }))`。跳过 text 包含 "Select" 或 value 为 `"0"` 的选项。
- **富文本**：评论框是否支持 `@mentions`、`#tags`、markdown 或 emoji？检查 placeholder 文本。
- **必填字段**：哪些字段会阻止表单提交？检查 `required`、标签中的 `*`，并尝试空提交以查看校验错误。
- **动态内容**：字段是否在其他字段填写后才出现？
- **按钮标签**：确切的文本，如 `"Submit"`、`"Submit Request"` 或 `"Send"`。
- **表格列标题**：对于表格驱动的 modal，将每个 `input[type="number"]` 映射到对应的列标题，而不是假设所有数字 input 都表示相同含义。

### 输出

每个页面的字段映射，用于在脚本中编写正确的选择器。示例：

```text
/purchase-requests/new:
  - Budget Code: <select> (first select on page, 4 options)
  - Desired Delivery: <input type="date">
  - Context: <textarea> (not input)
  - BOM table: inline-editable cells with span.cursor-pointer -> input pattern
  - Submit: <button> text="Submit"

/purchase-requests/N (detail):
  - Comment: <input placeholder="Type a message..."> supports @user and #PR tags
  - Send: <button> text="Send" (disabled until input has content)
```

---

## 阶段 2：排练

跑一遍所有步骤但不录制。验证每个选择器都能成功解析。

### 为什么

静默的选择器失败是 demo 录制中断的主要原因。排练能在你浪费一次录制之前发现这些问题。

### 如何做

使用 `ensureVisible`，这是一个会记录日志并显式报错的 wrapper：

```javascript
async function ensureVisible(page, locator, label) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  const visible = await el.isVisible().catch(() => false);
  if (!visible) {
    const msg = `REHEARSAL FAIL: "${label}" not found - selector: ${typeof locator === 'string' ? locator : '(locator object)'}`;
    console.error(msg);
    const found = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, input, select, textarea, a'))
        .filter(el => el.offsetParent !== null)
        .map(el => `${el.tagName}[${el.type || ''}] "${el.textContent?.trim().substring(0, 30)}"`)
        .join('\n  ');
    });
    console.error('  Visible elements:\n  ' + found);
    return false;
  }
  console.log(`REHEARSAL OK: "${label}"`);
  return true;
}
```

### 排练脚本结构

```javascript
const steps = [
  { label: 'Login email field', selector: '#email' },
  { label: 'Login submit', selector: 'button[type="submit"]' },
  { label: 'New Request button', selector: 'button:has-text("New Request")' },
  { label: 'Budget Code select', selector: 'select' },
  { label: 'Delivery date', selector: 'input[type="date"]:visible' },
  { label: 'Description field', selector: 'textarea:visible' },
  { label: 'Add Item button', selector: 'button:has-text("Add Item")' },
  { label: 'Submit button', selector: 'button:has-text("Submit")' },
];

let allOk = true;
for (const step of steps) {
  if (!await ensureVisible(page, step.selector, step.label)) {
    allOk = false;
  }
}
if (!allOk) {
  console.error('REHEARSAL FAILED - fix selectors before recording');
  process.exit(1);
}
console.log('REHEARSAL PASSED - all selectors verified');
```

### 当排练失败时

1. 阅读可见元素转储。
2. 找到正确的选择器。
3. 更新脚本。
4. 重新运行排练。
5. 只有当每个选择器都通过时才继续。

---

## 阶段 3：录制

只有在探索和排练都通过之后，才应开始录制。

### 录制原则

#### 1. 叙事流程

将视频规划为一个故事。遵循用户指定的顺序，或使用以下默认顺序：

- **入口**：登录或导航到起始点
- **背景**：扫视周围环境，让观众建立方位感
- **动作**：执行主要的工作流步骤
- **变化**：展示一个次要功能，如设置、主题或本地化
- **结果**：展示结果、确认信息或新状态

#### 2. 节奏

- 登录后：`4s`
- 导航后：`3s`
- 点击按钮后：`2s`
- 主要步骤之间：`1.5-2s`
- 最终动作后：`3s`
- 打字延迟：每字符 `25-40ms`

#### 3. 光标覆盖层

注入一个跟随鼠标移动的 SVG 箭头光标：

```javascript
async function injectCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('demo-cursor')) return;
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    cursor.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
    cursor.style.cssText = `
      position: fixed; z-index: 999999; pointer-events: none;
      width: 24px; height: 24px;
      transition: left 0.1s, top 0.1s;
      filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
    `;
    cursor.style.left = '0px';
    cursor.style.top = '0px';
    document.body.appendChild(cursor);
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });
  });
}
```

在每次页面导航后调用 `injectCursor(page)`，因为覆盖层会在导航时被销毁。

#### 4. 鼠标移动

不要瞬移光标。点击前先移动到目标：

```javascript
async function moveAndClick(page, locator, label, opts = {}) {
  const { postClickDelay = 800, ...clickOpts } = opts;
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  const visible = await el.isVisible().catch(() => false);
  if (!visible) {
    console.error(`WARNING: moveAndClick skipped - "${label}" not visible`);
    return false;
  }
  try {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const box = await el.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
      await page.waitForTimeout(400);
    }
    await el.click(clickOpts);
  } catch (e) {
    console.error(`WARNING: moveAndClick failed on "${label}": ${e.message}`);
    return false;
  }
  await page.waitForTimeout(postClickDelay);
  return true;
}
```

每次调用都应包含一个描述性的 `label` 以便调试。

#### 5. 打字

可见地逐字输入，而非瞬时填充：

```javascript
async function typeSlowly(page, locator, text, label, charDelay = 35) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  const visible = await el.isVisible().catch(() => false);
  if (!visible) {
    console.error(`WARNING: typeSlowly skipped - "${label}" not visible`);
    return false;
  }
  await moveAndClick(page, el, label);
  await el.fill('');
  await el.pressSequentially(text, { delay: charDelay });
  await page.waitForTimeout(500);
  return true;
}
```

#### 6. 滚动

使用平滑滚动而非跳跃式滚动：

```javascript
await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
await page.waitForTimeout(1500);
```

#### 7. Dashboard 扫视

当展示 dashboard 或概览页面时，将光标在关键元素间移动：

```javascript
async function panElements(page, selector, maxCount = 6) {
  const elements = await page.locator(selector).all();
  for (let i = 0; i < Math.min(elements.length, maxCount); i++) {
    try {
      const box = await elements[i].boundingBox();
      if (box && box.y < 700) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
        await page.waitForTimeout(600);
      }
    } catch (e) {
      console.warn(`WARNING: panElements skipped element ${i} (selector: "${selector}"): ${e.message}`);
    }
  }
}
```

#### 8. 字幕

在视口底部注入一个字幕条：

```javascript
async function injectSubtitleBar(page) {
  await page.evaluate(() => {
    if (document.getElementById('demo-subtitle')) return;
    const bar = document.createElement('div');
    bar.id = 'demo-subtitle';
    bar.style.cssText = `
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 999998;
      text-align: center; padding: 12px 24px;
      background: rgba(0, 0, 0, 0.75);
      color: white; font-family: -apple-system, "Segoe UI", sans-serif;
      font-size: 16px; font-weight: 500; letter-spacing: 0.3px;
      transition: opacity 0.3s;
      pointer-events: none;
    `;
    bar.textContent = '';
    bar.style.opacity = '0';
    document.body.appendChild(bar);
  });
}

async function showSubtitle(page, text) {
  await page.evaluate((t) => {
    const bar = document.getElementById('demo-subtitle');
    if (!bar) return;
    if (t) {
      bar.textContent = t;
      bar.style.opacity = '1';
    } else {
      bar.style.opacity = '0';
    }
  }, text);
  if (text) await page.waitForTimeout(800);
}
```

在每次导航后，将 `injectSubtitleBar(page)` 与 `injectCursor(page)` 一起调用。

使用模式：

```javascript
await showSubtitle(page, 'Step 1 - Logging in');
await showSubtitle(page, 'Step 2 - Dashboard overview');
await showSubtitle(page, '');
```

准则：

- 保持字幕文本简短，最好不超过 60 个字符。
- 为保持一致，使用 `Step N - Action` 格式。
- 在长暂停期间清除字幕，让 UI 自行展示。

## 脚本模板

```javascript
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3000';
const VIDEO_DIR = path.join(__dirname, 'screenshots');
const OUTPUT_NAME = 'demo-FEATURE.webm';
const REHEARSAL = process.argv.includes('--rehearse');

// 在此处粘贴 injectCursor、injectSubtitleBar、showSubtitle、moveAndClick、
// typeSlowly、ensureVisible 和 panElements。

(async () => {
  const browser = await chromium.launch({ headless: true });

  if (REHEARSAL) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    // 遍历流程，对每个选择器运行 ensureVisible。
    await browser.close();
    return;
  }

  const context = await browser.newContext({
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    await injectCursor(page);
    await injectSubtitleBar(page);

    await showSubtitle(page, 'Step 1 - Logging in');
    // 登录操作

    await page.goto(`${BASE_URL}/dashboard`);
    await injectCursor(page);
    await injectSubtitleBar(page);
    await showSubtitle(page, 'Step 2 - Dashboard overview');
    // 扫视 dashboard

    await showSubtitle(page, 'Step 3 - Main workflow');
    // 动作序列

    await showSubtitle(page, 'Step 4 - Result');
    // 最终展示
    await showSubtitle(page, '');
  } catch (err) {
    console.error('DEMO ERROR:', err.message);
  } finally {
    await context.close();
    const video = page.video();
    if (video) {
      const src = await video.path();
      const dest = path.join(VIDEO_DIR, OUTPUT_NAME);
      try {
        fs.copyFileSync(src, dest);
        console.log('Video saved:', dest);
      } catch (e) {
        console.error('ERROR: Failed to copy video:', e.message);
        console.error('  Source:', src);
        console.error('  Destination:', dest);
      }
    }
    await browser.close();
  }
})();
```

使用：

```bash
# 阶段 2：排练
node demo-script.cjs --rehearse

# 阶段 3：录制
node demo-script.cjs
```

## 录制前检查清单

- [ ] 探索阶段已完成
- [ ] 排练通过，所有选择器均正常
- [ ] 已启用 headless 模式
- [ ] 分辨率设为 `1280x720`
- [ ] 每次导航后重新注入光标和字幕覆盖层
- [ ] 在主要过渡处使用 `showSubtitle(page, 'Step N - ...')`
- [ ] 所有点击都使用 `moveAndClick` 并附带描述性 label
- [ ] 可见输入使用 `typeSlowly`
- [ ] 没有静默的 catch；helper 会记录警告
- [ ] 内容展示使用平滑滚动
- [ ] 关键暂停对人类观看者可见
- [ ] 流程符合所要求的叙事顺序
- [ ] 脚本反映了在阶段 1 中探索到的实际 UI

## 常见陷阱

1. 导航后光标消失——重新注入。
2. 视频太快——增加暂停。
3. 光标是圆点而非箭头——使用 SVG 覆盖层。
4. 光标瞬移——点击前先移动。
5. 下拉框的选择操作看起来不对——先展示移动过程，再选择选项。
6. modal 显得突兀——确认前增加一个阅读暂停。
7. 视频文件路径是随机的——将其复制为一个稳定的输出名称。
8. 选择器失败被吞掉——绝不使用静默的 catch 块。
9. 字段类型被假设——先探索它们。
10. 功能被假设——编写脚本前先检查实际 UI。
11. select 的占位值看起来像真的——当心 `"0"` 和 `"Select..."`。
12. popup 会生成单独的视频——显式捕获 popup 页面，如有需要稍后合并。
