---
paths:
  - "**/*.pl"
  - "**/*.pm"
  - "**/*.t"
  - "**/*.psgi"
  - "**/*.cgi"
---
# Perl 模式

> 本文件扩展了 [common/patterns.md](../common/patterns.md)，增加了 Perl 特定的内容。

## Repository Pattern

在接口背后使用 **DBI** 或 **DBIx::Class**：

```perl
package MyApp::Repo::User;
use Moo;

has dbh => (is => 'ro', required => 1);

sub find_by_id ($self, $id) {
    my $sth = $self->dbh->prepare('SELECT * FROM users WHERE id = ?');
    $sth->execute($id);
    return $sth->fetchrow_hashref;
}
```

## DTOs / Value Objects

使用 **Moo** 类配合 **Types::Standard**（等价于 Python dataclasses）：

```perl
package MyApp::DTO::User;
use Moo;
use Types::Standard qw(Str Int);

has name  => (is => 'ro', isa => Str, required => 1);
has email => (is => 'ro', isa => Str, required => 1);
has age   => (is => 'ro', isa => Int);
```

## 资源管理

- 始终将 **three-arg open** 与 `autodie` 配合使用
- 使用 **Path::Tiny** 进行文件操作

```perl
use autodie;
use Path::Tiny;

my $content = path('config.json')->slurp_utf8;
```

## 模块接口

将 `Exporter 'import'` 与 `@EXPORT_OK` 配合使用 —— 永远不要使用 `@EXPORT`：

```perl
use Exporter 'import';
our @EXPORT_OK = qw(parse_config validate_input);
```

## 依赖管理

使用 **cpanfile** + **carton** 实现可复现的安装：

```bash
carton install
carton exec prove -lr t/
```

## 参考

关于全面的现代 Perl 模式与惯用法，参见 skill：`perl-patterns`。
