// Bundles src/ into one self-contained app/index.html (used by the desktop exe and the web version).
import fs from 'node:fs';
const src = p => fs.readFileSync(new URL('./src/' + p, import.meta.url), 'utf8');
const order = ['util.js', 'world.js', 'shaders.js', 'render.js', 'items.js', 'audio.js', 'game.js', 'input.js', 'ui.js', 'net.js', 'main.js'];
const peerPath = new URL('./node_modules/peerjs/dist/peerjs.min.js', import.meta.url);
const peer = process.env.NO_PEER || !fs.existsSync(peerPath) ? '' : fs.readFileSync(peerPath, 'utf8').replace(/<\/script/gi, '<\\/script');
const js = '(() => {\n"use strict";\n' + order.map(f => `/* ===== ${f} ===== */\n` + src('js/' + f)).join('\n') + '\n})();';
const html = src('index.html')
  .replace('/* @styles */', () => src('style.css'))
  .replace('/* @peer */', () => peer)
  .replace('/* @scripts */', () => js);
fs.mkdirSync(new URL('./app/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('./app/index.html', import.meta.url), html);
console.log(`app/index.html ${(html.length / 1024).toFixed(0)} KB`);
