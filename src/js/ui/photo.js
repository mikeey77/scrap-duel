// Photo mode: freeze the battle, hide the HUD, move the camera freely, pick a filter and save a PNG.
// Opens from the pause menu or with F2 during a solo battle. Esc or Exit returns to the fight.
const PHOTO_FILTERS = [
  ['none', 'Clean', ''],
  ['vivid', 'Vivid', 'saturate(1.6) contrast(1.1)'],
  ['noir', 'Noir', 'grayscale(1) contrast(1.35)'],
  ['sepia', 'Old Print', 'sepia(0.85) contrast(1.05)'],
  ['heat', 'Heatwave', 'hue-rotate(-25deg) saturate(1.8)'],
  ['night', 'Night Vision', 'grayscale(1) sepia(1) hue-rotate(60deg) saturate(3) brightness(0.9)']
];
const canPhoto = () => B && !B.demo && !B.replay && G.mode !== 'mp' && (G.phase === 'battle' || G.phase === 'wait');
function openPhoto() {
  if (!canPhoto()) return;
  $('#ovPause').hidden = true;
  B.paused = true;
  B.photo = { filter: 'none', z0: cam.z, x0: cam.x, y0: cam.y };
  document.body.classList.add('photo');
  let bar = $('#photoBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'photoBar';
    document.body.appendChild(bar);
  }
  bar.innerHTML = `<span class="pb-t">Photo mode</span>
    <div class="seg pb-f">${PHOTO_FILTERS.map(([id, n]) => `<button data-pf="${id}" aria-pressed="${id === 'none'}">${n}</button>`).join('')}</div>
    <span class="small">Drag to move · scroll to zoom</span>
    <button class="btn" id="pbSave">Save photo</button><button class="btn ghost" id="pbExit">Back to the fight</button>`;
  bar.hidden = false;
  $$('#photoBar [data-pf]').forEach(b =>
    b.addEventListener('click', () => {
      B.photo.filter = b.dataset.pf;
      $$('#photoBar [data-pf]').forEach(x => x.setAttribute('aria-pressed', x === b));
      ac.style.filter = PHOTO_FILTERS.find(f => f[0] === b.dataset.pf)[2];
      sfx('ui');
    })
  );
  $('#pbSave').onclick = savePhoto;
  $('#pbExit').onclick = closePhoto;
  sfx('ui');
}
function closePhoto() {
  if (!B || !B.photo) return;
  cam.z = B.photo.z0;
  B.photo = null;
  B.paused = false;
  ac.style.filter = '';
  document.body.classList.remove('photo');
  if ($('#photoBar')) $('#photoBar').hidden = true;
  sfx('ui');
}
function savePhoto() {
  try {
    const f = PHOTO_FILTERS.find(x => x[0] === (B.photo && B.photo.filter)) || PHOTO_FILTERS[0];
    const out = document.createElement('canvas');
    out.width = ac.width;
    out.height = ac.height;
    const c = out.getContext('2d');
    if (f[2]) c.filter = f[2];
    c.drawImage(ac, 0, 0);
    c.filter = 'none';
    // a small stamp in the corner
    const s = out.width / 1440;
    c.font = `700 ${Math.round(22 * s)}px "Chakra Petch", sans-serif`;
    c.textAlign = 'right';
    c.textBaseline = 'bottom';
    c.fillStyle = 'rgba(0,0,0,.45)';
    c.fillText('SCRAP DUEL', out.width - 18 * s + 2, out.height - 14 * s + 2);
    c.fillStyle = '#ffb423';
    c.fillText('SCRAP DUEL', out.width - 18 * s, out.height - 14 * s);
    const a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = `scrap-duel-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast('Photo saved', true);
    grantAch('photo');
    sfx('coin');
    flashScreen();
  } catch (e) {
    toast('Could not save the photo');
  }
}
function flashScreen() {
  const d = document.createElement('div');
  d.className = 'pb-flash';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 400);
}
// camera: drag to pan, wheel to zoom (only while the photo mode is open)
{
  let drag = null;
  ac.addEventListener(
    'pointerdown',
    e => {
      if (!B || !B.photo) return;
      drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y };
      e.stopImmediatePropagation();
    },
    true
  );
  addEventListener('pointermove', e => {
    if (!drag || !B || !B.photo) return;
    const s = view.sc * cam.z;
    cam.x = clamp(drag.cx - (e.clientX - drag.x) / s, 0, AW);
    cam.y = clamp(drag.cy - (e.clientY - drag.y) / s, 0, AH);
    cam.tx = cam.x;
    cam.ty = cam.y;
  });
  addEventListener('pointerup', () => (drag = null));
  ac.addEventListener(
    'wheel',
    e => {
      if (!B || !B.photo) return;
      e.preventDefault();
      cam.z = clamp(cam.z * (e.deltaY > 0 ? 0.9 : 1.1), 0.5, 3);
      cam.tz = cam.z;
    },
    { passive: false }
  );
  addEventListener(
    'keydown',
    e => {
      if (B && B.photo && e.code === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        closePhoto();
      } else if (e.code === 'F2' && !e.repeat && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) {
        if (B && B.photo) closePhoto();
        else if (canPhoto() && $('#ovPause').hidden) openPhoto();
      }
    },
    true
  );
}
