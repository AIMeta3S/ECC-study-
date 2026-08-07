# Signal Forms

当目标 Angular 版本支持时，推荐在新表单中使用 Signal Forms。它们使用 Angular Signals 提供了一种响应式、类型安全且由模型驱动的方式来管理表单状态。

使用 Signal Forms 时，不要将 `null` 作为任何字段的值或类型。

## 导入

你可以从 `@angular/forms/signals` 导入以下内容：

```ts
import {
  form,
  FormField,
  submit,
  // 字段状态的规则
  disabled,
  hidden,
  readonly,
  debounce,
  // schema 辅助工具
  applyWhen,
  applyEach,
  schema,
  // 自定义校验
  validate,
  validateHttp,
  validateStandardSchema,
  // 元数据
  metadata,
} from '@angular/forms/signals';
```

## 创建表单

使用 `form()` 函数配合一个 Signal 模型。表单的结构直接派生自模型。

```ts
import {Component, signal} from '@angular/core';
import {form, FormField} from '@angular/forms/signals';

@Component({
  // ...
  imports: [FormField],
})
export class Example {
  // 1. 用初始值定义你的模型（避免使用 undefined）
  userModel = signal({
    name: '', // 关键：绝不使用 null 或 undefined 作为初始值
    email: '',
    age: 0, // 数字用 0，而不是 null
    address: {
      street: '',
      city: '',
    },
    hobbies: [] as string[], // 数组用 []，而不是 null
  });

  // 错误——不要这样做：
  // badModel = signal({
  //   name: null,      // 错误：应使用 ''
  //   age: null,       // 错误：应使用 0
  //   items: null      // 错误：应使用 []
  // });

  // 2. 创建表单
  userForm = form(this.userModel);
}
```

## 校验

从 `@angular/forms/signals` 导入校验器。

```ts
import {required, email, min, max, minLength, maxLength, pattern} from '@angular/forms/signals';
```

在传递给 `form()` 的 schema 函数中使用它们：

```ts
userForm = form(this.userModel, (schemaPath) => {
  // 必填
  required(schemaPath.name, {message: 'Name is required'});

  // 条件必填。
  required(schemaPath.name, {
    when({valueOf}) {
      return valueOf(schemaPath.age) > 10;
    },
  });
  // when 仅对 required 可用
  // 不要这样做：pattern(p.name, /xxx/, {when /* 错误 */)

  // 邮箱
  email(schemaPath.email, {message: 'Invalid email'});

  // 数字的 Min/Max
  min(schemaPath.age, 18);
  max(schemaPath.age, 100);

  // 字符串/数组的 MinLength/MaxLength
  minLength(schemaPath.password, 8);
  maxLength(schemaPath.description, 500);

  // Pattern（正则）
  pattern(schemaPath.zipCode, /^\d{5}$/);
});
```

## FieldState 与 FormField：父级要求

理解 **FormField**（结构）与 **FieldState**（实际数据/signals）之间的区别非常重要。

**规则**：你必须将字段作为函数**调用**，才能访问其状态 signals（valid、touched、dirty、hidden 等）。

```ts
// f 是一个 FormField（结构性的）
const f = form(signal({cat: {name: 'pirojok-the-cat', age: 5}}));

f.cat.name; // FormField：你无法从这里获取标志！
f.cat.name.touched(); // 错误：touched() 在 FormField 上不存在

f.cat.name(); // FieldState：调用它可以访问 signals
f.cat.name().touched(); // 有效：访问 signal
f.cat().name.touched(); // 错误：f.cat() 是状态，它没有子节点！
```

类似地，在模板中：

```html
<!-- 错误：类型 'FormField' 上不存在属性 'hidden' -->
@if (bookingForm.hotelDetails.hidden()) { ... }

<!-- 正确：先调用它 -->
@if (bookingForm.hotelDetails().hidden()) { ... }
```

## Disabled / Readonly / Hidden

使用 schema 中的规则控制字段状态。

```ts
import {disabled, readonly, hidden} from '@angular/forms/signals';

userForm = form(this.userModel, (schemaPath) => {
  // 条件性禁用
  disabled(schemaPath.password, ({valueOf}) => !valueOf(schemaPath.createAccount));

  // 条件性隐藏（不会从模型中移除，仅标记为隐藏）
  hidden(schemaPath.shippingAddress, ({valueOf}) => valueOf(schemaPath.sameAsBilling));

  // 只读
  readonly(schemaPath.username);
});
```

## 绑定

导入 `FormField` 并使用 `[formField]` 指令。

```ts
import {FormField} from '@angular/forms/signals';
```

state 上的所有属性（例如 `disabled`、`hidden`、`readonly` 和 `name`）都会自动绑定。
_不要_绑定 `name` 字段。

**关键：禁止的属性**
使用 `[formField]` 时，你不得在模板中设置以下属性（无论是静态设置还是绑定）：

- `min`、`max`（应在 schema 中改用校验器）
- `value`、`[value]`、`[attr.value]`（已由 `[formField]` 处理）
- `[attr.min]`、`[attr.max]`
- `[disabled]`、`[readonly]`（已由 `[formField]` 处理）

不要这样做：`<input min="1" [formField]>` 或 `<input [value]="val" [formField]>`。

```html
<!-- 输入框 -->
<input [formField]="userForm.name" />

<!-- 复选框 -->
<input type="checkbox" [formField]="userForm.isAdmin" />

<!-- 下拉选择 -->
<select [formField]="userForm.country">
  <option value="us">US</option>
</select>

<!-- userForm.name 不能为可空，因为 input 不接受 null-->
<input [formField]="userForm.name" />
```

## Reactive Forms

**不要**从 `@angular/forms` 导入 `FormControl`、`FormGroup`、`FormArray` 或 `FormBuilder`。Signal Forms 完全取代了这些概念。
Signal forms 没有 builder。

## 访问状态

表单中的每个字段都是一个返回其状态的函数。

```ts
// 通过调用来访问字段
const emailState = this.userForm.email();

// 值（WritableSignal）
const value = this.userForm().value();

// 校验状态（Signals）
const isValid = this.userForm().valid();
const isInvalid = this.userForm().invalid();
const errors = this.userForm().errors(); // 错误数组
const isPending = this.userForm().pending(); // 异步校验挂起中

// 交互状态（Signals）
const isTouched = this.userForm().touched();
const isDirty = this.userForm().dirty();

// 可用性状态（Signals）
const isDisabled = this.userForm().disabled();
const isHidden = this.userForm().hidden();
const isReadonly = this.userForm().readonly();
```

重要！：务必调用字段以获取其状态。

```ts
form().invalid()
form.field().dirty()
form.field.subfield().touched()
form.a.b.c.d().value()
form.address.ssn().pending()
form().reset()

// 唯一的例外是 length：
form.children.length
form.length // 注意：没有括号！
form.client.addresses.length  // 没有 "()"

@for (income of form.addresses; track $index) {/**/}
```

## 提交

使用 `submit()` 函数。它会在运行 action 之前自动将所有字段标记为 touched。

**关键**：`submit()` 的回调必须是 `async` 且必须返回一个 Promise。

```ts
import { submit } from '@angular/forms/signals';

// 正确——async 回调
onSubmit() {
  submit(this.userForm, async () => {
    // 仅在表单有效时才会执行
    await this.apiService.save(this.userModel());
    console.log('Saved!');
  });
}

// 错误——缺少 async 关键字
onSubmit() {
  submit(this.userForm, () => {  // 错误：必须是 async
    console.log('Saved!');
  });
}
```

## 处理错误

`field().errors()` 返回 ValidationError 的错误数组：

```ts
interface ValidationError {
  readonly kind: string;
  readonly message?: string;
}
```

_不要_从校验器中返回 null。
当没有错误时，返回 undefined。

### Context

传递给 `validate()`、`disabled()`、`applyWhen` 等规则的函数会接收一个 context 对象。理解其结构**至关重要**：

```ts
validate(
  schemaPath.username,
  ({
    value, // Signal<T>：字段当前的可写值
    fieldTree, // FieldTree<T>：子字段（如果是 group/array）
    state, // FieldState<T>：访问诸如 state.valid()、state.dirty() 等标志
    valueOf, // (path) => T：读取其他字段的值（跟踪依赖），例如 valueOf(schemaPath.password)
    stateOf, // (path) => FieldState：访问其他字段的状态（valid/dirty），例如 stateOf(schemaPath.password).valid()
    pathKeys, // Signal<string[]>：从根字段到该字段的路径
  }) => {
    // 错误：if (touched()) ...（touched 不在 context 中）
    // 正确：if (state.touched()) ...

    if (value() === 'admin') {
      return {kind: 'reserved', message: 'Username admin is reserved'};
    }
  },
);
```

### 重要：Paths 不是 Signals

在 `form()` 回调内部，`schemaPath` 及其子节点（例如 `schemaPath.user.name`）**不是** signals，也**不是**可调用的。

```ts
// 错误——这会抛出错误：
applyWhen(p.ssn, () => p.ssn().touched(), (ssnField) => { ... });

// 正确——使用 stateOf() 获取路径的状态：
applyWhen(p.ssn, ({ stateOf }) => stateOf(p.ssn).touched(), (ssnField) => { ... });

// 正确——使用 valueOf() 获取路径的值：
applyWhen(p.ssn, ({ valueOf }) => valueOf(p.ssn) !== '', (ssnField) => { ... });
```

### 多个项

- 使用 `applyEach` 为每个项应用规则。
- **关键**：`applyEach` 的回调只接收一个参数（项的路径），而不是两个：

```ts
// 正确——单个参数
applyEach(s.items, (item) => {
  required(item.name);
});

// 错误——不要传入 index
applyEach(s.items, (item, index) => {
  // 错误：回调接收 1 个参数
  required(item.name);
});
```

- 在模板中使用 `@for` 对项进行迭代。
- 要从数组中移除一个项，只需从数据的数组中移除相应的项。
- **`select` 绑定**：你可以绑定到 `<select [formField]="form.country">`。请确保 option 具有 `value` 属性。

### 嵌套的 @for 循环

**关键**：Angular 没有 `$parent`。在嵌套循环中，将外层 index 存入一个变量：

```html
<!-- 错误——$parent 不存在 -->
@for (item of form.items; track $index) { @for (option of item.options; track $index) {
<button (click)="removeOption($parent.$index, $index)">Remove</button>
<!-- 错误 -->
} }

<!-- 正确——使用 let 存储外层 index -->
@for (item of form.items; track $index; let outerIndex = $index) { @for (option of item.options;
track $index) {
<button (click)="removeOption(outerIndex, $index)">Remove</button>
} }
```

### 禁用表单按钮

```html
<button [disabled]="form().invalid() || form().pending()" />
<!-- 或者 -->
<button [disabled]="taxForm.invalid()" />
```

不要在 input 上使用 `[disabled]`。`[formField]` 会处理这个。
不要在 input 上使用 `[readonly]`。`[formField]` 会处理这个。
如果需要禁用或将字段设为只读，请在 schema 中使用 `disabled()` 或 `readonly()` 规则。

### 异步校验

不要对异步使用 `validate()`，应改用 `validateAsync()`：

**关键**：

1. `params` 选项必须是一个返回待校验值的函数。
2. `onError` 处理器是**必需的**——它不是可选的！

```ts
import {resource} from '@angular/core';
import {validateAsync} from '@angular/forms/signals';

userForm = form(this.userModel, (s) => {
  validateAsync(s.username, {
    // 1. 必须是函数——params 接收 context 并返回值
    params: ({value}) => value(),

    // 2. 创建 resource——factory 接收一个 Signal
    factory: (username) =>
      resource({
        params: username, // 在 resource() 中使用 'params'
        loader: async ({params: value}) => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return value === 'taken';
        },
      }),

    // 3. 将成功映射为错误
    onSuccess: (isTaken) =>
      isTaken ? {kind: 'taken', message: 'Username is already taken'} : undefined,

    // 4. 处理错误——这是必需的！
    onError: () => ({kind: 'error', message: 'Validation failed'}),
  });
});
```

**错误示例：**

```ts
// 错误——params 必须是函数
validateAsync(s.username, {
  params: s.username, // 错误：必须是 ({ value }) => value()
  // ...
});

// 错误——缺少 onError（它是必需的！）
validateAsync(s.username, {
  params: ({value}) => value(),
  factory: (username) =>
    resource({
      /* ... */
    }),
  onSuccess: (result) => (result ? {kind: 'error'} : undefined),
  // 错误：缺少 'onError' 但它是必需的！
});
```

### 使用 Resource

**关键**：在 Angular 的 `resource()` 中，使用 `params` 作为输入 signal。

```ts
// 正确
resource({
  params: mySignal,
  loader: async ({params: value}) => {
    /* ... */
  },
});

// 错误
resource({
  request: mySignal, // 错误：应为 'params'
  loader: async ({request}) => {
    /* ... */
  },
});
```

使用 `debounce()` 延迟 UI 与模型之间的同步。

```ts
import {debounce} from '@angular/forms/signals';

userForm = form(this.userModel, (s) => {
  // 将模型更新延迟 300ms
  debounce(s.username, 300);
});
```

### 条件校验

```ts
form(
  data,
  (path) => {
    applyWhen(
      name,
      ({value}) => value() !== 'admin',
      (namePath) => {
        validate(namePath.last /* ... */);
        disable(namePath.last /* ... */);
      },
    );
  },
  {injector: TestBed.inject(Injector)},
);
```

`applyWhen` 将映射到第一个参数的路径传入。
如果需要父字段，只需将其传给 `applyWhen`：

```ts
form(
  data,
  (path) => {
    applyWhen(
      cat,
      ({value}) => value().name !== 'admin',
      (catPath) => {
        require(cat.catPath /* ... */);
      },
    );
  },
  {injector: TestBed.inject(Injector)},
);
```

## 常见陷阱（不要这样做）

| 错误场景              | 错误（常见错误）                              | 正确（正确做法）                                            |
| :--------------------- | :-------------------------------------------- | :---------------------------------------------------------- |
| **访问标志**          | `form.field.valid()`                          | `form.field().valid()`                                      |
| **访问值**            | `form.field.value()`                          | `form.field().value()`                                      |
| **设置值**            | `form.field.set(x)`                           | 更新 model signal：`this.model.update(...)`                |
| **表单根标志**        | `form.invalid()`                              | `form().invalid()`                                          |
| **重复调用**          | `form.field()()`                              | `form.field().value()`                                      |
| **规则 Context**      | `({ touched }) => touched()`                  | `({ state }) => state.touched()`                            |
| **调用 Paths**        | `applyWhen(p.foo, () => p.foo() === 'x')`     | `applyWhen(p.foo, ({ valueOf }) => valueOf(p.foo) === 'x')` |
| **applyWhen 参数**    | `applyWhen(condition, () => {...})`           | `applyWhen(path, condition, schemaFn)` —— 需要 3 个参数    |
| **数组 length**       | `form.items().length`                         | `form.items.length`（结构性的）                            |
| **多选数组**          | `<select [formField]="form.tags">` (string[]) | 数组字段请使用复选框                                        |
| **readonly 属性**     | `<input readonly [formField]>`                | 在 schema 中使用 `readonly()` 规则                          |
| **min/max 属性**      | `<input min="1" max="10">`                    | 在 schema 中使用 `min()` 和 `max()` 规则                    |
| **value 绑定**        | `<input [value]="val">`                       | 不要将 `[value]` 与 `[formField]` 一起使用                  |
| **when 选项**         | `pattern(p.x, /.../, {when: ...})`            | `when` 只能与 `required()` 一起使用                         |
| **Submit 回调**       | `submit(form, () => { ... })`                 | `submit(form, async () => { ... })`                         |
| **异步 params**       | `params: s.field`                             | `params: ({ value }) => value()`                            |
| **异步 onError**      | 省略 `onError`                                | `validateAsync` 中 `onError` 是必需的                       |
| **resource() API**    | `request: signal`                             | `params: signal`                                            |
| **applyEach 参数**    | `applyEach(s.items, (item, index) => ...)`    | `applyEach(s.items, (item) => ...)`                         |
| **嵌套 @for**         | `$parent.$index`                              | 使用 `let outerIndex = $index`                              |
| **FormState 导入**    | `import { FormState }`                        | `FormState` 不存在，请使用 `FieldState`                     |
| **模型中的 null**     | `signal({ name: null })`                      | `signal({ name: '' })` 或 `signal({ age: 0 })`              |
| **Validate 语法**     | `validate(s.field, { value } => ...)`         | `validate(s.field, ({ value }) => ...)`                     |
| **复选框数组**        | `[formField]="form.tags"` (string[])          | 复选框只能绑定到 `boolean`                                  |

## 大型表单示例

### `src/app/app.ts`

```ts
import {Component, signal, ChangeDetectionStrategy} from '@angular/core';
import {
  form,
  FormField,
  submit,
  required,
  email,
  min,
  hidden,
  applyEach,
  validate,
} from '@angular/forms/signals';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormField],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  model = signal({
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      age: 0,
    },
    tripDetails: {
      destination: 'Mars',
      launchDate: '',
    },
    package: {
      tier: 'economy',
      extras: [] as string[],
    },
    companions: [] as Array<{name: string; relation: string}>,
  });

  bookingForm = form(this.model, (s) => {
    required(s.personalInfo.firstName, {message: 'First name is required'});
    required(s.personalInfo.lastName, {message: 'Last name is required'});
    required(s.personalInfo.email, {message: 'Email is required'});
    email(s.personalInfo.email, {message: 'Invalid email address'});
    required(s.personalInfo.age, {message: 'Age is required'});
    min(s.personalInfo.age, 18, {message: 'Must be at least 18'});

    required(s.tripDetails.destination);
    required(s.tripDetails.launchDate);
    validate(s.tripDetails.launchDate, ({value}) => {
      const date = new Date(value());
      if (isNaN(date.getTime())) return undefined;
      const today = new Date();
      if (date < today) {
        return {kind: 'pastData', message: 'Launch date must be in the future'};
      }
      return undefined;
    });

    // valueOf 用于在规则中访问其他字段的值
    hidden(s.package.extras, ({valueOf}) => valueOf(s.package.tier) === 'economy');

    applyEach(s.companions, (companion) => {
      required(companion.name, {message: 'Companion name required'});
      required(companion.relation, {message: 'Relation required'});
    });
  });

  addCompanion() {
    this.model.update((m) => ({
      ...m,
      companions: [...m.companions, {name: '', relation: ''}],
    }));
  }

  removeCompanion(index: number) {
    this.model.update((m) => ({
      ...m,
      companions: m.companions.filter((_, i) => i !== index),
    }));
  }

  onSubmit() {
    // 关键：submit 回调必须是 async
    submit(this.bookingForm, async () => {
      console.log('Booking Confirmed:', this.model());
      // 如果需要做异步工作：
      // await this.apiService.save(this.model());
    });
  }
}
```

### `src/app/app.html`

```html
<form (submit)="onSubmit(); $event.preventDefault()">
  <h1>Interstellar Booking</h1>

  <section>
    <h2>Personal Info</h2>

    <label>
      First Name
      <input [formField]="bookingForm.personalInfo.firstName" />
      @if (bookingForm.personalInfo.firstName().touched() &&
      bookingForm.personalInfo.firstName().errors().length) {
      <span>{{ bookingForm.personalInfo.firstName().errors()[0].message }}</span>
      }
    </label>

    <label>
      Last Name
      <input [formField]="bookingForm.personalInfo.lastName" />
      @if (bookingForm.personalInfo.lastName().touched() &&
      bookingForm.personalInfo.lastName().errors().length) {
      <span>{{ bookingForm.personalInfo.lastName().errors()[0].message }}</span>
      }
    </label>

    <label>
      Email
      <input type="email" [formField]="bookingForm.personalInfo.email" />
      @if (bookingForm.personalInfo.email().touched() &&
      bookingForm.personalInfo.email().errors().length) {
      <span>{{ bookingForm.personalInfo.email().errors()[0].message }}</span>
      }
    </label>

    <label>
      Age
      <input type="number" [formField]="bookingForm.personalInfo.age" />
      @if (bookingForm.personalInfo.age().touched() &&
      bookingForm.personalInfo.age().errors().length) {
      <span>{{ bookingForm.personalInfo.age().errors()[0].message }}</span>
      }
    </label>
  </section>

  <section>
    <h2>Trip Details</h2>

    <label>
      Destination
      <select [formField]="bookingForm.tripDetails.destination">
        <option value="Mars">Mars</option>
        <option value="Moon">Moon</option>
        <option value="Titan">Titan</option>
      </select>
    </label>

    <label>
      Launch Date
      <input type="date" [formField]="bookingForm.tripDetails.launchDate" />
      @if (bookingForm.tripDetails.launchDate().touched() &&
      bookingForm.tripDetails.launchDate().errors().length) {
      <span>{{ bookingForm.tripDetails.launchDate().errors()[0].message }}</span>
      }
    </label>
  </section>

  <section>
    <h2>Package</h2>

    <label>
      <input type="radio" value="economy" [formField]="bookingForm.package.tier" />
      Economy
    </label>
    <label>
      <input type="radio" value="business" [formField]="bookingForm.package.tier" />
      Business
    </label>
    <label>
      <input type="radio" value="first" [formField]="bookingForm.package.tier" />
      First Class
    </label>

    @if (!bookingForm.package.extras().hidden()) {
    <div>
      <h3>Extras</h3>
      <!-- 数组的多选必须使用 select multiple -->
      <select multiple [formField]="bookingForm.package.extras">
        <option value="wifi">WiFi</option>
        <option value="gym">Gym</option>
      </select>
    </div>
    }
  </section>

  <section>
    <h2>Companions</h2>
    <button type="button" (click)="addCompanion()">Add Companion</button>

    @for (companion of bookingForm.companions; track $index) {
    <div>
      <input [formField]="companion.name" placeholder="Name" />
      @if (companion.name().touched() && companion.name().errors().length) {
      <span>{{ companion.name().errors()[0].message }}</span>
      }

      <input [formField]="companion.relation" placeholder="Relation" />
      @if (companion.relation().touched() && companion.relation().errors().length) {
      <span>{{ companion.relation().errors()[0].message }}</span>
      }

      <button type="button" (click)="removeCompanion($index)">Remove</button>
    </div>
    }
  </section>

  <button [disabled]="bookingForm().invalid()">Submit</button>
</form>
```

## 从构建错误中恢复

如果遇到构建错误，以下是最常见的修复方法：

### `Property 'value' does not exist on type 'FieldTree'`

**问题**：在没有先调用字段的情况下直接访问 `.value()`。

```ts
// 错误
const val = this.form.field.value();
// 正确
const val = this.form.field().value();
```

### `Property 'set' does not exist on type 'FieldTree'`

**问题**：尝试在表单树上设置值。Signal Forms 是模型驱动的。

```ts
// 错误
this.form.address.street.set('Main St');
// 正确——改为更新 model signal
this.model.update((m) => ({...m, address: {...m.address, street: 'Main St'}}));
```

### `Type 'string[]' is not assignable to type 'string'`

**问题**：将 `[formField]` 绑定到数组字段时使用了单值的 `<select>`。

```html
<!-- 错误——assignees 是 string[]，select 期望 string -->
<select [formField]="form.assignees">
  ...
</select>

<!-- 正确——数组字段使用 select multiple -->
<select multiple [formField]="form.assignees">
  <option value="us">US</option>
</select>
```
