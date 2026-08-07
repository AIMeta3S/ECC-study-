---
paths:
  - "**/*.pl"
  - "**/*.pm"
  - "**/*.t"
  - "**/*.psgi"
  - "**/*.cgi"
---
# Perl 测试

> 本文件扩展了 [common/testing.md](../common/testing.md)，补充 Perl 特定内容。

## Framework

新项目使用 **Test2::V0**（而非 Test::More）：

```perl
use Test2::V0;

is($result, 42, 'answer is correct');

done_testing;
```

## Runner

```bash
prove -l t/              # 将 lib/ 加入 @INC
prove -lr -j8 t/         # 递归，8 个并行作业
```

始终使用 `-l` 以确保 `lib/` 在 `@INC` 中。

## Coverage

使用 **Devel::Cover** —— 目标 80%+：

```bash
cover -test
```

## Mocking

- **Test::MockModule** —— mock 现有模块的方法
- **Test::MockObject** —— 从零创建 test double

## Pitfalls

- 测试文件始终以 `done_testing` 结尾
- 切勿忘记 `prove` 的 `-l` flag

## Reference

参见 skill：`perl-testing`，了解使用 Test2::V0、prove 和 Devel::Cover 的详细 Perl TDD 模式。
