// Loads the engine, built-in characters and built-in styles in order. Parser-inserted via document.write so it works from
// file:// and runs before scenes.js; `init.mjs --update-engine` can add styles without touching index.html.
(() => {
  const base = document.currentScript.src.replace(/load\.js(\?.*)?$/, '');
  const files = ['core.js', 'characters.js', 'iso.js',
    ...['bot', 'person', 'cat'].map((c) => `characters/${c}.js`),
    ...['paper', 'blueprint', 'chalk', 'neon', 'minimal', 'pixel', 'ink', 'papercut', 'isometric'].map((s) => `styles/${s}.js`)];
  for (const f of files) document.write(`<script src="${base}${f}"><\/script>`);
})();
