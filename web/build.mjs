// Builds the download page into web/dist (what Netlify publishes).
// It fills in the version and the newest changelog section, so the page never needs editing for a release.
// The installer itself lives on GitHub Releases; the release workflow builds it from the same version.
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const out = join(here, 'dist');

const REPO = 'https://github.com/mikeey77/scrap-duel';
const LATEST = `${REPO}/releases/latest/download`;

const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');

// The first "## x.y.z · Title · date" section
const sections = changelog.split(/^## /m).slice(1);
const latest = sections.find(s => s.startsWith(version)) || sections[0];
const [heading, ...body] = latest.trim().split('\n');
if (!heading.startsWith(version)) console.warn(`CHANGELOG.md has no section for ${version} yet`);
const parts = heading.split('·').map(s => s.trim());
const title = parts.length > 2 ? `${parts[1]}, released ${parts[2]}` : `Released ${parts[1] || ''}`;

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const changes = body
  .filter(l => l.startsWith('- '))
  .map(l => `<li>${inline(l.slice(2))}</li>`)
  .join('\n              ');

const fill = {
  VERSION: version,
  TITLE: esc(title),
  CHANGES: changes,
  REPO,
  SETUP_URL: '/download',
  ZIP_URL: '/download/zip',
  PORTABLE_URL: '/download/portable'
};
const html = readFileSync(join(here, 'index.html'), 'utf8').replace(/\{\{(\w+)\}\}/g, (m, k) => {
  if (!(k in fill)) throw new Error(`Unknown placeholder ${m}`);
  return fill[k];
});

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'index.html'), html);
for (const dir of ['img', 'fonts', 'media']) cpSync(join(here, dir), join(out, dir), { recursive: true });

// Short download links that always point at the newest release
writeFileSync(
  join(out, '_redirects'),
  [
    `/download      ${LATEST}/ScrapDuel-Setup.exe   302`,
    `/download/zip  ${LATEST}/ScrapDuel-Windows.zip 302`,
    `/download/portable  ${LATEST}/ScrapDuel-Portable.exe 302`,
    ''
  ].join('\n')
);
writeFileSync(
  join(out, '_headers'),
  [
    '/img/*',
    '  Cache-Control: public, max-age=604800',
    '/media/*',
    '  Cache-Control: public, max-age=604800',
    '/fonts/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '/',
    '  Cache-Control: public, max-age=0, must-revalidate',
    ''
  ].join('\n')
);
console.log(`Download page for ${version} written to web/dist`);
