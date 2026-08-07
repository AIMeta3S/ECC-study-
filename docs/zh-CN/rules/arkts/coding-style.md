---
paths:
  - "**/*.ets"
  - "**/*.ts"
  - "**/module.json5"
  - "**/oh-package.json5"
  - "**/build-profile.json5"
---
# HarmonyOS / ArkTS 编码风格

> 本文件在 [common/coding-style.md](../common/coding-style.md) 基础上扩展了 HarmonyOS 与 ArkTS 专属内容。

## ArkTS 语言约束

ArkTS 是 TypeScript 的严格静态类型子集。违反这些约束会导致**编译失败**。

### 类型系统

- 禁止 `any` 或 `unknown` 类型——始终使用显式类型
- 禁止 index access types——直接使用类型名称
- 禁止 conditional type aliases 或 `infer` 关键字
- 禁止 intersection types——使用继承
- 禁止 mapped types——使用类和常规惯用法
- 禁止将 `typeof` 用于类型注解——使用显式类型声明
- 禁止 `as const` 断言——使用显式类型注解
- 禁止 structural typing——使用继承、interface 或 type aliases
- 除 `Partial`、`Required`、`Readonly`、`Record` 外禁止 TypeScript utility types
- 对于 `Record<K, V>`，索引表达式类型为 `V | undefined`
- 在 `catch` 子句中省略类型注解（ArkTS 不支持 `any`/`unknown`）

### 函数与类

- 禁止函数表达式——使用箭头函数
- 禁止嵌套函数——使用 lambda
- 禁止 generator functions——使用 `async`/`await` 处理多任务
- 禁止 `Function.apply`、`Function.call`、`Function.bind`——对 `this` 遵循传统 OOP
- 禁止 constructor type expressions——使用 lambda
- 禁止在 interface 或 object types 中使用 constructor signatures——使用方法或类
- 禁止在 constructor 中声明类字段——应在类体中声明
- 禁止在独立函数或静态方法中使用 `this`——仅可在实例方法中使用
- 禁止 `new.target`
- 禁止 definite assignment assertions（`let v!: T`）——使用带初始化的声明
- 禁止 class literals——引入具名的 class types
- 禁止将类作为对象使用（赋值给变量）——class 声明引入的是类型而非值
- 每个类只能有一个 static block——合并所有 static 语句

### 对象与属性访问

- 禁止动态字段声明或 `obj["field"]` 访问——使用 `obj.field` 语法
- 禁止 `delete` 操作符——使用带 `null` 的 nullable type 标记缺失
- 禁止 prototype assignment——使用类和 interface
- 禁止 `in` 操作符——使用 `instanceof`
- 禁止重新赋值对象方法——使用包装函数或继承
- 禁止 `Symbol()` API（`Symbol.iterator` 除外）
- 禁止 `globalThis` 或全局作用域——使用显式模块导出/导入
- 禁止将 namespace 作为对象使用——使用类或模块
- 禁止在 namespace 内使用语句——使用函数

### 解构与展开

- 禁止 destructuring assignments 或变量声明——使用中间对象和逐字段访问
- 禁止 destructuring parameter declarations——直接传递参数，手动赋予本地名称
- spread operator 仅用于将数组（或数组派生类）展开到 rest parameters 或数组字面量中

### 模块与导入

- 禁止 `require()`——使用常规 `import` 语法
- 禁止 `export = ...`——使用正常的 export/import
- 禁止 import assertions——ArkTS 中 import 是编译期的
- 禁止 UMD modules
- 禁止在模块名中使用通配符
- 所有 `import` 语句必须出现在所有其他语句之前
- TypeScript 代码库不得通过 import 依赖 ArkTS 代码库（反向支持）

### 其他限制

- 禁止 `var`——使用 `let`
- 禁止 `for...in` 循环——数组使用常规 `for` 循环
- 禁止 `with` 语句
- 禁止 JSX expressions
- 禁止 `#` 私有标识符——使用 `private` 关键字
- 禁止 declaration merging（类、interface、enum）——保持定义紧凑
- 禁止 index signatures——使用数组
- 逗号操作符仅用于 `for` 循环
- 一元操作符 `+`、`-`、`~` 仅用于数值类型（禁止隐式字符串转换）
- enum 成员：显式初始化器只能使用同类型的编译期表达式
- 函数返回类型推断受限——调用省略返回类型的函数时需显式指定返回类型

### 对象字面量

- 仅在编译器能推断对应类或 interface 时支持
- 不支持：`any`/`Object`/`object` 类型、含方法的类或 interface、含参数化 constructor 的类、含 `readonly` 字段的类

## 命名约定

- 变量 / 函数：`camelCase`（如 `getUserInfo`、`goodsList`）
- 类 / interface：`PascalCase`（如 `UserViewModel`、`IGoodsModel`）
- 常量：`UPPER_SNAKE_CASE`（如 `MAX_PAGE_SIZE`、`COLOR_PRIMARY`）
- 文件名：组件使用 `PascalCase`（如 `HomePage.ets`），工具文件使用 `camelCase`

## 格式化

- 字符串优先使用双引号
- 语句末尾加分号
- 禁止使用 `var`——优先使用 `const`，其次 `let`
- 所有方法、参数、返回值必须有完整的类型注解

## 文件组织

- 组件文件（`.ets`）：每个文件一个 `@ComponentV2`
- ViewModel 文件：每个文件一个 ViewModel 类
- Model 文件：相关数据模型可共享一个文件
- 保持文件在 400 行以内；接近 800 行时提取辅助函数

## 注释

- 文件头：`@file`（文件用途）+ `@author`（开发者），前提是项目已使用文件头
- 公共方法：使用 JSDoc 标注 `@param`、`@returns`；复杂方法添加 `@example`
- 与项目现有文档语言保持一致；除非仓库已标准化为中文注释，否则使用英文

## 错误处理

```typescript
// 使用 try/catch 进行正确的错误处理
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  hilog.error(0x0000, 'TAG', 'Operation failed: %{public}s', error)
  throw new Error('User-friendly error message')
}
```

## 不可变性

遵循通用的不可变性原则——创建新对象而非修改原对象：

```typescript
// 反面示例：mutation
function updateUser(user: UserModel, name: string): UserModel {
  user.name = name  // 直接 mutation
  return user
}

// 正面示例：immutable——创建新实例
function updateUser(user: UserModel, name: string): UserModel {
  const updated = new UserModel()
  updated.id = user.id
  updated.name = name
  updated.email = user.email
  return updated
}
```
