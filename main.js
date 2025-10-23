import {BrowserWindow , app , Menu ,ipcMain} from 'electron';
import { menuTemplate } from './menu.js';
import path from "path";
import { fileURLToPath} from 'url';

console.log(import.meta);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createWindow = () => {
    const win = new BrowserWindow({
      width: 1200, 
      height: 800,
      title:"Web Code",
      webPreferences : {
        preload: path.join(__dirname,"preload.js"),
        nodeIntegration:false,
        contextIsolation: true,
      },
      icon: path.join(__dirname,"assets","newlogo.png")
    });

    win.loadFile(path.join(__dirname,'dist','index.html'));
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on("window-all-closed" , ()=> {
    if(process.platform != "darwin") app.quit();
});

app.on("activate", () => {
    if(BrowserWindow.getAllWindows().length === 0) createWindow();
});

process.on("uncaughtException",(err)=>{
  console.error("[Main], Uncaugth Exception: ",err);
});

process.on("unhandledRejection", (reason) =>{
  console.error("[Main], Unhandled Rejection: ",reason);
})

ipcMain.on("open-preview" , (event,html) => {
  const previewWin = new BrowserWindow({
    width: 800,
    height: 800,
    title: "Web Code Preview",
    icon: path.join(__dirname,"assets","newlogo.png"),
    webPreferences : {
      nodeIntegration:false,
      contextIsolation:true,
    }
  });

    previewWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    previewWin.webContents.openDevTools();
});