// Build audio.wav = voice + background music (ducked under the voice) + sound effects, so the preview
// page plays the final mix. export.mjs does the same automatically.
// Usage: node scripts/mix.mjs
import { launchBrowser, openPage } from './lib.mjs';
import { mixAudio } from './audio.mjs';

const browser = await launchBrowser();
try {
  const { page, errors, TL } = await openPage(browser);
  if (errors.length) throw new Error(`page errors:\n  ${errors.join('\n  ')}`);
  const cues = await page.evaluate(() => window.collectCues());
  const cfg = TL.audio || {};
  mixAudio({ duration: TL.duration, cfg, cues });
  console.log(`audio.wav: ${TL.duration}s, music ${cfg.music === undefined ? 'calm' : cfg.music}, ${cfg.sfx === false ? 0 : cues.length} sound effects`);
} finally {
  await browser.close();
}
