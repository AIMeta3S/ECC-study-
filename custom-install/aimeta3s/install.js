#!/usr/bin/env node
'use strict';

/**
 * AIMeta3S 版独立安装脚本
 *
 * 把本目录下 install-src/ 的内容按 ECC claude target 映射规则装到目标根
 * （默认 ~/.claude）。零第三方依赖（仅 fs/path/os/crypto）。
 *
 * 用法:
 *   node install.js                安装（直接覆盖同名文件）
 *   node install.js --dry-run      只打印安装计划，不写盘
 *   node install.js --uninstall    按状态文件卸载
 *   node install.js --help         显示帮助
 *
 * 环境变量:
 *   AI_META_3S_HOME                目标根（默认 ~/.claude）
 *
 * 映射规则（对应官方 scripts/lib/install-targets/claude-home.js）:
 *   rules/ → rules/ecc/   (加 ecc/ 命名空间，避免与用户自有 rules 冲突)
 *   docs/  → aimeta3s/docs (装到 aimeta3s/ 子树下，/aimeta3s-help 的资料与资源清单)
 *   skills/ → skills/     (扁平，每个 skill 直接子目录)
 *   agents/ commands/ hooks/ scripts/ → 同名平铺
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// --- 常量 ---

const SOURCE_ROOT = path.join(__dirname, 'install-src');
const TARGET_ROOT = process.env.AI_META_3S_HOME || path.join(os.homedir(), '.claude');
const STATE_DIR = path.join(TARGET_ROOT, 'aimeta3s');
const STATE_PATH = path.join(STATE_DIR, 'install-state.json');
const SCHEMA_VERSION = 'aimeta3s.install.v1';

// 源（install-src/）→ 目标（~/.claude/）映射
const MAPPINGS = [
  { src: 'agents',   dest: 'agents' },
  { src: 'commands', dest: 'commands' },
  { src: 'docs',     dest: 'aimeta3s/docs' },
  { src: 'hooks',    dest: 'hooks' },
  { src: 'rules',    dest: 'rules/ecc' },
  { src: 'scripts',  dest: 'scripts' },
  { src: 'skills',   dest: 'skills' },
];

// --- 安全闸门（参考官方 scripts/lib/install/apply.js:146-176）---

function assertSafeDest(destAbs, targetRoot) {
  const resolvedRoot = path.resolve(targetRoot);
  const resolvedDest = path.resolve(destAbs);
  const relative = path.relative(resolvedRoot, resolvedDest);
  if (relative === '' || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside trusted root: '${destAbs}'`);
  }
  // 逐级 lstatSync，拒绝穿越 symlink（防 symlink 劫持）
  const segments = relative.split(path.sep);
  for (let i = 0; i <= segments.length; i++) {
    const p = i === 0 ? resolvedRoot : path.join(resolvedRoot, ...segments.slice(0, i));
    let st;
    try {
      st = fs.lstatSync(p);
    } catch (e) {
      if (e.code === 'ENOENT') break;
      throw e;
    }
    if (st.isSymbolicLink()) {
      throw new Error(`Refusing to write through symlinked path: '${p}'`);
    }
  }
}

// --- markdown 链接重写（内联简化版，参考官方 scripts/lib/install/link-rewrite.js）---
// 两个变形目录：rules/ → rules/ecc/、docs/ → aimeta3s/docs/，故 destOf 硬编码这两条，无需官方通用 ancestor 映射。

function destOf(logicalPath) {
  if (logicalPath === 'rules') return 'rules/ecc';
  if (logicalPath.startsWith('rules/')) return 'rules/ecc/' + logicalPath.slice(6);
  if (logicalPath === 'docs') return 'aimeta3s/docs';
  if (logicalPath.startsWith('docs/')) return 'aimeta3s/docs/' + logicalPath.slice(5);
  return logicalPath;
}

function isExternalOrAnchor(target) {
  return (
    target === '' ||
    target.startsWith('#') ||
    target.startsWith('/') ||
    target.startsWith('mailto:') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target) // 含 URL scheme（http:、https:、file: …）
  );
}

const INLINE_LINK_PATTERN = /(!?\]\()([^()\s]+)(\s+"[^"]*")?(\))/g;

function rewriteMarkdownLinks(content, sourceRel) {
  const installedSource = destOf(sourceRel);
  const installedSourceDir = path.posix.dirname(installedSource);
  const sourceDir = path.posix.dirname(sourceRel);
  const lines = String(content).split('\n');
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    lines[i] = lines[i].replace(INLINE_LINK_PATTERN, (match, open, target, title, close) => {
      const hashIdx = target.indexOf('#');
      const pathPart = hashIdx === -1 ? target : target.slice(0, hashIdx);
      const fragment = hashIdx === -1 ? '' : target.slice(hashIdx);
      if (isExternalOrAnchor(pathPart)) return match;

      const resolved = path.posix.normalize(path.posix.join(sourceDir, pathPart));
      if (resolved === '' || resolved === '.' || resolved.startsWith('..')) {
        return match; // 跨出源根 → 原样保留（不误改指向未安装资源的链接）
      }
      const resolvedDest = destOf(resolved);
      let rewritten = path.posix.relative(installedSourceDir, resolvedDest);
      if (rewritten === '') rewritten = '.';
      if (path.posix.normalize(rewritten) === path.posix.normalize(pathPart)) {
        return match; // 重算结果与原链接一致 → no-op
      }
      return `${open}${rewritten}${fragment}${title || ''}${close}`;
    });
  }
  return lines.join('\n');
}

// --- 文件遍历与计划 ---

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function walkDir(dirAbs, baseRel, ops) {
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === '.DS_Store') continue;
    const rel = baseRel ? baseRel + '/' + e.name : e.name;
    const abs = path.join(dirAbs, e.name);
    if (e.isDirectory()) {
      walkDir(abs, rel, ops);
    } else if (e.isFile()) {
      ops.push({ rel, abs });
    }
  }
  return ops;
}

function planInstall() {
  const files = [];
  for (const m of MAPPINGS) {
    const srcAbs = path.join(SOURCE_ROOT, m.src);
    if (!fs.existsSync(srcAbs)) continue;
    const collected = walkDir(srcAbs, m.src, []);
    for (const f of collected) {
      // 仓库内 manifest.json / paths.json 只是开发参考（由安装器动态生成），安装时跳过源副本
      if (m.src === 'docs' && (f.rel === 'docs/aimeta3s/manifest.json' || f.rel === 'docs/aimeta3s/paths.json')) continue;
      const sub = f.rel.slice(m.src.length); // 形如 '/common/agents.md'
      const destRel = m.dest + sub;          // 形如 'rules/ecc/common/agents.md'
      files.push({
        sourceRel: f.rel,
        sourceAbs: f.abs,
        destRel,
        destAbs: path.join(TARGET_ROOT, destRel),
      });
    }
  }
  return files;
}

// --- /aimeta3s-help 资源清单（白名单 + 路径表 + 逐条索引）---
// 仅收录功能性资源（agent/command/skill/rule/script）；docs/config 为资料与配置不入列。
// skills 只收 SKILL.md 入口；每条同时给 installPath（安装后）与 sourcePath（仓库相对，开发环境）。

function buildManifest(files, homeLabel) {
  const SRC_CATEGORY = {
    agents: 'agent',
    commands: 'command',
    skills: 'skill',
    rules: 'rule',
    scripts: 'script',
  };
  const home = homeLabel || toPosix(TARGET_ROOT);
  const resources = [];
  for (const f of files) {
    const src = toPosix(f.sourceRel);
    const top = src.split('/')[0];
    const category = SRC_CATEGORY[top];
    if (!category) continue;            // docs/config/hooks 跳过
    if (top === 'skills' && src.split('/').pop() !== 'SKILL.md') continue; // 只收 skill 入口
    let name;
    if (top === 'skills') {
      name = src.split('/')[1];                                   // skills/<name>/SKILL.md → <name>
    } else if (top === 'rules') {
      name = src.slice('rules/'.length).replace(/\.md$/, '');     // rules/<group>/<topic>.md → <group>/<topic>
    } else if (top === 'scripts') {
      name = src.slice('scripts/'.length).replace(/\.(js|ts|mjs|cjs)$/, ''); // scripts/<rel> → <rel>
    } else {
      name = src.split('/').pop().replace(/\.md$/, '');           // agents/commands → 文件名
    }
    resources.push({
      category,
      name,
      installPath: home + '/' + toPosix(f.destRel),
      sourcePath: src,
    });
  }
  resources.sort((a, b) =>
    a.category !== b.category ? a.category.localeCompare(b.category) : a.name.localeCompare(b.name)
  );
  return {
    version: 1,
    generated: new Date().toISOString().slice(0, 10),
    aimeta3sHome: home,
    dirMappings: {
      agents: 'agents', commands: 'commands', skills: 'skills',
      rules: 'rules/ecc', scripts: 'scripts', docs: 'aimeta3s/docs',
    },
    hooksConfig: home + '/hooks/hooks.json',
    resources,
  };
}

// --- 运行时产物路径索引 paths.json（manifest.json 的姊妹篇）---
// manifest.json 管「装了什么」，paths.json 管「运行时往哪写」。只读索引，不移动任何数据。
// resolved 反映 ECC 运行时真实根（resolveAgentDataHome/os.tmpdir/homunculus），与安装位置 TARGET_ROOT 无关。

const PATH_ROOT_LABEL = {
  CLAUDE_DIR: '${CLAUDE_DIR}',
  HOMUNCULUS: '${HOMUNCULUS}',
  TMPDIR: '${TMPDIR}',
  GATEGUARD_STATE_DIR: '${GATEGUARD_STATE_DIR}',
  SKILL_DIR: '<skillDir>',
  CWD: '<cwd>',
  EXTERNAL: '<external>',
};

const PATH_ROOT_NOTE = {
  CLAUDE_DIR: 'ECC 工具链共享根；session-data/skills/learned 被跨会话协议与 Claude Code skill 发现机制消费，勿移动',
  HOMUNCULUS: 'XDG 用户数据；continuous-learning 持久记忆（projects/observer/observations/instincts/evolved）',
  TMPDIR: 'os.tmpdir()；瞬态跨进程 IPC，OS 重启自动清理',
  GATEGUARD_STATE_DIR: 'gateguard 事实强制状态',
  SKILL_DIR: 'skill 演进产物；curated(skills/) / learned(~/.claude/skills/learned) / imported(~/.claude/skills/imported) 各自子树',
  CWD: '当前项目工作区；产物落在项目内',
  EXTERNAL: '产物落在本机之外（远程仓库、用户指定输出路径）',
};

// 静态产物定义表。source 为 install-src 相对路径（可含多个来源）。description 描述生成时机与文件内容。
const PATHS_SPEC = [
  // ── ${CLAUDE_DIR} ──
  { root: 'CLAUDE_DIR', path: 'metrics/costs.jsonl', description: '会话产生费用时逐行追加 JSON（时间戳/模型/输入输出 token/估算成本）；按会话累积，供成本追踪与预算告警读取', category: 'hook', source: 'scripts/hooks/cost-tracker.js', write: 'append', lifecycle: 'persistent', trigger: 'Stop', cleanup: '无（累积，手动清空）' },
  { root: 'CLAUDE_DIR', path: 'metrics/tool-usage.jsonl', description: '每次工具调用追加一行 JSON（工具名/会话 id/时间）；用于 ECC2 指标同步与会话活动分析', category: 'hook', source: 'scripts/hooks/session-activity-tracker.js', write: 'append', lifecycle: 'persistent', trigger: 'PostToolUse', cleanup: '无（累积）' },
  { root: 'CLAUDE_DIR', path: 'session-data/<date>-<shortId>-session.tmp', description: '会话结束时写入的 Markdown 摘要（目标/决策/未完成项）；下次启动由 session-start 加载以续接上下文', category: 'hook', source: 'scripts/hooks/session-end.js (+ scripts/lib/session-manager.js)', write: 'write', lifecycle: 'persistent', trigger: 'Stop / PreCompact', cleanup: 'session-manager 轮转旧格式', note: 'pre-compact.js / session-start.js 读取；跨会话续接协议依赖此目录' },
  { root: 'CLAUDE_DIR', path: 'session-aliases.json', description: '用户定义的会话别名→会话 id 映射表，/sessions 据此按别名快速定位历史会话', category: 'command', source: 'commands/sessions (+ scripts/lib/session-aliases.js)', write: 'atomic', lifecycle: 'persistent', trigger: '/sessions', cleanup: '无' },
  { root: 'CLAUDE_DIR', path: 'mcp-health-cache.json', description: 'MCP server 连通性检查结果缓存（各 server 健康状态/延迟），避免每次 MCP 调用实时探测', category: 'hook', source: 'scripts/hooks/mcp-health-check.js', write: 'write', lifecycle: 'persistent', trigger: 'PreToolUse(MCP)', cleanup: '无', note: '硬拼 os.homedir()/.claude，不走 resolveAgentDataHome' },
  { root: 'CLAUDE_DIR', path: 'state/skill-runs.jsonl', description: '每次 skill 执行追加一行记录（skill 名/时间/结果），供 skill 演进健康度统计', category: 'lib', source: 'scripts/lib/skill-evolution/tracker.js', write: 'append', lifecycle: 'persistent', trigger: 'skill 执行', cleanup: '无' },
  { root: 'CLAUDE_DIR', path: 'skills/learned/<name>/*.md', description: '/learn 或 /skill-create 从会话经验提炼生成的 SKILL.md，作为可复用知识包注入后续会话', category: 'command', source: 'commands/learn (+ commands/skill-create)', write: 'write', lifecycle: 'persistent', trigger: '/learn · /skill-create', cleanup: '无' },
  { root: 'CLAUDE_DIR', path: 'plan-canvas/sessions.json', description: 'plan-canvas 浏览器评审工具的活跃会话注册表（会话 id/待评审计划/状态），Stop 时由 hook 追加 pending 项', category: 'hook', source: 'scripts/hooks/plan-canvas-pending.js (+ scripts/lib/plan-canvas/sessions.js)', write: 'atomic', lifecycle: 'persistent', trigger: 'Stop', cleanup: '无' },
  { root: 'CLAUDE_DIR', path: 'plan-canvas/server.json', description: 'plan-canvas 本地 HTTP server 的运行参数（端口/PID 等），供浏览器端连接定位', category: 'script', source: 'scripts/plan-canvas.js (+ scripts/lib/plan-canvas/server.js)', write: 'write', lifecycle: 'persistent', trigger: 'plan-canvas server', cleanup: '无' },
  { root: 'CLAUDE_DIR', path: 'plan-canvas/server.log', description: 'plan-canvas server 运行日志（请求/错误），追加写入供排查', category: 'script', source: 'scripts/plan-canvas.js', write: 'append', lifecycle: 'persistent', trigger: 'plan-canvas server', cleanup: '无' },
  { root: 'CLAUDE_DIR', path: 'observer-last-run.log', description: 'session-guardian 记录的 observer 上次启动时间戳，用于判断后台 observer 是否需要重启', category: 'skill-script', source: 'skills/continuous-learning-v2/agents/session-guardian.sh', write: 'atomic', lifecycle: 'persistent', trigger: 'SessionStart', cleanup: '无', note: '硬拼 $HOME/.claude，不走 resolveAgentDataHome' },
  { root: 'CLAUDE_DIR', path: 'bash-commands.log', description: '用户执行的每条 Bash 命令（PostToolUse 追加），供命令历史审计与复盘', category: 'hook', source: 'scripts/hooks/post-bash-command-log.js', write: 'append', lifecycle: 'persistent', trigger: 'PostToolUse(Bash)', cleanup: '无', note: '硬拼 os.homedir()/.claude，不走 resolveAgentDataHome' },
  { root: 'CLAUDE_DIR', path: 'cost-tracker.log', description: '成本追踪相关的诊断/事件日志（与 bash-commands.log 同源写入）', category: 'hook', source: 'scripts/hooks/post-bash-command-log.js', write: 'append', lifecycle: 'persistent', trigger: 'PostToolUse(Bash)', cleanup: '无', note: '与 bash-commands.log 同源' },

  // ── ${HOMUNCULUS} ──
  { root: 'HOMUNCULUS', path: 'projects.json', description: '所有已知项目的索引（projectId→路径/git remote），首次检测到项目时由 detect-project 建立', category: 'skill-script', source: 'skills/continuous-learning-v2/scripts/detect-project.sh (+ instinct-cli.py)', write: 'atomic', lifecycle: 'persistent', trigger: 'SessionStart', cleanup: '无' },
  { root: 'HOMUNCULUS', path: 'projects/<pid>/project.json', description: '单个项目元数据（路径/git 信息/首末会话时间），SessionStart 时由 detect-project 写入', category: 'skill-script', source: 'skills/continuous-learning-v2/scripts/detect-project.sh', write: 'atomic', lifecycle: 'persistent', trigger: 'SessionStart', cleanup: '无' },
  { root: 'HOMUNCULUS', path: 'projects/<pid>/.observer-sessions/<sid>.json', description: '当前 observer 会话状态（会话 id/累计信号数/最近活动），session-start 建立、session-end-marker 删除', category: 'hook', source: 'scripts/hooks/session-start.js (+ scripts/lib/observer-sessions.js)', write: 'write', lifecycle: 'session-temp', trigger: 'SessionStart', cleanup: 'session-end-marker 删' },
  { root: 'HOMUNCULUS', path: 'projects/<pid>/observations.jsonl', description: '开发行为观察流（PostToolUse 追加：工具/文件/摘要），作为 instinct 提炼的原料', category: 'skill-script', source: 'skills/continuous-learning-v2/hooks/observe.sh', write: 'append', lifecycle: 'persistent', trigger: 'PostToolUse', cleanup: 'observe.sh 归档/轮转' },
  { root: 'HOMUNCULUS', path: 'projects/<pid>/observations.archive/*.jsonl', description: 'observations.jsonl 滚动归档的旧批次（observer 循环 mv 而来），保留历史观察', category: 'skill-script', source: 'skills/continuous-learning-v2/agents/observer-loop.sh', write: 'mv', lifecycle: 'persistent', trigger: 'observer 循环', cleanup: 'observe.sh 每日清' },
  { root: 'HOMUNCULUS', path: 'projects/<pid>/.observer.pid', description: '后台 observer 进程的 PID 文件，用于存活检测与防重复启动', category: 'skill-script', source: 'skills/continuous-learning-v2/agents/start-observer.sh', write: 'write', lifecycle: 'session-temp', trigger: 'observer 启动', cleanup: 'observer 停止时删' },
  { root: 'HOMUNCULUS', path: 'projects/<pid>/observer.log', description: '后台 observer 进程运行日志（循环事件/提炼结果/错误），追加写入', category: 'skill-script', source: 'skills/continuous-learning-v2/agents/observer-loop.sh', write: 'append', lifecycle: 'session-temp', trigger: 'observer 循环', cleanup: 'observer 停止时保留' },
  { root: 'HOMUNCULUS', path: 'projects/<pid>/observer-start.log', description: 'observer 启动（bootstrap）阶段日志，记录启动是否成功及早期错误', category: 'skill-script', source: 'skills/continuous-learning-v2/hooks/observe.sh', write: 'write', lifecycle: 'session-temp', trigger: 'observer 启动', cleanup: '无' },
  { root: 'HOMUNCULUS', path: 'projects/<pid>/.observer.lock', description: 'observer 单例锁，确保同一项目同时只有一个 observer 进程运行', category: 'skill-script', source: 'skills/continuous-learning-v2/hooks/observe.sh', write: 'write', lifecycle: 'ephemeral', trigger: 'observer 启动', cleanup: 'observer 停止时删' },
  { root: 'HOMUNCULUS', path: 'projects/<pid>/.observer-start.lock', description: 'lazy observer 启动去重锁，防止并发触发多次启动', category: 'skill-script', source: 'skills/continuous-learning-v2/hooks/observe.sh', write: 'write', lifecycle: 'ephemeral', trigger: 'lazy observer 启动', cleanup: '启动后删' },
  { root: 'HOMUNCULUS', path: 'projects/<pid>/.observer-signal-counter', description: '累计收到的 observe 信号数（PostToolUse 计数），达阈值触发一次 instinct 提炼', category: 'skill-script', source: 'skills/continuous-learning-v2/hooks/observe.sh (+ scripts/lib/observer-sessions.js)', write: 'write', lifecycle: 'session-temp', trigger: 'observe 信号', cleanup: '无' },
  { root: 'HOMUNCULUS', path: 'projects/<pid>/.observer-last-activity', description: 'observer 最近一次活动时间戳，用于空闲检测与进程健康判断', category: 'skill-script', source: 'skills/continuous-learning-v2/hooks/observe.sh (+ agents/observer-loop.sh)', write: 'write', lifecycle: 'session-temp', trigger: 'observer 活动', cleanup: '无' },
  { root: 'HOMUNCULUS', path: 'projects/<pid>/.last-purge', description: '上次执行 observations 清理的时间戳，控制每日只清理一次的节奏', category: 'skill-script', source: 'skills/continuous-learning-v2/hooks/observe.sh', write: 'write', lifecycle: 'persistent', trigger: 'observe 清理', cleanup: '无（时间戳）' },
  { root: 'HOMUNCULUS', path: 'projects/<pid>/.observer-tmp/ecc-observer-analysis.*.jsonl', description: 'observer 单次分析循环的中间产物（mktemp 生成），分析完成后循环内删除', category: 'skill-script', source: 'skills/continuous-learning-v2/agents/observer-loop.sh', write: 'write', lifecycle: 'ephemeral', trigger: 'observer 分析', cleanup: '循环内删' },
  { root: 'HOMUNCULUS', path: 'projects/<pid>/instincts/{personal,inherited}/<id>.yaml', description: '从本项目观察提炼的 instinct（编码模式/偏好）：personal 为本项目专属，inherited 为继承自全局', category: 'skill-script', source: 'skills/continuous-learning-v2/scripts/instinct-cli.py', write: 'write', lifecycle: 'persistent', trigger: 'observer 提炼 / /learn', cleanup: '无' },
  { root: 'HOMUNCULUS', path: 'instincts/{personal,inherited,pending}/<id>.yaml', description: '全局 instinct（跨项目复用）：personal 自提炼、inherited 项目继承、pending 待 promote 审核', category: 'command', source: 'commands/promote · import (instinct-cli.py)', write: 'write', lifecycle: 'persistent', trigger: 'promote / import', cleanup: '无', note: '全局 instinct（跨项目），与 project 级并存' },
  { root: 'HOMUNCULUS', path: 'evolved/{skills,commands,agents}/*.md', description: '由 instinct 演进生成的新 skill/command/agent 资源（Markdown），可 promote 为正式资源', category: 'command', source: 'commands/evolve (instinct-cli.py)', write: 'write', lifecycle: 'persistent', trigger: '/evolve', cleanup: '无', note: '全局 evolved；project 级在 projects/<pid>/evolved/' },

  // ── ${TMPDIR} ──
  { root: 'TMPDIR', path: 'ecc-edited-<sid>.txt', description: '本会话被 Edit 修改过的文件路径累积清单（追加），stop-format-typecheck 读取后批量 format/typecheck 并删除', category: 'hook', source: 'scripts/hooks/post-edit-accumulator.js', write: 'append', lifecycle: 'session-temp', trigger: 'PostToolUse(Edit)', cleanup: 'stop-format-typecheck 删 / OS' },
  { root: 'TMPDIR', path: 'ecc-metrics-<sid>.json', description: '本会话运行中指标聚合（成本/token/工具计数），多进程（hook/background）借此共享会话级统计', category: 'hook', source: 'scripts/hooks/ecc-metrics-bridge.js (+ scripts/lib/session-bridge.js)', write: 'atomic', lifecycle: 'session-temp', trigger: 'PostToolUse', cleanup: 'OS' },
  { root: 'TMPDIR', path: 'ecc-metrics-cost-warnings-<sha>.json', description: '已发出成本告警的去重缓存（按告警内容 sha），避免同一告警反复向用户提示', category: 'hook', source: 'scripts/hooks/ecc-metrics-bridge.js', write: 'atomic', lifecycle: 'session-temp', trigger: 'PostToolUse', cleanup: 'OS' },
  { root: 'TMPDIR', path: 'ecc-ctx-warn-<sid>.json', description: '本会话上下文水位告警的桥接文件，ecc-context-monitor 读取后向 agent 注入上下文提醒', category: 'hook', source: 'scripts/hooks/ecc-context-monitor.js', write: 'write', lifecycle: 'session-temp', trigger: 'PostToolUse', cleanup: 'OS' },
  { root: 'TMPDIR', path: 'claude-tool-count-<sid>', description: '本会话累计工具调用次数（PreToolUse 递增），suggest-compact 据此判断是否建议压缩', category: 'hook', source: 'scripts/hooks/suggest-compact.js', write: 'write', lifecycle: 'session-temp', trigger: 'PreToolUse', cleanup: 'suggest-compact 清 >14天 / OS' },
  { root: 'TMPDIR', path: 'claude-context-bucket-<sid>', description: '本会话上下文使用量分桶标记，配合 tool-count 判断压缩时机', category: 'hook', source: 'scripts/hooks/suggest-compact.js', write: 'write', lifecycle: 'session-temp', trigger: 'PreToolUse', cleanup: 'OS' },

  // ── ${GATEGUARD_STATE_DIR} ──
  { root: 'GATEGUARD_STATE_DIR', path: 'state-<sessionKey>.json', description: 'gateguard 事实强制的本会话状态（已核验断言/追问次数/放行记录），原子写入，30 分钟过期', category: 'hook', source: 'scripts/hooks/gateguard-fact-force.js', write: 'atomic', lifecycle: 'session-temp', trigger: 'PreToolUse', cleanup: 'gateguard 清 >30min（启动自清）' },

  // ── ${SKILL_DIR} ──
  { root: 'SKILL_DIR', path: '.versions/v<N>.md', description: 'skill 的历史版本快照（演进时从当前版本备份而来），保留每次修改前的完整 SKILL.md', category: 'lib', source: 'scripts/lib/skill-evolution/versioning.js', write: 'write', lifecycle: 'persistent', trigger: 'skill 演进', cleanup: '无' },
  { root: 'SKILL_DIR', path: '.evolution/{observations,inspections,amendments}.jsonl', description: 'skill 演进审计流：observations（观察）/inspections（检查）/amendments（修改记录）', category: 'lib', source: 'scripts/lib/skill-evolution/versioning.js', write: 'append', lifecycle: 'persistent', trigger: 'skill 演进', cleanup: '无' },
  { root: 'SKILL_DIR', path: '.provenance.json', description: 'skill 来源与演进溯源元数据（创建来源/修改历史/依赖），用于可追溯性', category: 'lib', source: 'scripts/lib/skill-evolution/provenance.js', write: 'write', lifecycle: 'persistent', trigger: 'skill 演进', cleanup: '无' },

  // ── ${CWD} ──
  { root: 'CWD', path: 'docs/CODEMAPS/*.md', description: '项目代码结构地图（模块/依赖/入口），codemaps 扫描源码生成，供导航与上下文', category: 'script', source: 'scripts/codemaps/generate.ts (+ commands/update-codemaps)', write: 'write', lifecycle: 'persistent', trigger: '/update-codemaps', cleanup: '无（项目内）' },
  { root: 'CWD', path: '.claude/package-manager.json', description: '检测到的项目包管理器（npm/pnpm/yarn/bun）与脚本命令，供 hooks/scripts 复用', category: 'lib', source: 'scripts/lib/package-manager.js (+ scripts/setup-package-manager.js)', write: 'write', lifecycle: 'persistent', trigger: 'setup', cleanup: '无' },
  { root: 'CWD', path: '<被就地修改的源文件>', description: '被 quality-gate/format/typecheck hook 原地修复的源文件本身（非新增产物）', category: 'hook', source: 'scripts/hooks/quality-gate.js · stop-format-typecheck.js · pre-bash-commit-quality.js', write: 'in-place', lifecycle: 'persistent', trigger: 'PostToolUse / Stop', cleanup: '无（改的就是源文件本身）' },
  { root: 'CWD', path: 'PRD / 流程文档（plan-prd · orch-* · prp-*）', description: 'plan-prd/orch-*/prp-* 命令生成的产品需求与流程文档（Markdown），落在项目内供团队协作', category: 'command', source: 'commands/plan-prd · orch-* · prp-*', write: 'write', lifecycle: 'persistent', trigger: '对应命令', cleanup: '无（项目内）' },
  { root: 'CWD', path: 'docs/PRPs/prs/<plan-name|branch-name>-<yyyymmdd-HHMM>.pr.md', description: '/prp-push-gogs 生成的 Gogs PR 草稿（PR 标题/描述/compare 链接/操作指引），PR 由用户在 Gogs 网页手动创建', category: 'command', source: 'commands/prp-push-gogs', write: 'write', lifecycle: 'persistent', trigger: '/prp-push-gogs', cleanup: '无（项目内）' },
  { root: 'CWD', path: 'docs/PRPs/runs/<prd-name>-<yyyymmdd-HHMM>.run.md', description: '/prp-run 调度运行日志（断点推导/dispatch 摘要/核验证据/STOP 原因的旁路记录，只写不读、best-effort），每次运行新文件', category: 'command', source: 'commands/prp-run', write: 'write', lifecycle: 'persistent', trigger: '/prp-run', cleanup: '无（项目内）' },

  // ── ${EXTERNAL} ──
  { root: 'EXTERNAL', path: 'GitHub PR', description: '/pr /prp-pr 通过 gh 创建的远程 Pull Request，产物落在 GitHub 仓库而非本机', category: 'command', source: 'commands/pr · prp-pr (gh pr create)', write: 'external', lifecycle: 'persistent', trigger: '/pr · /prp-pr', cleanup: '外部仓库' },
  { root: 'EXTERNAL', path: 'Gogs PR', description: '/prp-push-gogs 推送分支后经 Gogs 网页 compare 页面手动创建的远程 Pull Request，产物落在 Gogs 服务器而非本机', category: 'command', source: 'commands/prp-push-gogs (git push + 网页创建)', write: 'external', lifecycle: 'persistent', trigger: '/prp-push-gogs', cleanup: '外部仓库' },
  { root: 'EXTERNAL', path: 'instinct 导出文件（--output 路径）', description: '/instinct-export 按 --output 指定路径导出的 instinct 集合文件，供备份或迁移到其他项目', category: 'command', source: 'commands/instinct-export (instinct-cli.py)', write: 'write', lifecycle: 'persistent', trigger: '/instinct-export', cleanup: '由 --output 指定' },
];

const RESOLVED_ROOTS = ['CLAUDE_DIR', 'HOMUNCULUS', 'TMPDIR', 'GATEGUARD_STATE_DIR'];

// 复刻 homunculus-dir.sh：CLV2_HOMUNCULUS_DIR(abs) → XDG_DATA_HOME/ecc-homunculus(abs) → ~/.local/share/ecc-homunculus
function resolveHomunculusDir() {
  const clv2 = process.env.CLV2_HOMUNCULUS_DIR;
  if (clv2 && path.isAbsolute(clv2)) return path.resolve(clv2);
  const xdg = process.env.XDG_DATA_HOME;
  if (xdg && path.isAbsolute(xdg)) return path.join(xdg, 'ecc-homunculus');
  const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
  return path.join(home, '.local', 'share', 'ecc-homunculus');
}

// 解析运行时真实根（与安装位置无关）。lazy require 避免加载时序问题。
function resolvePathVars() {
  const { resolveAgentDataHome } = require(path.join(SOURCE_ROOT, 'scripts/lib/agent-data-home.js'));
  return {
    CLAUDE_DIR: toPosix(resolveAgentDataHome()),
    HOMUNCULUS: toPosix(resolveHomunculusDir()),
    TMPDIR: toPosix(os.tmpdir()),
    GATEGUARD_STATE_DIR: toPosix(process.env.GATEGUARD_STATE_DIR || path.join(os.homedir(), '.gateguard')),
  };
}

// 组装 paths.json。isTemplate=true（--gen-paths）用占位 resolved；false（applyInstall）用本机真实值。
function buildPathsIndex(isTemplate) {
  const real = resolvePathVars();
  const resolved = isTemplate
    ? { CLAUDE_DIR: '~/.claude', HOMUNCULUS: '~/.local/share/ecc-homunculus', TMPDIR: '$TMPDIR', GATEGUARD_STATE_DIR: '~/.gateguard' }
    : real;
  const PROJECT_DIR = (isTemplate ? '~/.local/share/ecc-homunculus' : real.HOMUNCULUS) + '/projects/<projectId>';

  const variables = {
    CLAUDE_DIR: { env: 'ECC_AGENT_DATA_HOME', default: '~/.claude', resolve: 'ECC_AGENT_DATA_HOME → 项目 .cursor/ecc-agent-data.json → Cursor(~/.cursor/ecc) → ~/.claude', resolved: resolved.CLAUDE_DIR },
    HOMUNCULUS: { env: 'CLV2_HOMUNCULUS_DIR', default: '~/.local/share/ecc-homunculus', resolve: 'CLV2_HOMUNCULUS_DIR(abs) → XDG_DATA_HOME/ecc-homunculus → ~/.local/share/ecc-homunculus', resolved: resolved.HOMUNCULUS },
    TMPDIR: { env: null, default: 'os.tmpdir()', resolve: 'Node os.tmpdir()（macOS = DARWIN_USER_TEMP_DIR，非 /tmp）', resolved: resolved.TMPDIR },
    GATEGUARD_STATE_DIR: { env: 'GATEGUARD_STATE_DIR', default: '~/.gateguard', resolved: resolved.GATEGUARD_STATE_DIR },
    PROJECT_DIR: { resolve: '$HOMUNCULUS/projects/<projectId>', note: 'projectId = git remote/path 的 12 字符哈希；无单值', resolved: PROJECT_DIR },
  };

  const order = ['CLAUDE_DIR', 'HOMUNCULUS', 'TMPDIR', 'GATEGUARD_STATE_DIR', 'SKILL_DIR', 'CWD', 'EXTERNAL'];
  const groups = order
    .filter((root) => PATHS_SPEC.some((s) => s.root === root))
    .map((root) => {
      const hasReal = RESOLVED_ROOTS.includes(root);
      const rootResolved = hasReal ? resolved[root] : PATH_ROOT_LABEL[root];
      const items = PATHS_SPEC
        .filter((s) => s.root === root)
        .map((s) => {
          const item = {
            path: s.path,
            resolved: root === 'EXTERNAL' ? s.path : rootResolved + '/' + s.path,
            description: s.description,
            category: s.category,
            source: s.source,
            write: s.write,
            lifecycle: s.lifecycle,
            trigger: s.trigger,
            cleanup: s.cleanup,
          };
          if (s.note) item.note = s.note;
          return item;
        });
      const g = { root: PATH_ROOT_LABEL[root], resolved: rootResolved, items };
      if (PATH_ROOT_NOTE[root]) g.note = PATH_ROOT_NOTE[root];
      return g;
    });

  return {
    version: 1,
    generated: new Date().toISOString().slice(0, 10),
    aimeta3sHome: isTemplate ? '~/.claude' : toPosix(TARGET_ROOT),
    purpose: '运行时落盘产物路径索引（只读；不移动任何数据）。基于主要写入脚本整理，偶有次要写入者未列。',
    variables,
    groups,
  };
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// --- 安装 ---

function applyInstall(dryRun) {
  const files = planInstall();
  const operations = [];
  for (const f of files) {
    assertSafeDest(f.destAbs, TARGET_ROOT); // 写入前校验路径安全

    const isMd = f.sourceRel.endsWith('.md');
    const raw = fs.readFileSync(f.sourceAbs);
    const content = isMd
      ? Buffer.from(rewriteMarkdownLinks(raw.toString('utf8'), toPosix(f.sourceRel)), 'utf8')
      : raw;
    const rewritten = isMd && !content.equals(raw);

    if (dryRun) {
      const mark = rewritten ? '  (md 链接已重写)' : '';
      console.log(`  ${f.sourceRel}  →  ${toPosix(path.relative(TARGET_ROOT, f.destAbs))}${mark}`);
      operations.push({ sourceRelativePath: f.sourceRel, destinationPath: f.destAbs, contentSha256: sha256(content) });
      continue;
    }

    fs.mkdirSync(path.dirname(f.destAbs), { recursive: true });
    fs.writeFileSync(f.destAbs, content);
    fs.chmodSync(f.destAbs, fs.statSync(f.sourceAbs).mode & 0o777); // 保留源权限（.sh 等 +x，P0-2）
    operations.push({ sourceRelativePath: f.sourceRel, destinationPath: f.destAbs, contentSha256: sha256(content) });
  }

  // 动态生成 /aimeta3s-help 资源清单 manifest.json（白名单 + 名→路径翻译表）
  const manifest = buildManifest(files);
  const manifestDestRel = 'aimeta3s/docs/manifest.json';
  const manifestDestAbs = path.join(TARGET_ROOT, manifestDestRel);
  const manifestBuf = Buffer.from(JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  assertSafeDest(manifestDestAbs, TARGET_ROOT);
  if (dryRun) {
    console.log(`  <生成> ${manifestDestRel}  →  ${toPosix(path.relative(TARGET_ROOT, manifestDestAbs))}  (aimeta3s 资源清单)`);
  } else {
    fs.mkdirSync(path.dirname(manifestDestAbs), { recursive: true });
    fs.writeFileSync(manifestDestAbs, manifestBuf);
  }
  operations.push({ sourceRelativePath: '<generated>/' + manifestDestRel, destinationPath: manifestDestAbs, contentSha256: sha256(manifestBuf) });

  // 动态生成运行时产物路径索引 paths.json（manifest.json 的姊妹篇；resolved 为本机真实值）
  const pathsIndex = buildPathsIndex(false);
  const pathsDestRel = 'aimeta3s/docs/paths.json';
  const pathsDestAbs = path.join(TARGET_ROOT, pathsDestRel);
  const pathsBuf = Buffer.from(JSON.stringify(pathsIndex, null, 2) + '\n', 'utf8');
  assertSafeDest(pathsDestAbs, TARGET_ROOT);
  if (dryRun) {
    console.log(`  <生成> ${pathsDestRel}  →  ${toPosix(path.relative(TARGET_ROOT, pathsDestAbs))}  (运行时产物路径索引)`);
  } else {
    fs.mkdirSync(path.dirname(pathsDestAbs), { recursive: true });
    fs.writeFileSync(pathsDestAbs, pathsBuf);
  }
  operations.push({ sourceRelativePath: '<generated>/' + pathsDestRel, destinationPath: pathsDestAbs, contentSha256: sha256(pathsBuf) });

  return operations;
}

function writeInstallState(operations) {
  const state = {
    schemaVersion: SCHEMA_VERSION,
    installedAt: new Date().toISOString(),
    target: { root: TARGET_ROOT, installStatePath: STATE_PATH },
    source: { sourceRoot: SOURCE_ROOT },
    operations,
  };
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
}

// --- 卸载 ---

function readInstallState() {
  if (!fs.existsSync(STATE_PATH)) {
    throw new Error(`找不到安装状态文件: ${STATE_PATH}（尚未安装或已卸载）`);
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

function uninstall(dryRun) {
  const state = readInstallState();
  const ops = state.operations || [];
  const dirsToPrune = new Set();
  let deleted = 0;
  let skipped = 0;

  for (let i = ops.length - 1; i >= 0; i--) {
    const op = ops[i];
    const dest = op.destinationPath;
    if (!fs.existsSync(dest)) { skipped++; continue; }
    const cur = sha256(fs.readFileSync(dest));
    if (cur !== op.contentSha256) {
      console.log(`  跳过(内容已修改): ${toPosix(path.relative(TARGET_ROOT, dest))}`);
      skipped++;
      continue;
    }
    if (dryRun) {
      console.log(`  将删除: ${toPosix(path.relative(TARGET_ROOT, dest))}`);
    } else {
      fs.unlinkSync(dest);
    }
    deleted++;
    dirsToPrune.add(path.dirname(dest));
  }

  if (!dryRun) {
    // 向上清理空目录，绝不删 TARGET_ROOT 本身
    const targetResolved = path.resolve(TARGET_ROOT);
    let changed = true;
    while (changed) {
      changed = false;
      for (const dir of [...dirsToPrune]) {
        const r = path.resolve(dir);
        if (r === targetResolved || r.length <= targetResolved.length) continue;
        try {
          if (fs.readdirSync(dir).length === 0) {
            fs.rmdirSync(dir);
            dirsToPrune.add(path.dirname(dir));
            changed = true;
          }
        } catch (e) { /* 忽略，下轮再试 */ }
      }
    }
    if (fs.existsSync(STATE_PATH)) fs.unlinkSync(STATE_PATH);
    try {
      if (fs.existsSync(STATE_DIR) && fs.readdirSync(STATE_DIR).length === 0) fs.rmdirSync(STATE_DIR);
    } catch (e) { /* 忽略 */ }
  }
  return { deleted, skipped };
}

// --- 入口 ---

function showHelp() {
  console.log(`AIMeta3S 版独立安装脚本

用法:
  node install.js                安装（直接覆盖同名文件）
  node install.js --dry-run      只打印安装计划，不写盘
  node install.js --uninstall    按状态文件卸载（内容被改过的文件会跳过）
  node install.js --gen-manifest 生成 /aimeta3s-help 资源清单到仓库 install-src/docs/aimeta3s/
  node install.js --gen-paths   生成运行时产物路径索引到仓库 install-src/docs/aimeta3s/
  node install.js --help         显示本帮助

环境变量:
  AI_META_3S_HOME                目标根（默认 ~/.claude）

源:   ${SOURCE_ROOT}
目标: ${TARGET_ROOT}
状态: ${STATE_PATH}
`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) { showHelp(); return; }

  const dryRun = args.includes('--dry-run');
  const doUninstall = args.includes('--uninstall');
  const genManifest = args.includes('--gen-manifest');
  const genPaths = args.includes('--gen-paths');

  if (genManifest) {
    if (!fs.existsSync(SOURCE_ROOT)) {
      console.error(`错误: 找不到源目录 ${SOURCE_ROOT}`);
      process.exit(1);
    }
    const files = planInstall();
    const manifest = buildManifest(files, '~/.claude');
    const outPath = path.join(SOURCE_ROOT, 'docs', 'aimeta3s', 'manifest.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`已生成仓库内清单: ${outPath}（${manifest.resources.length} 个资源，aimeta3sHome=~/.claude 占位）`);
    return;
  }

  if (genPaths) {
    if (!fs.existsSync(SOURCE_ROOT)) {
      console.error(`错误: 找不到源目录 ${SOURCE_ROOT}`);
      process.exit(1);
    }
    const pathsIndex = buildPathsIndex(true);
    const outPath = path.join(SOURCE_ROOT, 'docs', 'aimeta3s', 'paths.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(pathsIndex, null, 2) + '\n');
    const total = pathsIndex.groups.reduce((n, g) => n + g.items.length, 0);
    console.log(`已生成仓库内产物索引: ${outPath}（${pathsIndex.groups.length} 组 / ${total} 条，resolved 为占位）`);
    return;
  }

  if (doUninstall) {
    console.log(dryRun ? '[dry-run] 卸载计划:' : '卸载中...');
    const { deleted, skipped } = uninstall(dryRun);
    console.log(dryRun ? `将删除 ${deleted} 个、跳过 ${skipped} 个` : `已删除 ${deleted} 个、跳过 ${skipped} 个`);
    return;
  }

  if (!fs.existsSync(SOURCE_ROOT)) {
    console.error(`错误: 找不到源目录 ${SOURCE_ROOT}`);
    process.exit(1);
  }

  console.log(dryRun ? '[dry-run] 安装计划:' : `安装 ${SOURCE_ROOT}\n  → ${TARGET_ROOT}`);
  const operations = applyInstall(dryRun);
  if (dryRun) {
    console.log(`共 ${operations.length} 个文件待安装`);
  } else {
    writeInstallState(operations);
    console.log(`已安装 ${operations.length} 个文件；状态写入 ${STATE_PATH}`);
    console.log(`
⚠ hooks 不会自动生效（Claude Code 只从 settings.json 加载 hooks）。请手动合并：
  1. 把 ${toPosix(path.join(TARGET_ROOT, 'hooks', 'hooks.json'))} 里的 "hooks" 字段
     按事件名追加进 ${toPosix(path.join(TARGET_ROOT, 'settings.json'))}（无则新建 {}；勿整体覆盖已有 hooks）。
  2. 重启 Claude Code 会话，或在 /hooks 菜单 review（hooks 在启动时快照）。
  3. 卸载仅删除 hooks/hooks.json；已合并进 settings.json 的 hooks 需按 id（如 pre:bash:dispatcher）手动移除。`);
  }
}

main();
