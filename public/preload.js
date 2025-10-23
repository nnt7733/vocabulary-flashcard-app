const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('flashcardAPI', {
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload)
});
