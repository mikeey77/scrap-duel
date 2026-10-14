// The only bridge between the game page and the desktop app: fullscreen, quit, version, the save file and the error log.
const { contextBridge, ipcRenderer } = require('electron');
let full = false;
ipcRenderer.on('fullscreen', (_e, v) => {
  full = v;
  window.dispatchEvent(new Event('desktop-fullscreen'));
});
contextBridge.exposeInMainWorld('desktop', {
  get isFullscreen() {
    return full;
  },
  toggleFullscreen: () => ipcRenderer.invoke('fullscreen:toggle').then(v => (full = v)),
  quit: () => ipcRenderer.invoke('app:quit'),
  // the save file: read once at start-up (sync, before the game reads its settings), written in the background
  readSave: () => ipcRenderer.sendSync('save:read'),
  writeSave: (data, sync) => (sync ? ipcRenderer.sendSync('save:write', data) : ipcRenderer.invoke('save:write', data)),
  openSaveFolder: () => ipcRenderer.invoke('save:open'),
  logError: text => ipcRenderer.invoke('log:error', String(text).slice(0, 4000)),
  openLog: () => ipcRenderer.invoke('log:open'),
  version: (process.argv.find(a => a.startsWith('--app-version=')) || '').split('=')[1] || ''
});
