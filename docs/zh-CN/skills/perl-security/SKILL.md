---
name: perl-security
description: 全面的 Perl 安全，涵盖 taint mode、输入校验、安全的进程执行、DBI 参数化查询、Web 安全（XSS/SQLi/CSRF）以及 perlcritic 安全策略。
metadata:
  origin: ECC
---

# Perl 安全模式

面向 Perl 应用的全面安全指南，涵盖输入校验、注入防御和安全编码实践。

## 何时激活

- 在 Perl 应用中处理用户输入
- 构建 Perl Web 应用（CGI、Mojolicious、Dancer2、Catalyst）
- 审查 Perl 代码中的安全漏洞
- 使用用户提供的路径执行文件操作
- 从 Perl 执行系统命令
- 编写 DBI 数据库查询

## 工作原理

从具备 taint 意识的输入边界开始，然后向外扩展：校验并 untaint 输入，保持文件系统和进程执行受限，并在所有地方使用参数化的 DBI 查询。下面的示例展示了本 skill 期望你在发布任何触及用户输入、shell 或网络的 Perl 代码之前应用的安全默认设置。

## Taint Mode

Perl 的 taint mode（`-T`）会追踪来自外部来源的数据，并防止其在未经显式校验的情况下被用于不安全的操作。

### 启用 Taint Mode

```perl
#!/usr/bin/perl -T
use v5.36;

# Tainted：来自程序外部的任何内容
my $input    = $ARGV[0];        # Tainted
my $env_path = $ENV{PATH};      # Tainted
my $form     = <STDIN>;         # Tainted
my $query    = $ENV{QUERY_STRING}; # Tainted

# 尽早清理 PATH（在 taint mode 下必需）
$ENV{PATH} = '/usr/local/bin:/usr/bin:/bin';
delete @ENV{qw(IFS CDPATH ENV BASH_ENV)};
```

### Untainting 模式

```perl
use v5.36;

# Good：用具体的 regex 校验并 untaint
sub untaint_username($input) {
    if ($input =~ /^([a-zA-Z0-9_]{3,30})$/) {
        return $1;  # $1 已 untainted
    }
    die "Invalid username: must be 3-30 alphanumeric characters\n";
}

# Good：校验并 untaint 文件路径
sub untaint_filename($input) {
    if ($input =~ m{^([a-zA-Z0-9._-]+)$}) {
        return $1;
    }
    die "Invalid filename: contains unsafe characters\n";
}

# Bad：过度宽松的 untainting（使其失去意义）
sub bad_untaint($input) {
    $input =~ /^(.*)$/s;
    return $1;  # 接受任何内容——毫无意义
}
```

## 输入校验

### Allowlist 优先于 Blocklist

```perl
use v5.36;

# Good：Allowlist——精确定义允许的内容
sub validate_sort_field($field) {
    my %allowed = map { $_ => 1 } qw(name email created_at updated_at);
    die "Invalid sort field: $field\n" unless $allowed{$field};
    return $field;
}

# Good：用具体的模式校验
sub validate_email($email) {
    if ($email =~ /^([a-zA-Z0-9._%+-]+\@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/) {
        return $1;
    }
    die "Invalid email address\n";
}

sub validate_integer($input) {
    if ($input =~ /^(-?\d{1,10})$/) {
        return $1 + 0;  # 强制转换为数字
    }
    die "Invalid integer\n";
}

# Bad：Blocklist——总是不完整
sub bad_validate($input) {
    die "Invalid" if $input =~ /[<>"';&|]/;  # 会漏掉编码攻击
    return $input;
}
```

### 长度约束

```perl
use v5.36;

sub validate_comment($text) {
    die "Comment is required\n"        unless length($text) > 0;
    die "Comment exceeds 10000 chars\n" if length($text) > 10_000;
    return $text;
}
```

## 安全的正则表达式

### ReDoS 防御

当嵌套量词作用于重叠模式时，就会出现灾难性回溯。

```perl
use v5.36;

# Bad：易受 ReDoS 攻击（指数级回溯）
my $bad_re = qr/^(a+)+$/;           # 嵌套量词
my $bad_re2 = qr/^([a-zA-Z]+)*$/;   # 字符类上的嵌套量词
my $bad_re3 = qr/^(.*?,){10,}$/;    # 重复的贪婪/懒惰组合

# Good：改写以消除嵌套
my $good_re = qr/^a+$/;             # 单一量词
my $good_re2 = qr/^[a-zA-Z]+$/;     # 字符类上的单一量词

# Good：使用占有型量词或原子组来防止回溯
my $safe_re = qr/^[a-zA-Z]++$/;             # 占有型（5.10+）
my $safe_re2 = qr/^(?>a+)$/;                # 原子组

# Good：对不受信任的模式强制设置超时
use POSIX qw(alarm);
sub safe_match($string, $pattern, $timeout = 2) {
    my $matched;
    eval {
        local $SIG{ALRM} = sub { die "Regex timeout\n" };
        alarm($timeout);
        $matched = $string =~ $pattern;
        alarm(0);
    };
    alarm(0);
    die $@ if $@;
    return $matched;
}
```

## 安全的文件操作

### 三参数 open

```perl
use v5.36;

# Good：三参数 open、词法 filehandle、检查返回值
sub read_file($path) {
    open my $fh, '<:encoding(UTF-8)', $path
        or die "Cannot open '$path': $!\n";
    local $/;
    my $content = <$fh>;
    close $fh;
    return $content;
}

# Bad：用用户数据做两参数 open（命令注入）
sub bad_read($path) {
    open my $fh, $path;        # 如果 $path = "|rm -rf /"，会执行命令！
    open my $fh, "< $path";   # Shell 元字符注入
}
```

### TOCTOU 防御与 Path Traversal

```perl
use v5.36;
use Fcntl qw(:DEFAULT :flock);
use File::Spec;
use Cwd qw(realpath);

# 原子化文件创建
sub create_file_safe($path) {
    sysopen(my $fh, $path, O_WRONLY | O_CREAT | O_EXCL, 0600)
        or die "Cannot create '$path': $!\n";
    return $fh;
}

# 校验路径是否留在允许的目录内
sub safe_path($base_dir, $user_path) {
    my $real = realpath(File::Spec->catfile($base_dir, $user_path))
        // die "Path does not exist\n";
    my $base_real = realpath($base_dir)
        // die "Base dir does not exist\n";
    die "Path traversal blocked\n" unless $real =~ /^\Q$base_real\E(?:\/|\z)/;
    return $real;
}
```

使用 `File::Temp` 处理临时文件（`tempfile(UNLINK => 1)`），并使用 `flock(LOCK_EX)` 防止竞态条件。

## 安全的进程执行

### 列表形式的 system 和 exec

```perl
use v5.36;

# Good：列表形式——不做 shell 插值
sub run_command(@cmd) {
    system(@cmd) == 0
        or die "Command failed: @cmd\n";
}

run_command('grep', '-r', $user_pattern, '/var/log/app/');

# Good：用 IPC::Run3 安全地捕获输出
use IPC::Run3;
sub capture_output(@cmd) {
    my ($stdout, $stderr);
    run3(\@cmd, \undef, \$stdout, \$stderr);
    if ($?) {
        die "Command failed (exit $?): $stderr\n";
    }
    return $stdout;
}

# Bad：字符串形式——shell 注入！
sub bad_search($pattern) {
    system("grep -r '$pattern' /var/log/app/");  # 如果 $pattern = "'; rm -rf / #"
}

# Bad：带插值的反引号
my $output = `ls $user_dir`;   # Shell injection 风险
```

也可以使用 `Capture::Tiny` 来安全地捕获外部命令的 stdout/stderr。

## SQL Injection 防御

### DBI 占位符

```perl
use v5.36;
use DBI;

my $dbh = DBI->connect($dsn, $user, $pass, {
    RaiseError => 1,
    PrintError => 0,
    AutoCommit => 1,
});

# Good：参数化查询——始终使用占位符
sub find_user($dbh, $email) {
    my $sth = $dbh->prepare('SELECT * FROM users WHERE email = ?');
    $sth->execute($email);
    return $sth->fetchrow_hashref;
}

sub search_users($dbh, $name, $status) {
    my $sth = $dbh->prepare(
        'SELECT * FROM users WHERE name LIKE ? AND status = ? ORDER BY name'
    );
    $sth->execute("%$name%", $status);
    return $sth->fetchall_arrayref({});
}

# Bad：SQL 中的字符串插值（SQLi 漏洞！）
sub bad_find($dbh, $email) {
    my $sth = $dbh->prepare("SELECT * FROM users WHERE email = '$email'");
    # 如果 $email = "' OR 1=1 --"，会返回所有用户
    $sth->execute;
    return $sth->fetchrow_hashref;
}
```

### 动态列 Allowlist

```perl
use v5.36;

# Good：用 allowlist 校验列名
sub order_by($dbh, $column, $direction) {
    my %allowed_cols = map { $_ => 1 } qw(name email created_at);
    my %allowed_dirs = map { $_ => 1 } qw(ASC DESC);

    die "Invalid column: $column\n"    unless $allowed_cols{$column};
    die "Invalid direction: $direction\n" unless $allowed_dirs{uc $direction};

    my $sth = $dbh->prepare("SELECT * FROM users ORDER BY $column $direction");
    $sth->execute;
    return $sth->fetchall_arrayref({});
}

# Bad：直接插值用户选择的列
sub bad_order($dbh, $column) {
    $dbh->prepare("SELECT * FROM users ORDER BY $column");  # SQLi!
}
```

### DBIx::Class（ORM 安全）

```perl
use v5.36;

# DBIx::Class 会生成安全的参数化查询
my @users = $schema->resultset('User')->search({
    status => 'active',
    email  => { -like => '%@example.com' },
}, {
    order_by => { -asc => 'name' },
    rows     => 50,
});
```

## Web 安全

### XSS 防御

```perl
use v5.36;
use HTML::Entities qw(encode_entities);
use URI::Escape qw(uri_escape_utf8);

# Good：为 HTML 上下文编码输出
sub safe_html($user_input) {
    return encode_entities($user_input);
}

# Good：为 URL 上下文编码
sub safe_url_param($value) {
    return uri_escape_utf8($value);
}

# Good：为 JSON 上下文编码
use JSON::MaybeXS qw(encode_json);
sub safe_json($data) {
    return encode_json($data);  # 处理转义
}

# 模板自动转义（Mojolicious）
# <%= $user_input %>   — 自动转义（安全）
# <%== $raw_html %>    — 原始输出（危险，仅用于受信任内容）

# 模板自动转义（Template Toolkit）
# [% user_input | html %]  — 显式 HTML 编码

# Bad：在 HTML 中原始输出
sub bad_html($input) {
    print "<div>$input</div>";  # 如果 $input 包含 <script> 则存在 XSS
}
```

### CSRF 防御

```perl
use v5.36;
use Crypt::URandom qw(urandom);
use MIME::Base64 qw(encode_base64url);

sub generate_csrf_token() {
    return encode_base64url(urandom(32));
}
```

验证 token 时使用恒定时间比较。大多数 Web 框架（Mojolicious、Dancer2、Catalyst）都提供内置的 CSRF 防御——应优先使用这些而非自行实现的方案。

### Session 与 Header 安全

```perl
use v5.36;

# Mojolicious session + header
$app->secrets(['long-random-secret-rotated-regularly']);
$app->sessions->secure(1);          # 仅限 HTTPS
$app->sessions->samesite('Lax');

$app->hook(after_dispatch => sub ($c) {
    $c->res->headers->header('X-Content-Type-Options' => 'nosniff');
    $c->res->headers->header('X-Frame-Options'        => 'DENY');
    $c->res->headers->header('Content-Security-Policy' => "default-src 'self'");
    $c->res->headers->header('Strict-Transport-Security' => 'max-age=31536000; includeSubDomains');
});
```

## 输出编码

始终根据上下文编码输出：HTML 使用 `HTML::Entities::encode_entities()`，URL 使用 `URI::Escape::uri_escape_utf8()`，JSON 使用 `JSON::MaybeXS::encode_json()`。

## CPAN 模块安全

- **固定版本**：在 cpanfile 中：`requires 'DBI', '== 1.643';`
- **优先选择维护中的模块**：在 MetaCPAN 上查看最近的发布
- **最小化依赖**：每个依赖都是一个攻击面

## 安全工具

### perlcritic 安全策略

```ini
# .perlcriticrc — 以安全为导向的配置
severity = 3
theme = security + core

# 要求使用三参数 open
[InputOutput::RequireThreeArgOpen]
severity = 5

# 要求检查系统调用
[InputOutput::RequireCheckedSyscalls]
functions = :builtins
severity = 4

# 禁止字符串 eval
[BuiltinFunctions::ProhibitStringyEval]
severity = 5

# 禁止反引号操作符
[InputOutput::ProhibitBacktickOperators]
severity = 4

# 在 CGI 中要求 taint 检查
[Modules::RequireTaintChecking]
severity = 5

# 禁止两参数 open
[InputOutput::ProhibitTwoArgOpen]
severity = 5

# 禁止裸字 filehandle
[InputOutput::ProhibitBarewordFileHandles]
severity = 5
```

### 运行 perlcritic

```bash
# 检查单个文件
perlcritic --severity 3 --theme security lib/MyApp/Handler.pm

# 检查整个项目
perlcritic --severity 3 --theme security lib/

# CI 集成
perlcritic --severity 4 --theme security --quiet lib/ || exit 1
```

## 安全速查表

| 检查项 | 需要验证的内容 |
|---|---|
| Taint mode | CGI/Web 脚本上的 `-T` flag |
| 输入校验 | Allowlist 模式、长度限制 |
| 文件操作 | 三参数 open、path traversal 检查 |
| 进程执行 | 列表形式 system、不做 shell 插值 |
| SQL 查询 | DBI 占位符、绝不插值 |
| HTML 输出 | `encode_entities()`、模板自动转义 |
| CSRF token | 已生成、在改变状态的请求上验证 |
| Session 配置 | Secure、HttpOnly、SameSite cookie |
| HTTP header | CSP、X-Frame-Options、HSTS |
| 依赖 | 已固定的版本、已审计的模块 |
| Regex 安全 | 无嵌套量词、已锚定的模式 |
| 错误消息 | 不向用户泄露 stack trace 或路径 |

## Anti-Patterns

```perl
# 1. 用用户数据做两参数 open（命令注入）
open my $fh, $user_input;               # CRITICAL 漏洞

# 2. 字符串形式的 system（shell 注入）
system("convert $user_file output.png"); # CRITICAL 漏洞

# 3. SQL 字符串插值
$dbh->do("DELETE FROM users WHERE id = $id");  # SQLi

# 4. 用用户输入做 eval（代码注入）
eval $user_code;                         # 远程代码执行

# 5. 未经清理就信任 $ENV
my $path = $ENV{UPLOAD_DIR};             # 可能被篡改
system("ls $path");                      # 双重漏洞

# 6. 不经校验就关闭 taint
($input) = $input =~ /(.*)/s;           # 懒惰的 untaint——失去意义

# 7. 在 HTML 中使用原始用户数据
print "<div>Welcome, $username!</div>";  # XSS

# 8. 未校验的重定向
print $cgi->redirect($user_url);         # Open redirect
```

**切记**：Perl 的灵活性很强大，但也需要纪律。对面向 Web 的代码使用 taint mode，用 allowlist 校验所有输入，对每个查询使用 DBI 占位符，并根据上下文编码所有输出。Defense in depth——绝不要依赖单一层级。
