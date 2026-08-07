# 翻译保留英文技术术语表

> **用途**:翻译本仓库 `agents/`、`commands/`、`hooks/`、`rules/`、`skills/` 目录下的英文 Markdown 为中文时,为保证译文提供给 AI 的效果与英文一致(能准确表达意图和指令),部分技术术语必须保留英文原词。本表是这些术语的参考词表。
>
> **维护**:随源目录演进,由 ECC Tools / 人工同步。新增术语按下方"翻译总原则"判断后补入相应分类。

## 翻译总原则(决策规则)

按优先级从高到低,命中任一条即**保留英文原词**:

1. **专有标识符** —— skill 名、agent 名、slash command 名(含斜杠 `/tdd`)。它们是文件名/调用名,翻译即失效。
2. **平台固定标识符** —— Claude Code 的 hook 事件名(`PreToolUse`/`PostToolUse`/`Stop`/`SessionStart`/`SessionEnd`/`PreCompact`/`UserPromptSubmit`/`SubagentStop`)、tool 名(`Bash`/`Edit`/`Write`/`MultiEdit`/`Read`/`Grep`/`Glob`/`Task`/`WebSearch` 等)、frontmatter 字段(`name`/`description`/`tools`/`model`/`color`/`argument-hint`)、环境变量/占位符(`$ARGUMENTS`、`$PWD`、`CLAUDE_PLUGIN_ROOT`、`CLAUDE_PACKAGE_MANAGER`、`ECC_HOOK_PROFILE` 等)、配置文件名(`settings.json`、`hooks.json`、`CLAUDE.md`、`SKILL.md`)。
3. **代码标识符** —— API 名、函数名、关键字、装饰器、指令、配置键、CLI flag、HTTP header、类/方法名(如 `useState`、`defineProps`、`@Transactional`、`#[tokio::test]`、`runAsNonRoot`、`kubectl`)。
4. **语言 / 运行时 / 框架 / 库 / 工具 / 平台 / 产品 / 公司名**(TypeScript、React、Django、Kubernetes、Vite、ESLint、Claude、Anthropic…)。
5. **协议 / 标准 / 格式 / 算法名**(REST、OAuth、JSON Schema、WCAG、BM25、HNSW…)。
6. **首字母缩写**(CI/CD、SLO、RBAC、JWT、HIPAA、BGP、VLAN、OWASP、RLHF、RAG…)。
7. **枚举值 / 状态码 / 等级词** —— `CRITICAL`/`HIGH`/`MEDIUM`/`LOW`、`APPROVE`/`BLOCK`/`REQUEST CHANGES`/`WARNING`/`PASS`/`FAIL`、HTTP 状态码(`401`/`403`/`429`/`503`…)、HTTP 方法(`GET`/`POST`/`PUT`/`PATCH`/`DELETE`)、commit type(`feat`/`fix`/`chore`/`docs`/`refactor`/`test`/`perf`/`ci`)。
8. **中文技术语境惯用英文词**:bug、log、thread、token、hook、pipeline、dashboard、flag、threshold、crash、batch、buffer、cache、daemon、socket、trigger、refactor、debug、deploy、sprint、issue、prompt。

9. **变量类型**:parameter、argument、return、array、object、string、number、boolean。

**应译成中文的**(通用工程词,无歧义):file→文件、directory/folder→目录、error→错误、function→函数、method→方法、class→类、variable→变量、parameter/argument→参数、return→返回、import→导入、export→导出、loop→循环、condition→条件、array→数组、object→对象、string→字符串、number→数字、boolean→布尔、module→模块、library→库(但特定库名保留英文)、compile→编译、run→运行。

**边界判断**:出现疑义时,若该词是某个工具/概念在中文技术圈的标准叫法且中译无损含义(如 "并发"=concurrency、"事务"=transaction),可中译;若是该技术生态的固定专有名(如 `useEffect`、`tokio`、`ReentrancyGuard`),一律保留英文。

---

## 技术术语表

### 1. Claude Code / AI Agent 平台术语

**1a. 平台核心概念**
harness, plugin, marketplace, agent, subagent / sub-agent, Task tool (parallel Task execution), TaskOutput, run_in_background, Agent tool, Bash tool, tool, hook, skill, SKILL.md, skill reference, skill health, slash command, prompt, system prompt, prompt defense, prompt injection, context window, context budget / context limit, context compaction, token budget, token efficiency, session, session boundaries, session ID, session aliases, permission, allowlist, allow rule, denylist, settings.json, settings.local.json, ~/.claude.json, CLAUDE.md, AGENTS.md, SOUL.md, RULES.md, `.claude/`, delegate / delegation, orchestration / orchestrator / orchestrate, autonomous / autonomous loop, agent harness, harness audit, gate / GATE 1 / GATE 2 / gated commit / quality gate, instinct, continuous-learning-v2, homunculus, evolve, GAN harness / GAN-style multi-agent harness, generator, evaluator, rubric / eval-rubric, eval-driven development (EDD), pass@k / pass^k, codemap / codemaps, PRP, PRD, SDD, worktree / branch isolation, plan artifact mode, conversational mode, clarification mode, reference mode, Plan Mode, Extended Thinking, transcript / transcript_path, statusline, context monitor, cost tracker, AgentShield, codeagent-wrapper, ccg-workflow, ECC (everything-claude-code), plugin install, legacy install, control pane, handoff, work item, merge gate, Kanban (agent Kanban), SHARED_TASK_NOTES.md, de-sloppify, hookify rule, action space, observation, ReAct, function-calling, tool use / tool-call, plan document, red/green/refactor, RED, GREEN, characterization test.

**1b. Agent 名(全部保留英文;命名模式 `*-reviewer` / `*-build-resolver` / `*-architect`)**
planner, architect, tdd-guide, code-reviewer, security-reviewer, build-error-resolver, e2e-runner, refactor-cleaner, doc-updater, a11y-architect, agent-evaluator, chief-of-staff, code-architect, code-explorer, code-simplifier, comment-analyzer, conversation-analyzer, cpp-build-resolver, cpp-reviewer, csharp-reviewer, dart-build-resolver, database-reviewer, django-build-resolver, django-reviewer, docs-lookup, fastapi-reviewer, flutter-reviewer, fsharp-reviewer, gan-evaluator, gan-generator, gan-planner, go-build-resolver, go-reviewer, harmonyos-app-resolver, harness-optimizer, healthcare-reviewer, homelab-architect, java-build-resolver, java-reviewer, kotlin-build-resolver, kotlin-reviewer, loop-operator, marketing-agent, mle-reviewer, network-architect, network-config-reviewer, network-troubleshooter, opensource-forker, opensource-packager, opensource-sanitizer, performance-optimizer, php-reviewer, pr-test-analyzer, python-reviewer, pytorch-build-resolver, react-build-resolver, react-reviewer, rust-build-resolver, rust-reviewer, seo-specialist, silent-failure-hunter, spec-miner, swift-build-resolver, swift-reviewer, type-design-analyzer, typescript-reviewer, vue-reviewer.

**1c. Slash command 名(全部保留英文,含斜杠;命名模式 `orch-*` / `prp-*` / `epic-*` / `multi-*` / `hookify-*` / `instinct-*` / `<lang>-build|review|test`)**
/aside, /auto-update, /build-fix, /checkpoint, /code-review, /cost-report, /cpp-build, /cpp-review, /cpp-test, /ecc-guide, /epic-claim, /epic-decompose, /epic-publish, /epic-review, /epic-sync, /epic-unblock, /epic-validate, /evolve, /fastapi-review, /feature-dev, /flutter-build, /flutter-review, /flutter-test, /gan-build, /gan-design, /go-build, /go-review, /go-test, /gradle-build, /harness-audit, /hookify, /hookify-configure, /hookify-help, /hookify-list, /instinct-export, /instinct-import, /instinct-status, /jira, /kotlin-build, /kotlin-review, /kotlin-test, /learn, /learn-eval, /loop-start, /loop-status, /marketing-campaign, /model-route, /multi-backend, /multi-execute, /multi-frontend, /multi-plan, /multi-workflow, /orch-add-feature, /orch-build-mvp, /orch-change-feature, /orch-fix-defect, /orch-refine-code, /plan, /plan-prd, /pm2, /pr, /project-init, /projects, /promote, /prp-commit, /prp-implement, /prp-plan, /prp-pr, /prp-prd, /python-review, /quality-gate, /react-build, /react-review, /react-test, /refactor-clean, /resume-session, /review-pr, /rust-build, /rust-review, /rust-test, /santa-loop, /save-session, /security-scan, /sessions, /setup-pm, /skill-create, /skill-health, /test-coverage, /update-codemaps, /update-doc, /vue-review, /tdd, /e2e, /security-review, /verify, /config, /loop, /run, /init, /review, /simplify, /fewer-permission-prompts, /compact, /skill-creator, /ccg:plan, /ccg:execute, /orchestrate custom, /canary-watch.

**1d. Hook 事件 / frontmatter / 环境变量 / 配置**
PreToolUse, PostToolUse, PostToolUseFailure, Stop, SessionStart, SessionEnd, PreCompact, UserPromptSubmit, UserPromptUse, SubagentStop; matcher, tool_name, tool_input, tool_output; frontmatter 字段 `name`/`description`/`tools`/`model`/`color`/`argument-hint`/`allowed_tools`/`command`/`disable-model-invocation`/`subtask`/`agent`; profile `standard`/`strict`; `stop:cost-tracker`, `post:quality-gate`; 环境变量 `$ARGUMENTS`, `$PWD`, `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PACKAGE_MANAGER`, `ECC_HOOK_PROFILE`, `ECC_DISABLED_HOOKS`, `ECC_GATEGUARD`, `ECC_SESSION_START_MAX_CHARS`, `ECC_SESSION_START_CONTEXT`, `ECC_CONTEXT_MONITOR_COST_WARNINGS`, `ECC_GOVERNANCE_CAPTURE`.

**1e. 模型名 / 模型分层 / API**
Claude, Opus, Sonnet, Haiku, Codex, GPT, Gemini, Llama, Mixtral, Mistral, Phi, Qwen, DeepSeek; model tier, model routing; Claude API, Anthropic SDK, prompt caching; GPT-5, Gemini 2.5 Pro, Gemini 3 Pro Preview; Codex CLI, Gemini CLI.

**1f. MCP 相关**
MCP (Model Context Protocol), MCP server, MCP tool, mcpServers, Context7 MCP, ace-tool MCP, Playwright MCP, jira MCP; `mcp__context7__resolve-library-id`, `mcp__context7__query-docs`, `mcp__ace-tool__enhance_prompt`, `mcp__ace-tool__search_context`, resolve-library-id, query-docs.

---

### 2. 编程语言与运行时
**语言**:TypeScript, JavaScript, JSX, TSX, Python, Rust, Go / Golang, Java, Kotlin, Swift, Objective-C, C, C++ (C++17/C++20/C++23), C#, F#, Dart, PHP, Ruby, Perl (v5.36), ArkTS, Solidity, Vyper, Lua, R, Scala, Clojure, Elixir, Erlang, Haskell, OCaml, Bash, SQL, NoSQL, HTML, CSS, SCSS.
**运行时/VM**:Node.js, Deno, Bun, JVM, CLR, V8, JavaScriptCore, CPython, PyPy, Jython, GraalVM, ART, Dalvik, wasm / WebAssembly, LLVM, Hermes (RN JS engine), YJIT (Ruby JIT), native image.
**模块格式**:ESM, CommonJS / CJS, UMD.

---

### 3. 框架与库

**React 生态**:React (React 18/19), React Server Components / RSC, Server Component, Client Component, Server Action, Next.js (App Router, Parallel Routes, Route Handlers), Remix, Create React App / CRA, React Native / RN, Expo, Expo Router, Expo SDK, React Navigation, TanStack Query, TanStack Router, TanStack Form, SWR, Redux, Redux Toolkit, Zustand, Jotai, React Hook Form, Final Form, React Testing Library / RTL, @testing-library/react, @testing-library/react-native, @testing-library/user-event, React Markdown / ReactMarkdown, react-error-boundary, ErrorBoundary, DOMPurify, isomorphic-dompurify, MSW / Mock Service Worker.
**Vue / Nuxt 生态**:Vue (Vue 3 / Vue 3.4+ / 3.5+), Nuxt / Nuxt 4, Pinia, @pinia/nuxt, @pinia/testing, vue-router, vue-tsc, @vue/test-utils, @vitejs/plugin-vue, create-vue, @tanstack/vue-query, VeeValidate, FormKit, Vue Test Utils.
**Angular 生态**:Angular (v15+/v17+/v21+), Angular CLI, Angular CDK, Angular Material / @angular/material, RxJS, NgRx, @angular/ssr, @angular/router/testing, @angular/cdk/testing.
**构建/打包**:Vite, Turbopack, Rolldown, Webpack / webpack, esbuild, SWC, Rollup, Parcel, Rspack, Rsbuild, Babel, @vitejs/plugin-react, babel-loader, @babel/preset-react, Turborepo, nx.
**Python**:Django, Django REST Framework / DRF, FastAPI, Flask, Pydantic (v2), pydantic-settings, SQLAlchemy, Alembic, asyncpg, psycopg, Celery, uvicorn, gunicorn, httpx, aiohttp, pytest, pytest-asyncio, passlib, python-jose, python-dotenv / dotenv, black, isort, ruff, mypy, pyright, bandit, pylint.
**JVM**:Spring Boot, Spring MVC, Spring WebFlux, Spring Security, Spring Data JPA, Hibernate, Panache, JPA, JAX-RS, RESTEasy Reactive, Quarkus, Apache Camel, JSF, Lombok, MapStruct, SLF4J, Logback, Logstash, Micrometer, Bucket4j, JUnit 4 / JUnit 5, TestNG, Mockito, MockMvc, AssertJ, REST Assured, Testcontainers, JaCoCo, Dev Services, Koin, Dagger, Hilt, Ktor, OkHttp, Retrofit, Gson, Moshi, kotlinx.serialization, kotlinx.coroutines, Exposed, Turbine, kotlinx-coroutines-test, google-java-format, Checkstyle, SpotBugs, ktlint, Detekt, ktfmt.
**Swift / Apple**:SwiftUI, UIKit, AppKit, Combine, SwiftData, CoreData, FoundationModels / Foundation Models, WidgetKit, Swift Testing, Swift 6, SwiftFormat, SwiftLint, swift-format, Xcode (Xcode 16+/26+), Keychain / Keychain Services, UserDefaults, App Transport Security / ATS.
**.NET**:ASP.NET Core, EF Core / Entity Framework Core, Dapper, ADO.NET, xUnit, NUnit, FluentAssertions, FluentValidation, Moq, NSubstitute, WebApplicationFactory, dotnet, fantomas, FsUnit.xUnit, Unquote, FsCheck.xUnit.
**Rust**:tokio, axum, actix, hyper, reqwest, sqlx, diesel, sea-orm, serde, thiserror, anyhow, tracing, log, toml, clap, async-trait, rstest, proptest, mockall, Criterion, rustfmt, clippy, cargo (fmt/clippy/check/build/test/audit/deny/tree/llvm-cov), rustc, rustup.
**C++**:GoogleTest / gtest / gmock, CMake, CMakeLists.txt, CTest / ctest, clang-format, clang-tidy, cppcheck, lcov, gcov, fmt.
**Go**:Chi router, Gin, Echo, net/http, testify, errgroup, go-kit, sqlx, pgx, gofmt, goimports, golangci-lint, staticcheck, go vet, govulncheck.
**Dart / Flutter**:Flutter, BLoC / Cubit, Riverpod, Provider, GetX, freezed, get_it, GoRouter, Dio, flutter_dotenv, flutter_secure_storage, local_auth, webview_flutter, drift, sqflite, build_runner, mockito, mocktail, bloc_test, flutter_test, dart:test, integration_test, MobX, Signals.
**PHP**:Laravel, Symfony, Eloquent / Eloquent ORM, Doctrine, PHPUnit, Pest, PHPStan, Psalm, PHP-CS-Fixer, Laravel Pint, Composer, Inertia.js / Inertia, AssertableInertia, pcov, Xdebug.
**Ruby / Rails**:Rails (Rails 8), Active Record, ActiveSupport, Hotwire, Turbo, Turbo Stream, Stimulus, Importmap, Propshaft, Devise, Sidekiq, Solid Queue, Solid Cache, Solid Cable, Capybara, RSpec, Minitest, factory_bot, SimpleCov, RuboCop, rubocop-rails-omakase, Brakeman, bundle-audit / bundler-audit, ERB, Action Cable.
**Perl**:Moo, Moose, DBI, DBIx::Class, Types::Standard, Path::Tiny, IPC::Run3, Exporter, Log::Any, Test2::V0, Test::More, Test::MockModule, Test::MockObject, Devel::Cover, perltidy, perlcritic, carton, cpanfile, prove.
**HarmonyOS**:HarmonyOS, OpenHarmony, ArkUI, ArkTS, hvigor, hvigorw, DevEco Studio, ohpm, hypium / @ohos/hypium, @ohos.test, @ohos.UiTest, HUKS / UniversalKeystoreKit, hilog, hdc, HAP, @kit.AbilityKit, @kit.UniversalKeystoreKit.
**Web / CSS / 前端**:Tailwind / Tailwind CSS, shadcn / shadcn/ui, Radix, Material UI, styled-components, emotion, CSS-in-JS, CSS Modules, PostCSS, Prettier, ESLint (flat config), eslint-plugin-vue, eslint-plugin-react-hooks, eslint-plugin-jsx-a11y, eslint-plugin-security, eslint-config-expo, Stylelint, Biome, Commitlint, Storybook, Vitest, Jest, Mocha, Chai, Jasmine, Karma, Cypress, Playwright, Selenium, WebDriver, Percy, happy-dom, jsdom / JSDOM, Lighthouse, axe, vitest-axe, jest-axe, Sentry, @sentry/react-native, GSAP / gsap, ScrollTrigger, Zod, joi, yup, valibot, Supabase, Firebase, Stripe, socket.io, Axios, Lodash, Lodash-es, Moment.js, date-fns, dayjs, immer, madge, knip, depcheck, ts-prune, nuxi typecheck, @nuxt/eslint, @nuxt/test-utils, Three.js, React Three Fiber, Lottie.
**数据/ML**:PyTorch, torch.compile, torch.amp, GradScaler, autocast, TensorFlow, Keras, JAX, scikit-learn / sklearn, pandas, numpy, scipy, matplotlib, plotly, seaborn, Hugging Face Transformers, LangChain, LlamaIndex, ONNX, TensorRT, vLLM, llama.cpp, Ollama.
**区块链**:Foundry (Forge, Cast, Anvil, Chisel), Hardhat, Slither, Echidna, Mythril, OpenZeppelin, Uniswap, Anchor (Solana).
**科学/媒体**:Manim, Remotion, Mediabunny, gget, Biopython, Snakemake, Nextflow, BLAST, BLAT, Ensembl.

---

### 4. 编程概念 / 范式 / 语言特性
**范式**:object-oriented (OOP), functional programming (FP), reactive programming, declarative, imperative, procedural, event-driven, metaprogramming.
**并发/异步**:async/await, async, coroutine / coroutines, goroutine, structured concurrency, async let, TaskGroup, Task, runTest, virtual time, CancellationException, TestDispatcher, TestScope, Promise, Promise.all, callback, channel, mutex (sync.Mutex, sync.RWMutex), WaitGroup, errgroup, sync.Pool, context.Context, semaphore, atomic, actor model, CSP, futures, backpressure, deadlock, race condition, data race, goroutine leak, worklet, UI thread, JS thread, GIL, suspend, coroutineScope, supervisorScope.
**类型系统**:generic / generics, type parameter, trait bound, monomorphization, dynamic dispatch, vtable, trait, trait object (`Box<dyn Trait>`), interface, protocol (Swift/Python), struct, enum, sealed class / sealed interface / sealed type, record, data class, Optional / Option, Result, union type, sum type, product type, discriminated union, intersection type, mapped type, conditional type, type alias, variant, type inference / inference, type annotation, type hint, type safety, type system, type checking, static analysis, type narrowing, type guard, structural typing, duck typing, nominal typing, typeof, newtype pattern, existential, `any`, `unknown`, non-null assertion, null safety, nullable.
**Rust 所有权**:ownership, lifetime / lifetimes, borrow / borrowing, borrow checker, move semantics, sink parameter, RVO / NRVO, smart pointer (unique_ptr, shared_ptr, weak_ptr, make_unique/make_shared), Arc, Mutex, Cow, unwrap, Box, Rc, RefCell, Send, Sync, `pub`, `pub(crate)`, unsafe, FFI.
**函数式/特性**:closure, generator, iterator, lazy evaluation, recursion, memoization, curry / currying, partial application, monad, functor, immutability / immutable, mutation, copy-on-write, side effect, pure function / pure, higher-order function, decorator, context manager, macro (Rust/Vue compiler macros), pattern matching, destructuring, exhaustive matching / exhaustiveness, spread operator, rest parameters, early return, guard clause, DSL / Domain Specific Language, railway-oriented programming, computation expression, pipe operator (`|>`), scope function (let/run/apply/also/with), extension function, Elvis operator (`?:`), safe call (`?.`), `value class`, delegation, `@DslMarker`, sequence, `GlobalScope`, `NonCancellable`, `ensureActive`, significant whitespace, EAFP, LBYL, list/dict/set comprehension, dataclass, NamedTuple, `__slots__`, f-string, `pathlib`, `Protocol`, `TypeVar`, concept, constexpr, consteval, constinit, enum class, forward reference, SFINAE, CRTP, ABI, template.
**React/Vue 概念**:hook (React), rules of hooks, dependency array, React.memo, useMemo, useCallback, useState, useReducer, useRef, useSyncExternalStore, useImperativeHandle, useEffect, useFormStatus, useFormState, useActionState, useOptimistic, useTransition, use(), context (React Context), provider, render prop, prop drilling, compound component, container/presentational component (Smart/Dumb), forwardRef, ref forwarding, fragment, portal / createPortal, Suspense, Error Boundary, hydration / hydrate, SSR, SSG / Prerendering, CSR, reconciliation, render / rendering, re-render, state management, state machine, optimistic update / optimistic UI, rollback, snapshot, cache / caching, cache invalidation, revalidation / revalidate, stale-while-revalidate, polling, mutation, query / queryKey, queryOptions, invalidateQueries, reference equality, value semantics, SFC / Single-File Component, `<script setup>`, Composition API, Options API, v-model, defineProps, defineEmits, defineModel, defineExpose, withDefaults, definePageMeta, defineStore, defineEventHandler, defineNuxtRouteMiddleware, defineVitestConfig, defineVitestProject, ref (Vue), reactive (Vue), computed, watch / watcher, watchEffect, toRefs, storeToRefs, toValue, MaybeRefOrGetter, nextTick, provide / inject, InjectionKey, lifecycle hook, onMounted, onUnmounted.
**Angular 概念**:change detection, OnPush, markForCheck, detectChanges, standalone component, functional guard, resolver, interceptor, Pipe, directive, NgModule, InjectionToken, inject(), signal, linkedSignal, resource, effect, afterRenderEffect, toSignal, firstValueFrom, takeUntilDestroyed, DestroyRef, input, output, ViewEncapsulation, canMatch, canActivate, CanActivateFn, CanMatchFn, ResolveFn, provideRouter, withViewTransitions, provideHttpClient, withInterceptors, HttpInterceptorFn, View Transitions API, TransferState, isPlatformBrowser, DOCUMENT token.
**HarmonyOS 概念**:LazyForEach, NavPathStack, NavDestination, ability, EntryAbility, AbilityKit, BuildProfile, module.json5, oh-package.json5, build-profile.json5.
**原则**:KISS, DRY, YAGNI, SOLID, composition over inheritance, least surprise, fail fast, zero value, make illegal states unrepresentable, parse don't validate, return early, magic number, code smell, taint, taint mode, DTO / Data Transfer Object, value object, entity, ViewModel, MVVM, MVC, expect/actual (KMP), bug, log, thread, token.

---

### 5. 架构与设计模式
Repository Pattern, Service Layer, Dependency Injection / DI, Constructor Injection, field injection, Inversion of Control / IoC, composition root, service locator (anti-pattern), Factory, Abstract Factory, Builder / Builder Pattern, Builder (DSL), Singleton, Prototype, Observer, Adapter, Decorator, Facade, Proxy, Bridge, Composite, Flyweight, Command, Iterator, Mediator, Memento, State, Strategy, Template Method, Visitor, Chain of Responsibility, Middleware / Middleware Pattern, Pipeline / Pipeline Pattern, Compound Components, Container/Presentational split, Render Props / Slots, Clean Architecture, Hexagonal Architecture (Ports and Adapters), Onion Architecture, Layered Architecture, SOLID, Single Responsibility Principle, separation of concerns, cohesion, coupling, modularity, scalability, statelessness, Feature-Sliced Design / FSD, DDD (Domain-Driven Design), bounded context, aggregate, aggregate root, domain event, domain service, application service, use case, anti-corruption layer, CQRS, Event Sourcing, Event-Driven Architecture, Eventual Consistency, saga pattern, outbox pattern, strangler fig pattern, BFF (Backend for Frontend), microservices, monolith, modular monolith, monorepo, multi-tenancy, ADR (Architecture Decision Record), feature-first, vertical slice, Rule of Zero, Rule of Five, RAII (Resource Acquisition Is Initialization), Sealed Types, Newtype Pattern, Railway-Oriented Programming, Actor Pattern, Protocol-Oriented Design / Protocol-Oriented Programming, Functional Options, BLoC Pattern, UseCase Pattern, ViewModel Pattern, API Response Envelope / envelope, API gateway, service mesh, sidecar, message bus, message queue, pub/sub, event broker, load balancing, defense in depth, least privilege, RLS (Row Level Security), anti-pattern (Big Ball of Mud, Golden Hammer, Premature Optimization, Not Invented Here, Analysis Paralysis, God Object, Tight Coupling, Magic).

---

### 6. 测试与质量
TDD / Test-Driven Development, BDD / Behavior-Driven Development, RED-GREEN-REFACTOR (RED / GREEN / REFACTOR), E2E / End-to-End, unit test, integration test, smoke test, regression test, characterization test, contract test, mutation testing, property-based testing, golden test / golden file, snapshot test / snapshot, visual regression, parameterized test, table-driven test / test table, test pyramid, test isolation, test harness, test runner, test framework, test suite, test plan, coverage threshold, watch mode, happy path, edge case, flaky / flaky test, deterministic wait, quarantine, AAA Pattern / Arrange-Act-Assert, assertion, fluent assertion, matcher, mock / mocking, stub, spy, fake (Fakes Over Mocks), fixture, test double, code coverage / coverage, line coverage, branch coverage, function coverage, coverage target, Page Object Model / POM, data-testid, testID, data-cy, code review, build error, build fix, linter / linting, error boundary, Crashlytics, Sentry, profiler, React DevTools, Hermes sampling profiler, performance monitor, pass@k, pass^k, eval-driven development (EDD), LLM-as-judge, model grader, code grader, rule grader, regression eval, capability eval.
**测试注解/标识**:`@Test`, `@ParameterizedTest`, `@Nested`, `@DisplayName`, `@ExtendWith`, `@Mock`, `@Testcontainers`, `@Container`, `@CsvSource`, `@Fact`, `@Property`, `[Fact]`, `[Property]`, `#[test]`, `#[tokio::test]`, `#[cfg(test)]`, `#[rstest]`, `#[case]`, `mock!`.
**测试框架/工具**:Jest, Vitest, Mocha, Chai, Testing Library, nock, sinon, unittest, GoConvey, testify, Kotest, Spek, MockK, MSW / Mock Service Worker, Jacoco / JaCoCo, Istanbul, gcov, lcov, coverage.py, Codecov, bun:test, GoogleTest / gtest / gmock, CTest / ctest, sanitizers (AddressSanitizer, UndefinedBehaviorSanitizer), `-fsanitize=address,undefined`, Criterion, cargo-llvm-cov, `--fail-under-lines`, `--coverage`, Swift Testing (`import Testing`, `#expect`), FsCheck, Unquote, FsUnit.xUnit, PHPUnit, Pest, AssertableInertia, Maestro, Detox, Appium, Lighthouse, Core Web Vitals / CWV, axe, vitest-axe, jest-axe, happy-dom, Testcontainers, WebApplicationFactory, MockMvc, REST Assured, Dev Services, FluentAssertions, Moq, NSubstitute, Turbine, Room.inMemoryDatabaseBuilder, JdbcSqliteDriver, TestbedHarnessEnvironment, HarnessLoader, MatButtonHarness, RouterTestingHarness, ComponentFixture, TestBed, provideHttpClientTesting, HttpTestingController, fakeAsync, tick, waitForAsync, compileComponents, setInput, componentRef, renderHook, act / act(), userEvent, fireEvent, waitFor, `findBy*` / `getBy*` / `queryBy*`, screen, render, mount, shallowMount, trigger, setValue, flushPromises, createTestingPinia, RouterLinkStub, mountSuspended, renderSuspended, mockNuxtImport, mockComponent, registerEndpoint, setupServer, HttpResponse, ProviderContainer, overrideWithValue, ProviderScope, pumpWidget, matchesGoldenFile, blocTest, FakeAsync / fakeAsync, MockEngine (Ktor), advanceUntilIdle, @ohos/hypium, @ohos.UiTest, Driver, ON, assertEqual, assertFalse, assertTrue, Test2::V0, done_testing, prove.

---

### 7. DevOps / 基础设施 / 部署
**CI/CD**:CI/CD, CI, CD, pipeline, GitHub Actions, GitLab CI, CircleCI, Travis CI, Jenkins, build matrix, artifact, runner, workflow, stage, step, deployment gate, pre-commit, pre-release.
**容器/编排**:Docker, Docker Compose / docker-compose, Dockerfile, multi-stage build, container, image, OCI, podman, containerd, Kubernetes / K8s, kubectl, pod, Deployment, Service, Ingress, ConfigMap, Secret, Namespace, ServiceAccount, Role, RoleBinding, ClusterRole, ClusterRoleBinding, RBAC, HPA (Horizontal Pod Autoscaler), PDB (PodDisruptionBudget), ResourceQuota, Job, CronJob, Helm, Kustomize, ArgoCD, Flux, GitOps, skaffold, tilt, k3s, OpenShift.
**部署策略**:deployment, release, release build, debug build, dev mode, rolling deployment, blue-green deployment, canary / canary deployment, feature flag, dark launch, progressive delivery, shadow traffic, A/B test, staging, production, rollback / rollback plan, rollout, maintenance window, strangler approach, OTA / Over-the-Air Updates, EAS Build, EAS Submit, EAS Update, expo-updates, runtime version.
**云/平台**:AWS (EC2, S3, RDS, Lambda, CloudFront, SQS, SNS, ECS, EKS, Fargate), GCP, Azure, Vercel, Netlify, Cloudflare (Workers, Pages), wrangler, Heroku, Fly / Fly.io, Render, Railway, Upstash, Cloud Run, DigitalOcean, Linode, GraalVM, native image.
**移动发布**:signing, signing credentials, keystore, provisioning profile, App Store, Play Store, crash reporting, New Architecture (Fabric + TurboModules), obfuscation, ProGuard, R8, `--split-debug-info`, symbolication.
**可靠性**:SLA, SLO, SLI, error budget, MTTR, MTBF, runbook, postmortem, on-call, chaos engineering, game day, incident, grace period, circuit breaker, bulkhead, retry, backoff, exponential backoff, jitter, graceful shutdown, rate limit, kill switch, PM2, ecosystem.config, Nginx, nginx, HAProxy, Envoy, Caddy, Traefik, ALB, NLB, reverse proxy, load balancer (L4, L7), CDN, edge cache.
**探针**:health check, liveness probe, readiness probe, startup probe, CrashLoopBackOff, OOMKilled, ImagePullBackOff.
**可观测性**:observability, monitoring, alerting, logging, structured logging, audit trail / audit log, metrics, dashboard, telemetry, tracing, distributed tracing, span, trace, Grafana, Prometheus, Datadog, New Relic, Splunk, PagerDuty, StatsD, Graphite, Loki, Tempo, Jaeger, Zipkin, OpenTelemetry / OTel / OTLP, Honeycomb, Lightstep, PromQL, LogQL, Sentry, Dependabot, Renovate.
**IaC/配置**:Terraform, Pulumi, Ansible, Chef, Puppet, Twelve-Factor App, env var / environment variable, .env, sandbox, isolation boundary.
**进程/信号**:exit code, stderr, stdout, stdin, signal, spawn, spawnSync, background job, queue, runtime.
**性能**:Lighthouse, Core Web Vitals / Web Vitals / CWV, LCP, INP, CLS, FCP, TTFB, TBT, performance budget, bundle size, bundle budget, gzipped, render-blocking, above-the-fold, hero image.

---

### 8. 协议 / 标准 / 格式
**Web/网络协议**:HTTP, HTTPS, HTTP/2, HTTP/3 (QUIC), HTTP 402, REST, GraphQL, gRPC, WebSocket, Server-Sent Events / SSE, WebRTC, WebTransport, SOAP, JSON-RPC, mTLS / mutual TLS, TLS, certificate pinning, deep link, universal link.
**数据格式**:JSON, YAML, TOML, JSON5 / json5, JSON-LD, JSONL, CSV, TSV, XML, Parquet, ORC, Avro, Arrow, MsgPack, BSON, Protobuf / Protocol Buffers / protobuf, Thrift, CBOR, frontmatter, Markdown (GFM), MDX, MIME / MIME type.
**API 规范**:OpenAPI, Swagger, JSON Schema, AsyncAPI, gRPC IDL, RAML, RFC 7807 (Problem Details).
**编码**:UTF-8, UTF-16, UTF-32, ASCII, base64, hex, URL encoding.
**Web/安全头标准**:CORS, CSP / Content Security Policy / Content-Security-Policy, nonce, `unsafe-inline`, `unsafe-eval`, script-src, style-src, default-src, img-src, font-src, connect-src, frame-src, object-src, base-uri, frame-ancestors, HSTS / Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, SRI / Subresource Integrity, httpOnly, Secure, SameSite, SameSite=Strict / Lax, double-submit cookie, origin verification, cookie / cookies, session.
**无障碍/SEO 标准**:WCAG (2.2, Level AA / AAA), WAI-ARIA / ARIA, a11y / accessibility, POUR, hreflang, canonical, robots.txt, sitemap, schema.org structured data, BCP 47.
**文件/媒体格式**:PDF, DOCX, XLSX, PPTX, MP4, MOV, WebM, GIF, PNG, JPEG, WebP, AVIF, SVG, HEIC, tar, gzip, brotli, zstd, SRT (subtitle).
**正则/其他**:regex / regular expression, SPDX, MIT license.

---

### 9. 数据库与存储
**关系型**:PostgreSQL / Postgres, MySQL, MariaDB, SQLite, CockroachDB, TiDB, YugabyteDB, MSSQL / SQL Server, Oracle, Amazon Aurora.
**NoSQL/键值/图**:MongoDB, Cassandra, ScyllaDB, DynamoDB, Couchbase, Redis, Valkey, Memcached, Dragonfly, Hazelcast, etcd, FoundationDB, Neo4j, ArangoDB, Dgraph.
**分析/列式/时序/搜索**:ClickHouse, Druid, Pinot, DuckDB, Trino, Presto, Snowflake, BigQuery, Redshift, InfluxDB, TimescaleDB, Elasticsearch, OpenSearch, Meilisearch, Typesense, Solr.
**向量**:pgvector, FAISS, HNSW, Annoy, Milvus, Qdrant, Weaviate, Pinecone, Chroma, LanceDB, vector database, vector search.
**ORM/驱动**:Prisma, TypeORM, Drizzle, Knex, Kysely, Sequelize, SQLAlchemy, Alembic, psycopg, asyncpg, Diesel, sqlx, Eloquent, Hibernate, Panache, Active Record, Exposed, EF Core, Dapper, ADO.NET, JDBC, JdbcTemplate, Room, SQLDelight, drift, sqflite, DBI, DBIx::Class, AsyncSession, SessionLocal.
**迁移/概念**:migration, schema migration, expand-and-contract migration, seed, backfill, up/down migration, drift detection, schema, transaction, ACID, isolation level, MVCC, row-level security / RLS, UPSERT, cursor pagination, keyset pagination, OFFSET pagination, N+1 / N+1 query, prepared statement / PreparedStatement, parameterized query, stored procedure, trigger, foreign key, JOIN, LEFT JOIN, SELECT, FOR UPDATE, SKIP LOCKED, EXPLAIN ANALYZE, soft delete, optimistic/pessimistic lock, optimistic concurrency, CAS (Compare-and-Swap), sharding, partitioning, index, B-tree, GIN, BRIN, composite index, covering index, partial index, unique index, materialized view, read replica, primary/replica, master/slave, connection pool / pooling (HikariCP, PgBouncer, Supabase pooler), DataLoader.
**缓存模式**:cache-aside, write-through, write-behind, TTL, eviction policy (LRU, LFU), stampede prevention, invalidation, cache hit/miss, probabilistic early expiry.
**Redis 特有**:Pub/Sub, Streams, consumer group, Lua script, MULTI/EXEC, Redlock, sentinel, cluster mode, SCAN, KEYS, HyperLogLog, Bloom filter, sorted set, INCR.
**本地存储**:localStorage, sessionStorage, SharedPreferences, EncryptedSharedPreferences, MMKV, AsyncStorage, expo-secure-store, Keychain / Keychain Services, Keystore, HUKS.
**密钥管理**:secret manager, Vault, AWS Secrets Manager, AWS KMS, Cloud KMS, SOPS, Sealed Secrets, External Secrets Operator / ESO, HSM, Doppler, Infisical.

---

### 10. 工具链 / CLI / 构建
**包管理器**:npm, pnpm, yarn, bun, deno, npx, `npm exec`, `npm audit`, pip, pipx, poetry, uv, pipenv, conda, cargo, go modules, gem, bundler, composer, pub, CocoaPods, SPM / Swift Package Manager, Gradle / gradle, `./gradlew`, Maven / mvn, `./mvnw`, nix, homebrew, apt, dnf.
**构建工具**:Make, Makefile, Justfile, CMake, Ninja, Bazel, Buck, Pants, MSBuild, xcodebuild, Webpack, Rollup, Rolldown, esbuild, SWC, Vite, Turbopack, Parcel, Rspack, Rsbuild, Turborepo, nx, craco, react-app-rewired.
**lock/manifest 文件**:package.json, package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb, Cargo.toml, Cargo.lock, go.mod, go.sum, pom.xml, build.gradle, build.gradle.kts, settings.gradle.kts, gradle.properties, pyproject.toml, requirements.txt, tsconfig.json, vite.config, next.config, analysis_options.yaml, pubspec.yaml, composer.json, composer.lock, Gemfile, Gemfile.lock, gemspec, Rakefile, .csproj, .sln, .slnx, Directory.Build.props, Directory.Build.targets, Package.swift, .xcconfig, module.json5, oh-package.json5, build-profile.json5, lock file, dependency, transitive dependency, version conflict, resolution, overrides, dedupe, BROWSERSLIST, browserslist.
**Linter/Formatter**:ESLint, Prettier, Biome, Stylelint, Commitlint, EditorConfig, tsc, vue-tsc, `tsc --noEmit`, nuxi typecheck, gofmt, goimports, golangci-lint, staticcheck, go vet, govulncheck, Ruff, Black, isort, mypy, pylint, bandit, Clippy, rustfmt, detekt, ktlint, ktfmt, Checkstyle, Spotless, SpotBugs, google-java-format, SwiftFormat, SwiftLint, swift-format, RuboCop, PHP CS Fixer / PHP-CS-Fixer, Laravel Pint, PHPStan, Psalm, clang-format, clang-tidy, cppcheck, perltidy, perlcritic, linter / lint, formatter / format, type checker / typecheck / type-check, static analysis, transpile / transpiler.
**CLI/通用工具**:CLI, shell, bash, zsh, fish, PowerShell / pwsh, tmux, Zellij, iTerm2, Windows Terminal, node, gh / GitHub CLI, gmail CLI, jq, yq, fd, ripgrep / rg, fzf, direnv, starship, ffmpeg, ImageMagick, pandoc, Xcode, Android Studio, Instruments, WSL.
**安全审计工具**:npm audit, pip-audit, safety, cargo audit, cargo deny, cargo tree, trivy, Snyk, Dependabot, OWASP Dependency-Check, composer audit, bundle-audit / bundler-audit, brakeman, gitleaks, gosec.
**元工具/git hook**:husky, lint-staged, semantic-release, changesets, commitlint, lefthook, pre-commit.

---

### 11. Git / 版本控制 / 协作
Git / git, GitHub, GitLab, Bitbucket, Gitea, branch, feature branch, base branch, target branch, main, HEAD, origin, upstream, fork, clone, commit / commit message, conventional commits / Conventional Commits, commit types (feat, fix, docs, style, refactor, test, chore, perf, ci, revert, build), Pull Request / PR, Merge Request / MR, draft PR, merge, merge conflict, mergeable, merge readiness, squash / squash merge, rebase / rebase merge, merge commit, cherry-pick, revert, reset (soft/hard/mixed), stash / git stash, tag, annotate, blame, reflog, submodule, worktree / git worktree, Jujutsu / jj, `--force-with-lease`, force push, protected branch, CODEOWNERS, conflict, conflict marker, three-way merge, fast-forward, Semantic Versioning / SemVer (MAJOR.MINOR.PATCH), changelog / CHANGELOG, release notes, pre-release, release, attribution, code search, branching strategy (GitHub Flow, trunk-based development, GitFlow, release flow), epic, issue, ticket, Jira, JQL, GitHub issue template, contributing guidelines / CONTRIBUTING, LICENSE, README, coordination, pre-commit hook, commit-msg hook, pre-push hook.

---

### 12. 安全 / 合规
**认证/授权**:authentication, authorization, OAuth, OAuth2, OpenID Connect / OIDC, SAML, SSO, SCIM, JWT / JSON Web Token, bearer token, refresh token, API key, mTLS / mutual TLS, RADIUS, TACACS+, RBAC.
**Web 漏洞**:OWASP, OWASP Top 10, Injection, SQL injection / SQLi, NoSQL injection, XSS / Cross-Site Scripting, CSRF / Cross-Site Request Forgery, SSRF / Server-Side Request Forgery, XXE, IDOR, RCE / Remote Code Execution, clickjacking, path traversal, command injection, insecure deserialization, broken authentication, broken access control, misconfiguration, mass assignment, prototype pollution, Open Redirect, prompt injection.
**密码学**:hash (SHA-256, SHA-512, SHA-3, BLAKE2, MD5 deprecated), HMAC, password hashing (Bcrypt / bcrypt, Argon2 / argon2, scrypt, PBKDF2), salt, nonce, IV, KDF / key derivation function, AES (GCM, CBC, CTR), RSA, ECDSA, Ed25519, secp256k1, ChaCha20-Poly1305, X25519, AEAD, MAC, HKDF, key rotation, PGP / GPG, SSH key, X.509 certificate, CSR, CA / Certificate Authority, PKI.
**概念/工具**:vulnerability, secret / secrets, hardcoded secrets / hardcoded credentials, secrets scanning / secret detection, sanitization / sanitize / sanitized, escape / escaping, allowlist / allowlisting, denylist / denylisting, input validation, rate limiting, throttling, brute force, honeypot, CAPTCHA, SAST, DAST, IAST, SCA / Software Composition Analysis, SBOM, CVE, zero trust / zero-trust, principle of least privilege, defense in depth, secure headers, dependency scanning, penetration testing, threat modeling, STRIDE, security hardening, security review, decompilation, `bypassSecurityTrust*`, `bypassSecurityTrustHtml`, `dangerouslySetInnerHTML`, `html_safe`, `raw`, `@JavascriptInterface`, JavaScriptMode, NavigationDelegate, `shouldOverrideUrlLoading`, FLAG_SECURE, NSAppTransportSecurity, network_security_config.xml, cleartext traffic, BiometricPrompt, biometric authentication, local_auth.
**合规/法规**:HIPAA, PHI / Protected Health Information, PII / Personally Identifiable Information, BAA / Business Associate Agreement, GDPR, CCPA, SOC 2, ISO 27001, PCI DSS, FedRAMP, NIST, HiTrust, DISHA.
**医疗**:FHIR, HL7, ICD-10, CPT, SNOMED, EHR / Electronic Health Record, EMR, MRN, CDSS / Clinical Decision Support System, clinical workflow, patient safety, minimum necessary access.
**区块链安全**:reentrancy, CEI / Checks-Effects-Interactions, TWAP oracle, flash loan / flash loan attack, MEV / Maximal Extractable Value, front-running, slippage, ERC-20, ERC-721, ERC-1155, ERC-4337, non-custodial wallet.

---

### 13. AI / ML 术语
**基础**:LLM / Large Language Model, SLM, transformer, attention, self-attention, encoder, decoder, embedding, token, tokenizer (BPE, tiktoken), context window, prompt, system prompt, completion, inference, fine-tune / fine-tuning, instruction tuning, RLHF, DPO, PPO, SFT, GRPO, distill / knowledge distillation, quantization, LoRA, QLoRA, PEFT, RAG / Retrieval-Augmented Generation.
**推理参数**:temperature, top-p, top-k, beam search, sampling, max tokens, stop sequence, logprobs.
**检索/向量**:embedding model, similarity (cosine, dot product), nearest neighbor, cross-encoder, reranker, two-tower model, semantic search, hybrid search, BM25.
**Agent/工具**:agent, autonomous agent, ReAct / Reason+Act, chain-of-thought / CoT, few-shot, zero-shot, tool use, tool-call, function calling, prompt engineering, prompt caching, prompt injection, system prompt, MCP, MCP server, MCP tool, sub-agent, agent harness.
**训练**:model training, training loop, gradient, backpropagation, optimizer (SGD, Adam, AdamW), loss function, learning rate, batch size, epoch, checkpoint, state_dict, mixed precision / AMP, gradient checkpointing, gradient clipping, dropout, BatchNorm, LayerNorm, weight init (Kaiming, Xavier), early stopping, learning rate schedule, transfer learning.
**数据/评估**:training data, validation set, test set, holdout, cross-validation, overfitting, underfitting, regularization (L1, L2, Lasso, Ridge), data augmentation, dataset, DataLoader, collate, batch; eval, eval harness, benchmark, pass@k, pass^k, LLM-as-judge, model grader, code grader, rule grader, regression eval, capability eval.
**流水线/部署**:cost-aware pipeline, model routing, prompt caching, batch inference, streaming response; vLLM, llama.cpp, Ollama, LM Studio, modal, replicate, runpod, together, fireworks, groq, ONNX, TensorRT, Apple Intelligence, FoundationModels / on-device LLM, `@Generable`, guided generation.
**模型提供商**:Anthropic (Claude, Opus, Sonnet, Haiku), OpenAI (GPT-4, GPT-5), Google (Gemini), Meta (Llama, Mixtral, Mistral), Microsoft (Phi), Alibaba (Qwen), DeepSeek, Hugging Face, Cohere, Mistral.
**媒体 AI**:fal.ai, text-to-image (Nano Banana, DALL-E, Stable Diffusion), text-to-video (Seedance, Kling, Veo 3), text-to-speech (CSM-1B), video-to-audio (ThinkSound).
**推荐系统**:recommendation system / recsys, candidate generation, ranking, feed pipeline, scorer, hydrator, selector, multi-action prediction, diversity reranking, MMR / Maximal Marginal Relevance.

---

### 14. 其他(网络 / 金融 / 物流 / 能源 / 科学 / 设计 / 平台 OS / 领域专有名词)

**网络/运维**:BGP (Idle, Connect, Active, OpenSent, OpenConfirm, Established), OSPF, EIGRP, IS-IS, MPLS, VXLAN, VLAN, VPN, VPNv4, EVPN, CIDR, ASN / Autonomous System Number, AFI/SAFI, VRF, IPv4, IPv6, address family, TCP, UDP, ICMP, ARP, BPF, eBPF, STP, RSTP, DHCP, DNS, DDNS, mDNS, WireGuard, OpenVPN, IPsec, Tailscale, pfSense, OPNsense, UniFi, Pi-hole, AdGuard, iptables, nftables, conntrack, MASQUERADE, SNAT, DNAT, NET_BIND_SERVICE, loopback, PersistentKeepalive, split tunnel, full tunnel, NetFlow, sFlow, SNMP, syslog, NX-API, NETCONF, YANG, RESTCONF, Cisco IOS, IOS-XE, running-config, startup-config, ACL, wildcard mask, route-map, prefix-list, BRI/PRI, BGP route-refresh, Netmiko, TextFSM, NAPALM, Nornir, Ansible network, Scrapli, HTTP 状态码 (200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504), HTTP 方法 (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD).

**金融/区块链/贸易**:Stripe, MRR, ARR, chargeback, refund, dispute, subscription, per-seat billing, entitlement, checkout, churn, dunning; EVM / Ethereum Virtual Machine, Ethereum, Bitcoin, Solana, Base, Polygon, Optimism, Arbitrum, zkSync, Starknet, Cosmos, Polkadot, Layer 2 / L2, rollup, ZK rollup, optimistic rollup, gas, gas limit, gas price, AMM / Automated Market Maker, LP token, liquidity pool, Uniswap, TWAP, VWAP, oracle; HFT / high-frequency trading, orderbook, p50/p95/p99 latency, market data, execution gateway, trading bot, on-chain, wallet, private key, seed phrase, custody, non-custodial; Carmack Amendment, COGSA, Hague-Visby, Montreal Convention, force majeure.

**物流/制造/供应链**:LTL / Less Than Truckload, FTL / Full Truckload, BOL / Bill of Lading, POD / Proof of Delivery, OS&D / Over Short & Damage, TMS, WMS, ERP, MRP, MES, CMMS, SOP, SAP PP, Theory of Constraints / TOC, Drum-Buffer-Rope / DBR, SMED, OEE, heijunka, JIT / Just-in-Time, kanban, BOM / Bill of Materials, routing, work order, changeover, WIP / Work in Process, bottleneck, finite-capacity scheduling / FCS, EDD, SPT; HS / Harmonized System, HTS, TARIC, Schedule B, GRI, Incoterms, FTA / Free Trade Agreement, USMCA, FTZ / Foreign Trade Zone, ISF 10+2, ACE, CF-28/CF-29, OFAC SDN list, denied party screening; detention, accessorial charges, reefer, drayage, chassis.

**能源**:PPA / Power Purchase Agreement, TOU / Time of Use, RTP / Real-Time Pricing, demand charge, capacity charge, PLC / Peak Load Contribution, ISO-NE, PJM, ERCOT, NYISO, CAISO, node-to-hub spread, basis risk, hedge, polar vortex, virtual PPA, block-and-index, ancillary services, T&D / transmission and distribution, kW, kWh, MWh.

**科学/生物信息学**:PubMed, MEDLINE, MeSH / Medical Subject Headings, PMID, DOI, NCBI E-utilities, PubMed Central, USPTO, BLAST, BLAT, Ensembl, gene, transcript, protein, genome, reference genome, gget, Biopython, Snakemake, Nextflow, BLAST+, USPSTF.

**营销/商业/预测**:JTBD / jobs-to-be-done, CTA / Call to Action, landing page, BOGO, MOQ, EOQ, MAPE, GMROI, ABC/XYZ analysis, fill rate, safety stock, lead time, SES, Holt-Winters, Holt's, STL, X-13ARIMA-SEATS, exponential smoothing.

**设计/媒体**:iOS 26, Liquid Glass, glass effect, GlassEffectContainer, UIGlassEffect, accented rendering mode, glassmorphism, neo-brutalism, bento layout, scrollytelling, editorial, Swiss / International, retro-futurism, dark mode / dark theme, light theme, design system, design token / design tokens, CSS custom properties / CSS variable, utility class, motion, transition, keyframe, easing (linear, spring, cubic-bezier), transform, opacity, clip-path, will-change, requestAnimationFrame, IntersectionObserver, `font-display: swap`, subset, font family, preload, prefetch, lazy-load / lazy loading, debounce, virtualization, bundle, source map / sourcemap, tree-shake / tree-shaking, minification, lottie, Remotion, Manim, ffmpeg, semantic HTML, focus / focus order, live region, touch target, hitSlop, Dynamic Type, prefers-reduced-motion, reduced motion, color contrast, screen reader, VoiceOver, TalkBack, compositor-friendly.

**操作系统/平台**:macOS, Linux, Windows, iOS, iPadOS, Android, tvOS, watchOS, visionOS, Raspberry Pi, Alpine, Ubuntu, Debian, POSIX, systemd.

**商业/合同通用**:IP / Intellectual Property, NDA / Non-Disclosure Agreement, SOW / Statement of Work, RFP / Request for Proposal, RFQ, SLA, OKR, KPI, ROI, NPV, TCO, MoSCoW.

**杂项概念**:AST, heuristic, deterministic, idempotent / idempotency, monotonic, eventual consistency / eventual convergence, CAP theorem, webhooks / webhook, Action Cable, Turbo Stream, HAP (HarmonyOS Ability Package), data-driven, evidence-based.

---

## 文件扩展名(全部保留英文)
.ts, .tsx, .js, .jsx, .vue, .py, .go, .rs, .java, .kt, .kts, .swift, .cs, .fs, .fsx, .cpp, .hpp, .cc, .hh, .cxx, .h, .dart, .php, .rb, .pl, .pm, .t, .psgi, .cgi, .ets, .md, .json, .yaml, .yml, .toml, .json5, .tsbuildinfo, .gitignore.

---

## 使用与维护

**翻译流程**:
1. 译到一个术语时,先查本表;命中则保留英文原词。
2. 未命中时,按"翻译总原则"8 条规则判断;仍不确定时保留英文(保守策略,因保留英文不会损害 AI 理解,误译才会)。
3. 代码块、frontmatter、命令行示例、文件路径中的内容**一律不译**。

**重要提醒**:
- `agents/` 每个文件都有的 "Prompt Defense Baseline" 段落含大量平台/安全术语(homoglyph、zero-width character、prompt injection、token window overflow 等),这些词在所有文件重复出现,翻译时保持一致。
- severity 等级(`CRITICAL`/`HIGH`/`MEDIUM`/`LOW`)、review verdict(`APPROVE`/`BLOCK`/`REQUEST CHANGES`/`WARNING`/`PASS`/`FAIL`)作为枚举值必须保留英文,以保证 AI 行为一致。
- `事件:名称` 形式的 hook 标识(如 `stop:cost-tracker`、`post:quality-gate`)整体保留。
- 环境变量/占位符(`$ARGUMENTS`、`$PWD`、`CLAUDE_PLUGIN_ROOT`、`CLAUDE_PACKAGE_MANAGER` 等)原样保留。

**本表来源**:由 3 个 Explore agent 并行通读 `rules/`(122)+`hooks/`(4)、`agents/`(67)+`commands/`(92)、`skills/`(448)后合并去重产生。skills 下 200+ skill 名均为 kebab-case 标识符,规则统一(全部保留英文),表中只列代表性样例,翻译时遇到任何 skill 目录名/SKILL.md 标题标识都保留英文。

**验证**:抽样校验——任取若干已译文件,确认 (a) 表中专有名词未被中译、(b) 代码块/frontmatter/路径未被动、(c) 通用工程词已中译;三者齐备即合格。
