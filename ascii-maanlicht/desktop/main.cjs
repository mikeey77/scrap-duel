// Electron shell: one window, fullscreen-capable, loads the bundled single-page game.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
function create() {
  const win = new BrowserWindow({
    width: 1600, height: 900, minWidth: 960, minHeight: 600,
    backgroundColor: '#000000', title: 'Maanlicht', autoHideMenuBar: true, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, backgroundThrottling: false }
  });
  win.setMenu(null);
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.loadFile(path.join(__dirname, '..', 'app', 'index.html'));
  ipcMain.on('fullscreen', () => win.setFullScreen(!win.isFullScreen()));
}
app.whenReady().then(create);
app.on('window-all-closed', () => app.quit());
