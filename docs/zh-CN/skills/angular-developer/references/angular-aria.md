# Angular Aria

Angular Aria（`@angular/aria`）是一组 headless 的无障碍指令，实现了常见的 WAI-ARIA 模式。这些指令负责处理键盘交互、ARIA 属性、焦点管理以及屏幕阅读器支持。

**作为 AI Agent，你的职责是提供 HTML 结构和 CSS 样式**，而由指令负责处理复杂的无障碍逻辑。

## 为 Headless 组件编写样式

由于 Angular Aria 组件是 headless 的，它们不提供默认样式。你**必须**使用 CSS，基于指令自动应用的 ARIA 属性或结构性 class 来为不同状态编写样式。

CSS 中常见的可作选择目标的 ARIA 属性：

- `[aria-expanded="true"]` / `[aria-expanded="false"]`
- `[aria-selected="true"]`
- `[aria-disabled="true"]`
- `[aria-current="page"]`（用于导航）

---

**关键**：在使用此包之前，必须通过包管理器安装它。请确认它已在项目中安装。如有必要，使用 `npm install @angular/aria` 进行安装。

## 1. Accordion

将相关内容组织为可展开/可折叠的部分。

**用法**：Accordion 是一个布局组件，旨在将内容组织为逻辑分组，用户可以一次展开一个分组，以减少内容密集页面上的滚动。它适用于 FAQ、长表单或信息的渐进式披露，但应避免用于主导航，或用户必须同时查看多个内容部分的场景。

**导入**：`import { AccordionContent, AccordionGroup, AccordionPanel, AccordionTrigger } from '@angular/aria/accordion';`

**指令**：`ngAccordionGroup`、`ngAccordionTrigger`、`ngAccordionPanel`、`ngAccordionContent`（用于懒加载）。

```ts
@Component({
  selector: 'app-cmp',
  imports: [AccordionContent, AccordionGroup, AccordionPanel, AccordionTrigger],
  template: `...`,
  styles: [],
})
export class App {
  protected readonly title = signal('angular-app');
}
```

```html
<div ngAccordionGroup [multiExpandable]="false">
  <div class="accordion-item">
    <button ngAccordionTrigger panelId="panel-1" class="accordion-header">
      Section 1
      <span class="icon">▼</span>
    </button>
    <div ngAccordionPanel panelId="panel-1" class="accordion-panel">
      <ng-template ngAccordionContent>
        <p>Lazy loaded content here.</p>
      </ng-template>
    </div>
  </div>
</div>
```

**样式策略**：
针对 trigger 上的 `[aria-expanded]` 属性来旋转图标，并为面板的可见性编写样式。

```css
.accordion-header[aria-expanded='true'] .icon {
  transform: rotate(180deg);
}

/* 面板指令负责 DOM 的移除，但你可以为过渡效果编写样式 */
.accordion-panel {
  padding: 1rem;
  border-top: 1px solid #ccc;
}
```

---

## 2. Listbox

用于显示选项列表的基础指令。用于可见的选择列表（而非下拉菜单）。

**用法**：可见的可选列表（单选或多选）。

**导入**：`import {Listbox, Option} from '@angular/aria/listbox';`

**指令**：`ngListbox`、`ngOption`。

```ts
@Component({
  selector: 'app-cmp',
  imports: [Listbox, Option],
  template: `...`,
  styles: [],
})
export class App {
  protected readonly title = signal('angular-app');
}
```

```html
<!-- 水平或垂直方向 -->
<ul ngListbox [(values)]="selectedItems" orientation="horizontal" [multi]="true">
  <li ngOption value="apple" class="option">Apple</li>
  <li ngOption value="banana" class="option">Banana</li>
</ul>
```

**样式策略**：
针对 `[aria-selected="true"]` 设置选中状态，针对 `:focus-visible` 或 `[data-active]` 设置聚焦项（Angular Aria 使用 roving tabindex 或 activedescendant）。

```css
.option {
  padding: 8px;
  cursor: pointer;
}
.option[aria-selected='true'] {
  background: #e0f7fa;
  font-weight: bold;
}
/* 焦点状态由 aria 管理 */
.option:focus-visible {
  outline: 2px solid blue;
}
```

---

## 3. Combobox、Select 与 Multiselect

这些模式将 `ngCombobox` 与一个包含 `ngListbox` 的弹出层结合在一起。

- **Combobox**：文本输入 + 弹出层（用于 Autocomplete）。
- **Select**：只读 Combobox + 单选 Listbox。
- **Multiselect**：只读 Combobox + 多选 Listbox。

**用法**：Combobox 是一个底层基础指令，用于将文本输入与弹出层同步，是 autocomplete、select 和 multiselect 模式的基础逻辑。它专门用于构建自定义过滤、独特选择需求，或偏离标准文档化组件的专用“输入到弹出层”协调。

**导入**：

```
  import {Combobox, ComboboxInput, ComboboxPopupContainer} from '@angular/aria/combobox';
  import {Listbox, Option} from '@angular/aria/listbox';
```

**指令**：`ngCombobox`、`ngComboboxInput`、`ngComboboxPopupContainer`、`ngListbox`、`ngOption`。

```html
<!-- 示例：标准 Select -->
<div ngCombobox [readonly]="true">
  <button ngComboboxInput class="select-trigger">
    {{ selectedValue() || 'Choose an option' }}
  </button>

  <ng-template ngComboboxPopupContainer>
    <ul ngListbox [(values)]="selectedValue" class="dropdown-menu">
      <li ngOption value="option1">Option 1</li>
      <li ngOption value="option2">Option 2</li>
    </ul>
  </ng-template>
</div>
```

**样式策略**：
将弹出层容器样式化为浮动在内容上方的下拉菜单（通常与 CDK Overlay 搭配使用）。

```css
.select-trigger {
  width: 200px;
  padding: 8px;
  text-align: left;
}
.dropdown-menu {
  list-style: none;
  padding: 0;
  margin: 0;
  border: 1px solid #ccc;
  background: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

---

## 4. Menu 与 Menubar

用于操作、命令和上下文菜单（不用于表单选择）。

**用法**：Menubar 是一种高层导航模式，旨在构建桌面风格的应用命令栏（例如 File、Edit、View），这些命令栏在整个界面中保持持久存在。它最适合用于将复杂命令组织为具有完整水平键盘支持的逻辑顶级分类，但应避免用于简单的独立操作列表，或水平空间受限的移动优先布局。

**导入**：`import {MenuBar, Menu, MenuContent, MenuItem} from '@angular/aria/menu';`

**指令**：`ngMenuBar`、`ngMenu`、`ngMenuItem`、`ngMenuTrigger`。

```html
<!-- Menubar 示例 -->
<ul ngMenuBar class="menubar">
  <li ngMenuItem value="file">
    <button ngMenuTrigger [menu]="fileMenu">File</button>
  </li>
</ul>

<ul ngMenu #fileMenu="ngMenu" class="menu">
  <li ngMenuItem value="new">New</li>
  <li ngMenuItem value="open">Open</li>
</ul>
```

**样式策略**：
为 menubar 使用 flexbox。根据 trigger 的状态隐藏/显示子菜单。

```css
.menubar {
  display: flex;
  gap: 10px;
  list-style: none;
  padding: 0;
}
.menu {
  background: white;
  border: 1px solid #ccc;
  padding: 5px 0;
}
.menu li {
  padding: 5px 15px;
  cursor: pointer;
}
```

---

## 5. Tabs

分层的内容部分，其中只有一个面板可见。

**用法**：Tabs 组件用于将相关内容组织为独立的、可导航的部分，让用户可以在不离开页面的情况下在分类或视图之间切换。它非常适合设置面板、多主题文档或 dashboard，但应避免用于顺序工作流（stepper），或导航涉及超过 7-8 个部分的场景。

**导入**：`import {Tab, Tabs, TabList, TabPanel, TabContent} from '@angular/aria/tabs';`

**指令**：`ngTabs`、`ngTabList`、`ngTab`、`ngTabPanel`、`ngTabContent`。

```html
<div ngTabs>
  <ul ngTabList class="tab-list">
    <li ngTab value="profile" class="tab-btn">Profile</li>
    <li ngTab value="security" class="tab-btn">Security</li>
  </ul>

  <div ngTabPanel value="profile" class="tab-panel">
    <ng-template ngTabContent>Profile Settings</ng-template>
  </div>
  <div ngTabPanel value="security" class="tab-panel">
    <ng-template ngTabContent>Security Settings</ng-template>
  </div>
</div>
```

**样式策略**：
针对 tab 按钮上的 `[aria-selected="true"]` 编写样式。

```css
.tab-list {
  display: flex;
  border-bottom: 2px solid #ccc;
  list-style: none;
  padding: 0;
}
.tab-btn {
  padding: 10px 20px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.tab-btn[aria-selected='true'] {
  border-bottom-color: blue;
  font-weight: bold;
}
.tab-panel {
  padding: 20px;
}
```

---

## 6. Toolbar

将相关控件（如文本格式化）分组。

**用法**：Toolbar 是一个组织型组件，旨在将频繁访问的相关控件分组到一个逻辑容器中。它最适合用于为需要重复操作的工作流（如文本格式化或媒体控件）增强键盘效率（通过方向键导航）和视觉结构。

**导入**：`import {Toolbar, ToolbarWidget, ToolbarWidgetGroup} from '@angular/aria/toolbar';`

**指令**：`ngToolbar`、`ngToolbarWidget`、`ngToolbarWidgetGroup`。

```html
<div ngToolbar class="toolbar">
  <div ngToolbarWidgetGroup [multi]="true" role="group" aria-label="Formatting">
    <button ngToolbarWidget value="bold" class="tool-btn">B</button>
    <button ngToolbarWidget value="italic" class="tool-btn">I</button>
  </div>
</div>
```

**样式策略**：
针对 toolbar 内的 `[aria-pressed="true"]`（用于切换按钮）或 `[aria-checked="true"]`（用于单选按钮组）编写样式。

```css
.toolbar {
  display: flex;
  gap: 5px;
  padding: 8px;
  background: #f5f5f5;
}
.tool-btn {
  padding: 5px 10px;
  border: 1px solid #ccc;
}
.tool-btn[aria-pressed='true'],
.tool-btn[aria-checked='true'] {
  background: #ddd;
}
```

---

## 7. Tree

展示层级数据（文件系统、嵌套导航）。

**用法**：Tree 组件专为导航和展示深度嵌套的层级数据结构而设计，例如文件系统、组织架构图或复杂的站点架构。它应专门用于用户需要展开或折叠分支的多级关系，但应避免用于扁平列表、数据表格或简单的选择菜单。

**导入**：`import {Tree, TreeItem, TreeItemGroup} from '@angular/aria/tree';`

**指令**：`ngTree`、`ngTreeItem`、`ngTreeGroup`。

```html
<ul ngTree class="tree">
  <li ngTreeItem value="documents">
    <span class="tree-label">Documents</span>
    <ul ngTreeGroup class="tree-group">
      <li ngTreeItem value="resume">Resume.pdf</li>
    </ul>
  </li>
</ul>
```

**样式策略**：
针对 `[aria-expanded]` 来显示/隐藏子项或旋转 chevron 图标。在嵌套分组上使用 `padding-left` 来体现层级关系。

```css
.tree,
.tree-group {
  list-style: none;
  padding-left: 20px;
}
.tree-label::before {
  content: '> ';
  display: inline-block;
  transition: transform 0.2s;
}
li[aria-expanded='true'] > .tree-label::before {
  transform: rotate(90deg);
}
```

## 8. Grid

一个二维的交互式单元格集合，支持通过方向键导航。

**用法**：数据表格、日历、电子表格，以及交互元素的布局模式。
**指令**：`ngGrid`、`ngGridRow`、`ngGridCell`、`ngGridCellWidget`。

```html
<table ngGrid [multi]="true" [enableSelection]="true" class="grid-table">
  <tr ngGridRow>
    <th ngGridCell role="columnheader">Name</th>
    <th ngGridCell role="columnheader">Status</th>
  </tr>
  <tr ngGridRow>
    <td ngGridCell>Project A</td>
    <td ngGridCell [(selected)]="isSelected">
      <button ngGridCellWidget (activated)="onActivate()">Active</button>
    </td>
  </tr>
</table>
```

**样式策略**：
针对 `[aria-selected="true"]` 设置选中的单元格，针对 `:focus-visible` 设置活动单元格（roving tabindex），或针对容器上的 `[aria-activedescendant]` 编写样式。

```css
.grid-table {
  border-collapse: collapse;
}
[ngGridCell] {
  padding: 8px;
  border: 1px solid #ddd;
}
[ngGridCell][aria-selected='true'] {
  background: #e3f2fd;
}
/* 焦点状态由 roving tabindex 管理 */
[ngGridCell]:focus-visible {
  outline: 2px solid #2196f3;
  outline-offset: -2px;
}
```

## Agent 通用规则

1. **绝不使用像 `<select>` 这样的原生 HTML 元素**来实现这些特定的 Aria 模式。请使用 `ng*` 指令。
2. **手动处理 CSS**：请记住 `Angular Aria` 不提供样式。你必须编写 CSS，针对指令自动切换的原生 ARIA 属性（`aria-expanded`、`aria-selected` 等）。
3. **懒加载**：始终在 `ng-template` 内部使用所提供的结构型指令（`ngAccordionContent`、`ngTabContent`）来处理重型内容面板，以确保它们被延迟渲染。
