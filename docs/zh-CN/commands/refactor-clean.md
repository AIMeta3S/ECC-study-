---
description: 安全地识别并移除死代码，并在每次更改后进行验证。
---

# Refactor Clean

在每一步都通过测试验证，安全地识别并移除死代码。

## 第 1 步：检测死代码

根据项目类型运行分析工具：

| 工具 | 查找内容 | 命令 |
|------|--------------|---------|
| knip | 未使用的 exports、文件、依赖 | `npx knip` |
| depcheck | 未使用的 npm 依赖 | `npx depcheck` |
| ts-prune | 未使用的 TypeScript exports | `npx ts-prune` |
| vulture | 未使用的 Python 代码 | `vulture src/` |
| deadcode | 未使用的 Go 代码 | `deadcode ./...` |
| cargo-udeps | 未使用的 Rust 依赖 | `cargo +nightly udeps` |

如果没有可用工具，使用 Grep 查找零 import 的 exports：
```
# 查找 exports，然后检查它们是否在任意位置被 import
```

## 第 2 步：对发现项分类

将发现项按安全等级分类：

| 等级 | 示例 | 操作 |
|------|----------|--------|
| **SAFE** | 未使用的工具函数、测试辅助函数、内部函数 | 放心删除 |
| **CAUTION** | 组件、API 路由、中间件 | 验证没有动态 import 或外部使用方 |
| **DANGER** | 配置文件、入口点、类型定义 | 修改前先调查 |

## 第 3 步：安全删除循环

对每个 SAFE 项：

1. **运行完整 test suite** — 建立基线（全部通过）
2. **删除死代码** — 使用 Edit 工具进行精确移除
3. **重新运行 test suite** — 验证没有破坏任何功能
4. **如果测试失败** — 立即用 `git checkout -- <file>` 还原并跳过此项
5. **如果测试通过** — 进入下一项

## 第 4 步：处理 CAUTION 项

在删除 CAUTION 项之前：
- 搜索动态 import：`import()`、`require()`、`__import__`
- 搜索字符串引用：配置中的路由名称、组件名称
- 检查是否从公共 package API export
- 验证没有外部使用方（若已发布，检查 dependents）

## 第 5 步：合并重复项

移除死代码后，查找：
- 几乎重复的函数（相似度 >80%）— 合并为一个
- 冗余的类型定义 — 合并
- 无价值的 wrapper 函数 — 内联它们
- 无目的的 re-export — 移除间接层

## 第 6 步：总结

报告结果：

```
Dead Code Cleanup
──────────────────────────────
Deleted:   12 unused functions
           3 unused files
           5 unused dependencies
Skipped:   2 items (tests failed)
Saved:     ~450 lines removed
──────────────────────────────
All tests passing PASS:
```

## 规则

- **切勿在未先运行测试的情况下删除**
- **一次删除一项** — 原子化变更使回滚更容易
- **不确定时跳过** — 宁可保留死代码也不要破坏生产环境
- **清理时不要 refactor** — 分离关注点（先清理，后 refactor）
