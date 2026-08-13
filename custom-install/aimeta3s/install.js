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
      // 仓库内 manifest.json 只是开发参考（由 buildManifest 动态生成），安装时跳过源副本
      if (m.src === 'docs' && f.rel === 'docs/aimeta3s/manifest.json') continue;
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
