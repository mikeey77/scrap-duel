// Builds the single-page game: src/index.html + src/css/* + src/js/* -> site/index.html.
// The scripts share one scope (one IIFE), so files are concatenated in the order of src/manifest.json.
import fs from 'node:fs';
const src = p => fs.readFileSync(new URL('./src/' + p, import.meta.url), 'utf8');
const { css, js } = JSON.parse(src('manifest.json'));
const styles = css.map(f => src('css/' + f).trimEnd()).join('\n');
const scripts = '(() => {\n' + js.map(f => `/* ===== ${f} ===== */\n` + src(f).trimEnd()).join('\n') + '\n})();';
const html = src('index.html').replace('<!-- @styles -->', () => styles).replace('<!-- @scripts -->', () => scripts);
fs.writeFileSync(new URL('./site/index.html', import.meta.url), html);

// Offline assets: the networking library and the three fonts ship with the game (no CDN needed).
const root = new URL('./', import.meta.url),
  nm = p => new URL('node_modules/' + p, root),
  out = p => new URL('site/' + p, root);
fs.mkdirSync(out('vendor'), { recursive: true });
fs.mkdirSync(out('fonts'), { recursive: true });
if (fs.existsSync(nm('peerjs/dist/peerjs.min.js'))) fs.copyFileSync(nm('peerjs/dist/peerjs.min.js'), out('vendor/peerjs.min.js'));
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
console.log(`built site/index.html: ${css.length} stylesheets, ${js.length} scripts, ${(html.length / 1024).toFixed(0)} KB`);
