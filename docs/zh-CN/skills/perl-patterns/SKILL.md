---
name: perl-patterns
description: 现代 Perl 5.36+ 的习惯用法、最佳实践和约定，用于构建健壮、可维护的 Perl 应用。
metadata:
  origin: ECC
---

# 现代 Perl 开发模式

地道的 Perl 5.36+ 模式与最佳实践，用于构建健壮、可维护的应用。

## 何时激活

- 编写新的 Perl 代码或模块
- 审查 Perl 代码是否符合习惯用法
- 将传统 Perl 重构为现代标准
- 设计 Perl 模块架构
- 将 5.36 之前的代码迁移到现代 Perl

## 工作原理

应用这些模式时，应倾向于采用现代 Perl 5.36+ 的默认做法：签名、显式模块、聚焦的错误处理以及可测试的边界。下面的示例旨在作为起点复制使用，然后针对你实际面对的应用、依赖栈和部署模型进行收紧调整。

## 核心原则

### 1. 使用 `v5.36` pragma

单独一行 `use v5.36` 即可取代旧的样板代码，并启用 strict、warnings 和子程序签名。

```perl
# 良好：现代前导代码
use v5.36;

sub greet($name) {
    say "Hello, $name!";
}

# 不良：传统样板代码
use strict;
use warnings;
use feature 'say', 'signatures';
no warnings 'experimental::signatures';

sub greet {
    my ($name) = @_;
    say "Hello, $name!";
}
```

### 2. 子程序签名

使用签名可以提升清晰度，并自动检查参数个数。

```perl
use v5.36;

# 良好：带默认值的签名
sub connect_db($host, $port = 5432, $timeout = 30) {
    # $host 是必需的，其他参数有默认值
    return DBI->connect("dbi:Pg:host=$host;port=$port", undef, undef, {
        RaiseError => 1,
        PrintError => 0,
    });
}

# 良好：用于可变参数的 slurpy 参数
sub log_message($level, @details) {
    say "[$level] " . join(' ', @details);
}

# 不良：手动参数解包
sub connect_db {
    my ($host, $port, $timeout) = @_;
    $port    //= 5432;
    $timeout //= 30;
    # ...
}
```

### 3. 上下文敏感性

理解标量上下文与列表上下文——这是 Perl 的核心概念。

```perl
use v5.36;

my @items = (1, 2, 3, 4, 5);

my @copy  = @items;            # 列表上下文：所有元素
my $count = @items;            # 标量上下文：元素个数 (5)
say "Items: " . scalar @items; # 强制标量上下文
```

### 4. 后缀解引用

对于嵌套结构，使用后缀解引用语法以提升可读性。

```perl
use v5.36;

my $data = {
    users => [
        { name => 'Alice', roles => ['admin', 'user'] },
        { name => 'Bob',   roles => ['user'] },
    ],
};

# 良好：后缀解引用
my @users = $data->{users}->@*;
my @roles = $data->{users}[0]{roles}->@*;
my %first = $data->{users}[0]->%*;

# 不良：包围式解引用（在链式调用中更难阅读）
my @users = @{ $data->{users} };
my @roles = @{ $data->{users}[0]{roles} };
```

### 5. `isa` 运算符 (5.32+)

中缀类型检查——取代 `blessed($o) && $o->isa('X')`。

```perl
use v5.36;
if ($obj isa 'My::Class') { $obj->do_something }
```

## 错误处理

### eval/die 模式

```perl
use v5.36;

sub parse_config($path) {
    my $content = eval { path($path)->slurp_utf8 };
    die "Config error: $@" if $@;
    return decode_json($content);
}
```

### Try::Tiny（可靠的异常处理）

```perl
use v5.36;
use Try::Tiny;

sub fetch_user($id) {
    my $user = try {
        $db->resultset('User')->find($id)
            // die "User $id not found\n";
    }
    catch {
        warn "Failed to fetch user $id: $_";
        undef;
    };
    return $user;
}
```

### 原生 try/catch (5.40+)

```perl
use v5.40;

sub divide($x, $y) {
    try {
        die "Division by zero" if $y == 0;
        return $x / $y;
    }
    catch ($e) {
        warn "Error: $e";
        return;
    }
}
```

## 使用 Moo 的现代面向对象

优先使用 Moo 构建轻量级的现代面向对象。仅在需要元协议时才使用 Moose。

```perl
# 良好：Moo 类
package User;
use Moo;
use Types::Standard qw(Str Int ArrayRef);
use namespace::autoclean;

has name  => (is => 'ro', isa => Str, required => 1);
has email => (is => 'ro', isa => Str, required => 1);
has age   => (is => 'ro', isa => Int, default  => sub { 0 });
has roles => (is => 'ro', isa => ArrayRef[Str], default => sub { [] });

sub is_admin($self) {
    return grep { $_ eq 'admin' } $self->roles->@*;
}

sub greet($self) {
    return "Hello, I'm " . $self->name;
}

1;

# 用法
my $user = User->new(
    name  => 'Alice',
    email => 'alice@example.com',
    roles => ['admin', 'user'],
);

# 不良：blessed hashref（无校验、无访问器）
package User;
sub new {
    my ($class, %args) = @_;
    return bless \%args, $class;
}
sub name { return $_[0]->{name} }
1;
```

### Moo 角色

```perl
package Role::Serializable;
use Moo::Role;
use JSON::MaybeXS qw(encode_json);
requires 'TO_HASH';
sub to_json($self) { encode_json($self->TO_HASH) }
1;

package User;
use Moo;
with 'Role::Serializable';
has name  => (is => 'ro', required => 1);
has email => (is => 'ro', required => 1);
sub TO_HASH($self) { { name => $self->name, email => $self->email } }
1;
```

### 原生 `class` 关键字 (5.38+, Corinna)

```perl
use v5.38;
use feature 'class';
no warnings 'experimental::class';

class Point {
    field $x :param;
    field $y :param;
    method magnitude() { sqrt($x**2 + $y**2) }
}

my $p = Point->new(x => 3, y => 4);
say $p->magnitude;  # 5
```

## 正则表达式

### 命名捕获与 `/x` 标志

```perl
use v5.36;

# 良好：使用命名捕获配合 /x 提升可读性
my $log_re = qr{
    ^ (?<timestamp> \d{4}-\d{2}-\d{2} \s \d{2}:\d{2}:\d{2} )
    \s+ \[ (?<level> \w+ ) \]
    \s+ (?<message> .+ ) $
}x;

if ($line =~ $log_re) {
    say "Time: $+{timestamp}, Level: $+{level}";
    say "Message: $+{message}";
}

# 不良：位置捕获（难以维护）
if ($line =~ /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+\[(\w+)\]\s+(.+)$/) {
    say "Time: $1, Level: $2";
}
```

### 预编译模式

```perl
use v5.36;

# 良好：一次编译，多处使用
my $email_re = qr/^[A-Za-z0-9._%+-]+\@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

sub validate_emails(@emails) {
    return grep { $_ =~ $email_re } @emails;
}
```

## 数据结构

### 引用与安全的深层访问

```perl
use v5.36;

# hash 引用与 array 引用
my $config = {
    database => {
        host => 'localhost',
        port => 5432,
        options => ['utf8', 'sslmode=require'],
    },
};

# 安全的深层访问（任意层级缺失时返回 undef）
my $port = $config->{database}{port};           # 5432
my $missing = $config->{cache}{host};           # undef，不会报错

# hash 切片
my %subset;
@subset{qw(host port)} = @{$config->{database}}{qw(host port)};

# array 切片
my @first_two = $config->{database}{options}->@[0, 1];

# 多变量 for 循环（5.36 中实验性，5.40 中稳定）
use feature 'for_list';
no warnings 'experimental::for_list';
for my ($key, $val) (%$config) {
    say "$key => $val";
}
```

## 文件 I/O

### 三参数 open

```perl
use v5.36;

# 良好：三参数 open 配合 autodie（核心模块，省去 'or die'）
use autodie;

sub read_file($path) {
    open my $fh, '<:encoding(UTF-8)', $path;
    local $/;
    my $content = <$fh>;
    close $fh;
    return $content;
}

# 不良：两参数 open（存在 shell 注入风险，参见 perl-security）
open FH, $path;            # 绝不要这样做
open FH, "< $path";        # 同样不良——用户数据出现在模式字符串中
```

### 用于文件操作的 Path::Tiny

```perl
use v5.36;
use Path::Tiny;

my $file = path('config', 'app.json');
my $content = $file->slurp_utf8;
$file->spew_utf8($new_content);

# 遍历目录
for my $child (path('src')->children(qr/\.pl$/)) {
    say $child->basename;
}
```

## 模块组织

### 标准项目布局

```text
MyApp/
├── lib/
│   └── MyApp/
│       ├── App.pm           # 主模块
│       ├── Config.pm        # 配置
│       ├── DB.pm            # 数据库层
│       └── Util.pm          # 工具
├── bin/
│   └── myapp                # 入口脚本
├── t/
│   ├── 00-load.t            # 编译测试
│   ├── unit/                # 单元测试
│   └── integration/         # 集成测试
├── cpanfile                 # 依赖
├── Makefile.PL              # 构建系统
└── .perlcriticrc            # Linting 配置
```

### Exporter 模式

```perl
package MyApp::Util;
use v5.36;
use Exporter 'import';

our @EXPORT_OK   = qw(trim);
our %EXPORT_TAGS = (all => \@EXPORT_OK);

sub trim($str) { $str =~ s/^\s+|\s+$//gr }

1;
```

## 工具链

### perltidy 配置 (.perltidyrc)

```text
-i=4        # 4 空格缩进
-l=100      # 100 字符行宽
-ci=4       # 续行缩进
-ce         # cuddled else
-bar        # 左花括号在同一行
-nolq       # 不要减少长引号字符串的缩进
```

### perlcritic 配置 (.perlcriticrc)

```ini
severity = 3
theme = core + pbp + security

[InputOutput::RequireCheckedSyscalls]
functions = :builtins
exclude_functions = say print

[Subroutines::ProhibitExplicitReturnUndef]
severity = 4

[ValuesAndExpressions::ProhibitMagicNumbers]
allowed_values = 0 1 2 -1
```

### 依赖管理 (cpanfile + carton)

```bash
cpanm App::cpanminus Carton   # 安装工具
carton install                 # 从 cpanfile 安装依赖
carton exec -- perl bin/myapp  # 使用本地依赖运行
```

```perl
# cpanfile
requires 'Moo', '>= 2.005';
requires 'Path::Tiny';
requires 'JSON::MaybeXS';
requires 'Try::Tiny';

on test => sub {
    requires 'Test2::V0';
    requires 'Test::MockModule';
};
```

## 快速参考：现代 Perl 习惯用法

| 传统模式 | 现代替代方案 |
|---|---|
| `use strict; use warnings;` | `use v5.36;` |
| `my ($x, $y) = @_;` | `sub foo($x, $y) { ... }` |
| `@{ $ref }` | `$ref->@*` |
| `%{ $ref }` | `$ref->%*` |
| `open FH, "< $file"` | `open my $fh, '<:encoding(UTF-8)', $file` |
| `blessed hashref` | 带类型的 `Moo` 类 |
| `$1, $2, $3` | `$+{name}`（命名捕获） |
| `eval { }; if ($@)` | `Try::Tiny` 或原生 `try/catch` (5.40+) |
| `BEGIN { require Exporter; }` | `use Exporter 'import';` |
| 手动文件操作 | `Path::Tiny` |
| `blessed($o) && $o->isa('X')` | `$o isa 'X'` (5.32+) |
| `builtin::true / false` | `use builtin 'true', 'false';` (5.36+, 实验性) |

## 反模式

```perl
# 1. 两参数 open（安全风险）
open FH, $filename;                     # 绝不要

# 2. 间接对象语法（解析有歧义）
my $obj = new Foo(bar => 1);            # 不良
my $obj = Foo->new(bar => 1);           # 良好

# 3. 过度依赖 $_
map { process($_) } grep { validate($_) } @items;  # 难以跟踪
my @valid = grep { validate($_) } @items;           # 更好：拆开写
my @results = map { process($_) } @valid;

# 4. 禁用 strict refs
no strict 'refs';                        # 几乎总是错的
${"My::Package::$var"} = $value;         # 改用 hash

# 5. 用全局变量作为配置
our $TIMEOUT = 30;                       # 不良：可变全局变量
use constant TIMEOUT => 30;              # 更好：使用常量
# 最佳：带默认值的 Moo 属性

# 6. 用字符串 eval 加载模块
eval "require $module";                  # 不良：存在代码注入风险
eval "use $module";                      # 不良
use Module::Runtime 'require_module';    # 良好：安全的模块加载
require_module($module);
```

**记住**：现代 Perl 是整洁、可读且安全的。让 `use v5.36` 处理样板代码，用 Moo 构建对象，并优先使用 CPAN 中经过实战检验的模块，而非自行手写的方案。
