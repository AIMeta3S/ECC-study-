---
name: ui-to-vue
description: 当用户拥有 UI 截图或设计导出文件，需要批量转换为 Vue 3 组件（尤其是使用 Vant、Element Plus 或 Ant Design Vue）时使用。
metadata:
  origin: community
---

# UI To Vue

将 UI 设计截图批量转换为 Vue 3 Composition API 组件代码。

## When to Use

- 用户提供了一个包含设计截图或设计导出图片的目录。
- 目标应用是 Vue 3。
- 用户希望初步生成页面组件、共享组件以及 router 连接。
- 用户指定 Vant、Element Plus 或 Ant Design Vue 作为组件库。

## When Not to Use

- 用户只有一张截图，且希望得到定制组件。
- 目标项目不是 Vue。
- 设计需要详细的交互逻辑、数据流或可访问性审查。
- 截图包含无法发送到外部 model API 的私密客户数据。

## Inputs

使用按模块和页面状态对截图进行分组的输入目录：

```text
screenshots/
|-- HomePage/
|   |-- List/
|   |   |-- HomePage-List-Default@3x.png
|   |   `-- cut-images/
|   |-- cut-images/
|   `-- HomePage-Default@3x.png
`-- cut-images/
```

支持的切图目录名包括 `assets`、`icons`、`sprites`、`cut`、`images` 和 `cut-images`。

## Conversion Model

- 页面分组：当相关截图表示列表、详情、表单、加载或空状态时，将其合并为一个页面组件。
- UI 库映射：在可行的情况下，将原生视觉元素映射到 Vant、Element Plus 或 Ant Design Vue 组件。
- 切图优先级：优先使用页面级资源，其次是模块级资源，最后是全局共享资源。
- 组件提取：当重复的 UI 区域出现超过一次时，将其提取为共享组件。

## CLI Usage

使用 `npx` 运行转换器，使文档中的命令无需依赖全局二进制文件即可运行：

```bash
export DASHSCOPE_API_KEY=your_key
npx ui-to-vue-converter@1.0.2 --input ./screenshots --ui vant --output ./src
```

对于桌面端 UI 库：

```bash
npx ui-to-vue-converter@1.0.2 --input ./designs --ui element-plus --output ./src
npx ui-to-vue-converter@1.0.2 --input ./designs --ui antd-vue --output ./src
```

如果包已全局安装，可以直接使用 `ui-to-vue` 二进制文件：

```bash
npm install -g ui-to-vue-converter@1.0.2
ui-to-vue --input ./screenshots --ui vant --output ./src
```

## Options

| 选项 | 说明 | 默认值 |
| --- | --- | --- |
| `--input` | 设计图片目录 | `./screenshots` |
| `--ui` | UI 库：`vant`、`element-plus` 或 `antd-vue` | `vant` |
| `--output` | 输出目录 | `./src` |
| `--config` | 配置文件路径 | `./.ui-to-vue.config.json` |

## API Key Handling

转换器可以从配置文件或环境中读取 DashScope 凭证。在代码仓库中优先使用环境变量：

```bash
export DASHSCOPE_API_KEY=your_key
```

如果需要本地配置文件，请将其排除在版本控制之外：

```json
{
  "apiKey": "your_dashscope_key",
  "input": "./designs",
  "ui": "vant",
  "output": "./src"
}
```

```gitignore
.ui-to-vue.config.json
```

## Security and Privacy

- 将设计截图视为可能发送到外部 model API 的原始素材。
- 未经许可，不要对私密客户设计运行此流程。
- 在可重复的工作流中固定转换器版本，而不是使用 `@latest`。
- 在提交前审查生成的 Vue 代码。
- 不要提交 `.ui-to-vue.config.json`、API key、生成的密钥或客户截图。

## Output Review Checklist

- [ ] 页面组件已生成在 `views/` 或所选输出目录下。
- [ ] 仅当复用关系明确时，才将重复的 UI 区域提取到 `components/` 中。
- [ ] router 输出与目标项目的 router 风格兼容。
- [ ] 生成的组件一致地使用了所请求的 UI 库。
- [ ] 生成的 CSS 单位与设计基准匹配。
- [ ] 代码通过了项目的 formatter、linter、type checker 和 build。
- [ ] 在提交前已审查占位文案、mock 数据和生成的资源。

## Troubleshooting

| 问题 | 检查项 |
| --- | --- |
| `401` 或认证错误 | 确认运行命令的 shell 中已设置 `DASHSCOPE_API_KEY`。 |
| `command not found: ui-to-vue` | 使用 `npx ui-to-vue-converter@1.0.2` 形式，或全局安装该包。 |
| 切图被忽略 | 确认资源目录名受支持，且嵌套在对应的页面或模块下。 |
| 组件忽略了所请求的 UI 库 | 使用显式的 `--ui` 值重新运行，并检查生成的 import 语句。 |
| 生成的布局尺寸看起来不对 | 确认截图导出宽度与目标库基准匹配。 |

## References

- npm 包：`ui-to-vue-converter`
