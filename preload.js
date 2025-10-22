import { contextBridge , ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronApi" ,{
    onSave: (callback) => ipcRenderer.on("menu-save" , callback),
    onLoad: (callback) => ipcRenderer.on("menu-load" , callback)
});