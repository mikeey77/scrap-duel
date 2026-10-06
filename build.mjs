// Builds the single-page game: src/index.html + src/css/* + src/js/* -> site/index.html.
// The scripts share one scope (one IIFE), so files are concatenated in the order of src/manifest.json.
import fs from 'node:fs';
const src = p => fs.readFileSync(new URL('./src/' + p, import.meta.url), 'utf8');
const { css, js } = JSON.parse(src('manifest.json'));
const styles = css.map(f => src('css/' + f).trimEnd()).join('\n');
const scripts = '(() => {\n' + js.map(f => `/* ===== ${f} ===== */\n` + src(f).trimEnd()).join('\n') + '\n})();';
const html = src('index.html').replace('<!-- @styles -->', () => styles).replace('<!-- @scripts -->', () => scripts);
fs.writeFileSync(new URL('./site/index.html', import.meta.url), html);
console.log(`built site/index.html: ${css.length} stylesheets, ${js.length} scripts, ${(html.length / 1024).toFixed(0)} KB`);
