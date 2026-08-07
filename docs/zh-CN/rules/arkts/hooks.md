---
paths:
  - "**/*.ets"
  - "**/*.ts"
  - "**/module.json5"
  - "**/oh-package.json5"
---
# HarmonyOS / ArkTS Hooks

> 本文件在 [common/hooks.md](../common/hooks.md) 基础上扩展了 HarmonyOS 专属的构建与校验 hook。

## 构建命令

### HAP 包构建

```bash
# 构建 HAP 包（全局 hvigor 环境）
hvigorw assembleHap -p product=default

# 使用指定模块构建
hvigorw assembleHap -p module=entry -p product=default

# 清理构建产物
hvigorw clean
```

### DevEco Studio CLI

```bash
# 检查项目结构
hvigorw --version

# 安装依赖
ohpm install

# 更新依赖
ohpm update
```

## 推荐的 PostToolUse Hooks

### 编辑 .ets/.ts 文件后

运行 hvigor 构建以检查 ArkTS 编译错误：

```json
{
  "type": "PostToolUse",
  "matcher": {
    "tool": ["Edit", "Write"],
    "filePath": ["**/*.ets", "**/*.ts"]
  },
  "hooks": [
    {
      "command": "hvigorw assembleHap -p product=default 2>&1 | tail -20",
      "async": true,
      "timeout": 60000
    }
  ]
}
```

### 编辑 module.json5 后

校验权限与 ability 声明：

```json
{
  "type": "PostToolUse",
  "matcher": {
    "tool": "Edit",
    "filePath": "**/module.json5"
  },
  "hooks": [
    {
      "command": "echo '[HarmonyOS] module.json5 modified - verify permissions and abilities'",
      "async": false
    }
  ]
}
```

### 编辑 oh-package.json5 后

重新安装依赖：

```json
{
  "type": "PostToolUse",
  "matcher": {
    "tool": "Edit",
    "filePath": "**/oh-package.json5"
  },
  "hooks": [
    {
      "command": "ohpm install 2>&1 | tail -10",
      "async": true,
      "timeout": 30000
    }
  ]
}
```

## PreToolUse Hooks

### V1 装饰器守卫

当代码包含 V1 状态管理装饰器时给出告警：

```json
{
  "type": "PreToolUse",
  "matcher": {
    "tool": ["Write", "Edit"],
    "filePath": "**/*.ets"
  },
  "hooks": [
    {
      "command": "echo '[HarmonyOS] Reminder: Use @ComponentV2 / @Local / @Param - V1 decorators (@State, @Prop, @Link) are prohibited'"
    }
  ]
}
```

## 校验清单

每个实现循环结束后，核对以下事项：

- [ ] `hvigorw assembleHap` 无错误完成
- [ ] 新增或修改的 `.ets` 文件中不包含 V1 装饰器
- [ ] 新增或修改的文件中不包含 `@ohos.router` 导入
- [ ] 所有 API 权限已在 `module.json5` 中声明
- [ ] 所有依赖已列入 `oh-package.json5`
- [ ] 资源字符串已添加到所有 i18n 目录
- [ ] 新增颜色资源已提供深色主题配色
