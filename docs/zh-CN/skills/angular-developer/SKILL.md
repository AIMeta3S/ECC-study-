---
name: angular-developer
description: 生成 Angular 代码并提供架构指导。在创建项目、components 或 services，或针对 reactivity（signals、linkedSignal、resource）、forms、dependency injection、routing、SSR、accessibility (ARIA)、animations、styling（component 样式、Tailwind CSS）、testing 或 CLI 工具的最佳实践时触发。
metadata:
  origin: ECC
---

# Angular 开发指南

## 何时激活

- 在任何 Angular 项目或代码库中工作
- 创建或脚手架新的 Angular 项目、应用或库
- 生成 components、services、directives、pipes、guards 或 resolvers
- 使用 Angular Signals、`linkedSignal` 或 `resource` 实现 reactivity
- 处理 Angular forms（signal forms、reactive forms 或 template-driven）
- 设置 dependency injection、routing、lazy loading 或 route guards
- 添加 accessibility (ARIA)、animations 或 component 样式
- 编写或调试 Angular 特定的 tests（unit、component harness、E2E）
- 配置 Angular CLI 工具或 Angular MCP server

1. 在提供指导之前，始终分析项目的 Angular 版本，因为最佳实践和可用功能在不同版本之间可能有显著差异。如果使用 Angular CLI 创建新项目，除非用户要求，否则不要指定版本。

2. 生成代码时，遵循 Angular 的 style guide 和最佳实践，以保证可维护性和性能。使用 Angular CLI 脚手架 components、services、directives、pipes 和 routes，以确保一致性。

3. 完成代码生成后，运行 `ng build` 确保没有 build 错误。如果有错误，分析错误信息并在继续之前修复它们。不要跳过这一步，因为这对于确保生成的代码正确且可用至关重要。

## 创建新项目

如果用户没有提供指导原则，创建新 Angular 项目时使用以下默认值：

1. 除非用户另有指定，否则使用最新稳定版本的 Angular。
2. 仅当目标 Angular 版本支持时，新项目才优先使用 Signal Forms。[了解更多](references/signal-forms.md)。

**`ng new` 的执行规则：**
当被要求创建新 Angular 项目时，必须按以下严格步骤确定正确的执行命令：

**Step 1：检查用户是否明确指定版本。**

- **IF** 用户请求特定版本（例如 Angular 15），跳过本地安装，严格使用 `npx`。
- **Command：** `npx @angular/cli@<requested_version> new <project-name>`

**Step 2：检查现有的 Angular 安装。**

- **IF** 没有请求特定版本，在终端运行 `ng version` 检查系统是否已安装 Angular CLI。
- **IF** 命令成功并返回已安装的版本，直接使用本地/全局安装。
- **Command：** `ng new <project-name>`

**Step 3：回退到最新版本。**

- **IF** 没有请求特定版本且 `ng version` 命令失败（表示不存在 Angular 安装），必须使用 `npx` 获取最新版本。
- **Command：** `npx @angular/cli@latest new <project-name>`

## Components

在使用 Angular components 工作时，根据任务查阅以下参考文档：

- **Fundamentals**：结构剖析、metadata、核心概念和模板控制流（@if、@for、@switch）。阅读 [components.md](references/components.md)
- **Inputs**：基于 signal 的 inputs、transforms 和 model inputs。阅读 [inputs.md](references/inputs.md)
- **Outputs**：基于 signal 的 outputs 和自定义事件的最佳实践。阅读 [outputs.md](references/outputs.md)
- **Host Elements**：host bindings 和 attribute 注入。阅读 [host-elements.md](references/host-elements.md)

如果需要上述参考资料中找不到的更深入文档，请阅读 `https://angular.dev/guide/components` 上的文档。

## Reactivity 与数据管理

管理状态和数据 reactivity 时，使用 Angular Signals 并查阅以下参考文档：

- **Signals Overview**：核心 signal 概念（`signal`、`computed`）、reactive contexts 和 `untracked`。阅读 [signals-overview.md](references/signals-overview.md)
- **Dependent State (`linkedSignal`)**：创建链接到源 signal 的可写状态。阅读 [linked-signal.md](references/linked-signal.md)
- **Async Reactivity (`resource`)**：将异步数据直接获取到 signal 状态中。阅读 [resource.md](references/resource.md)
- **Side Effects (`effect`)**：日志记录、第三方 DOM 操作（`afterRenderEffect`），以及何时不应使用 effects。阅读 [effects.md](references/effects.md)

## Forms

对于新应用的大多数情况，**优先使用 signal forms**。在做 forms 决策时，分析项目并考虑以下指导原则：

- 如果应用版本支持 Signal Forms 且这是一个新 form，**优先使用 signal forms**。
- 对于较旧的应用或现有 forms，匹配应用当前的 form 策略。

- **Signal Forms**：使用 signals 进行 form 状态管理。阅读 [signal-forms.md](references/signal-forms.md)
- **Template-driven forms**：用于简单的 forms。阅读 [template-driven-forms.md](references/template-driven-forms.md)
- **Reactive forms**：用于复杂的 forms。阅读 [reactive-forms.md](references/reactive-forms.md)

## Dependency Injection

在 Angular 中实现 dependency injection 时，遵循以下指导原则：

- **Fundamentals**：Dependency Injection、services 和 `inject()` 函数概述。阅读 [di-fundamentals.md](references/di-fundamentals.md)
- **Creating and Using Services**：创建 services、`providedIn: 'root'` 选项，以及注入到 components 或其他 services 中。阅读 [creating-services.md](references/creating-services.md)
- **Defining Dependency Providers**：自动 vs 手动 provision、`InjectionToken`、`useClass`、`useValue`、`useFactory` 和 scopes。阅读 [defining-providers.md](references/defining-providers.md)
- **Injection Context**：`inject()` 的允许位置、`runInInjectionContext` 和 `assertInInjectionContext`。阅读 [injection-context.md](references/injection-context.md)
- **Hierarchical Injectors**：`EnvironmentInjector` 与 `ElementInjector`、解析规则、修饰符（`optional`、`skipSelf`）以及 `providers` 与 `viewProviders`。阅读 [hierarchical-injectors.md](references/hierarchical-injectors.md)

## Angular Aria

当为以下任何模式构建无障碍自定义 components 时：Accordion、Listbox、Combobox、Menu、Tabs、Toolbar、Tree、Grid，请查阅以下参考文档：

- **Angular Aria Components**：构建 headless、无障碍的 components（Accordion、Listbox、Combobox、Menu、Tabs、Toolbar、Tree、Grid）以及为 ARIA 属性设置样式。阅读 [angular-aria.md](references/angular-aria.md)

## Routing

在 Angular 中实现导航时，查阅以下参考文档：

- **Define Routes**：URL 路径、静态 vs 动态 segments、通配符和 redirects。阅读 [define-routes.md](references/define-routes.md)
- **Route Loading Strategies**：Eager vs lazy loading，以及上下文感知加载。阅读 [loading-strategies.md](references/loading-strategies.md)
- **Show Routes with Outlets**：使用 `<router-outlet>`、嵌套 outlets 和命名 outlets。阅读 [show-routes-with-outlets.md](references/show-routes-with-outlets.md)
- **Navigate to Routes**：使用 `RouterLink` 的声明式导航和使用 `Router` 的编程式导航。阅读 [navigate-to-routes.md](references/navigate-to-routes.md)
- **Control Route Access with Guards**：实现 `CanActivate`、`CanMatch` 和其他 guards 以保证安全。阅读 [route-guards.md](references/route-guards.md)
- **Data Resolvers**：在路由激活前使用 `ResolveFn` 预取数据。阅读 [data-resolvers.md](references/data-resolvers.md)
- **Router Lifecycle and Events**：导航事件的时间顺序和调试。阅读 [router-lifecycle.md](references/router-lifecycle.md)
- **Rendering Strategies**：CSR、SSG (Prerendering) 和带 hydration 的 SSR。阅读 [rendering-strategies.md](references/rendering-strategies.md)
- **Route Transition Animations**：启用和自定义 View Transitions API。阅读 [route-animations.md](references/route-animations.md)

如果需要更深入的文档或更多上下文，请访问[官方 Angular Routing 指南](https://angular.dev/guide/routing)。

## Styling 与 Animations

在 Angular 中实现 styling 和 animations 时，查阅以下参考文档：

- **Using Tailwind CSS with Angular**：将 Tailwind CSS 集成到 Angular 项目中。阅读 [tailwind-css.md](references/tailwind-css.md)
- **Angular Animations**：使用原生 CSS（推荐）或 legacy DSL 实现动态效果。阅读 [angular-animations.md](references/angular-animations.md)
- **Styling components**：component 样式和 encapsulation 的最佳实践。阅读 [component-styling.md](references/component-styling.md)

## Testing

编写或更新 tests 时，根据任务查阅以下参考文档：

- **Fundamentals**：unit testing、async patterns 和 `TestBed` 的最佳实践。阅读 [testing-fundamentals.md](references/testing-fundamentals.md)
- **Component Harnesses**：稳健 component 交互的标准模式。阅读 [component-harnesses.md](references/component-harnesses.md)
- **Router Testing**：使用 `RouterTestingHarness` 进行可靠的导航测试。阅读 [router-testing.md](references/router-testing.md)
- **End-to-End (E2E) Testing**：使用 Cypress 或 Playwright 进行 E2E tests 的最佳实践。阅读 [e2e-testing.md](references/e2e-testing.md)

## Tooling

使用 Angular 工具时，查阅以下参考文档：

- **Angular CLI**：创建应用、生成代码（components、routes、services）、serving 和 building。阅读 [cli.md](references/cli.md)
- **Angular MCP Server**：可用工具、配置和实验性功能。阅读 [mcp.md](references/mcp.md)

## Anti-Patterns

- 使用 `null` 或 `undefined` 作为 signal form field 的初始值——应改用 `''`、`0` 或 `[]`
- 在未先调用 field 的情况下访问 form field 的状态标志：`form.field.valid()`——应使用 `form.field().valid()`
- 当目标 Angular 版本支持 Signal Forms 时，仍用较旧的 form API 开始新 forms
- 在 `[formField]` inputs 上设置 `min`、`max`、`value`、`disabled` 或 `readonly` HTML 属性——应改为将其定义为 schema 规则
- 在 injection context 之外调用 `inject()`——需要时使用 `runInInjectionContext`
- 对应该使用 `computed()` 的派生状态使用 `effect()`
- 在嵌套的 `@for` 循环中引用 `$parent.$index`——Angular 不支持 `$parent`；应改用 `let outerIdx = $index`

## Related Skills

- `tdd-workflow` ——适用于 Angular components 和 services 的 test-driven development 工作流
- `security-review` ——Web 应用的安全检查清单，包括 Angular 特定的关注点
- `frontend-patterns` ——通用前端模式的参考，以了解 React/Next.js 的方法
