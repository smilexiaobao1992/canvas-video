// Scaffold a canvas-video project (self-contained: engine + scripts are copied in).
// Usage: node ~/.claude/skills/canvas-video/scripts/init.mjs <dir> [--example <name>] [--format 9:16] [--no-install]
//        node ~/.claude/skills/canvas-video/scripts/init.mjs <dir> --update-engine   refresh engine/ and scripts/ only
import { cpSync, existsSync, mkdirSync, readdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (f) => argv.includes(`--${f}`);
const opt = (f) => { const i = argv.indexOf(`--${f}`); return i >= 0 ? argv[i + 1] : null; };
const dir = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && ['--example', '--format'].includes(argv[i - 1])));
if (!dir) { console.error('usage: init.mjs <dir> [--example <name>] [--no-install] [--update-engine]'); process.exit(1); }
const target = resolve(dir);

function copyEngine() {
  cpSync(join(SKILL, 'engine'), join(target, 'engine'), { recursive: true });
  mkdirSync(join(target, 'scripts'), { recursive: true });
  for (const f of PROJECT_SCRIPTS) copyFileSync(join(SKILL, 'scripts', f), join(target, 'scripts', f));
}
const PROJECT_SCRIPTS = ['lib.mjs', 'tts.mjs', 'edge_words.py', 'audio.mjs', 'mix.mjs', 'snap.mjs', 'export.mjs'];
const IS_WIN = process.platform === 'win32';
const PY = IS_WIN ? 'python' : 'python3';
const PIP = IS_WIN ? '.venv\\Scripts\\pip' : '.venv/bin/pip';
const NPM_DEPS = 'puppeteer-core lxgw-wenkai-webfont';

// bring an older project's index.html up to the current template (single loader, web font, sized canvas)
function migrateHtml() {
  const path = join(target, 'index.html');
  let html = readFileSync(path, 'utf8');
  const tpl = readFileSync(join(SKILL, 'templates', 'index.html'), 'utf8');
  if (!html.includes('engine/load.js')) {
    html = html
      .replace(/^[ \t]*<script src="engine\/[^"]+"><\/script>\n/gm, '')
      .replace(/(<script src="timeline\.js"><\/script>\n)/, '$1<script src="engine/load.js"></script>\n');
  }
  html = html.replace(/<style>[\s\S]*?<\/style>/, tpl.match(/<style>[\s\S]*?<\/style>/)[0]);
  if (!html.includes('lxgw-wenkai-webfont')) html = html.replace(/(<\/title>\n)/, `$1${tpl.match(/<!-- bundled[\s\S]*?bold\.css">\n/)[0]}`);
  html = html.replace(/<canvas id="c"[^>]*>/, '<canvas id="c">').replace(/<audio id="voice"[^>]*>/, '<audio id="voice" preload="auto">');
  writeFileSync(path, html);
}

if (flag('update-engine')) {
  if (!existsSync(join(target, 'index.html'))) { console.error(`${target} is not a canvas-video project`); process.exit(1); }
  copyEngine();
  migrateHtml();
  if (!existsSync(join(target, 'node_modules/lxgw-wenkai-webfont')) && !flag('no-install')) execSync(`npm install --silent ${NPM_DEPS}`, { cwd: target, stdio: 'inherit' });
  console.log(`engine/ and scripts/ refreshed in ${target} — rerun scripts/tts.mjs so timeline.js picks up new fields`);
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

const format = opt('format');
if (format) {
  const p = join(target, 'script.json'), s = JSON.parse(readFileSync(p, 'utf8'));
  writeFileSync(p, JSON.stringify({ ...s, format }, null, 2) + '\n');
}

if (!flag('no-install')) {
  const run = (cmd) => { console.log(`$ ${cmd}`); execSync(cmd, { cwd: target, stdio: 'inherit' }); };
  run(`npm install --silent ${NPM_DEPS}`);
  run(`${PY} -m venv .venv`);
  run(`${PIP} install -q edge-tts`);
}
console.log(`\ncanvas-video project ready: ${target}\nnext: cd ${dir} && node scripts/tts.mjs --dry && node scripts/snap.mjs   (real voice later: node scripts/tts.mjs)`);
