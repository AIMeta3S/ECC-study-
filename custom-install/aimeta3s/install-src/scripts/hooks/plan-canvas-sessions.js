#!/usr/bin/env node
/**
 * Plan Canvas open-session surfacing (SessionStart)
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * If a Plan Canvas review is still open from a previous agent session,
 * surface it at session start so a fresh session can resume the loop with
 * `plan-canvas await <file>` instead of leaving the human talking to an
 * empty chair in the browser.
 *
 * Never blocks: exits 0 on every error, prints nothing when there is
 * nothing to resume.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// 提示文案里给出的可执行命令名。aimeta3s 平铺安装不提供 `ecc-plan-canvas` bin，
// 故提示必须指向脚本自身（绝对路径，AI 可直接复制执行）。
const PLAN_CANVAS_CMD = `node "${path.join(__dirname, '..', 'plan-canvas.js')}"`;

function stateDir() {
  const override = process.env.ECC_PLAN_CANVAS_STATE_DIR;
  if (override && override.trim()) return path.resolve(override.trim());
  return path.join(os.homedir(), '.claude', 'plan-canvas');
}

function openSessions() {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(stateDir(), 'sessions.json'), 'utf8'));
    return Object.values(parsed.sessions || {}).filter(session => session.status !== 'ended');
  } catch {
    return [];
  }
}

function buildContext(sessions) {
  const lines = [
    '[PlanCanvas] Open browser review sessions from a previous run:'
  ];
  for (const session of sessions.slice(0, 5)) {
    const pending = session.pendingFeedback && session.pendingFeedback.length;
    lines.push(`  - ${session.file}${pending ? ` (${pending} undelivered feedback item${pending === 1 ? '' : 's'})` : ''}`);
  }
  lines.push(
    `Resume with \`${PLAN_CANVAS_CMD} await <file>\` (plan-canvas skill), or \`${PLAN_CANVAS_CMD} end <file>\` if the review is obsolete.`
  );
  return lines.join('\n');
}

function run() {
  const sessions = openSessions();
  if (sessions.length > 0) {
    process.stdout.write(`${buildContext(sessions)}\n`);
  }
  return 0;
}

if (require.main === module) {
  try {
    process.exit(run());
  } catch (error) {
    process.stderr.write(`[PlanCanvas] WARNING: ${error.message}\n`);
    process.exit(0);
  }
}

module.exports = { run, openSessions, buildContext };
