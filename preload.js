const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Lock/unlock drag
  onToggleDrag: (callback) => ipcRenderer.on('toggle-drag', callback),

  // File operations
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (content, filePath) => ipcRenderer.invoke('save-file', content, filePath),

  // Auto-launch toggle
  getAutoLaunchStatus: () => ipcRenderer.invoke('auto-launch:get-status'),
  setAutoLaunch: (enable) =>
    ipcRenderer.invoke(enable ? 'auto-launch:enable' : 'auto-launch:disable')
});
