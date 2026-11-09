
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

contextBridge.exposeInMainWorld("pageAPI", {

    loadPage: (fileName) =>
        ipcRenderer.invoke("page:load", fileName)

});

contextBridge.exposeInMainWorld('cryptoAPI', {
    classical: (data) =>
        ipcRenderer.invoke('crypto:classical', data),

    aes: (data) =>
        ipcRenderer.invoke('crypto:aes:process', data),

    selectImage: () =>
        ipcRenderer.invoke('crypto:image:select'),

    embedImage: (message) =>
        ipcRenderer.invoke('crypto:image:embed', message),

    extractImage: (imageId) =>
        ipcRenderer.invoke('crypto:image:extract', imageId),

    listAddedImages: () => 
        ipcRenderer.invoke('crypto:image:list'),

    readAddedImage: (imageId) => 
        ipcRenderer.invoke('crypto:image:read', imageId),

    decryptDossier: (password) =>
        ipcRenderer.invoke('crypto:dossier:decrypt', password),

    extractDossierImage: (namaFile) =>
        ipcRenderer.invoke('crypto:dossier:extract-image', namaFile),

    extractTKPImage: () =>
        ipcRenderer.invoke('crypto:tkp:extract-image'),
    
    getSuratPS: () =>
        ipcRenderer.invoke('crypto:surat:get'),

    decryptSuratPS: (password) =>
        ipcRenderer.invoke('crypto:surat:decrypt', password),

    unlockAudio: (password) =>
        ipcRenderer.invoke('crypto:audio:unlock', password),

    getAudio: () =>
        ipcRenderer.invoke('crypto:audio:get'),

    markAudioListened: () =>
        ipcRenderer.invoke('crypto:audio:mark-listened'),

    extractAudio: () =>
        ipcRenderer.invoke('crypto:audio:extract')
});

contextBridge.exposeInMainWorld('blockchainAPI', {
    addEvidence: (metadata) =>
        ipcRenderer.invoke('blockchain:evidence:add', metadata),

    getChain: () =>
        ipcRenderer.invoke('blockchain:chain:get'),

    verifyChain: () =>
        ipcRenderer.invoke('blockchain:chain:verify'),

    verifyEvidence: (evidenceId) =>
        ipcRenderer.invoke('blockchain:evidence:verify', evidenceId)
});