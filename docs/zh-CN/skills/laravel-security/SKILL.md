---
name: laravel-security
description: Laravel 安全最佳实践 —— 涵盖认证、授权、Eloquent 安全、CSRF、XSS 防护、API 安全以及安全的部署配置。
metadata:
  origin: ECC
---

# Laravel 安全最佳实践

Laravel 应用的全面安全指南，用于防范常见漏洞。

## 何时启用

- 配置 Laravel 的认证与授权（Sanctum、Passport、Jetstream、Breeze）
- 实现用户角色、权限与 policy
- 配置生产环境安全设置与环境变量
- 对 Laravel 应用进行安全漏洞审查
- 将 Laravel 应用部署到生产环境
- 编写安全的 Eloquent 查询与 migration

## 生产环境配置

### 关键生产环境设置

```php
// config/app.php
'env' => env('APP_ENV', 'production'),
'debug' => (bool) env('APP_DEBUG', false), // CRITICAL：生产环境绝不可为 true
'key' => env('APP_KEY'), // 必须设置：php artisan key:generate

// config/session.php
'secure' => env('SESSION_SECURE_COOKIE', true),
'http_only' => true,
'same_site' => 'lax',

// 在启动时校验 APP_KEY 是否已设置
// bootstrap/app.php 或某个 service provider
if (empty(config('app.key'))) {
    throw new RuntimeException('APP_KEY is not set. Run: php artisan key:generate');
}
```

### 环境文件安全

```bash
# 绝不可将 .env 提交到版本控制
# .gitignore 默认已包含 .env

# 改用带占位符的 .env.example
DB_PASSWORD=
APP_KEY=
SANCTUM_TOKEN_PREFIX=

// 在启动时校验必填变量
// 在 AppServiceProvider::boot() 中
$requiredKeys = ['app.key', 'database.connections.mysql.database', 'database.connections.mysql.username'];
foreach ($requiredKeys as $key) {
    if (empty(config($key))) {
        throw new RuntimeException("Missing required config key: {$key}");
    }
}
```

### 强制 HTTPS

```php
// AppServiceProvider::boot() 或 middleware
if (app()->environment('production')) {
    URL::forceScheme('https');
    request()->server->set('HTTPS', 'on');
}

// config/app.php 配置受信任代理（负载均衡器）
// 使用具体的 IP 段 —— * 会信任所有来源，从而允许 X-Forwarded-* 伪造
// AWS：'10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'
'trusted_proxies' => ['10.0.0.0/8', '172.16.0.0/12'],

// 通过 middleware 在生产环境强制 HTTPS
// app/Http/Middleware/ForceHttps.php
public function handle($request, Closure $next)
{
    if (!$request->secure() && app()->environment('production')) {
        return redirect()->secure($request->getRequestUri());
    }
    return $next($request);
}
```

## 认证

### Sanctum（API Token 认证）

```php
// config/sanctum.php
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
    '%s%s',
    'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1',
    env('APP_URL') ? ',' . parse_url(env('APP_URL'), PHP_URL_HOST) : ''
)));

'expiration' => 60 * 24, // token 过期时间，单位分钟（null = 永不过期）
'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

// 发放带 ability 的 token
$token = $user->createToken('api-token', ['read', 'write'])->plainTextToken;

// 在路由上校验 ability
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/orders', function () {
        // 用户必须拥有 'read' ability
        abort_unless(Auth::user()->tokenCan('read'), 403);
        // ...
    })->middleware('abilities:read');

    Route::post('/orders', function () {
        // 用户必须拥有 'write' ability
        abort_unless(Auth::user()->tokenCan('write'), 403);
        // ...
    })->middleware('abilities:write');
});
```

### 密码安全

```php
// config/hashing.php
// 默认是 bcrypt。Argon2id 更强。
'bcrypt' => [
    'rounds' => env('BCRYPT_ROUNDS', 12), // 增大可加强哈希强度
],

'argon' => [
    'memory' => 65536,
    'threads' => 4,
    'time' => 4,
],

// RegisterRequest 中的密码校验
public function rules(): array
{
    return [
        'password' => [
            'required',
            'confirmed',
            Password::min(12)
                ->letters()
                ->mixedCase()
                ->numbers()
                ->symbols()
                ->uncompromised(), // 检查 haveibeenpwned
        ],
    ];
}

// 登录尝试限流
// App\Http\Controllers\Auth\AuthenticatedSessionController
protected function authenticated(Request $request, $user)
{
    if ($user->wasRecentlyLockedOut()) {
        // 通知用户存在可疑登录
        $user->notify(new SuspiciousLoginNotification($request->ip()));
    }
}
```

### Session 管理

```php
// config/session.php
'driver' => env('SESSION_DRIVER', 'database'), // database/redis 优于 file
'lifetime' => env('SESSION_LIFETIME', 120),
'expire_on_close' => env('SESSION_EXPIRE_ON_CLOSE', false),
'encrypt' => env('SESSION_ENCRYPT', false),

// 登录时重新生成 session
// App\Http\Controllers\Auth\AuthenticatedSessionController
public function store(LoginRequest $request): RedirectResponse
{
    $request->authenticate();
    $request->session()->regenerate(); // CRITICAL：防止 session fixation
    return redirect()->intended(RouteServiceProvider::HOME);
}

// 登出时让 session 失效
public function destroy(Request $request): RedirectResponse
{
    Auth::guard('web')->logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    return redirect('/');
}
```

## 授权

### Gate

```php
// App\Providers\AuthServiceProvider
use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\Gate;

public function boot(): void
{
    Gate::define('update-post', function (User $user, Post $post): bool {
        return $user->id === $post->user_id;
    });

    Gate::define('publish-post', function (User $user): bool {
        return $user->role === 'editor' || $user->role === 'admin';
    });

    // 使用 before() 让超级管理员绕过所有检查
    Gate::before(function (User $user, string $ability): ?bool {
        if ($user->role === 'super-admin') {
            return true; // 授予所有 ability
        }
        return null; // 继续走正常检查
    });
}

// 在 controller 中使用
public function update(Request $request, Post $post): RedirectResponse
{
    Gate::authorize('update-post', $post);
    // 或者：$this->authorize('update-post', $post);
    // 或者：abort_unless(Auth::user()->can('update-post', $post), 403);
    // ...
}
```

### Policy

```php
// App\Policies\PostPolicy
class PostPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user): bool
    {
        return true; // 公开列表
    }

    public function view(?User $user, Post $post): bool
    {
        return $post->is_published || ($user && $user->id === $post->user_id);
    }

    public function create(User $user): bool
    {
        return $user->hasVerifiedEmail(); // 必须先验证邮箱
    }

    public function update(User $user, Post $post): bool
    {
        return $user->id === $post->user_id;
    }

    public function delete(User $user, Post $post): bool
    {
        return $user->id === $post->user_id && $post->created_at->diffInDays(now()) <= 30;
    }

    public function restore(User $user, Post $post): bool
    {
        return $user->role === 'admin';
    }

    public function forceDelete(User $user, Post $post): bool
    {
        return $user->role === 'super-admin';
    }
}

// 在 AuthServiceProvider 中注册
protected $policies = [
    Post::class => PostPolicy::class,
];

// controller 中使用
public function show(Post $post): View
{
    $this->authorize('view', $post);
    return view('posts.show', compact('post'));
}

// Blade 中使用
@can('update', $post)
    <a href="{{ route('posts.edit', $post) }}">Edit</a>
@endcan

@cannot('update', $post)
    <span>You cannot edit this post</span>
@endcannot
```

### Middleware 授权

```php
// 在路由中使用 middleware
Route::put('/posts/{post}', [PostController::class, 'update'])
    ->middleware('can:update,post');

Route::get('/posts/create', [PostController::class, 'create'])
    ->middleware('can:create,App\Models\Post');

// 自定义授权 middleware
// app/Http/Middleware/CheckRole.php
class CheckRole
{
    public function handle(Request $request, Closure $next, string $role): mixed
    {
        if (!$request->user() || $request->user()->role !== $role) {
            abort(403, 'Unauthorized. This area requires role: ' . $role);
        }
        return $next($request);
    }
}

// 在 Kernel 中注册
protected $routeMiddleware = [
    'role' => \App\Http\Middleware\CheckRole::class,
];

// 路由中使用
Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::get('/admin', [AdminController::class, 'index']);
});
```

## Eloquent 安全

### 批量赋值防护

```php
// 错误：$guarded = [] 会让所有字段都可被批量赋值
// 生产环境绝不可使用 $guarded = []

// 正确：白名单列出可填充属性
final class User extends Authenticatable
{
    protected $fillable = [
        'name',
        'email',
        'phone',
        'avatar',
    ];
    // 绝不可在此加入 'role'、'is_admin'、'is_verified'
}

// 正确：在 request 中显式控制可填充字段
public function store(StoreUserRequest $request): RedirectResponse
{
    $user = User::create($request->safe()->only([
        'name', 'email', 'phone', 'avatar'
    ]));
    // $request->safe() 只使用已校验的数据
    // $request->only() 在没有校验规则的情况下并不安全
}

// 错误：直接用 request 数据创建用户
User::create($request->all()); // 易受批量赋值攻击！

// 更好：使用 DTO 进行创建
$user = User::create($request->validated()); // 仅校验通过的字段
```

### SQL 注入防护

```php
// 正确：Eloquent 会自动对查询做参数化
User::where('email', $userInput)->first();
User::whereRaw('email = ?', [$userInput])->first();

// 正确：Query Builder 同样会参数化
DB::table('users')->where('email', $userInput)->first();
DB::select('SELECT * FROM users WHERE email = ?', [$userInput]);

// 错误：原始字符串拼接
DB::select("SELECT * FROM users WHERE email = '{$userInput}'"); // 存在漏洞！
User::whereRaw("email = '{$userInput}'")->first(); // 存在漏洞！

// 错误：whereRaw/orderByRaw 接收未转义输入
User::orderByRaw($userInput); // 存在漏洞！
User::groupByRaw($userInput); // 存在漏洞！

// 错误：DB::statement 使用字符串拼接
DB::statement("INSERT INTO users (email) VALUES ('{$userInput}')"); // 存在漏洞！
```

### 属性转换

```php
final class User extends Authenticatable
{
    protected $casts = [
        'email_verified_at' => 'datetime',
        'is_admin' => 'boolean', // 转为布尔值，防止字符串注入
        'settings' => 'array', // 自动 json_encode/json_decode
        'metadata' => 'encrypted:array', // Laravel 11+ 加密转换
        'password' => 'hashed', // Laravel 10+ 在赋值时自动哈希
    ];
}
```

### Model 安全

```php
final class User extends Authenticatable
{
    // 在 JSON/API 响应中隐藏敏感属性
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    // 只追加安全的计算属性
    protected $appends = ['full_name']; // 安全
    // 绝不追加敏感的计算数据
}

final class Post extends Model
{
    // 用全局 scope 过滤软删除记录
    use SoftDeletes;

    // 通过限制延迟加载来防止 N+1（可选的严格模式）
    // AppServiceProvider::boot()
    // Model::preventLazyLoading(!app()->isProduction());
}
```

## CSRF 防护

### 默认防护

```php
// Laravel 通过 VerifyCsrfToken middleware 默认启用 CSRF 防护
// app/Http/Kernel.php（protected $middlewareGroups['web']）

// 所有 POST/PUT/PATCH/DELETE 表单都必须包含 @csrf
<form method="POST" action="/posts">
    @csrf
    <input type="text" name="title">
    <button type="submit">Create</button>
</form>
```

### 排除路由（需谨慎）

```php
// app/Http/Middleware/VerifyCsrfToken.php
class VerifyCsrfToken extends Middleware
{
    // 仅排除那些已有外部 CSRF 防护的路由（webhook 等）
    protected $except = [
        'stripe/*', // Stripe webhook 使用其自带的签名校验
        // 避免一刀切地写 'api/*' —— 有状态的 Sanctum 路由需要 CSRF。
        // 仅排除特定的无状态 webhook/端点路由。
    ];
}
```

### 与 JavaScript 配合的 CSRF

```html
<meta name="csrf-token" content="{{ csrf_token() }}">

<script>
// Axios 示例（Laravel 自带 Axios）
axios.defaults.headers.common['X-CSRF-TOKEN'] = document.querySelector(
    'meta[name="csrf-token"]'
).getAttribute('content');

// Fetch 示例
fetch('/posts', {
    method: 'POST',
    headers: {
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
});
</script>
```

## XSS 防护

### Blade 模板安全

```blade
{{-- 安全：由 Blade 自动转义 --}}
{{ $userInput }}

{{-- 危险：原始输出 —— 绝不可用于用户输入 --}}
{!! $userInput !!}

{{-- 安全：{!! !!} 仅用于你可控的受信任内容 --}}
{!! $trustedHtmlFromYourServer !!}

{{-- 正确：使用专门的转义指令 --}}
@js($data) {{-- 为 JavaScript 做 JSON 编码 --}}
@json($data) {{-- 在模板中做 JSON 编码 --}}

{{-- 错误：在原始 HTML 中直接使用用户输入 --}}
<div>{!! $user->bio !!}</div> {{-- 若用户填写 bio 则存在漏洞 --}}
```

### 安全的 HTML 处理

```php
// 当确实需要保留部分 HTML 时，使用白名单方式
use HTMLPurifier; // 需要：composer require ezyang/htmlpurifier

public function sanitizeHtml(string $dirty): string
{
    $config = \HTMLPurifier_Config::createDefault();
    $config->set('HTML.Allowed', 'p,b,i,a[href],ul,ol,li,br');
    $config->set('URI.AllowedSchemes', ['http', 'https', 'mailto']);
    $purifier = new \HTMLPurifier($config);
    return $purifier->purify($dirty);
}

// 在 blade 中：
<div>{!! $sanitizedContent !!}</div> {{-- 经净化后安全 --}}
```

### JavaScript 上下文转义

```blade
{{-- 安全：Blade 的 @js 会针对 JavaScript 上下文转义 --}}
<script>
    const user = @js($user); // JSON + 针对 JS 上下文转义
    const settings = @json($settings); // 直接 JSON 编码
</script>

{{-- 危险：在 JS 上下文中手动 JSON --}}
<script>
    const user = {{ json_encode($user) }}; // 未针对 JS 上下文转义！
</script>
```

### 用于 XSS 防护的 HTTP Header

```php
// App\Http\Middleware\SecurityHeaders.php
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): mixed
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'"
        );

        return $response;
    }
}

// 在 kernel 中注册
protected $middleware = [
    \App\Http\Middleware\SecurityHeaders::class,
];
```

## 输入校验

### Form Request 校验

```php
final class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Post::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255', 'sanitize_html'],
            'content' => ['required', 'string', 'max:10000'],
            'image' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,gif,webp', // 白名单指定类型
                'max:2048', // 最大 2MB
            ],
            'tags' => ['array'],
            'tags.*' => ['integer', 'exists:tags,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.max' => 'Post title must not exceed 255 characters.',
            'image.max' => 'Image must be under 2MB.',
        ];
    }

    // 校验后对输入做净化
    public function validated($key = null, $default = null): mixed
    {
        $validated = parent::validated();
        $validated['title'] = strip_tags($validated['title']);
        return $key ? ($validated[$key] ?? $default) : $validated;
    }
}
```

### 自定义校验规则

```php
// app/Rules/StrongPassword.php
class StrongPassword implements Rule
{
    public function passes($attribute, $value): bool
    {
        return preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{12,}$/', $value);
    }

    public function message(): string
    {
        return 'The :attribute must be at least 12 characters with uppercase, lowercase, number, and symbol.';
    }
}

// app/Rules/NotBlacklistedDomain.php
class NotBlacklistedDomain implements Rule
{
    private array $blacklisted = ['mailinator.com', 'guerrillamail.com'];

    public function passes($attribute, $value): bool
    {
        $domain = substr(strrchr($value, '@'), 1);
        return !in_array(strtolower($domain), $this->blacklisted);
    }

    public function message(): string
    {
        return 'Email from disposable domains is not allowed.';
    }
}
```

## API 安全

### 限流

```php
// App/Providers/RouteServiceProvider
protected function configureRateLimiting(): void
{
    RateLimiter::for('api', function (Request $request) {
        return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
    });

    RateLimiter::for('auth', function (Request $request) {
        return Limit::perMinute(5)->by($request->ip())
            ->response(function () {
                return response()->json([
                    'message' => 'Too many login attempts. Try again in 1 minute.',
                ], 429);
            });
    });

    RateLimiter::for('uploads', function (Request $request) {
        return Limit::perHour(10)->by($request->user()?->id ?? $request->ip())
            ->response(function () {
                return response()->json([
                    'message' => 'Upload limit reached. Try again later.',
                ], 429);
            });
    });
}

// 路由中使用
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::apiResource('posts', PostController::class);
});

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:auth');
```

### API 认证 —— Sanctum vs Passport

```php
// Sanctum（大多数应用推荐 —— 简单、第一方、适配 SPA）
// config/sanctum.php
'expiration' => 60 * 24, // token 24 小时后过期
'model' => User::class,

// 发放带 scope 的 token
$token = $user->createToken('client-name', [
    'posts:read',
    'posts:write',
])->plainTextToken;

// middleware 限定 scope
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/posts', [PostController::class, 'index'])
        ->middleware('abilities:posts:read');

    Route::post('/posts', [PostController::class, 'store'])
        ->middleware('abilities:posts:write');
});

// Passport（OAuth2 —— 用于第三方客户端或复杂认证流程）
// 安装：composer require laravel/passport
Passport::tokensExpireIn(now()->addDays(15));
Passport::refreshTokensExpireIn(now()->addDays(30));
Passport::personalAccessTokensExpireIn(now()->addMonths(6));
```

### CORS 配置

```php
// config/cors.php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', '')), // 白名单指定来源
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => ['X-Total-Count', 'X-Pagination-Page'],
    'max_age' => 0,
    'supports_credentials' => true, // Sanctum SPA 认证必需
];

// 绝不可：生产环境除非确有必要，否则不要放行所有来源
// 'allowed_origins' => ['*'], // 仅用于完全公开的 API
```

## 文件上传安全

### 校验

```php
public function rules(): array
{
    return [
        'document' => [
            'required',
            'file',
            'mimes:pdf,doc,docx,xls,xlsx', // 白名单指定 MIME 类型
            'max:10240', // 10MB
            'extensions:pdf,doc,docx,xls,xlsx', // 校验扩展名与 MIME 一致
        ],
        'avatar' => [
            'nullable',
            'image', // 确保是合法图片
            'mimes:jpg,jpeg,png,webp',
            'max:2048',
            'dimensions:min_width=100,min_height=100,max_width=2000,max_height=2000',
        ],
    ];
}
```

### 安全存储

```php
// 将文件存储在 public 目录之外
$path = $request->file('document')->store('documents', 'local');
// 敏感文档绝不可使用 'public' disk

// 使用签名 URL 进行临时文件访问
use Illuminate\Support\Facades\Storage;

public function download(Request $request, string $path)
{
    // 生成临时签名 URL（15 分钟后过期）
    $url = Storage::temporaryUrl($path, now()->addMinutes(15));

    // 校验用户是否拥有权限
    $this->authorize('download', $path);

    return redirect($url);
}

// 云存储的加密配置
// config/filesystems.php
's3' => [
    'driver' => 's3',
    'key' => env('AWS_ACCESS_KEY_ID'),
    'secret' => env('AWS_SECRET_ACCESS_KEY'),
    'region' => env('AWS_DEFAULT_REGION'),
    'bucket' => env('AWS_BUCKET'),
    'url' => env('AWS_URL'),
    'endpoint' => env('AWS_ENDPOINT'),
    'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
    'throw' => false,
    'server_side_encryption' => 'AES256', // 静态加密
],
```

## 依赖与密钥

### Composer 安全

```bash
# 始终在 CI 中审计依赖
composer audit

# 在 composer.json 中锁定主版本
"laravel/framework": "^11.0",
"spatie/laravel-permission": "^6.0"

# 检查被弃用的包
composer why-not

# 将 lock 文件纳入版本控制（它会锁定精确版本）
# 谨慎执行 composer update，绝不在 CI/CD 中执行
```

### 密钥管理

```bash
# .env 文件（绝不可提交）
# .gitignore 默认包含 .env

APP_KEY=base64:abc123...
DB_PASSWORD=secure_password
STRIPE_KEY=sk_live_...
SANCTUM_TOKEN_PREFIX=myapp_

# 生产环境：使用 secret manager
# 部署命令：env $(aws secretsmanager get-secret-value --secret-id prod/db | jq ...) php artisan serve

// 在启动时校验密钥（AppServiceProvider::boot）
$secrets = ['services.stripe.key', 'services.stripe.webhook_secret'];
foreach ($secrets as $key) {
    if (empty(config($key))) {
        Log::critical("Missing secret: {$key}");
    }
}
```

## Queue 安全

```php
// 定义一个具名 rate limiter（通常位于 AppServiceProvider::boot()）
RateLimiter::for('payments', fn () => Limit::perMinute(5));
```

```php
// 通过实现接口来加密敏感 job 数据
final class ProcessPaymentJob implements ShouldQueue, ShouldBeEncrypted
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private readonly string $paymentIntentId, // 公开 ID 没问题
        private readonly string $cardFingerprint, // 通过 ShouldBeEncrypted 加密
    ) {}

    public function handle(): void
    {
        // 处理支付
    }

    // 限制重试次数以及尝试之间的延迟
    public function retryUntil(): Carbon
    {
        return now()->addMinutes(5);
    }

    // 限制该类型 job 的并发运行数量
    public function middleware(): array
    {
        return [
            new RateLimited('payments'),
        ];
    }
}
```

## 记录安全事件

```php
// config/logging.php
'channels' => [
    'security' => [
        'driver' => 'single',
        'path' => storage_path('logs/security.log'),
        'level' => 'warning',
    ],
],

// 审计日志助手
final class SecurityLogger
{
    public static function log(string $event, array $context = []): void
    {
        Log::channel('security')->warning($event, array_merge([
            'user_id' => Auth::id(),
            'ip' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'url' => request()->fullUrl(),
            'timestamp' => now()->toIso8601String(),
        ], $context));
    }
}

// 用法
SecurityLogger::log('failed_login_attempt', ['email' => $email]);
SecurityLogger::log('password_change');
SecurityLogger::log('role_change', ['target_user' => $targetId, 'new_role' => 'admin']);
SecurityLogger::log('suspicious_activity', ['reason' => 'multiple_attempts_from_different_ips']);
```

## 安全速查表

| 检查项 | 说明 |
|-------|-------------|
| `APP_DEBUG=false` | 生产环境绝不可开启 debug 运行 |
| `APP_KEY` 已设置 | 始终执行 `php artisan key:generate` |
| 强制 HTTPS | 通过 middleware 或代理在生产环境强制 HTTPS |
| `$fillable` 白名单 | 绝不使用 `$guarded = []` |
| CSRF 已启用 | 所有改变状态的表单都加 `@csrf` |
| Sanctum/Passport 已配置 | 使用 token ability/scope 进行 API 认证 |
| 已配置限流 | 对 API 与认证端点进行限流 |
| 输入校验 | 使用 FormRequest 配合具体规则，绝不用 `$request->all()` |
| 文件上传限制 | 校验 MIME 类型、大小、尺寸 |
| CI 中执行 `composer audit` | 检查依赖的已知漏洞 |
| `password_hash` / `password_verify` | 使用 Laravel 内置的哈希（bcrypt/Argon2） |
| 登录时重新生成 session | 调用 `$request->session()->regenerate()` |
| 安全 header middleware | CSP、X-Frame-Options、X-Content-Type-Options |
| 记录安全事件 | 对认证失败、角色变更、可疑行为写入审计日志 |
| `.env` 未被提交 | 确认 `.gitignore` 包含 `.env` |

## 关联 Skill

- `laravel-patterns` —— Laravel 架构、路由、Eloquent 与 API 模式
- `backend-patterns` —— 通用后端 API 与数据库模式
- `laravel-tdd` —— 使用 PHPUnit 与 Pest 进行 Laravel 测试
