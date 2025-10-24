const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('flashcardAPI', {
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload)
});

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setOpenAtLogin: enabled => ipcRenderer.invoke('settings:set-open-at-login', enabled),
  setReminder: settings => ipcRenderer.invoke('settings:set-reminder', settings),
  onShowReminder: callback => ipcRenderer.on('show-reminder', (_event, ...args) => callback(...args))
});
