---
paths:
  - "**/*.pl"
  - "**/*.pm"
  - "**/*.t"
  - "**/*.psgi"
  - "**/*.cgi"
---
# Perl 编码风格

> 本文件在 [common/coding-style.md](../common/coding-style.md) 基础上扩展了 Perl 专属内容。

## 标准

- 始终 `use v5.36`（启用 `strict`、`warnings`、`say`、subroutine signatures）
- 使用 subroutine signatures — 切勿手动解包 `@_`
- 优先使用 `say`，而非带显式换行的 `print`

## 不可变性

- 所有属性一律使用 **Moo** 配合 `is => 'ro'` 与 `Types::Standard`
- 切勿直接使用 blessed hashrefs — 始终使用 Moo/Moose 访问器
- **OO 例外说明**：带 `builder` 或 `default` 的 Moo `has` 属性可用于计算得出的只读值

## 格式化

使用 **perltidy**，设置如下：

```
-i=4    # 4 空格缩进
-l=100  # 100 字符行长度
-ce     # cuddled else
-bar    # 左花括号始终在右侧
```

## Linting

使用 **perlcritic**，severity 3，themes：`core`、`pbp`、`security`。

```bash
perlcritic --severity 3 --theme 'core || pbp || security' lib/
```

## 参考

参见 skill：`perl-patterns`，了解详尽的现代 Perl 惯用法与最佳实践。
