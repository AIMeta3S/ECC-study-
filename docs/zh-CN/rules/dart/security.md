---
paths:
  - "**/*.dart"
  - "**/pubspec.yaml"
  - "**/AndroidManifest.xml"
  - "**/Info.plist"
---
# Dart/Flutter Security

> 本文件在 [common/security.md](../common/security.md) 基础上扩展了 Dart、Flutter 及移动端相关内容。

## Secrets Management

- 切勿在 Dart 源码中硬编码 API key、token 或 credentials
- 使用 `--dart-define` 或 `--dart-define-from-file` 进行编译期配置（这些值并非真正保密——服务端密钥应通过后端代理使用）
- 使用 `flutter_dotenv` 或同等方案，并将 `.env` 文件加入 `.gitignore`
- 运行期密钥存储在平台安全存储中：`flutter_secure_storage`（iOS 上为 Keychain，Android 上为 EncryptedSharedPreferences）

```dart
// BAD
const apiKey = 'sk-abc123...';

// GOOD —— 编译期配置（不保密，仅作可配置化）
const apiKey = String.fromEnvironment('API_KEY');

// GOOD —— 从安全存储读取的运行期密钥
final token = await secureStorage.read(key: 'auth_token');
```

## Network Security

- 强制使用 HTTPS——生产环境不得出现 `http://` 调用
- 配置 Android `network_security_config.xml` 以阻止明文流量
- 在 `Info.plist` 中设置 `NSAppTransportSecurity` 以禁止任意加载
- 为所有 HTTP client 设置请求超时——切勿沿用默认值
- 对高安全级别的 endpoint 考虑启用 certificate pinning

```dart
// 带超时和 HTTPS 强制的 Dio
final dio = Dio(BaseOptions(
  baseUrl: 'https://api.example.com',
  connectTimeout: const Duration(seconds: 10),
  receiveTimeout: const Duration(seconds: 30),
));
```

## Input Validation

- 所有用户输入在发送至 API 或写入存储前必须经过校验和净化
- 切勿将未净化的输入传给 SQL 查询——使用参数化查询（sqflite、drift）
- 导航前净化 deep link URL——校验 scheme、host 和 path 参数
- 使用 `Uri.tryParse` 并在导航前进行校验

```dart
// BAD —— SQL injection
await db.rawQuery("SELECT * FROM users WHERE email = '$userInput'");

// GOOD —— 参数化查询
await db.query('users', where: 'email = ?', whereArgs: [userInput]);

// BAD —— 未校验的 deep link
final uri = Uri.parse(incomingLink);
context.go(uri.path); // 可能导航到任意路由

// GOOD —— 已校验的 deep link
final uri = Uri.tryParse(incomingLink);
if (uri != null && uri.host == 'myapp.com' && _allowedPaths.contains(uri.path)) {
  context.go(uri.path);
}
```

## Data Protection

- token、PII 和 credentials 仅存储在 `flutter_secure_storage` 中
- 切勿以明文形式将敏感数据写入 `SharedPreferences` 或本地文件
- 登出时清除认证状态：token、缓存的用户数据、cookie
- 对敏感操作使用生物识别认证（`local_auth`）
- 避免记录敏感数据——禁止 `print(token)` 或 `debugPrint(password)`

## Android-Specific

- 在 `AndroidManifest.xml` 中仅声明所需权限
- 仅在必要时导出 Android 组件（`Activity`、`Service`、`BroadcastReceiver`）；不需要导出的应添加 `android:exported="false"`
- 审查 intent filter——带有隐式 intent filter 的导出组件可被任意 app 访问
- 显示敏感数据的界面使用 `FLAG_SECURE`（防止截屏）

```xml
<!-- AndroidManifest.xml —— 限制导出组件 -->
<activity android:name=".MainActivity" android:exported="true">
    <!-- 仅 launcher activity 需要 exported=true -->
</activity>
<activity android:name=".SensitiveActivity" android:exported="false" />
```

## iOS-Specific

- 在 `Info.plist` 中仅声明所需的使用说明（`NSCameraUsageDescription` 等）
- 密钥存储在 Keychain 中——`flutter_secure_storage` 在 iOS 上使用 Keychain
- 启用 App Transport Security (ATS)——禁止任意加载
- 为敏感文件启用 data protection entitlement

## WebView Security

- 使用 `webview_flutter` v4+（`WebViewController` / `WebViewWidget`)——旧版 `WebView` widget 已被移除
- 除非明确需要，否则禁用 JavaScript（`JavaScriptMode.disabled`）
- 加载前校验 URL——切勿从 deep link 加载任意 URL
- 除非绝对必要且经过仔细沙箱化，否则不要将 Dart 回调暴露给 JavaScript
- 使用 `NavigationDelegate.onNavigationRequest` 拦截并校验导航请求

```dart
// webview_flutter v4+ API（WebViewController + WebViewWidget）
final controller = WebViewController()
  ..setJavaScriptMode(JavaScriptMode.disabled) // 默认禁用，除非确有需要
  ..setNavigationDelegate(
    NavigationDelegate(
      onNavigationRequest: (request) {
        final uri = Uri.tryParse(request.url);
        if (uri == null || uri.host != 'trusted.example.com') {
          return NavigationDecision.prevent;
        }
        return NavigationDecision.navigate;
      },
    ),
  );

// 在你的 widget tree 中：
WebViewWidget(controller: controller)
```

## Obfuscation and Build Security

- 在 release build 中启用混淆：`flutter build apk --obfuscate --split-debug-info=./debug-info/`
- `--split-debug-info` 的输出不要纳入版本控制（仅用于崩溃符号化）
- 确保 ProGuard/R8 规则不会无意间暴露序列化类
- 发布前运行 `flutter analyze` 并处理所有 warning
