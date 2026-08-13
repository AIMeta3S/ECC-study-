---
name: instinct-status
description: 显示学习到的 instincts（project + global）及其 confidence
command: true
---

# Instinct Status 命令

显示当前项目已学到的 instinct 以及全局 instinct，按 domain 分组。

## Implementation

```bash
ECC_ROOT="${CLAUDE_PLUGIN_ROOT:-$(node -e "var r=(()=>{var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var p=require('path'),f=require('fs'),h=require('os').homedir(),d=p.join(h,'.claude'),q=p.join('scripts','lib','utils.js');if(f.existsSync(p.join(d,q)))return d;for(var s of [['ecc'],['ecc@ecc'],['marketplaces','ecc'],['everything-claude-code'],['everything-claude-code@everything-claude-code'],['marketplaces','everything-claude-code']]){var l=p.join(d,'plugins',...s);if(f.existsSync(p.join(l,q)))return l}try{for(var g of ['ecc','everything-claude-code']){var b=p.join(d,'plugins','cache',g);for(var o of f.readdirSync(b,{withFileTypes:true})){if(!o.isDirectory())continue;for(var v of f.readdirSync(p.join(b,o.name),{withFileTypes:true})){if(!v.isDirectory())continue;var c=p.join(b,o.name,v.name);if(f.existsSync(p.join(c,q)))return c}}}}catch(x){}return d})();console.log(r)")}"
python3 "$ECC_ROOT/skills/continuous-learning-v2/scripts/instinct-cli.py" status
```

## Usage

```
/instinct-status
```

## What to Do

1. 检测当前项目上下文（git remote/path hash）
2. 从 `${XDG_DATA_HOME:-~/.local/share}/ecc-homunculus/projects/<project-id>/instincts/` 读取项目 instinct
3. 从 `${XDG_DATA_HOME:-~/.local/share}/ecc-homunculus/instincts/` 读取全局 instinct
4. 按优先级规则合并（当 ID 冲突时，项目 覆盖 全局）
5. 按 domain 分组显示，包含 confidence bar 和 observation stats

## Output Format

```
============================================================
  INSTINCT 状态 - 总计 12
============================================================

  项目: my-app (a1b2c3d4e5f6)
  项目 instinct 数: 8
  全局 instinct 数:  4

## 项目作用域 (my-app)
  ### 工作流 (3)
    ███████░░░  70%  grep-before-edit [project]
              trigger: 当修改代码时触发

## 全局 (所有项目)
  ### 安全 (2)
    █████████░  85%  validate-user-input [global]
              trigger: 当处理用户输入时触发
```
