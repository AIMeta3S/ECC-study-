---
paths:
  - "**/*.pl"
  - "**/*.pm"
  - "**/*.t"
  - "**/*.psgi"
  - "**/*.cgi"
---
# Perl 安全

> 本文件在 [common/security.md](../common/security.md) 的基础上扩展了 Perl 特定内容。

## Taint Mode

- 对所有 CGI 及面向 Web 的脚本使用 `-T` flag
- 在执行任何外部命令之前，对 `%ENV`（`$ENV{PATH}`、`$ENV{CDPATH}` 等）进行净化

## 输入验证

- 使用 allowlist regex 执行 untaint — 切勿使用 `/(.*)/s`
- 使用显式 pattern 验证所有用户输入：

```perl
if ($input =~ /\A([a-zA-Z0-9_-]+)\z/) {
    my $clean = $1;
}
```

## 文件 I/O

- **仅使用 three-arg open** — 切勿使用 two-arg open
- 使用 `Cwd::realpath` 防止 path traversal：

```perl
use Cwd 'realpath';
my $safe_path = realpath($user_path);
die "Path traversal" unless $safe_path =~ m{\A/allowed/directory/};
```

## 进程执行

- 使用 **list-form `system()`** — 切勿使用 single-string form
- 使用 **IPC::Run3** 捕获输出
- 切勿在反引号中使用变量插值

```perl
system('grep', '-r', $pattern, $directory);  # 安全
```

## SQL Injection 防护

始终使用 DBI 占位符 — 切勿向 SQL 中插值：

```perl
my $sth = $dbh->prepare('SELECT * FROM users WHERE email = ?');
$sth->execute($email);
```

## 安全扫描

以 severity 4+ 运行 **perlcritic** 的 security theme：

```bash
perlcritic --severity 4 --theme security lib/
```

## 参考

参见 skill：`perl-security`，了解全面的 Perl 安全 pattern、taint mode 以及安全 I/O。
