---
name: laravel-patterns
description: 面向生产级应用的 Laravel 架构模式、路由/控制器、Eloquent ORM、服务层、队列、事件、缓存以及 API resources。
metadata:
  origin: ECC
---

# Laravel 开发模式

面向可扩展、可维护应用的生产级 Laravel 架构模式。

## 何时使用

- 构建 Laravel Web 应用或 API
- 组织控制器、服务和领域逻辑的结构
- 使用 Eloquent 模型与关联关系
- 使用 resources 和分页设计 API
- 添加队列、事件、缓存和后台作业

## 工作原理

- 围绕清晰的边界组织应用结构（控制器 -> 服务/actions -> 模型）。
- 使用显式绑定和作用域绑定以保持路由的可预测性；同时仍通过授权来强制执行访问控制。
- 优先采用类型化模型、类型转换和作用域，以保持领域逻辑的一致性。
- 将 IO 密集型工作放入队列，并缓存开销较大的读取操作。
- 在 `config/*` 中集中管理配置，并保持各环境的显式性。

## 示例

### 项目结构

使用常规的 Laravel 布局，具备清晰的分层边界（HTTP、服务/actions、模型）。

### 推荐布局

```
app/
├── Actions/            # 单一用途的用例
├── Console/
├── Events/
├── Exceptions/
├── Http/
│   ├── Controllers/
│   ├── Middleware/
│   ├── Requests/       # 表单请求验证
│   └── Resources/      # API resources
├── Jobs/
├── Models/
├── Policies/
├── Providers/
├── Services/           # 协调领域服务
└── Support/
config/
database/
├── factories/
├── migrations/
└── seeders/
resources/
├── views/
└── lang/
routes/
├── api.php
├── web.php
└── console.php
```

### 控制器 -> 服务 -> Actions

保持控制器精简。将编排逻辑放在服务中，将单一用途的逻辑放在 action 中。

```php
final class CreateOrderAction
{
    public function __construct(private OrderRepository $orders) {}

    public function handle(CreateOrderData $data): Order
    {
        return $this->orders->create($data);
    }
}

final class OrdersController extends Controller
{
    public function __construct(private CreateOrderAction $createOrder) {}

    public function store(StoreOrderRequest $request): JsonResponse
    {
        $order = $this->createOrder->handle($request->toDto());

        return response()->json([
            'success' => true,
            'data' => OrderResource::make($order),
            'error' => null,
            'meta' => null,
        ], 201);
    }
}
```

### 路由与控制器

为清晰起见，优先使用路由模型绑定和资源控制器。

```php
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('projects', ProjectController::class);
});
```

### 路由模型绑定（作用域）

使用作用域绑定以防止跨租户访问。

```php
Route::scopeBindings()->group(function () {
    Route::get('/accounts/{account}/projects/{project}', [ProjectController::class, 'show']);
});
```

### 嵌套路由与绑定名称

- 保持前缀和路径一致，以避免重复嵌套（例如 `conversation` 与 `conversations`）。
- 使用与所绑定模型匹配的单一参数名（例如 `Conversation` 使用 `{conversation}`）。
- 嵌套时优先使用作用域绑定，以强制执行父子关系。

```php
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\MessageController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->prefix('conversations')->group(function () {
    Route::post('/', [ConversationController::class, 'store'])->name('conversations.store');

    Route::scopeBindings()->group(function () {
        Route::get('/{conversation}', [ConversationController::class, 'show'])
            ->name('conversations.show');

        Route::post('/{conversation}/messages', [MessageController::class, 'store'])
            ->name('conversation-messages.store');

        Route::get('/{conversation}/messages/{message}', [MessageController::class, 'show'])
            ->name('conversation-messages.show');
    });
});
```

如果希望让某个参数解析为不同的模型类，请定义显式绑定。对于自定义绑定逻辑，请使用 `Route::bind()` 或在模型上实现 `resolveRouteBinding()`。

```php
use App\Models\AiConversation;
use Illuminate\Support\Facades\Route;

Route::model('conversation', AiConversation::class);
```

### 服务容器绑定

在服务提供器中将接口绑定到实现，以清晰地装配依赖关系。

```php
use App\Repositories\EloquentOrderRepository;
use App\Repositories\OrderRepository;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(OrderRepository::class, EloquentOrderRepository::class);
    }
}
```

### Eloquent 模型模式

### 模型配置

```php
final class Project extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'owner_id', 'status'];

    protected $casts = [
        'status' => ProjectStatus::class,
        'archived_at' => 'datetime',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('archived_at');
    }
}
```

### 自定义类型转换与值对象

使用枚举或值对象以实现严格类型。

```php
use Illuminate\Database\Eloquent\Casts\Attribute;

protected $casts = [
    'status' => ProjectStatus::class,
];
```

```php
protected function budgetCents(): Attribute
{
    return Attribute::make(
        get: fn (int $value) => Money::fromCents($value),
        set: fn (Money $money) => $money->toCents(),
    );
}
```

### 通过预加载避免 N+1

```php
$orders = Order::query()
    ->with(['customer', 'items.product'])
    ->latest()
    ->paginate(25);
```

### 用于复杂过滤的查询对象

```php
final class ProjectQuery
{
    public function __construct(private Builder $query) {}

    public function ownedBy(int $userId): self
    {
        $query = clone $this->query;

        return new self($query->where('owner_id', $userId));
    }

    public function active(): self
    {
        $query = clone $this->query;

        return new self($query->whereNull('archived_at'));
    }

    public function builder(): Builder
    {
        return $this->query;
    }
}
```

### 全局作用域与软删除

对默认过滤使用全局作用域，对可恢复的记录使用 `SoftDeletes`。
对于同一个过滤条件，使用全局作用域或命名作用域其中之一，不要两者并用，除非你有意实现分层行为。

```php
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

final class Project extends Model
{
    use SoftDeletes;

    protected static function booted(): void
    {
        static::addGlobalScope('active', function (Builder $builder): void {
            $builder->whereNull('archived_at');
        });
    }
}
```

### 用于可复用过滤的查询作用域

```php
use Illuminate\Database\Eloquent\Builder;

final class Project extends Model
{
    public function scopeOwnedBy(Builder $query, int $userId): Builder
    {
        return $query->where('owner_id', $userId);
    }
}

// 在服务、仓储等中使用。
$projects = Project::ownedBy($user->id)->get();
```

### 用于多步骤更新的事务

```php
use Illuminate\Support\Facades\DB;

DB::transaction(function (): void {
    $order->update(['status' => 'paid']);
    $order->items()->update(['paid_at' => now()]);
});
```

### 迁移

### 命名约定

- 文件名使用时间戳：`YYYY_MM_DD_HHMMSS_create_users_table.php`
- 迁移使用匿名类（无具名类）；文件名即表达其意图
- 表名默认使用 `snake_case` 并采用复数形式

### 迁移示例

```php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->string('status', 32)->index();
            $table->unsignedInteger('total_cents');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
```

### 表单请求与验证

将验证保留在表单请求中，并将输入转换为 DTO。

```php
use App\Models\Order;

final class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Order::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.sku' => ['required', 'string'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ];
    }

    public function toDto(): CreateOrderData
    {
        return new CreateOrderData(
            customerId: (int) $this->validated('customer_id'),
            items: $this->validated('items'),
        );
    }
}
```

### API Resources

使用 resources 和分页保持 API 响应的一致性。

```php
$projects = Project::query()->active()->paginate(25);

return response()->json([
    'success' => true,
    'data' => ProjectResource::collection($projects->items()),
    'error' => null,
    'meta' => [
        'page' => $projects->currentPage(),
        'per_page' => $projects->perPage(),
        'total' => $projects->total(),
    ],
]);
```

### 事件、作业与队列

- 针对副作用（邮件、数据分析）触发领域事件
- 对耗时工作（报表、导出、webhook）使用队列作业
- 优先使用带重试和退避的幂等处理器

### 缓存

- 缓存读密集的端点和开销较大的查询
- 在模型事件（created/updated/deleted）时使缓存失效
- 缓存相关数据时使用标签，以便于失效

### 配置与环境

- 将密钥保存在 `.env` 中，配置保存在 `config/*.php` 中
- 使用按环境的配置覆盖，并在生产环境中使用 `config:cache`
