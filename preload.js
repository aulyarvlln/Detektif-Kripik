
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dongleAPI', {
  check: () => ipcRenderer.invoke('dongle:check')
});
