// Scrap Duel desktop app (Electron). Loads the built game from site/ through a private
// app:// protocol so saves (localStorage) live in a stable place in the user's profile.
const { app, BrowserWindow, protocol, net, ipcMain, shell, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const SITE = path.join(__dirname, '..', 'site');
const STATE = () => path.join(app.getPath('userData'), 'window.json');

// Use the graphics card for canvas drawing wherever possible, also on GPUs Chromium is cautious about.
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true }
  }
]);

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE(), 'utf8'));
  } catch (e) {
    return {};
  }
}
function saveState(win) {
  try {
    const b = win.getNormalBounds();
    fs.writeFileSync(STATE(), JSON.stringify({ ...b, maximized: win.isMaximized(), fullscreen: win.isFullScreen() }));
  } catch (e) {}
}
/** Keeps a saved window position only when it is still on a connected screen. */
function visible(s) {
  if (s.x == null) return false;
  return screen.getAllDisplays().some(d => {
    const a = d.workArea;
    return s.x < a.x + a.width - 100 && s.x + s.width > a.x + 100 && s.y >= a.y - 20 && s.y < a.y + a.height - 100;
  });
}

function createWindow() {
  const s = readState();
  const win = new BrowserWindow({
    width: s.width || 1440,
    height: s.height || 900,
    ...(visible(s) ? { x: s.x, y: s.y } : {}),
    minWidth: 1100,
    minHeight: 680,
    backgroundColor: '#0a1020',
    title: 'Scrap Duel',
    icon: path.join(SITE, 'icons', 'icon-512.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false, // a hosted match must keep simulating when the window is in the background
      spellcheck: false,
      additionalArguments: ['--app-version=' + app.getVersion()]
    }
  });
  win.setMenuBarVisibility(false);
  if (s.maximized) win.maximize();
  if (s.fullscreen) win.setFullScreen(true);
  win.once('ready-to-show', () => win.show());
  win.on('close', () => saveState(win));
  win.on('enter-full-screen', () => win.webContents.send('fullscreen', true));
  win.on('leave-full-screen', () => win.webContents.send('fullscreen', false));
  // F11 toggles fullscreen, Ctrl+Shift+I opens dev tools (handy for bug reports)
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    } else if (input.control && input.shift && input.key.toLowerCase() === 'i') win.webContents.toggleDevTools();
  });
  // links to the web open in the normal browser, never inside the game window
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://')) e.preventDefault();
  });
  win.loadURL('app://game/index.html');
  if (process.env.SD_SMOKE) smokeTest(win);
  return win;
}

/** SD_SMOKE=out.png: load the game, log page errors, save a screenshot and quit (used by CI/tests). */
function smokeTest(win) {
  const errors = [];
  win.webContents.on('console-message', (_e, level, msg) => level >= 3 && errors.push(msg));
  win.webContents.on('render-process-gone', (_e, d) => errors.push('renderer gone: ' + d.reason));
  win.webContents.once('did-finish-load', () =>
    setTimeout(async () => {
      const info = await win.webContents.executeJavaScript(
        `JSON.stringify({menu: !document.querySelector('#ovMenu').hidden, peer: !!window.Peer || 'lazy', desktop: !!window.desktop, font: document.fonts.check('16px "Chakra Petch"')})`
      );
      fs.writeFileSync(process.env.SD_SMOKE, (await win.webContents.capturePage()).toPNG());
      console.log('SMOKE', info, 'errors:', JSON.stringify(errors));
      app.quit();
    }, 2500)
  );
}

app.whenReady().then(() => {
  protocol.handle('app', req => {
    const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.normalize(path.join(SITE, rel));
    if (!file.startsWith(SITE)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  ipcMain.handle('fullscreen:toggle', e => {
    const w = BrowserWindow.fromWebContents(e.sender);
    w.setFullScreen(!w.isFullScreen());
    return w.isFullScreen();
  });
  ipcMain.handle('app:quit', () => app.quit());
  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});
app.on('window-all-closed', () => app.quit());
