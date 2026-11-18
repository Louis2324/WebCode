const { contextBridge , ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI" ,{
    onSave: (callback) => ipcRenderer.on("menu-save" , callback),
    onLoad: (callback) => ipcRenderer.on("menu-load" , callback),
    openPreview: (html) => ipcRenderer.send("open-preview", html)
});

console.log("[Preload] API exposed:", Object.keys(window));