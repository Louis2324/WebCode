import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
} from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isProject } from "./dist/project.js";
import { createMenuTemplate } from "./menu.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectFilters = [{ name: "WebCode Project", extensions: ["webcode.json", "json"] }];
const maxPreviewSize = 2_000_000;

let mainWindow;

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    title: "WebCode",
    icon: path.join(__dirname, "assets", "newlogo.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.loadFile(path.join(__dirname, "dist", "index.html"));
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = undefined;
  });
  return window;
}

function getOwnerWindow(event) {
  return BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
}

function createPreviewWindow(html) {
  const previewWindow = new BrowserWindow({
    width: 900,
    height: 800,
    minWidth: 500,
    minHeight: 400,
    title: "WebCode Preview",
    icon: path.join(__dirname, "assets", "newlogo.png"),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  previewWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  previewWindow.webContents.on("will-navigate", (event) => event.preventDefault());
  previewWindow.once("ready-to-show", () => previewWindow.show());
  previewWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

async function readProjectFile(filePath) {
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.toLowerCase().endsWith(".webcode.json")) {
    throw new Error("Recent project paths must point to a .webcode.json file");
  }
  const project = JSON.parse(await fs.readFile(resolvedPath, "utf8"));
  if (!isProject(project)) throw new Error("Selected file is not a valid WebCode project");
  return { canceled: false, filePath: resolvedPath, project };
}

ipcMain.handle("project-save", async (event, project) => {
  if (!isProject(project)) throw new Error("Invalid WebCode project");

  const result = await dialog.showSaveDialog(getOwnerWindow(event), {
    title: "Save WebCode Project",
    defaultPath: "project.webcode.json",
    filters: projectFilters,
  });

  if (result.canceled || !result.filePath) return { canceled: true };

  const filePath = result.filePath.toLowerCase().endsWith(".webcode.json")
    ? result.filePath
    : `${result.filePath}.webcode.json`;

  await fs.writeFile(filePath, `${JSON.stringify(project, null, 2)}\n`, "utf8");
  return { canceled: false, filePath };
});

ipcMain.handle("project-load", async (event) => {
  const result = await dialog.showOpenDialog(getOwnerWindow(event), {
    title: "Open WebCode Project",
    properties: ["openFile"],
    filters: projectFilters,
  });

  if (result.canceled || result.filePaths.length === 0) return { canceled: true };

  const filePath = result.filePaths[0];
  return readProjectFile(filePath);
});

ipcMain.handle("project-load-path", async (_event, filePath) => {
  if (typeof filePath !== "string" || filePath.length > 4096) {
    throw new Error("Invalid recent project path");
  }
  return readProjectFile(filePath);
});

ipcMain.handle("open-preview", (event, html) => {
  if (typeof html !== "string" || html.length > maxPreviewSize) {
    throw new Error("Preview content is too large or invalid");
  }

  createPreviewWindow(html);
  return true;
});

app.whenReady().then(() => {
  mainWindow = createMainWindow();
  Menu.setApplicationMenu(Menu.buildFromTemplate(createMenuTemplate()));

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

process.on("uncaughtException", (error) => {
  console.error("[Main] Uncaught exception", error);
  app.quit();
});

process.on("unhandledRejection", (reason) => {
  console.error("[Main] Unhandled rejection", reason);
});
