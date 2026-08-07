---
name: nestjs-patterns
description: NestJS 架构模式，涵盖 modules、controllers、providers、DTO 校验、guards、interceptors、config 以及生产级 TypeScript 后端。
metadata:
  origin: ECC
---

# NestJS 开发模式

面向模块化 TypeScript 后端的生产级 NestJS 模式。

## 何时激活

- 构建 NestJS API 或服务时
- 组织 modules、controllers 和 providers 结构时
- 添加 DTO 校验、guards、interceptors 或 exception filters 时
- 配置环境感知的设置与数据库集成时
- 对 NestJS 单元或 HTTP endpoint 进行测试时

## 项目结构

```text
src/
├── app.module.ts
├── main.ts
├── common/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
├── config/
│   ├── configuration.ts
│   └── validation.ts
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   ├── guards/
│   │   └── strategies/
│   └── users/
│       ├── dto/
│       ├── entities/
│       ├── users.controller.ts
│       ├── users.module.ts
│       └── users.service.ts
└── prisma/ or database/
```

- 将领域代码放在 feature modules 内部。
- 将跨模块的 filters、decorators、guards 和 interceptors 放在 `common/` 中。
- 将 DTO 放在拥有它们的 module 附近。

## 启动与全局校验

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

- 在 public API 上始终启用 `whitelist` 和 `forbidNonWhitelisted`。
- 优先使用一个全局 validation pipe，而不是在每个 route 上重复校验配置。

## Modules、Controllers 和 Providers

```ts
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getById(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  async create(dto: CreateUserDto) {
    return this.usersRepo.create(dto);
  }
}
```

- Controllers 应保持精简：解析 HTTP 输入、调用 provider、返回响应 DTO。
- 将业务逻辑放在 injectable 的 services 中，而不是 controllers 中。
- 只导出其他 modules 真正需要的 providers。

## DTO 与校验

```ts
export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(2, 80)
  name!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
```

- 使用 `class-validator` 校验每个 request DTO。
- 使用专门的响应 DTO 或 serializer，而不是直接返回 ORM entity。
- 避免泄露内部字段，例如 password hash、token 或审计列。

## 认证、Guards 与请求上下文

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Get('admin/report')
getAdminReport(@Req() req: AuthenticatedRequest) {
  return this.reportService.getForUser(req.user.id);
}
```

- 除非真正共享，否则将 auth strategy 和 guard 保持在 module 本地。
- 在 guard 中编码粗粒度的访问规则，然后在 service 中执行资源特定的 authorization。
- 为已认证的 request 对象优先使用显式的请求类型。

## Exception Filters 与错误结构

```ts
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();

    if (exception instanceof HttpException) {
      return response.status(exception.getStatus()).json({
        path: request.url,
        error: exception.getResponse(),
      });
    }

    return response.status(500).json({
      path: request.url,
      error: 'Internal server error',
    });
  }
}
```

- 在整个 API 中保持一致的 error envelope。
- 对预期的 client error 抛出 framework exception；对未预期的失败进行集中日志记录与包装。

## Config 与环境变量校验

```ts
ConfigModule.forRoot({
  isGlobal: true,
  load: [configuration],
  validate: validateEnv,
});
```

- 在启动时校验 env，而不是在首次请求时懒加载校验。
- 通过带类型的 helper 或 config service 来访问 config。
- 在 config factory 中拆分 dev/staging/prod 关注点，而不是在 feature code 中到处分支。

## 持久化与事务

- 将 repository / ORM 代码放在使用领域语言的 provider 之后。
- 对于 Prisma 或 TypeORM，将事务型工作流隔离在拥有 unit of work 的 service 中。
- 不要让 controller 直接协调多步写入。

## 测试

```ts
describe('UsersController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });
});
```

- 以隔离方式对 provider 进行单元测试，并 mock 其依赖。
- 为 guard、validation pipe 和 exception filter 添加请求级别的测试。
- 在测试中复用与生产环境相同的全局 pipe/filter。

## 生产环境默认项

- 启用结构化日志与 request correlation id。
- 遇到无效的 env/config 时终止进程，而不是部分启动。
- 对 DB/cache client 优先使用异步 provider 初始化，并显式进行健康检查。
- 将后台 job 和 event consumer 保留在其各自的 module 中，而不是放在 HTTP controller 内。
- 对 public endpoint 显式地实现 rate limiting、auth 和 audit logging。
