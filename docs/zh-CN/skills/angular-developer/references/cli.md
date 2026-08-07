# 面向 Agent 的 Angular CLI 指南

Angular CLI（`ng`）是管理 Angular workspace 的主要工具。在修改项目结构或添加 Angular 特定依赖时，始终优先使用 CLI 命令，而非手动创建文件或使用通用的 `npm` 命令。

## 1. 依赖管理

**为 Angular 库添加依赖时，始终使用 `ng add`**，而非 `npm install`。`ng add` 会安装包并运行初始化 schematics（例如，配置 `angular.json`、更新 root providers）。

```bash
ng add @angular/material
ng add tailwindcss
ng add @angular/fire
```

若要更新应用及其依赖（该操作会自动运行代码迁移）：

```bash
ng update @angular/core@<latest or specific version> @angular/cli<latest or specific version>
```

## 2. 生成代码（`ng generate` 或 `ng g`）

始终使用 CLI 生成代码，以确保其符合 Angular 标准并自动更新必要的配置文件。

| Target       | Command               | Notes                                                                                          |
| :----------- | :-------------------- | :--------------------------------------------------------------------------------------------- |
| Component    | `ng g c path/to/name` | 生成一个 component。如有需要，可使用 `--inline-style`（`-s`）或 `--inline-template`（`-t`）。 |
| Service      | `ng g s path/to/name` | 生成一个 `@Injectable({providedIn: 'root'})` service。                                      |
| Directive    | `ng g d path/to/name` | 生成一个 directive。                                                                         |
| Pipe         | `ng g p path/to/name` | 生成一个 pipe。                                                                              |
| Guard        | `ng g g path/to/name` | 生成一个 functional route guard。                                                            |
| Environments | `ng g environments`   | 搭建 `src/environments/` 目录，并通过文件替换更新 `angular.json`。               |

_注：没有用于生成单个 route 定义的命令。请先生成一个 component，然后手动将其添加到 `app.routes.ts` 中的 `Routes` 数组。_

## 3. 开发服务器与代理

启动本地开发服务器，启用 hot-module replacement（HMR）：

```bash
ng serve
```

### 后端 API 代理

若要在开发期间代理 API 请求（例如，将 `/api` 重定向到本地 Node 服务器）：

1. 创建 `src/proxy.conf.json`：
   ```json
   {
     "/api/**": {"target": "http://localhost:3000", "secure": false}
   }
   ```
2. 在 `angular.json` 的 `serve` target 下更新：
   ```json
   "serve": {
     "builder": "@angular/build:dev-server",
     "options": { "proxyConfig": "src/proxy.conf.json" }
   }
   ```

## 4. 构建应用

将应用编译到输出目录（默认为 `dist/<project-name>/browser`）。现代 Angular 使用 `@angular/build:application` builder（基于 esbuild）。

```bash
ng build
```

- `ng build` 默认使用 production configuration，该配置会启用 Ahead-of-Time（AOT）编译、minification 和 tree-shaking。
- 使用 `--configuration` 指定 `angular.json` 中定义的特定 configuration：`ng build --configuration=staging`。

## 5. 测试

- **单元测试**：运行 `ng test`，通过已配置的 test runner（例如 Karma 或 Vitest）执行单元测试。
- **端到端（E2E）**：运行 `ng e2e`。如果未配置 E2E 框架，CLI 会提示安装一个（Cypress、Playwright、Puppeteer 等）。

## 6. 部署

要部署应用，必须先添加一个 deployment builder，然后运行 deploy 命令：

```bash
# Firebase 示例
ng add @angular/fire
ng deploy
```
