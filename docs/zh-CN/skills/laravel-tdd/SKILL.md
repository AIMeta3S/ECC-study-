---
name: laravel-tdd
description: 使用 PHPUnit、Pest、model factory、HTTP 测试、Sanctum 认证测试、mocking 与覆盖率的 Laravel 测试策略。
metadata:
  origin: ECC
---

# 使用 TDD 进行 Laravel 测试

使用 PHPUnit、Pest、Laravel factory 和测试辅助工具进行 Laravel 应用的测试驱动开发。

## 适用场景

- 编写新的 Laravel 应用或功能
- 实现带 Sanctum 或 Passport 认证的 API 端点
- 测试 Eloquent model、关系、scope 和 accessor
- 为 Laravel 项目搭建测试基础设施
- 为 HTTP controller 和 form request 编写 feature test
- Mock 外部服务（队列、邮件、通知、HTTP）

## Laravel 的 TDD 工作流

### Red-Green-Refactor 循环

```php
// 步骤 1：RED —— 编写一个失败的测试
public function test_a_product_can_be_created(): void
{
    $product = Product::factory()->create(['name' => 'Test Product']);
    $this->assertDatabaseHas('products', ['name' => 'Test Product']);
}

// 步骤 2：GREEN —— 编写 migration、model 和 factory
// 步骤 3：REFACTOR —— 在保持测试 green 的同时改进
```

## 环境配置

### PHPUnit 配置

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true">
    <testsuites>
        <testsuite name="Unit">
            <directory suffix="Test.php">tests/Unit</directory>
        </testsuite>
        <testsuite name="Feature">
            <directory suffix="Test.php">tests/Feature</directory>
        </testsuite>
    </testsuites>
    <php>
        <env name="APP_ENV" value="testing"/>
        <env name="BCRYPT_ROUNDS" value="4"/>
        <env name="CACHE_STORE" value="array"/>
        <env name="DB_CONNECTION" value="sqlite"/>
        <env name="DB_DATABASE" value=":memory:"/>
        <env name="MAIL_MAILER" value="array"/>
        <env name="QUEUE_CONNECTION" value="sync"/>
        <env name="SESSION_DRIVER" value="array"/>
    </php>
</phpunit>
```

### 基础 TestCase 配置

```php
namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // 仅在测试非 HTTP 异常的测试中调用 $this->withoutExceptionHandling()；
        // 它会屏蔽 assertStatus() 等。
    }

    // 辅助方法：认证并返回 user
    protected function actingAsUser(): mixed
    {
        $user = \App\Models\User::factory()->create();
        $this->actingAs($user);
        return $user;
    }

    protected function actingAsAdmin(): mixed
    {
        $admin = \App\Models\User::factory()->admin()->create();
        $this->actingAs($admin);
        return $admin;
    }
}
```

## Model Factory

```php
// database/factories/UserFactory.php
class UserFactory extends Factory
{
    protected static ?string $password = null;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'role' => 'user',
        ];
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => ['role' => 'admin']);
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => ['email_verified_at' => null]);
    }
}

// database/factories/ProductFactory.php
class ProductFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(3, true),
            'slug' => fn (array $attrs) => Str::slug($attrs['name']),
            'description' => fake()->paragraph(),
            'price' => fake()->numberBetween(100, 100000),
            'stock' => fake()->numberBetween(0, 100),
            'is_active' => true,
            'user_id' => UserFactory::new(),
        ];
    }

    public function outOfStock(): static
    {
        return $this->state(fn (array $attributes) => ['stock' => 0]);
    }
}
```

### 使用 Factory

```php
$user = User::factory()->create();
$admin = User::factory()->admin()->create();
$product = Product::factory()->create(['user_id' => $user->id]);
$products = Product::factory()->count(10)->create();
$draft = Product::factory()->make(); // 未持久化

// 带关系
$user = User::factory()->has(Product::factory()->count(3))->create();

// 序列
User::factory()->count(3)->sequence(
    ['role' => 'admin'], ['role' => 'editor'], ['role' => 'user'],
)->create();
```

## Model 测试

```php
namespace Tests\Unit\Models;

use App\Models\User;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_hides_sensitive_attributes(): void
    {
        $user = User::factory()->create();
        $this->assertArrayNotHasKey('password', $user->toArray());
    }

    public function test_admin_scope_returns_only_admins(): void
    {
        User::factory()->admin()->create();
        User::factory()->count(3)->create();

        $this->assertCount(1, User::admin()->get());
    }
}

class ProductTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_scope_filters_correctly(): void
    {
        Product::factory()->count(3)->create(['is_active' => true]);
        Product::factory()->count(2)->create(['is_active' => false]);

        $this->assertCount(3, Product::active()->get());
    }

    public function test_it_belongs_to_a_user(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['user_id' => $user->id]);

        $this->assertTrue($product->user->is($user));
    }
}
```

## Feature / HTTP 测试

```php
namespace Tests\Feature\Http\Controllers;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_login(): void
    {
        $this->get(route('products.create'))->assertRedirect(route('login'));
    }

    public function test_it_stores_a_new_product(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post(route('products.store'), [
            'name' => 'New Product',
            'description' => 'Description',
            'price' => 2999,
            'stock' => 10,
        ]);

        $response->assertRedirect(route('products.index'));
        $this->assertDatabaseHas('products', [
            'name' => 'New Product',
            'user_id' => $user->id,
        ]);
    }

    public function test_it_validates_required_fields(): void
    {
        $this->actingAs(User::factory()->create());
        $this->post(route('products.store'), [])
            ->assertSessionHasErrors(['name', 'price']);
    }

    public function test_users_cannot_modify_others_products(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $product = Product::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($attacker)
            ->delete(route('products.destroy', $product))
            ->assertForbidden();
    }
}
```

## JSON API 测试

```php
namespace Tests\Feature\Http\Controllers\Api;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/products')->assertUnauthorized();
    }

    public function test_it_lists_paginated_products(): void
    {
        $user = User::factory()->create();
        Product::factory()->count(5)->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->getJson('/api/products');

        $response->assertOk();
        $response->assertJsonCount(5, 'data');
        $response->assertJsonStructure([
            'data' => [['id', 'name', 'price']],
            'meta' => ['current_page', 'last_page', 'total'],
        ]);
    }

    public function test_it_creates_a_product(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/products', [
            'name' => 'API Product',
            'price' => 4999,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.name', 'API Product');
    }

    public function test_users_cannot_delete_others_products(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $product = Product::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($attacker)
            ->deleteJson("/api/products/{$product->id}")
            ->assertForbidden();
    }
}
```

## Sanctum API 认证测试

```php
namespace Tests\Feature\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_can_register(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertCreated();
        $response->assertJsonStructure(['data' => ['user', 'token']]);
    }

    public function test_users_can_login(): void
    {
        User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('Password123!'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'Password123!',
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['data' => ['token']]);
    }

    public function test_users_cannot_login_with_wrong_password(): void
    {
        User::factory()->create(['email' => 'test@example.com']);

        $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'wrong',
        ])->assertUnprocessable();
    }

    public function test_token_bearer_authenticates_requests(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);
    }
}
```

## Mocking 与 Fakes

### HTTP Fake

```php
use Illuminate\Support\Facades\Http;

public function test_it_handles_successful_payment(): void
{
    Http::fake([
        'api.stripe.com/*' => Http::response(['id' => 'pi_123', 'status' => 'succeeded'], 200),
    ]);

    $result = (new PaymentService())->charge(2999);
    $this->assertTrue($result->success);
}

public function test_it_handles_gateway_failure(): void
{
    Http::fake([
        'api.stripe.com/*' => Http::response(['error' => 'card_declined'], 402),
    ]);

    $this->expectException(PaymentFailedException::class);
    (new PaymentService())->charge(2999);
}

public function test_it_retries_on_timeout(): void
{
    Http::fake([
        'api.stripe.com/*' => Http::sequence()
            ->pushStatus(408)
            ->pushStatus(200),
    ]);

    $this->assertTrue((new PaymentService())->charge(2999)->success);
}
```

### Mail Fake

```php
Mail::fake();

$order->sendConfirmation();

Mail::assertSent(OrderConfirmation::class, function ($mail) use ($order) {
    return $mail->hasTo($order->user->email);
});
```

### Notification Fake

```php
Notification::fake();

$user->notify(new WelcomeUser());

Notification::assertSentTo($user, WelcomeUser::class);
```

### Queue Fake

```php
Queue::fake();

ProcessImage::dispatch($product);

Queue::assertPushed(ProcessImage::class, function ($job) use ($product) {
    return $job->product->id === $product->id;
});
```

### Storage Fake

```php
Storage::fake('public');

$file = UploadedFile::fake()->image('photo.jpg', 200, 200);

$response = $this->actingAs($user)->post('/avatar', [
    'avatar' => $file,
]);

$response->assertSessionHasNoErrors();
Storage::disk('public')->assertExists('avatars/' . $file->hashName());
```

### Event Fake

```php
Event::fake();

$order->markAsShipped();

Event::assertDispatched(OrderShipped::class, function ($event) use ($order) {
    return $event->order->id === $order->id;
});
```

## Artisan 命令测试

```php
public function test_it_sends_newsletters(): void
{
    Mail::fake();
    User::factory()->count(5)->create(['subscribed' => true]);

    $this->artisan('newsletter:send')
        ->expectsOutput('Sending newsletter to 5 subscribers...')
        ->assertExitCode(0);

    Mail::assertSent(NewsletterMail::class, 5);
}

public function test_it_handles_no_subscribers(): void
{
    $this->artisan('newsletter:send')
        ->expectsOutput('No subscribers found.')
        ->assertExitCode(0);
}
```

## 授权测试

```php
public function test_users_can_update_own_posts(): void
{
    $user = User::factory()->create();
    $post = Post::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->put(route('posts.update', $post), ['title' => 'Updated'])
        ->assertRedirect();
}

public function test_users_cannot_update_others_posts(): void
{
    $post = Post::factory()->create();
    $this->actingAs(User::factory()->create())
        ->put(route('posts.update', $post), ['title' => 'Hacked'])
        ->assertForbidden();
}

public function test_gate_before_grants_super_admin_full_access(): void
{
    $super = User::factory()->create(['role' => 'super-admin']);
    $post = Post::factory()->create();

    $this->actingAs($super)
        ->delete(route('posts.destroy', $post))
        ->assertRedirect();

    $this->assertSoftDeleted($post);
}
```

## Pest Feature 测试

```php
<?php

use App\Models\Product;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
});

it('lists products', function () {
    Product::factory()->count(3)->create(['user_id' => $this->user->id]);

    $this->get(route('products.index'))
        ->assertOk()
        ->assertViewHas('products');
});

it('creates a product with valid data', function () {
    $this->post(route('products.store'), [
        'name' => 'Test Product', 'price' => 1999,
    ])->assertRedirect();

    $this->assertDatabaseHas('products', ['name' => 'Test Product']);
});

it('fails validation without required fields', function () {
    $this->post(route('products.store'), [])
        ->assertSessionHasErrors(['name', 'price']);
});

it('authorizes updates', function () {
    $other = User::factory()->create();
    $product = Product::factory()->create(['user_id' => $other->id]);

    $this->put(route('products.update', $product), ['name' => 'Hacked'])
        ->assertForbidden();
});
```

## 覆盖率

```bash
# PHPUnit（使用 clover 输出用于 CI 阈值检查）
vendor/bin/phpunit --coverage-html coverage --coverage-clover clover.xml

# Pest（内置阈值支持）
vendor/bin/pest --coverage --min=80
```

### 覆盖率目标

| 组件 | 目标 |
|-----------|--------|
| Model | 95%+ |
| Action / Service | 90%+ |
| Form Request | 90%+ |
| Controller | 85%+ |
| Policy | 95%+ |
| 总体 | 80%+ |

## 测试最佳实践

### 应该做的

- 优先使用 factory 而非手动 `create()` 调用
- 每个测试只做一个逻辑断言
- 使用描述性命名：`test_guests_cannot_create_products`
- 测试边界情况和授权边界
- 使用 `Http::fake()`、`Mail::fake()` mock 外部服务
- 使用 `RefreshDatabase` 保持干净状态

### 不应该做的

- 不要测试 Laravel 内部（信任框架）
- 不要让测试相互依赖
- 不要过度 mock —— 只在服务边界处 mock
- 不要测试 private 方法 —— 通过 public 接口测试
- 不要把测试与 HTML 结构耦合

## 快速参考

| 模式 | 用法 |
|---------|-------|
| `RefreshDatabase` | 在测试间重置数据库 |
| `$this->actingAs($user)` | 以 user 身份认证 |
| `$this->withToken($token)` | 用于 API 的 bearer token 认证 |
| `Model::factory()->create()` | 使用 factory 创建 model |
| `Model::factory()->count(5)->create()` | 创建多条记录 |
| `Http::fake([...])` | Mock HTTP 调用 |
| `Mail::fake()` | 拦截已发送邮件 |
| `Notification::fake()` | 拦截已发送通知 |
| `Queue::fake()` | 拦截队列 job |
| `Event::fake()` | 拦截已分发事件 |
| `Storage::fake('public')` | 拦截文件操作 |
| `assertDatabaseHas` | 断言数据库行存在 |
| `assertSoftDeleted` | 断言软删除 |
| `assertSessionHasErrors` | 断言校验错误 |
| `assertForbidden` | 断言 403 状态码 |

## 相关 Skills

- `laravel-patterns` —— Laravel 架构、Eloquent、路由和 API 模式
- `laravel-security` —— Laravel 认证、授权和安全编码
- `tdd-workflow` —— 仓库范围的 RED -> GREEN -> REFACTOR 循环
- `backend-patterns` —— 通用后端 API 和数据库模式
