---
name: terminal-ops
description: ECC 的证据优先仓库执行工作流。当用户希望运行某条命令、检查某个仓库、调试某个 CI 失败，或推送一个最小范围的修复，并要求提供关于已执行与已验证内容的确切证据时使用。
metadata:
  origin: ECC
---

# Terminal Ops

当用户希望进行真实的仓库执行时使用本 skill：运行命令、检查 git 状态、调试 CI 或 build、做出最小范围的修复，并准确报告变更内容与已验证结果。

本 skill 有意比通用编码指导更窄。它是一种面向证据优先终端执行的操作员工作流。

## Skill 栈

在相关时，将下列 ECC 原生 skill 拉入工作流：

- `verification-loop`：用于变更后的精确验证步骤
- `tdd-workflow`：当正确的修复需要回归覆盖时
- `security-review`：当涉及 secrets、auth 或外部输入时
- `github-ops`：当任务依赖 CI 运行、PR 状态或 release 状态时
- `knowledge-ops`：当已验证的结果需要沉淀为持久的项目上下文时

## 何时使用

- 用户说 "fix"、"debug"、"run this"、"check the repo" 或 "push it"
- 任务依赖命令输出、git 状态、测试结果或已验证的本地修复
- 回答必须区分 changed locally、verified locally、committed 与 pushed

## 操作约束

- 编辑前先检查
- 如果用户只要求 audit/review，则保持只读
- 优先使用仓库本地的脚本和 helper，而非即兴拼凑的临时 wrapper
- 在验证命令重新运行之前，不得声称已修复
- 除非 branch 确实已推送到 upstream，否则不得声称已 pushed

## 工作流

### 1. 明确工作面

确定：

- 确切的仓库路径
- branch
- 本地 diff 状态
- 请求的模式：
  - inspect
  - fix
  - verify
  - push

### 2. 先读取失败面

在修改任何内容之前：

- 检查错误
- 检查文件或测试
- 检查 git 状态
- 在盲目重新读取之前，先使用任何已提供的 log 或上下文

### 3. 保持修复范围最小

一次解决一个主要失败：

- 先使用最小可用的验证命令
- 仅在本地失败解决后，才升级到更大范围的 build/test 通过
- 如果某个命令反复以相同特征失败，停止宽泛的重试并收窄范围

### 4. 报告确切的执行状态

使用确切的状态词：

- inspected
- changed locally
- verified locally
- committed
- pushed
- blocked

## 输出格式

```text
SURFACE
- repo
- branch
- requested mode

EVIDENCE
- failing command / diff / test

ACTION
- what changed

STATUS
- inspected / changed locally / verified locally / committed / pushed / blocked
```

## 陷阱

- 当可以读取实时仓库状态时，不要基于陈旧记忆工作
- 不要将最小范围的修复扩大成全仓库范围的改动
- 不要使用破坏性的 git 命令
- 不要忽略无关的本地工作

## 验证

- 回复要指明验证命令或测试
- git 相关工作要指明仓库路径和 branch
- 任何 push 声称都要包含目标 branch 和确切结果
