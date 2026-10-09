// The only bridge between the game page and the desktop app: fullscreen, quit and version.
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
  version: (process.argv.find(a => a.startsWith('--app-version=')) || '').split('=')[1] || ''
});
