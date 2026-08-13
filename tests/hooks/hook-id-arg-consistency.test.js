/**
 * Tests that every top-level hooks.json entry gates under the same id it
 * declares in its `id` field.
 *
 * Background: `pre:observe:continuous-learning` once passed the *abbreviated*
 * `pre:observe` to run-with-flags.js while its `id` field carried the full
 * name. Because the gate (hook-flags.js) compares `ECC_DISABLED_HOOKS` against
 * the arg, `ECC_DISABLED_HOOKS=pre:observe:continuous-learning` silently did
 * nothing. This test locks the invariant so renaming an `id` without updating
 * the command arg is caught by CI.
 *
 * Run with: node tests/hooks/hook-id-arg-consistency.test.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

// hooks.json copies that ship hook definitions. The root copy is authoritative;
// the others are tested only when present so a stale copy cannot reintroduce
// the same drift silently.
const HOOKS_JSON_COPIES = [
  'hooks/hooks.json',
  'custom-install/aimeta3s/install-src/hooks/hooks.json',
  'docs/zh-CN/hooks/hooks.json'
];

// Top-level entries that do NOT gate via run-with-flags.js. Their gate id lives
// inside a .js dispatcher/bootstrap (which uses `hook.id` directly, so it is
// structurally unable to drift). If a new entry is skipped, it must be added
// here explicitly after confirming its command introduced a new gating shape.
const DISPATCHER_BOOTSTRAP_IDS = new Set([
  'pre:bash:dispatcher',
  'session:start',
  'post:dispatcher:sync',
  'post:dispatcher:async'
]);

// Returns the id a hook actually gates under, parsed out of its command, or
// null when the command does not route through run-with-flags.js.
function extractGateId(command) {
  if (typeof command !== 'string') return null;
  // Shape A (PreToolUse/PreCompact/SessionStart sub/PostToolUseFailure):
  //   node ... run-with-flags.js <id> <script> <profiles>
  const shapeA = command.match(/run-with-flags\.js\s+(\S+)/);
  if (shapeA) return shapeA[1];
  // Shape B (Stop/SessionEnd): spawnSync(exec, [script, '<id>', ...])
  const shapeB = command.match(/\[script,'([^']+)'/);
  if (shapeB) return shapeB[1];
  return null;
}

function auditHooksJson(hooksJsonPath) {
  const absPath = path.join(repoRoot, hooksJsonPath);
  const hooks = JSON.parse(fs.readFileSync(absPath, 'utf8')).hooks;
  const checked = [];
  const skipped = [];
  const mismatches = [];

  for (const [event, entries] of Object.entries(hooks)) {
    for (const entry of entries) {
      const id = entry.id;
      const command = entry.hooks && entry.hooks[0] && entry.hooks[0].command;
      const gateId = extractGateId(command);
      if (!gateId) {
        skipped.push({ event, id });
        continue;
      }
      if (gateId !== id) {
        mismatches.push({
          event,
          id,
          gateId,
          hint: `id 字段是 "${id}" 但 command 传给门控的是 "${gateId}"——若重命名了 id，须同步更新 command 里的 run-with-flags 参数`
        });
      } else {
        checked.push({ event, id });
      }
    }
  }

  return { checked, skipped, mismatches, absPath };
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function runTests() {
  console.log('\n=== Testing hooks.json id ↔ gate-arg consistency ===\n');

  let passed = 0;
  let failed = 0;

  const root = auditHooksJson(HOOKS_JSON_COPIES[0]);

  if (test('every gated hook id matches the id in its command arg', () => {
    assert.strictEqual(root.mismatches.length, 0, JSON.stringify(root.mismatches, null, 2));
  })) passed++; else failed++;

  if (test('skipped entries are exactly the known dispatcher/bootstrap set', () => {
    const unknown = root.skipped.filter(s => !DISPATCHER_BOOTSTRAP_IDS.has(s.id));
    assert.strictEqual(
      unknown.length,
      0,
      `未识别的门控形态（提取逻辑可能失效或新增了非 run-with-flags 路径）: ${JSON.stringify(unknown)}`
    );
    // Conversely, every dispatcher/bootstrap id should still be present, so a
    // future refactor that routes one of them through run-with-flags.js does
    // not leave the allow-set stale.
    const skippedIds = new Set(root.skipped.map(s => s.id));
    for (const id of DISPATCHER_BOOTSTRAP_IDS) {
      assert.ok(skippedIds.has(id), `预期被跳过的 ${id} 不再被跳过——若它改走 run-with-flags，请从豁免集合移除并确认 id 一致`);
    }
  })) passed++; else failed++;

  if (test('observe hook is covered (regression anchor for the historical abbreviation bug)', () => {
    assert.ok(
      root.checked.some(c => c.id === 'pre:observe:continuous-learning'),
      'pre:observe:continuous-learning 未被提取为受门控 hook——提取逻辑可能漏掉了它'
    );
  })) passed++; else failed++;

  if (test('hook copies shipped under install-src and docs stay consistent when present', () => {
    for (const rel of HOOKS_JSON_COPIES.slice(1)) {
      if (!fs.existsSync(path.join(repoRoot, rel))) continue;
      const copy = auditHooksJson(rel);
      assert.strictEqual(
        copy.mismatches.length,
        0,
        `${rel} 不一致: ${JSON.stringify(copy.mismatches, null, 2)}`
      );
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
