---
description: 分析覆盖率、识别缺口，并生成缺失的测试以达到目标 threshold。
---

# 测试覆盖率

分析测试覆盖率、识别缺口，并生成缺失的测试以达到 80% 以上的覆盖率。

## 步骤 1：检测测试框架

| 指标 | 覆盖率命令 |
|-----------|-----------------|
| `jest.config.*` 或 `package.json` jest | `npx jest --coverage --coverageReporters=json-summary` |
| `vitest.config.*` | `npx vitest run --coverage` |
| `pytest.ini` / `pyproject.toml` pytest | `pytest --cov=src --cov-report=json` |
| `Cargo.toml` | `cargo llvm-cov --json` |
| `pom.xml` 配合 JaCoCo | `mvn test jacoco:report` |
| `go.mod` | `go test -coverprofile=coverage.out ./...` |

## 步骤 2：分析覆盖率报告

1. 运行覆盖率命令
2. 解析输出（JSON 摘要或终端输出）
3. 列出**覆盖率低于 80%** 的文件，按覆盖率从低到高排序
4. 对每个覆盖不足的文件，识别：
   - 未测试的 function 或 method
   - 缺失的分支覆盖率（if/else、switch、错误路径）
   - 推高分母的 dead code

## 步骤 3：生成缺失的测试

对每个覆盖不足的文件，按以下优先级生成测试：

1. **Happy path** —— 使用有效输入的核心功能
2. **错误处理** —— 无效输入、缺失数据、网络失败
3. **Edge cases** —— 空数组、null/undefined、边界值（0、-1、MAX_INT）
4. **分支覆盖率** —— 每个 if/else、switch case、三元表达式

### 测试生成规则

- 将测试放在源文件旁边：`foo.ts` → `foo.test.ts`（或遵循项目约定）
- 复用项目中已有的测试模式（import 风格、断言库、mocking 方式）
- mock 外部依赖（数据库、API、文件系统）
- 每个测试应相互独立 —— 测试之间不共享可变状态
- 为测试使用描述性命名：`test_create_user_with_duplicate_email_returns_409`

## 步骤 4：验证

1. 运行完整测试套件 —— 所有测试必须通过
2. 重新运行覆盖率 —— 验证改进效果
3. 如果仍低于 80%，对剩余缺口重复步骤 3

## 步骤 5：报告

展示前后对比：

```
Coverage Report
──────────────────────────────
File                   Before  After
src/services/auth.ts   45%     88%
src/utils/validation.ts 32%    82%
──────────────────────────────
Overall:               67%     84%  PASS:
```

## 重点关注区域

- 具有复杂分支的 function（高圈复杂度）
- 错误处理程序和 catch 块
- 跨代码库使用的工具 function
- API 端点处理程序（请求 → 响应流程）
- Edge cases：null、undefined、空字符串、空数组、零、负数
