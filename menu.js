import {shell} from "electron";
export const menuTemplate =  [
    {
        label: "File",
        submenu: [
            {
                label:"Save",
                accelerators:"CmdOrCtrl+S",
                click: () => {
                    window.webContents.send("menu-save");
                }
            },
            {
                label:"Load",
                accelerators:"CmdOrCtrl+L",
                click: () => {
                    window.webContents.send("menu-load");
                }
            }
        ]
    },
    {
        label: "Help",
        submenu: [
            {
                label: "View Documentation",
                click: ()=> {
                    shell.openExternal("https://github.com/Louis2324/WebCode");
                }
            }
        ]
    }
];