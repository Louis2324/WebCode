import { BrowserWindow, shell } from "electron";

function sendToFocusedWindow(channel) {
  BrowserWindow.getFocusedWindow()?.webContents.send(channel);
}

export function createMenuTemplate() {
  return [
    {
      label: "File",
      submenu: [
        {
          label: "New Project",
          accelerator: "CmdOrCtrl+N",
          click: () => sendToFocusedWindow("menu-new"),
        },
        {
          label: "Save Project",
          accelerator: "CmdOrCtrl+S",
          click: () => sendToFocusedWindow("menu-save"),
        },
        {
          label: "Open Project",
          accelerator: "CmdOrCtrl+O",
          click: () => sendToFocusedWindow("menu-load"),
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "WebCode on GitHub",
          click: () => shell.openExternal("https://github.com/Louis2324/WebCode"),
        },
      ],
    },
  ];
}
