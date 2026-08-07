---
name: iterative-retrieval
description: 逐步精炼上下文检索以解决 subagent 上下文问题的模式
metadata:
  origin: ECC
---

# 迭代检索模式

解决多 agent 工作流中的“上下文问题”——subagent 在开始工作之前并不知道自己需要什么上下文。

## 何时激活

- 派生无法预先预测所需代码库上下文的 subagent
- 构建逐步精炼上下文的多 agent 工作流
- 在 agent 任务中遇到“上下文过大”或“缺失上下文”的失败
- 为代码探索设计类 RAG 的检索 pipeline
- 优化 agent orchestration 中的 token 用量

## 问题所在

subagent 在派生时只携带有限的上下文。它们不知道：
- 哪些文件包含相关代码
- 代码库中存在哪些模式
- 项目使用什么术语

标准方法都会失败：
- **全部发送**：超出 context limit
- **什么都不发**：agent 缺少关键信息
- **猜测所需内容**：常常猜错

## 解决方案：迭代检索

一个逐步精炼上下文的 4 阶段循环：

```
┌─────────────────────────────────────────────┐
│                                             │
│   ┌──────────┐      ┌──────────┐            │
│   │ DISPATCH │─────│ EVALUATE │            │
│   └──────────┘      └──────────┘            │
│        ▲                  │                 │
│        │                  ▼                 │
│   ┌──────────┐      ┌──────────┐            │
│   │   LOOP   │─────│  REFINE  │            │
│   └──────────┘      └──────────┘            │
│                                             │
│        Max 3 cycles, then proceed           │
└─────────────────────────────────────────────┘
```

### 阶段 1: DISPATCH

初始宽泛查询，用于收集候选文件：

```javascript
// 从高层意图开始
const initialQuery = {
  patterns: ['src/**/*.ts', 'lib/**/*.ts'],
  keywords: ['authentication', 'user', 'session'],
  excludes: ['*.test.ts', '*.spec.ts']
};

// 派发给检索 agent
const candidates = await retrieveFiles(initialQuery);
```

### 阶段 2: EVALUATE

评估检索内容的相关性：

```javascript
function evaluateRelevance(files, task) {
  return files.map(file => ({
    path: file.path,
    relevance: scoreRelevance(file.content, task),
    reason: explainRelevance(file.content, task),
    missingContext: identifyGaps(file.content, task)
  }));
}
```

评分标准：
- **High (0.8-1.0)**：直接实现目标功能
- **Medium (0.5-0.7)**：包含相关的模式或类型
- **Low (0.2-0.4)**：略微相关
- **None (0-0.2)**：不相关，排除

### 阶段 3: REFINE

基于评估更新搜索条件：

```javascript
function refineQuery(evaluation, previousQuery) {
  return {
    // 添加在高相关性文件中发现的新模式
    patterns: [...previousQuery.patterns, ...extractPatterns(evaluation)],

    // 添加在代码库中发现的术语
    keywords: [...previousQuery.keywords, ...extractKeywords(evaluation)],

    // 排除已确认不相关的路径
    excludes: [...previousQuery.excludes, ...evaluation
      .filter(e => e.relevance < 0.2)
      .map(e => e.path)
    ],

    // 针对特定缺口
    focusAreas: evaluation
      .flatMap(e => e.missingContext)
      .filter(unique)
  };
}
```

### 阶段 4: LOOP

使用精炼后的条件重复执行（最多 3 个循环）：

```javascript
async function iterativeRetrieve(task, maxCycles = 3) {
  let query = createInitialQuery(task);
  let bestContext = [];

  for (let cycle = 0; cycle < maxCycles; cycle++) {
    const candidates = await retrieveFiles(query);
    const evaluation = evaluateRelevance(candidates, task);

    // 检查是否已有足够的上下文
    const highRelevance = evaluation.filter(e => e.relevance >= 0.7);
    if (highRelevance.length >= 3 && !hasCriticalGaps(evaluation)) {
      return highRelevance;
    }

    // 精炼并继续
    query = refineQuery(evaluation, query);
    bestContext = mergeContext(bestContext, highRelevance);
  }

  return bestContext;
}
```

## 实战示例

### 示例 1：Bug 修复上下文

```
Task: "Fix the authentication token expiry bug"

Cycle 1:
  DISPATCH: Search for "token", "auth", "expiry" in src/**
  EVALUATE: Found auth.ts (0.9), tokens.ts (0.8), user.ts (0.3)
  REFINE: Add "refresh", "jwt" keywords; exclude user.ts

Cycle 2:
  DISPATCH: Search refined terms
  EVALUATE: Found session-manager.ts (0.95), jwt-utils.ts (0.85)
  REFINE: Sufficient context (2 high-relevance files)

Result: auth.ts, tokens.ts, session-manager.ts, jwt-utils.ts
```

### 示例 2：功能实现

```
Task: "Add rate limiting to API endpoints"

Cycle 1:
  DISPATCH: Search "rate", "limit", "api" in routes/**
  EVALUATE: No matches - codebase uses "throttle" terminology
  REFINE: Add "throttle", "middleware" keywords

Cycle 2:
  DISPATCH: Search refined terms
  EVALUATE: Found throttle.ts (0.9), middleware/index.ts (0.7)
  REFINE: Need router patterns

Cycle 3:
  DISPATCH: Search "router", "express" patterns
  EVALUATE: Found router-setup.ts (0.8)
  REFINE: Sufficient context

Result: throttle.ts, middleware/index.ts, router-setup.ts
```

## 与 agent 集成

在 agent prompt 中使用：

```markdown
When retrieving context for this task:
1. Start with broad keyword search
2. Evaluate each file's relevance (0-1 scale)
3. Identify what context is still missing
4. Refine search criteria and repeat (max 3 cycles)
5. Return files with relevance >= 0.7
```

## 最佳实践

1. **从宽泛开始，逐步收窄** —— 不要过度限定初始查询
2. **学习代码库术语** —— 第一个循环往往会暴露命名约定
3. **追踪缺失的内容** —— 显式识别缺口驱动精炼
4. **在“足够好”时停止** —— 3 个高相关性文件胜过 10 个平庸文件
5. **自信地排除** —— 低相关性文件不会变得相关

## 相关

- [The Longform Guide](https://x.com/affaanmustafa/status/2014040193557471352) —— subagent orchestration 章节
- `continuous-learning` skill —— 用于随时间改进的模式
- 随 ECC 捆绑的 agent 定义（手动安装路径：`agents/`）
