const { contextBridge, ipcRenderer } = require("electron");

function subscribe(channel, callback) {
  const listener = () => callback();
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("electronAPI", {
  onNew: (callback) => subscribe("menu-new", callback),
  onSave: (callback) => subscribe("menu-save", callback),
  onLoad: (callback) => subscribe("menu-load", callback),
  saveProject: (project) => ipcRenderer.invoke("project-save", project),
  loadProject: () => ipcRenderer.invoke("project-load"),
  openPreview: (html) => ipcRenderer.invoke("open-preview", html),
});
