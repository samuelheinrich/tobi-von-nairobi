#!/usr/bin/env node
/** Level validator. Reads every level through its adapter and runs the shared checks.
 *
 *   npx tsx tools/levels/validate.mjs            alle Levels
 *   npx tsx tools/levels/validate.mjs zurich     nur passende
 *   npx tsx tools/levels/validate.mjs --json     maschinenlesbar
 *
 * Runs through tsx because the level data is TypeScript. Exit code 1 on any CRITICAL finding, so
 * it can gate a change the moment someone wants that.
 */
import { adapters } from './adapters.mjs';
import { runChecks, severityOrder } from './checks.mjs';

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const filters = argv.filter((a) => !a.startsWith('--'));

const report = [];
for (const [id, build] of Object.entries(adapters)) {
  if (filters.length && !filters.some((f) => id.includes(f))) continue;
  let model;
  try {
    model = await build();
  } catch (error) {
    report.push({ level: id, error: String(error.message), findings: [] });
    continue;
  }
  const findings = runChecks(model).sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
  );
  report.push({ level: id, title: model.title, notes: model.notes, findings, model });
}

if (asJson) {
  console.log(
    JSON.stringify(
      report.map(({ model: _model, ...rest }) => rest),
      null,
      2,
    ),
  );
  process.exit(0);
}

const mark = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '⚪️' };
let critical = 0;
for (const entry of report) {
  const counts = severityOrder.map(
    (s) => `${s} ${entry.findings.filter((f) => f.severity === s).length}`,
  );
  console.log(`\n━━ ${entry.level}${entry.title ? ` · ${entry.title}` : ''}`);
  if (entry.error) {
    console.log(`   Adapter-Fehler: ${entry.error}`);
    continue;
  }
  console.log(`   ${counts.join('  ')}`);
  const shown = new Map();
  for (const f of entry.findings) {
    if (f.severity === 'CRITICAL') critical++;
    // Collapse repeats of the same code so one broken rule does not bury the rest.
    const seen = shown.get(f.code) ?? 0;
    shown.set(f.code, seen + 1);
    if (seen < 3) console.log(`   ${mark[f.severity]} ${f.code}: ${f.message}`);
    else if (seen === 3) console.log(`   ${mark[f.severity]} ${f.code}: … weitere`);
  }
  for (const note of entry.notes ?? []) console.log(`   · nicht geprüft: ${note}`);
}
const totals = severityOrder.map(
  (s) => `${s} ${report.flatMap((r) => r.findings).filter((f) => f.severity === s).length}`,
);
console.log(`\n${'─'.repeat(60)}\nGESAMT  ${totals.join('   ')}`);
if (critical) process.exitCode = 1;
