---
name: frontend-a11y
description: >
  React 和 Next.js 的无障碍模式——semantic HTML、ARIA 属性、
  表单标签、键盘导航、焦点管理以及屏幕阅读器支持。
  在构建任何交互式 UI 组件或表单时使用。
metadata:
  origin: community
---

# 前端无障碍模式

React 和 Next.js 的实用无障碍模式。涵盖 code review 中最常被标记的问题：缺失的表单标签、错误的 ARIA 用法、非语义化的交互元素，以及失效的键盘导航。

## 何时激活

- 构建或审查表单组件（`<input>`、`<select>`、`<textarea>`）
- 创建交互元素（模态框、下拉菜单、工具提示、选项卡）
- 在 `<div>` 或 `<span>` 上使用 `onClick`
- 为任何元素添加 `aria-*` 属性
- 实现键盘导航或焦点管理
- 收到来自 code review 工具（CodeRabbit、ESLint a11y）的无障碍反馈
- 构建必须支持屏幕阅读器的组件

## 表单无障碍

`htmlFor` / `id` 配对缺失以及错误信息未关联，是 code review 中最常被标记的问题。

### 标签关联

```tsx
// BAD：label 与 input 没有关联——屏幕阅读器无法将二者关联
<label>Email</label>
<input type="email" />

// GOOD：htmlFor 与 input id 匹配
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

### 必填字段

```tsx
// BAD：仅视觉上的星号对屏幕阅读器没有任何意义
<label htmlFor="email">Email *</label>
<input id="email" type="email" />

// GOOD：required 启用浏览器原生校验；aria-required 向屏幕阅读器标识该字段为必填
<label htmlFor="email">
  Email <span aria-hidden="true">*</span>
</label>
<input id="email" type="email" required aria-required="true" />
```

### 错误信息

```tsx
// BAD：错误文本仅视觉可见，未与 input 关联
<input id="email" type="email" />
<span className="error">Invalid email address</span>

// GOOD：aria-describedby 将 input 与其错误信息关联
// aria-invalid 向屏幕阅读器标识无效状态
<input
  id="email"
  type="email"
  aria-describedby="email-error"
  aria-invalid={!!error}
/>
{error && (
  <span id="email-error" role="alert">
    {error}
  </span>
)}
```

### 完整的无障碍表单

```tsx
interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="email">
          Email <span aria-hidden="true">*</span>
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          aria-required="true"
          aria-describedby={errors.email ? 'email-error' : undefined}
          aria-invalid={!!errors.email}
          autoComplete="email"
        />
        {errors.email && (
          <span id="email-error" role="alert">
            {errors.email}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="password">
          Password <span aria-hidden="true">*</span>
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          aria-required="true"
          aria-describedby={errors.password ? 'password-error' : undefined}
          aria-invalid={!!errors.password}
          autoComplete="current-password"
        />
        {errors.password && (
          <span id="password-error" role="alert">
            {errors.password}
          </span>
        )}
      </div>

      <button type="submit">Log in</button>
    </form>
  );
}
```

## Semantic HTML

使用与意图匹配的元素。屏幕阅读器和键盘用户依赖原生语义。

```tsx
// BAD：div 没有 role、没有键盘支持、没有 accessible name
<div onClick={handleClick}>Submit</div>

// GOOD：button 可聚焦，按 Enter/Space 激活，并被播报为 "button"
<button type="button" onClick={handleClick}>Submit</button>
```

```tsx
// BAD：非语义化的导航
<div onClick={() => navigate('/home')}>Home</div>

// GOOD：anchor 支持右键、中键以及键盘导航
<a href="/home">Home</a>
```

```tsx
// BAD：heading 层级跳跃（从 h1 跳到 h4）
<h1>Dashboard</h1>
<h4>Recent Activity</h4>

// GOOD：连续的 heading 层级
<h1>Dashboard</h1>
<h2>Recent Activity</h2>
```

## ARIA 属性

仅当原生 HTML 语义不足时才使用 ARIA。错误的 ARIA 比不用 ARIA 更糟。

### aria-label 与 aria-labelledby

```tsx
// aria-label：内联字符串标签——当没有可见 label 文本时使用
<button aria-label="Close modal">
  <XIcon />
</button>

// aria-labelledby：引用另一个元素的文本——当存在可见 label 时使用
<section aria-labelledby="section-title">
  <h2 id="section-title">Recent Orders</h2>
  {/* 内容 */}
</section>
```

### aria-describedby

```tsx
// 提供 label 之外的补充描述
<button
  aria-describedby="delete-warning"
  onClick={handleDelete}
> Delete account
</button>
<p id="delete-warning">This action cannot be undone.</p>
```

### 用于动态内容的 aria-live

```tsx
// 使用 aria-live 播报无需重新加载页面即可更新的内容
// polite：等待用户完成当前操作后再播报
// assertive：立即打断——仅用于紧急错误

export function StatusMessage({ message, isError }: { message: string; isError?: boolean }) {
  return (
    <div role="status" aria-live={isError ? 'assertive' : 'polite'} aria-atomic="true">
      {message}
    </div>
  );
}
```

### aria-expanded 与 aria-controls

```tsx
export function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <div>
      <button aria-expanded={isOpen} aria-controls={contentId} onClick={() => setIsOpen(prev => !prev)}>
        {title}
      </button>
      <div id={contentId} hidden={!isOpen}>
        {children}
      </div>
    </div>
  );
}
```

## 键盘导航

每个交互元素都必须能够仅通过键盘即可到达和操作。

### 自定义下拉菜单

```tsx
export function Dropdown({ options, onSelect }: { options: string[]; onSelect: (value: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();

  if (!options.length) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen) onSelect(options[activeIndex]);
        setIsOpen(prev => !prev);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-controls={listId}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => setIsOpen(prev => !prev)}
    >
      <span>{options[activeIndex]}</span>
      {isOpen && (
        <ul id={listId} role="listbox">
          {options.map((option, index) => (
            <li
              key={option}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
              }}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## 焦点管理

当 UI 状态变化时，焦点必须合理移动——尤其是模态框和路由切换。

### 模态框焦点恢复

> 本示例涵盖初始焦点和焦点恢复。若要实现完整的 focus trap（Tab/Shift+Tab 在模态框内循环），请使用 [`focus-trap-react`](https://github.com/focus-trap/focus-trap-react) 这类库，它们会处理动态内容和嵌套 portals 等边界情况。

```tsx
export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // 保存当前聚焦的元素并将焦点移入模态框
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else {
      // 将焦点恢复到打开模态框的元素
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} onKeyDown={e => e.key === 'Escape' && onClose()}>
      <h2 id="modal-title">{title}</h2>
      {children}
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

## 图片与图标

```tsx
// BAD：装饰性图标被播报为无标签图片
<img src="/icon.svg" />

// GOOD：装饰性图片对屏幕阅读器隐藏
<img src="/decoration.png" alt="" aria-hidden="true" />

// GOOD：有意义的图片配有描述性 alt 文本
<img src="/chart.png" alt="Monthly revenue increased 23% from January to March" />

// GOOD：带 accessible label 的图标按钮
<button aria-label="Delete item">
  <TrashIcon aria-hidden="true" />
</button>
```

## Reduced Motion

尊重那些在 OS 设置中开启了 reduced motion 的用户。

```tsx
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

// 用法
export function AnimatedCard({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      style={{
        transition: reduceMotion ? 'none' : 'transform 300ms ease'
      }}
    >
      {children}
    </div>
  );
}
```

## 反模式

```tsx
// BAD：onClick 在没有键盘支持的非交互元素上
<div onClick={handleClick}>Click me</div>

// BAD：aria-label 用在没有 role 的 div 上
<div aria-label="Navigation">...</div>

// BAD：placeholder 用作 label 的替代
<input placeholder="Enter your email" />

// BAD：正 tabIndex 造成不可预测的 tab 顺序
<button tabIndex={3}>Submit</button>

// BAD：aria-hidden 用在可聚焦元素上——键盘用户会被困住
<button aria-hidden="true">Open</button>

// BAD：role="button" 用在没有键盘处理程序的 div 上
<div role="button" onClick={handleClick}>Submit</div>
// 缺失：tabIndex={0}，以及用于 Enter/Space 的 onKeyDown
```

## 检查清单

在提交任何交互组件进行 review 之前：

- [ ] 每个 `<input>`、`<select>` 和 `<textarea>` 都通过 `htmlFor`/`id` 关联了 `<label>`
- [ ] 错误信息通过 `aria-describedby` 关联并标记 `role="alert"`
- [ ] `<div>` 或 `<span>` 上的 `onClick` 必须同时具备 `role`、`tabIndex` 和 `onKeyDown`
- [ ] 仅图标的按钮配有 `aria-label`
- [ ] 装饰性图片使用 `alt=""` 和 `aria-hidden="true"`
- [ ] 模态框在关闭时恢复焦点（若要实现完整的 focus trap，即 Tab/Shift+Tab 循环，请使用 `focus-trap-react` 这类库）
- [ ] 动态内容更新使用 `aria-live`
- [ ] 动画尊重 `prefers-reduced-motion`

## 相关 Skills

- `frontend-patterns` —— 通用的 React 组件与 state 模式
- `design-system` —— design token 与组件一致性
- `motion-ui` —— 考虑无障碍的动画模式
