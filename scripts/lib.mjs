// Shared helpers for the project scripts: Chrome discovery, page launch, timeline access.
import puppeteer from 'puppeteer-core';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';

const IS_WIN = process.platform === 'win32';

// CHROME_PATH, then the usual install locations per platform, then whatever is on PATH
export function findChrome() {
  if (process.env.CHROME_PATH) {
    if (!existsSync(process.env.CHROME_PATH)) throw new Error(`CHROME_PATH does not exist: ${process.env.CHROME_PATH}`);
    return process.env.CHROME_PATH;
  }
  const pf = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
  const candidates = {
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', `${process.env.HOME}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`],
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'],
    win32: pf.map((p) => join(p, 'Google/Chrome/Application/chrome.exe')),
  }[process.platform] || [];
  const found = candidates.find((p) => existsSync(p));
  if (found) return found;
  for (const name of ['google-chrome', 'chromium', 'chromium-browser', 'chrome']) {
    try { return execFileSync(IS_WIN ? 'where' : 'which', [name]).toString().split(/\r?\n/)[0].trim(); } catch { /* not on PATH, try next */ }
  }
  throw new Error('Chrome not found. Install Google Chrome or set CHROME_PATH to a Chrome/Chromium executable.');
}

export function launchBrowser() {
  return puppeteer.launch({ executablePath: findChrome(), headless: true, args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'] });
}

// executable inside the project's Python virtualenv
export const venvBin = (name) => (IS_WIN ? `.venv/Scripts/${name}.exe` : `.venv/bin/${name}`);

export function readTimeline() {
  if (!existsSync('timeline.js')) throw new Error('timeline.js is missing — run `node scripts/tts.mjs` (or `--dry`) first');
  const src = readFileSync('timeline.js', 'utf8');
  return JSON.parse(src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1));
}

export function pageUrl({ style, cast } = {}) {
  const url = new URL(pathToFileURL(resolve('index.html')).href);
  url.searchParams.set('export', '1');
  if (style) url.searchParams.set('style', style);
  if (cast) url.searchParams.set('cast', cast.replaceAll('=', ':'));
  return url.href;
}

// open the project page at full size and wait for fonts; page errors are collected, not thrown
export async function openPage(browser, opts = {}) {
  const TL = readTimeline();
  const page = await browser.newPage();
  await page.setViewport({ width: TL.width || 1920, height: TL.height || 1080, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/audio\.wav/.test(m.text()) && !/ERR_FILE_NOT_FOUND/.test(m.text())) errors.push(m.text()); });
  await page.goto(pageUrl(opts));
  await page.evaluate(() => window.ready).catch((e) => errors.push(String(e.message || e)));
  return { page, errors, TL };
}

export const argOpt = (argv, name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : null; };
