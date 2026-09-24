// Scaffold a canvas-video project (self-contained: engine + scripts are copied in).
// Usage: node ~/.claude/skills/canvas-video/scripts/init.mjs <dir> [--example <name>] [--no-install]
//        node ~/.claude/skills/canvas-video/scripts/init.mjs <dir> --update-engine   refresh engine/ and scripts/ only
import { cpSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (f) => argv.includes(`--${f}`);
const opt = (f) => { const i = argv.indexOf(`--${f}`); return i >= 0 ? argv[i + 1] : null; };
const dir = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1] === '--example'));
if (!dir) { console.error('usage: init.mjs <dir> [--example <name>] [--no-install] [--update-engine]'); process.exit(1); }
const target = resolve(dir);

function copyEngine() {
  cpSync(join(SKILL, 'engine'), join(target, 'engine'), { recursive: true });
  mkdirSync(join(target, 'scripts'), { recursive: true });
  for (const f of ['tts.mjs', 'export.mjs', 'snap.mjs']) copyFileSync(join(SKILL, 'scripts', f), join(target, 'scripts', f));
}

if (flag('update-engine')) {
  if (!existsSync(join(target, 'index.html'))) { console.error(`${target} is not a canvas-video project`); process.exit(1); }
  copyEngine();
  console.log(`engine/ and scripts/ refreshed in ${target}`);
  process.exit(0);
}

if (existsSync(target) && readdirSync(target).length) { console.error(`${target} is not empty; pick a new directory (or use --update-engine)`); process.exit(1); }
mkdirSync(target, { recursive: true });
copyEngine();
for (const f of ['index.html', 'scenes.js', 'script.json', 'package.json']) copyFileSync(join(SKILL, 'templates', f), join(target, f));
copyFileSync(join(SKILL, 'templates', 'gitignore'), join(target, '.gitignore'));

const example = opt('example');
if (example) {
  const src = join(SKILL, 'examples', example);
  if (!existsSync(src)) { console.error(`unknown example "${example}"; available: ${readdirSync(join(SKILL, 'examples')).join(', ')}`); process.exit(1); }
  for (const f of readdirSync(src)) copyFileSync(join(src, f), join(target, f));
}

if (!flag('no-install')) {
  const run = (cmd) => { console.log(`$ ${cmd}`); execSync(cmd, { cwd: target, stdio: 'inherit' }); };
  run('npm install --silent puppeteer-core');
  run('python3 -m venv .venv');
  run('.venv/bin/pip install -q edge-tts');
}
console.log(`\ncanvas-video project ready: ${target}\nnext: cd ${dir} && node scripts/tts.mjs && node scripts/snap.mjs`);
