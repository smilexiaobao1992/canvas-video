// Scaffold a canvas-video project (self-contained: engine + scripts are copied in).
// Usage: node ~/.claude/skills/canvas-video/scripts/init.mjs <dir> [--example <name>] [--format 9:16] [--no-install]
//        node ~/.claude/skills/canvas-video/scripts/init.mjs <dir> --update-engine   refresh engine/ and scripts/ only
//        node ~/.claude/skills/canvas-video/scripts/init.mjs <dir> --episode-of <project>
//          next episode of a series: same settings as <project>, and it shares that project's node_modules, .venv,
//          custom script files (drawing libraries, styles, characters) and music file instead of copying them,
//          so a helper fixed in one episode is fixed in all of them. Nothing is installed.
import { cpSync, existsSync, mkdirSync, readdirSync, copyFileSync, readFileSync, writeFileSync, symlinkSync, realpathSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (f) => argv.includes(`--${f}`);
const opt = (f) => { const i = argv.indexOf(`--${f}`); return i >= 0 ? argv[i + 1] : null; };
const dir = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && ['--example', '--format', '--episode-of'].includes(argv[i - 1])));
if (!dir) { console.error('usage: init.mjs <dir> [--example <name>] [--format 9:16] [--no-install] | --update-engine | --episode-of <project>'); process.exit(1); }
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

// next episode of a series: reuse the first project's dependencies, shared scripts and settings
const episodeOf = opt('episode-of');
if (episodeOf) {
  const src = resolve(episodeOf);
  if (!existsSync(join(src, 'index.html')) || !existsSync(join(src, 'script.json'))) { console.error(`${src} is not a canvas-video project`); process.exit(1); }
  if (opt('example')) { console.error('--episode-of and --example cannot be combined'); process.exit(1); }
  const rel = (p) => relative(target, resolve(src, p)).split('\\').join('/');
  const own = (p) => /^(timeline\.js|scenes\.js|engine\/|node_modules\/)/.test(p) || /^([a-z]+:)?\/\//i.test(p);
  // scripts the first project added to its page (drawing libraries, styles, characters) stay where they are
  // and are loaded from there
  const shared = [];
  const html = readFileSync(join(src, 'index.html'), 'utf8').replace(/(<script src=")([^"]+)(")/g, (m, a, p, b) => {
    if (own(p)) return m;
    shared.push(rel(p));
    return a + rel(p) + b;
  });
  writeFileSync(join(target, 'index.html'), html);
  for (const d of ['node_modules', '.venv']) {
    if (existsSync(join(src, d))) symlinkSync(realpathSync(join(src, d)), join(target, d), IS_WIN ? 'junction' : 'dir');
    else console.log(`note: ${src} has no ${d}; install it there (or in the new project) before running the scripts`);
  }
  const from = JSON.parse(readFileSync(join(src, 'script.json'), 'utf8'));
  const audio = from.audio && typeof from.audio.music === 'string' && existsSync(join(src, from.audio.music))
    ? { ...from.audio, music: rel(from.audio.music) } : from.audio;
  // one placeholder scene that only needs the engine, so the episode renders before any content is written
  const scenes = [{ id: 'opening', title: '开场', lead: 0.6, hold: 0.8, lines: ['这一集的第一句台词。'] }];
  writeFileSync(join(target, 'script.json'), JSON.stringify({ ...from, ...(audio ? { audio } : {}), scenes }, null, 2) + '\n');
  writeFileSync(join(target, 'scenes.js'), `/* Episode content: one function per scene id in script.json, signature (lt, S, t).
 * The series' drawing helpers and styles come from the shared scripts listed in index.html; edit them in place.
 */
const SCENES = {
  opening(lt, S, t) {
    text('新的一集', W / 2, (SAFE.y0 + SAFE.y1) / 2, { size: 96, weight: 700, alpha: prog(lt, 0, 0.6) });
  },
};
const CAMS = {};
const SFX = {};
`);
  // a style the first episode registers inside its own scenes.js is not visible from here
  const style = from.style, srcScenes = existsSync(join(src, 'scenes.js')) ? readFileSync(join(src, 'scenes.js'), 'utf8') : '';
  if (style && new RegExp(`registerStyle\\(\\s*['"]${style}['"]`).test(srcScenes)) {
    console.log(`note: style "${style}" is registered inside ${join(src, 'scenes.js')}. Move that registerStyle call into its own file (e.g. series.js), load it with a <script> tag before scenes.js in both index.html files, and both episodes will share it.`);
  }
  console.log(`\ncanvas-video episode ready: ${target}\n  settings, node_modules and .venv come from ${src}${shared.length ? `\n  shared scripts (edit them in place, every episode loads the same file): ${shared.join(', ')}` : ''}\nnext: write script.json scenes and scenes.js, then cd ${dir} && node scripts/tts.mjs --dry && node scripts/snap.mjs`);
  process.exit(0);
}

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
