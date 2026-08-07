---
name: instinct-status
description: 显示已学到的 instinct（项目 + 全局）及其 confidence
command: true
---

# Instinct Status 命令

显示当前项目已学到的 instinct 以及全局 instinct，按 domain 分组。

## 实现

运行 instinct CLI，采用与 `hooks/hooks.json` 和其他 slash command（`/sessions`、`/skill-health`）相同的方式解析当前生效的 ECC plugin root —— env var → standard install → known plugin roots → plugin cache → fallback。这样可以避免当 `CLAUDE_PLUGIN_ROOT` 未设置、但旧版 `~/.claude/skills/continuous-learning-v2/` 目录仍然存在时出现的不一致（#2037）。

```bash
ECC_ROOT="${CLAUDE_PLUGIN_ROOT:-$(node -e "var r=(function(){var p=require('path'),f=require('fs'),o=require('os');var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var d=p.join(o.homedir(),'.claude');function L(x){try{return require(p.join(x,'scripts','lib','resolve-ecc-root')).resolveEccRoot()}catch(_){return null}}var r=L(d);if(r)return r;var s=['ecc','ecc@ecc','marketplaces/ecc','everything-claude-code','everything-claude-code@everything-claude-code','marketplaces/everything-claude-code'];for(var i=0;i<s.length;i++){r=L(p.join(d,'plugins',s[i]));if(r)return r}try{var g=['ecc','everything-claude-code'];for(var j=0;j<g.length;j++){var c=p.join(d,'plugins','cache',g[j]);var O=f.readdirSync(c);for(var k=0;k<O.length;k++){var q=p.join(c,O[k]);var V=f.readdirSync(q);for(var m=0;m<V.length;m++){r=L(p.join(q,V[m]));if(r)return r}}}}catch(_){}return d})();console.log(r)")}"
python3 "$ECC_ROOT/skills/continuous-learning-v2/scripts/instinct-cli.py" status
```

## 用法

```
/instinct-status
```

## 操作步骤

1. 检测当前项目上下文（git remote/path hash）
2. 从 `~/.claude/homunculus/projects/<project-id>/instincts/` 读取项目 instinct
3. 从 `~/.claude/homunculus/instincts/` 读取全局 instinct
4. 按优先级规则合并（当 ID 冲突时项目覆盖全局）
5. 按 domain 分组显示，包含 confidence bar 和 observation 统计

## 输出格式

```
============================================================
  INSTINCT STATUS - 12 total
============================================================

  Project: my-app (a1b2c3d4e5f6)
  Project instincts: 8
  Global instincts:  4

## PROJECT-SCOPED (my-app)
  ### WORKFLOW (3)
    ███████░░░  70%  grep-before-edit [project]
              trigger: when modifying code

## GLOBAL (apply to all projects)
  ### SECURITY (2)
    █████████░  85%  validate-user-input [global]
              trigger: when handling user input
```
