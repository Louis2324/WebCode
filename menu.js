import {shell , BrowserWindow} from "electron";
const focusedWindow =  BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
export const menuTemplate =  [

    {
        label: "Help",
        submenu: [
            {
                label: "Help",
                accelerator: "CmdOrCtrl + H",
                click: ()=> {
                    shell.openExternal("https://github.com/Louis2324/WebCode");
                }
            }
        ]
    }
];