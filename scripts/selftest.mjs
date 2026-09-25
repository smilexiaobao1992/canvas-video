// Engine self-test: run after changing engine/, scripts/, templates/ or examples/.
// For every example (and the template in 9:16): init a temp project, dry timeline, snap every style and every
// character (purity check + golden-image comparison), mix audio, and a full draft export.
// Usage: node <skill>/scripts/selftest.mjs [--update-golden] [--quick]
//   --update-golden  accept the current rendering as the new reference images (after an intended visual change)
//   --quick          one style and one character per example (faster smoke test)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, symlinkSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UPDATE = process.argv.includes('--update-golden');
const QUICK = process.argv.includes('--quick');
const tmp = mkdtempSync(join(tmpdir(), 'canvas-video-selftest-'));
const names = (dir) => readdirSync(join(SKILL, dir)).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3));
const STYLES = QUICK ? ['paper'] : names('engine/styles');
const CHARACTERS = QUICK ? ['person'] : names('engine/characters');
const CASES = [...readdirSync(join(SKILL, 'examples')).map((ex) => ({ id: ex, example: ex })), { id: 'template-9x16', example: null, format: '9:16' }];

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'pipe' }).toString();
let failed = 0;
function step(name, fn) {
  const t0 = Date.now();
  try { const note = fn(); console.log(`ok    ${name}  (${((Date.now() - t0) / 1000).toFixed(1)}s)${note ? `  ${note}` : ''}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}\n${String(e.stderr || e.stdout || e.message).trim().split('\n').map((l) => '      ' + l).join('\n')}`); }
}
const golden = (id, variant) => ['--golden', join(SKILL, 'tests/golden', id, variant), ...(UPDATE ? ['--update-golden'] : [])];
const lastLine = (s) => s.trim().split('\n').pop();
const probeDur = (f, cwd) => parseFloat(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], cwd));
const timelineDur = (dir) => { const tl = readFileSync(join(dir, 'timeline.js'), 'utf8'); return JSON.parse(tl.slice(tl.indexOf('{'), tl.lastIndexOf('}') + 1)).duration; };

console.log(`selftest in ${tmp}: ${CASES.length} cases, ${STYLES.length} styles, ${CHARACTERS.length} characters${UPDATE ? ' (updating golden images)' : ''}\n`);
step('install npm deps', () => run('npm', ['install', '--silent', '--prefix', join(tmp, 'shared'), 'puppeteer-core', 'lxgw-wenkai-webfont'], tmp));

for (const c of CASES) {
  const dir = join(tmp, c.id);
  step(`${c.id}: init`, () => {
    run('node', [join(SKILL, 'scripts/init.mjs'), dir, ...(c.example ? ['--example', c.example] : []), '--no-install'], tmp);
    symlinkSync(join(tmp, 'shared', 'node_modules'), join(dir, 'node_modules'));
    if (c.format) {
      const s = JSON.parse(readFileSync(join(dir, 'script.json'), 'utf8'));
      writeFileSync(join(dir, 'script.json'), JSON.stringify({ ...s, format: c.format }, null, 2));
    }
  });
  step(`${c.id}: tts --dry`, () => lastLine(run('node', ['scripts/tts.mjs', '--dry'], dir)));
  step(`${c.id}: script styles`, () => lastLine(run('node', ['scripts/snap.mjs', '--at', '0.5', ...golden(c.id, 'default')], dir)));
  for (const s of STYLES) step(`${c.id}: style ${s}`, () => lastLine(run('node', ['scripts/snap.mjs', '--style', s, '--at', '0.5', ...golden(c.id, `style-${s}`)], dir)));
  for (const ch of CHARACTERS) step(`${c.id}: cast host=${ch}`, () => lastLine(run('node', ['scripts/snap.mjs', '--cast', `host=${ch}`, '--at', '0.5', ...golden(c.id, `cast-${ch}`)], dir)));
  step(`${c.id}: mix audio`, () => {
    const out = lastLine(run('node', ['scripts/mix.mjs'], dir));
    const got = probeDur('audio.wav', dir), want = timelineDur(dir);
    if (Math.abs(got - want) > 0.1) throw new Error(`audio.wav is ${got}s, timeline says ${want}s`);
    return out;
  });
  step(`${c.id}: export --draft`, () => {
    run('node', ['scripts/export.mjs', '--draft', '--out', 'smoke.mp4'], dir);
    const got = probeDur('smoke.mp4', dir), want = timelineDur(dir);
    if (Math.abs(got - want) > 0.2) throw new Error(`smoke.mp4 is ${got}s, timeline says ${want}s`);
    const size = run('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', 'smoke.mp4'], dir).trim();
    return `${size}, ${got.toFixed(1)}s`;
  });
}

console.log(`\n${failed ? `${failed} step(s) failed` : 'all passed'} — contact sheets are in ${tmp}/<case>/snaps/`);
process.exit(failed ? 1 : 0);
