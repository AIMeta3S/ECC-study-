---
name: enterprise-agent-ops
description: 运维长期运行的 agent 工作负载，提供 observability、安全边界与生命周期管理。
metadata:
  origin: ECC
---

# Enterprise Agent Ops

当 agent 系统为云托管或持续运行，且需要超出单次 CLI session 的运维控制时，使用本 skill。

## 运维领域

1. runtime 生命周期（启动、暂停、停止、重启）
2. observability（logs、metrics、traces）
3. 安全控制（scopes、permissions、kill switches）
4. 变更管理（rollout、rollback、audit）

## 基线控制

- 不可变 deployment artifacts
- 最小权限 credentials
- 环境级 secret injection
- 硬性超时与 retry 预算
- 针对高风险操作的 audit log

## 需跟踪的 metrics

- 成功率
- 每个任务的平均 retries
- 恢复时间
- 每个成功任务的成本
- failure class 分布

## incident 模式

当失败激增时：
1. 冻结新 rollout
2. 采集代表性 traces
3. 隔离失败的 route
4. 以最小安全变更进行 patch
5. 运行回归测试 + 安全检查
6. 逐步恢复

## 部署集成

本 skill 与以下工具搭配使用：
- PM2 workflows
- systemd services
- container orchestrators
- CI/CD gates
