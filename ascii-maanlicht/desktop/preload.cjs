const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('maanlicht', { toggleFullscreen: () => ipcRenderer.send('fullscreen') });
