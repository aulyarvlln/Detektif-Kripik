
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dongleAPI', {
  check: () => ipcRenderer.invoke('dongle:check')
});

contextBridge.exposeInMainWorld('authAPI', {
  verifyPassword: (password) =>
    ipcRenderer.invoke('password:verify', password),

  openGame: () =>
    ipcRenderer.invoke('game:open')
});
