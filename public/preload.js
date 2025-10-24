const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setOpenAtLogin: enabled => ipcRenderer.invoke('settings:set-open-at-login', enabled),
  setReminder: settings => ipcRenderer.invoke('settings:set-reminder', settings)
});
