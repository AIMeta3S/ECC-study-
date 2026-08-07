---
paths:
  - "**/*.ets"
  - "**/*.ts"
  - "**/module.json5"
---
# HarmonyOS / ArkTS 安全

> 本文件扩展了 [common/security.md](../common/security.md)，增加了 HarmonyOS 特有的安全实践。

## 权限管理

### 在 module.json5 中声明权限

所有需要权限的系统 API 调用都必须进行声明：

```json5
{
  "module": {
    "requestPermissions": [
      {
        "name": "ohos.permission.INTERNET",
        "reason": "$string:internet_permission_reason",
        "usedScene": {
          "abilities": ["EntryAbility"],
          "when": "always"
        }
      }
    ]
  }
}
```

### 权限检查清单

在调用系统 API 之前，确认：

- [ ] 权限已在 `module.json5` 中声明
- [ ] 权限说明字符串已在 resources 中定义（面向用户的权限）
- [ ] 对敏感权限（相机、位置等）已实现运行时权限申请
- [ ] API 调用前进行权限检查，并在被拒绝时优雅降级

### 运行时权限申请

```typescript
import { abilityAccessCtrl, bundleManager, Permissions } from '@kit.AbilityKit';

async function checkAndRequestPermission(permission: Permissions): Promise<boolean> {
  const atManager = abilityAccessCtrl.createAtManager();
  const bundleInfo = await bundleManager.getBundleInfoForSelf(
    bundleManager.BundleFlag.GET_BUNDLE_INFO_WITH_APPLICATION
  );
  const tokenId = bundleInfo.appInfo.accessTokenId;
  const grantStatus = await atManager.checkAccessToken(tokenId, permission);

  if (grantStatus === abilityAccessCtrl.GrantStatus.PERMISSION_GRANTED) {
    return true;
  }

  const result = await atManager.requestPermissionsFromUser(getContext(), [permission]);
  return result.authResults[0] === abilityAccessCtrl.GrantStatus.PERMISSION_GRANTED;
}
```

## 机密管理

- **绝不**在 `.ets`/`.ts` 源文件中硬编码 API key、token 或密码
- 使用 HarmonyOS Preferences API 存储非敏感配置
- 使用 HarmonyOS Keystore 存储敏感凭据
- 环境相关的配置应通过 build profile 管理

```typescript
// 反例：硬编码的 secret
const API_KEY: string = 'sk-xxxxxxxxxxxx';

// 正例：来自 build profile 配置（非敏感）
import { BuildProfile } from 'BuildProfile';
const endpoint = BuildProfile.API_ENDPOINT;

// 正例：使用 HUKS 加解密数据，不暴露密钥材料
import { huks } from '@kit.UniversalKeystoreKit';
async function decryptWithKeystore(alias: string, nonce: Uint8Array, aad: Uint8Array, cipherData: Uint8Array): Promise<Uint8Array> {
  const options: huks.HuksOptions = {
    properties: [
      { tag: huks.HuksTag.HUKS_TAG_ALGORITHM, value: huks.HuksKeyAlg.HUKS_ALG_AES },
      { tag: huks.HuksTag.HUKS_TAG_PURPOSE, value: huks.HuksKeyPurpose.HUKS_KEY_PURPOSE_DECRYPT },
      { tag: huks.HuksTag.HUKS_TAG_BLOCK_MODE, value: huks.HuksCipherMode.HUKS_MODE_GCM },
      { tag: huks.HuksTag.HUKS_TAG_PADDING, value: huks.HuksKeyPadding.HUKS_PADDING_NONE },
      { tag: huks.HuksTag.HUKS_TAG_NONCE, value: nonce },
      { tag: huks.HuksTag.HUKS_TAG_ASSOCIATED_DATA, value: aad }
    ],
    inData: cipherData
  };
  const handle = await huks.initSession(alias, options);
  const result = await huks.finishSession(handle.handle, options);
  return result.outData;
}
```

## 输入校验

- 在处理前校验所有用户输入
- 在 UI 中展示前对数据进行净化，防止注入
- 在导航前校验 deep link 参数

```typescript
// 导航前校验
function handleDeepLink(uri: string): void {
  const allowedPaths: string[] = ['detail', 'settings', 'profile'];
  const parsed = new URL(uri);
  const path = parsed.pathname.replace('/', '');

  if (!allowedPaths.includes(path)) {
    hilog.warn(0x0000, 'DeepLink', 'Invalid deep link path: %{public}s', path);
    return;
  }

  navPathStack.pushPath({ name: path });
}
```

## 网络安全

- 网络请求一律使用 HTTPS
- 校验服务器证书
- 实现请求超时与重试策略
- 绝不在网络请求/响应日志中记录敏感数据（token、用户凭据）

## 数据存储安全

- 对敏感的本地数据使用加密 preferences
- 不再需要时从内存中清除敏感数据
- 实现适当的数据生命周期管理
- 在选择存储机制时考虑数据分级（公开、内部、机密）

## 依赖安全

- 只使用来自可信源（官方 ohpm registry）的依赖
- 在 `oh-package.json5` 中校验依赖版本
- 定期检查第三方库的已知漏洞
- 锁定依赖版本以避免意外的更新
