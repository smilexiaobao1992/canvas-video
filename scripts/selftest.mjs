// Engine self-test: run after changing engine/, scripts/, templates/ or examples/.
// For every example: init a temp project, dry timeline, snap every style and every character (with the
// purity check), then a full draft export whose duration must match the timeline.
// Usage: node <skill>/scripts/selftest.mjs      (needs network once to install puppeteer-core)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, symlinkSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'canvas-video-selftest-'));
const names = (dir) => readdirSync(join(SKILL, dir)).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3));
const STYLES = names('engine/styles');
const CHARACTERS = names('engine/characters');
const EXAMPLES = readdirSync(join(SKILL, 'examples'));

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'pipe' }).toString();
let failed = 0;
function step(name, fn) {
  const t0 = Date.now();
  try { fn(); console.log(`ok    ${name}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }
  catch (e) { failed++; console.log(`FAIL  ${name}\n${String(e.stderr || e.stdout || e.message).trim().split('\n').map((l) => '      ' + l).join('\n')}`); }
}

console.log(`selftest in ${tmp}: ${EXAMPLES.length} examples, ${STYLES.length} styles, ${CHARACTERS.length} characters\n`);
step('install puppeteer-core', () => run('npm', ['install', '--silent', '--prefix', join(tmp, 'shared'), 'puppeteer-core'], tmp));

for (const ex of EXAMPLES) {
  const dir = join(tmp, ex);
  step(`${ex}: init`, () => {
    run('node', [join(SKILL, 'scripts/init.mjs'), dir, '--example', ex, '--no-install'], tmp);
    symlinkSync(join(tmp, 'shared', 'node_modules'), join(dir, 'node_modules'));
  });
  step(`${ex}: tts --dry`, () => run('node', ['scripts/tts.mjs', '--dry'], dir));
  for (const s of STYLES) step(`${ex}: style ${s}`, () => run('node', ['scripts/snap.mjs', '--style', s, '--at', '0.5'], dir));
  for (const c of CHARACTERS) step(`${ex}: cast host=${c}`, () => run('node', ['scripts/snap.mjs', '--cast', `host=${c}`, '--at', '0.5'], dir));
  step(`${ex}: export --draft`, () => {
    run('node', ['scripts/export.mjs', '--draft', '--out', 'smoke.mp4'], dir);
    const tl = readFileSync(join(dir, 'timeline.js'), 'utf8');
    const want = JSON.parse(tl.slice(tl.indexOf('{'), tl.lastIndexOf('}') + 1)).duration;
    const got = parseFloat(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', 'smoke.mp4'], dir));
    if (Math.abs(got - want) > 0.2) throw new Error(`smoke.mp4 is ${got}s, timeline says ${want}s`);
  });
}

console.log(`\n${failed ? `${failed} step(s) failed` : 'all passed'} — contact sheets are in ${tmp}/<example>/snaps/`);
process.exit(failed ? 1 : 0);
