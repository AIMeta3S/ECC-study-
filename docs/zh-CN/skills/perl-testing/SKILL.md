---
name: perl-testing
description: 采用 Test2::V0、Test::More、prove runner、mocking、通过 Devel::Cover 进行覆盖率分析以及 TDD 方法论的 Perl 测试模式。
metadata:
  origin: ECC
---

# Perl 测试模式

使用 Test2::V0、Test::More、prove 和 TDD 方法论为 Perl 应用提供的全面测试策略。

## 何时启用

- 编写新的 Perl 代码时（遵循 TDD：red、green、refactor）
- 为 Perl module 或应用设计 test suite 时
- 审查 Perl 测试覆盖率时
- 搭建 Perl 测试基础设施时
- 将测试从 Test::More 迁移到 Test2::V0 时
- debug 失败的 Perl 测试时

## TDD 工作流

始终遵循 RED-GREEN-REFACTOR 循环。

```perl
# 步骤 1：RED — 编写一个失败的测试
# t/unit/calculator.t
use v5.36;
use Test2::V0;

use lib 'lib';
use Calculator;

subtest 'addition' => sub {
    my $calc = Calculator->new;
    is($calc->add(2, 3), 5, 'adds two numbers');
    is($calc->add(-1, 1), 0, 'handles negatives');
};

done_testing;

# 步骤 2：GREEN — 编写最小实现
# lib/Calculator.pm
package Calculator;
use v5.36;
use Moo;

sub add($self, $a, $b) {
    return $a + $b;
}

1;

# 步骤 3：REFACTOR — 在测试保持 green 的同时进行改进
# 运行：prove -lv t/unit/calculator.t
```

## Test::More 基础

标准的 Perl 测试 module — 使用广泛，随核心发行版一同发布。

### 基本断言

```perl
use v5.36;
use Test::More;

# 预先 plan 或使用 done_testing
# plan tests => 5;  # 固定的 plan（可选）

# 相等性
is($result, 42, 'returns correct value');
isnt($result, 0, 'not zero');

# 布尔值
ok($user->is_active, 'user is active');
ok(!$user->is_banned, 'user is not banned');

# 深度比较
is_deeply(
    $got,
    { name => 'Alice', roles => ['admin'] },
    'returns expected structure'
);

# 模式匹配
like($error, qr/not found/i, 'error mentions not found');
unlike($output, qr/password/, 'output hides password');

# 类型检查
isa_ok($obj, 'MyApp::User');
can_ok($obj, 'save', 'delete');

done_testing;
```

### SKIP 和 TODO

```perl
use v5.36;
use Test::More;

# 有条件地跳过测试
SKIP: {
    skip 'No database configured', 2 unless $ENV{TEST_DB};

    my $db = connect_db();
    ok($db->ping, 'database is reachable');
    is($db->version, '15', 'correct PostgreSQL version');
}

# 标记预期失败
TODO: {
    local $TODO = 'Caching not yet implemented';
    is($cache->get('key'), 'value', 'cache returns value');
}

done_testing;
```

## Test2::V0 现代框架

Test2::V0 是 Test::More 的现代替代品 — 断言更丰富、诊断信息更完善，并且可扩展。

### 为什么选择 Test2？

- 通过 hash/array builder 实现更强大的深度比较
- 失败时提供更好的诊断输出
- subtest 具有更清晰的作用域
- 通过 Test2::Tools::* plugin 可扩展
- 与 Test::More 测试向后兼容

### 使用 Builder 进行深度比较

```perl
use v5.36;
use Test2::V0;

# Hash builder — 检查部分结构
is(
    $user->to_hash,
    hash {
        field name  => 'Alice';
        field email => match(qr/\@example\.com$/);
        field age   => validator(sub { $_ >= 18 });
        # 忽略其他字段
        etc();
    },
    'user has expected fields'
);

# Array builder
is(
    $result,
    array {
        item 'first';
        item match(qr/^second/);
        item DNE();  # Does Not Exist — 验证没有多余的 item
    },
    'result matches expected list'
);

# Bag — 与顺序无关的比较
is(
    $tags,
    bag {
        item 'perl';
        item 'testing';
        item 'tdd';
    },
    'has all required tags regardless of order'
);
```

### Subtest

```perl
use v5.36;
use Test2::V0;

subtest 'User creation' => sub {
    my $user = User->new(name => 'Alice', email => 'alice@example.com');
    ok($user, 'user object created');
    is($user->name, 'Alice', 'name is set');
    is($user->email, 'alice@example.com', 'email is set');
};

subtest 'User validation' => sub {
    my $warnings = warns {
        User->new(name => '', email => 'bad');
    };
    ok($warnings, 'warns on invalid data');
};

done_testing;
```

### 使用 Test2 进行异常测试

```perl
use v5.36;
use Test2::V0;

# 测试代码会 dies
like(
    dies { divide(10, 0) },
    qr/Division by zero/,
    'dies on division by zero'
);

# 测试代码会 lives
ok(lives { divide(10, 2) }, 'division succeeds') or note($@);

# 组合模式
subtest 'error handling' => sub {
    ok(lives { parse_config('valid.json') }, 'valid config parses');
    like(
        dies { parse_config('missing.json') },
        qr/Cannot open/,
        'missing file dies with message'
    );
};

done_testing;
```

## 测试组织与 prove

### 目录结构

```text
t/
├── 00-load.t              # 验证 module 能否编译
├── 01-basic.t             # 核心功能
├── unit/
│   ├── config.t           # 按模块组织的单元测试
│   ├── user.t
│   └── util.t
├── integration/
│   ├── database.t
│   └── api.t
├── lib/
│   └── TestHelper.pm      # 共享的测试工具
└── fixtures/
    ├── config.json        # 测试数据文件
    └── users.csv
```

### prove 命令

```bash
# 运行所有测试
prove -l t/

# 详细输出
prove -lv t/

# 运行特定测试
prove -lv t/unit/user.t

# 递归搜索
prove -lr t/

# 并行执行（8 个 job）
prove -lr -j8 t/

# 仅运行上次运行中失败的测试
prove -l --state=failed t/

# 带计时器的彩色输出
prove -l --color --timer t/

# 用于 CI 的 TAP 输出
prove -l --formatter TAP::Formatter::JUnit t/ > results.xml
```

### .proverc 配置

```text
-l
--color
--timer
-r
-j4
--state=save
```

## Fixture 与 Setup/Teardown

### Subtest 隔离

```perl
use v5.36;
use Test2::V0;
use File::Temp qw(tempdir);
use Path::Tiny;

subtest 'file processing' => sub {
    # Setup
    my $dir = tempdir(CLEANUP => 1);
    my $file = path($dir, 'input.txt');
    $file->spew_utf8("line1\nline2\nline3\n");

    # 测试
    my $result = process_file("$file");
    is($result->{line_count}, 3, 'counts lines');

    # Teardown 会自动执行（CLEANUP => 1）
};
```

### 共享的测试 helper

将可复用的 helper 放在 `t/lib/TestHelper.pm` 中，使用 `use lib 't/lib'` 加载。通过 `Exporter` 导出工厂函数，如 `create_test_db()`、`create_temp_dir()` 和 `fixture_path()`。

## Mocking

### Test::MockModule

```perl
use v5.36;
use Test2::V0;
use Test::MockModule;

subtest 'mock external API' => sub {
    my $mock = Test::MockModule->new('MyApp::API');

    # 好：mock 返回受控数据
    $mock->mock(fetch_user => sub ($self, $id) {
        return { id => $id, name => 'Mock User', email => 'mock@test.com' };
    });

    my $api = MyApp::API->new;
    my $user = $api->fetch_user(42);
    is($user->{name}, 'Mock User', 'returns mocked user');

    # 验证调用次数
    my $call_count = 0;
    $mock->mock(fetch_user => sub { $call_count++; return {} });
    $api->fetch_user(1);
    $api->fetch_user(2);
    is($call_count, 2, 'fetch_user called twice');

    # 当 $mock 离开作用域时，mock 会自动恢复
};

# 坏：不恢复原状的 monkey-patching
# *MyApp::API::fetch_user = sub { ... };  # 绝不这样做 — 会在测试之间泄漏
```

对于轻量级的 mock 对象，使用 `Test::MockObject` 创建可注入的 test double，通过 `->mock()` 设置行为，并用 `->called_ok()` 验证调用。

## 使用 Devel::Cover 的覆盖率

### 运行覆盖率

```bash
# 基本覆盖率报告
cover -test

# 或者分步执行
perl -MDevel::Cover -Ilib t/unit/user.t
cover

# HTML 报告
cover -report html
open cover_db/coverage.html

# 特定 threshold
cover -test -report text | grep 'Total'

# 对 CI 友好：低于 threshold 则失败
cover -test && cover -report text -select '^lib/' \
  | perl -ne 'if (/Total.*?(\d+\.\d+)/) { exit 1 if $1 < 80 }'
```

### 集成测试

数据库测试使用内存中的 SQLite，API 测试则 mock HTTP::Tiny。

```perl
use v5.36;
use Test2::V0;
use DBI;

subtest 'database integration' => sub {
    my $dbh = DBI->connect('dbi:SQLite:dbname=:memory:', '', '', {
        RaiseError => 1,
    });
    $dbh->do('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');

    $dbh->prepare('INSERT INTO users (name) VALUES (?)')->execute('Alice');
    my $row = $dbh->selectrow_hashref('SELECT * FROM users WHERE name = ?', undef, 'Alice');
    is($row->{name}, 'Alice', 'inserted and retrieved user');
};

done_testing;
```

## 最佳实践

### 应该做的

- **遵循 TDD**：在实现之前先写测试（red-green-refactor）
- **使用 Test2::V0**：现代的断言，更好的诊断信息
- **使用 subtest**：将相关的断言分组，隔离状态
- **mock 外部依赖**：网络、数据库、文件系统
- **使用 `prove -l`**：始终将 lib/ 包含在 `@INC` 中
- **清晰地命名测试**：`'user login with invalid password fails'`
- **测试边缘情况**：空字符串、undef、零、边界值
- **以 80% 以上的覆盖率为目标**：重点关注业务逻辑路径
- **保持测试快速**：mock I/O，使用内存数据库

### 不应该做的

- **不要测试实现细节**：测试行为和输出，而非内部细节
- **不要在 subtest 之间共享状态**：每个 subtest 应当独立
- **不要省略 `done_testing`**：它确保所有计划中的测试都已运行
- **不要过度 mock**：只 mock 边界，不要 mock 被测代码
- **不要在新项目中使用 `Test::More`**：优先使用 Test2::V0
- **不要忽略测试失败**：合并前所有测试必须通过
- **不要测试 CPAN module**：信任这些库能正常工作
- **不要写脆弱的测试**：避免过于具体的字符串匹配

## 快速参考

| 任务 | 命令 / 模式 |
|---|---|
| 运行所有测试 | `prove -lr t/` |
| 详细运行单个测试 | `prove -lv t/unit/user.t` |
| 并行运行测试 | `prove -lr -j8 t/` |
| 覆盖率报告 | `cover -test && cover -report html` |
| 测试相等性 | `is($got, $expected, 'label')` |
| 深度比较 | `is($got, hash { field k => 'v'; etc() }, 'label')` |
| 测试异常 | `like(dies { ... }, qr/msg/, 'label')` |
| 测试无异常 | `ok(lives { ... }, 'label')` |
| mock 一个方法 | `Test::MockModule->new('Pkg')->mock(m => sub { ... })` |
| 跳过测试 | `SKIP: { skip 'reason', $count unless $cond; ... }` |
| TODO 测试 | `TODO: { local $TODO = 'reason'; ... }` |

## 常见陷阱

### 忘记 `done_testing`

```perl
# 坏：测试文件运行了，但没有验证所有测试都已执行
use Test2::V0;
is(1, 1, 'works');
# 缺少 done_testing — 如果测试代码被跳过，会产生静默 bug

# 好：始终以 done_testing 结尾
use Test2::V0;
is(1, 1, 'works');
done_testing;
```

### 缺少 `-l` flag

```bash
# 坏：找不到 lib/ 中的 module
prove t/unit/user.t
# Can't locate MyApp/User.pm in @INC

# 好：将 lib/ 包含进 @INC
prove -l t/unit/user.t
```

### 过度 mock

mock 的是*依赖*，而不是被测代码。如果你的测试只是验证一个 mock 返回了你告诉它要返回的内容，那它什么都没有测试。

### 测试污染

在 subtest 内部使用 `my` 变量 — 绝不使用 `our` — 以防止状态在测试之间泄漏。

**记住**：测试是你的安全网。保持它们快速、聚焦、独立。新项目使用 Test2::V0，用 prove 运行，用 Devel::Cover 来确保覆盖率问责。
