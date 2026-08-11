# Hooks 系统

## Hook 类型

- **PreToolUse**：tool 执行前（验证、参数修改）
- **PostToolUse**：tool 执行后（自动格式化、检查）
- **Stop**：session 结束时（最终验证）

## Auto-Accept Permissions

谨慎使用：
- 对可信、定义明确的计划启用
- 对探索性工作禁用
- 切勿使用 dangerously-skip-permissions flag
- 应改为在 `~/.claude/settings.json` 中配置 `permissions.allow`

## TodoWrite Best Practices 

Use TodoWrite tool to:
- 跟踪多步任务的进度
- 验证对 instructions 的理解
- Enable real-time steering
- 展示详细的实施步骤

Todo list reveals: 
- Out of order steps
- Missing items
- Extra unnecessary items
- Wrong granularity
- Misinterpreted requirements
