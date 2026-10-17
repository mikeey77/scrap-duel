// Builds the single-page game: src/index.html + src/css/* + src/js/* -> site/index.html.
// The scripts share one scope (one IIFE), so files are concatenated in the order of src/manifest.json.
import fs from 'node:fs';
const src = p => fs.readFileSync(new URL('./src/' + p, import.meta.url), 'utf8');
const { css, js } = JSON.parse(src('manifest.json'));
// Motion follows the game's own "Interface animations" setting (body.reduced-motion), not the OS switch:
// Windows laptops often have animation effects off, which would silently strip every transition.
const styles =
  css
    .map(f => src('css/' + f).trimEnd())
    .join('\n')
    .replaceAll('@media (prefers-reduced-motion: no-preference)', '@media all')
    .replaceAll('@media (prefers-reduced-motion: reduce)', '@media not all') +
  '\nbody.reduced-motion *,body.reduced-motion *::before,body.reduced-motion *::after{transition:none!important;animation:none!important}';
// recorded voice lines (tools/make-voices.mjs): their lengths go into the bundle, the clips next to it
const voiceDir = new URL('./assets/voice/', import.meta.url);
const voiceIndex = fs.existsSync(new URL('index.json', voiceDir))
  ? JSON.parse(fs.readFileSync(new URL('index.json', voiceDir), 'utf8'))
  : {};
const scripts =
  '(() => {\n' +
  `const VOICE_INDEX = ${JSON.stringify(voiceIndex)};\n` +
  `const GAME_VERSION = ${JSON.stringify(JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version)};\n` +
  js.map(f => `/* ===== ${f} ===== */\n` + src(f).trimEnd()).join('\n') +
  '\n})();';
const html = src('index.html')
  .replace('<!-- @styles -->', () => styles)
  .replace('<!-- @scripts -->', () => scripts);
fs.writeFileSync(new URL('./site/index.html', import.meta.url), html);

// Offline assets: the networking library and the three fonts ship with the game (no CDN needed).
const root = new URL('./', import.meta.url),
  nm = p => new URL('node_modules/' + p, root),
  out = p => new URL('site/' + p, root);
fs.mkdirSync(out('vendor'), { recursive: true });
fs.mkdirSync(out('fonts'), { recursive: true });
if (fs.existsSync(nm('peerjs/dist/peerjs.min.js')))
  fs.copyFileSync(nm('peerjs/dist/peerjs.min.js'), out('vendor/peerjs.min.js'));
const FONTS = [
  ['Chakra Petch', 'chakra-petch', [500, 600, 700]],
  ['Barlow Semi Condensed', 'barlow-semi-condensed', [400, 500, 600, 700]],
  ['JetBrains Mono', 'jetbrains-mono', [400, 600]]
];
let faces = '';
for (const [family, pkg, weights] of FONTS)
  for (const w of weights) {
    const file = `${pkg}-latin-${w}-normal.woff2`,
      src = nm(`@fontsource/${pkg}/files/${file}`);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, out('fonts/' + file));
    faces += `@font-face{font-family:'${family}';font-style:normal;font-weight:${w};font-display:swap;src:url(${file}) format('woff2')}\n`;
  }
if (faces) fs.writeFileSync(out('fonts/fonts.css'), faces);
fs.rmSync(out('voice'), { recursive: true, force: true });
fs.mkdirSync(out('voice'), { recursive: true });
for (const id of Object.keys(voiceIndex)) fs.copyFileSync(new URL(id + '.ogg', voiceDir), out('voice/' + id + '.ogg'));
// the soundtrack (tools/make-music.py)
fs.rmSync(out('music'), { recursive: true, force: true });
fs.cpSync(new URL('./assets/music/', import.meta.url), out('music'), { recursive: true });
console.log(
  `built site/index.html: ${css.length} stylesheets, ${js.length} scripts, ${(html.length / 1024).toFixed(0)} KB, ${Object.keys(voiceIndex).length} voice clips`
);
