import {
  createDefaultProject,
  isValidFilePath,
  languageForPath,
  normalizeProject,
} from "./project.js";

const sel = (selector) => document.querySelector(selector);
const selAll = (selector) => Array.from(document.querySelectorAll(selector));
const ace = window.ace;
const electronAPI = window.electronAPI;
const out = sel("#output");
const preview = sel("#preview");
const status = sel("#status");
const testResults = sel("#testResults");
const RECOVERY_KEY = "webcode:recovery:v2";
const RECENT_KEY = "webcode:recent:v1";

let project = createDefaultProject();
let currentFilePath = "";
let activeFilePath = project.entryFile;
let currentFilePathOnDisk = "";
let dirty = false;
let applyingProject = false;
let draftTimer;
let autoRunTimer;
let activeRunId = "";
let recentProjects = [];
let testRunState = { passed: 0, failed: 0 };

const editor = ace.edit("editor", {
  theme: "ace/theme/dracula",
  tabSize: 2,
  useSoftTabs: true,
  showPrintMargin: false,
  wrap: true,
});
editor.session.setUseWrapMode(true);
ace.config.set("basePath", "./vendor/ace/");
ace.config.set("modePath", "./vendor/ace/");
ace.config.set("themePath", "./vendor/ace/");
ace.config.set("workerPath", "./vendor/ace/");

const sessions = new Map();

function createRunId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function log(message, type = "info") {
  const line = document.createElement("div");
  const time = document.createElement("span");
  const text = document.createElement("span");
  time.className = `log-time log-${type}`;
  time.textContent = `[${new Date().toLocaleTimeString()}]`;
  text.textContent = ` ${String(message)}`;
  line.append(time, text);
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}

function setStatus(message, state = "ready") {
  status.textContent = message;
  status.dataset.state = state;
}

function setDirty(nextDirty) {
  dirty = nextDirty;
  if (dirty) {
    setStatus("Unsaved changes", "dirty");
    scheduleRecovery();
  } else {
    setStatus(currentFilePathOnDisk ? `Saved: ${currentFilePathOnDisk}` : "Saved", "saved");
  }
}

function markDirty() {
  if (applyingProject) return;
  setDirty(true);
  if (project.settings.autoRun) {
    clearTimeout(autoRunTimer);
    autoRunTimer = setTimeout(() => runWeb(), 350);
  }
}

function getFile(filePath) {
  return project.files.find((file) => file.path === filePath);
}

function getSession(filePath) {
  return sessions.get(filePath);
}

function projectJSON() {
  return {
    ...project,
    assignment: sel("#assignment").value,
    test: sel("#testArea").value,
    files: project.files.map((file) => ({
      ...file,
      content: getSession(file.path)?.getValue() ?? file.content,
    })),
  };
}

function scheduleRecovery() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    try {
      localStorage.setItem(RECOVERY_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        project: projectJSON(),
      }));
    } catch (error) {
      log(`Unable to create recovery snapshot: ${error.message}`, "warning");
    }
  }, 500);
}

function clearRecovery() {
  localStorage.removeItem(RECOVERY_KEY);
}

function createSession(file) {
  const session = ace.createEditSession(file.content, `ace/mode/${file.language || languageForPath(file.path)}`);
  session.setUseWrapMode(true);
  session.on("change", markDirty);
  return session;
}

function rebuildSessions() {
  sessions.clear();
  for (const file of project.files) sessions.set(file.path, createSession(file));
}

function projectName() {
  if (currentFilePathOnDisk) return currentFilePathOnDisk.split(/[\\/]/).pop();
  return "Untitled project";
}

function applyProject(value, { clean = true, filePath = "" } = {}) {
  const normalized = normalizeProject(value);
  applyingProject = true;
  project = normalized;
  currentFilePathOnDisk = filePath;
  activeFilePath = normalized.entryFile;
  sel("#assignment").value = normalized.assignment;
  sel("#testArea").value = normalized.test;
  sel("#autoRun").checked = normalized.settings.autoRun;
  sel("#viewport").value = normalized.settings.viewport;
  rebuildSessions();
  renderExplorer();
  renderTabs();
  switchFile(activeFilePath, false);
  updateViewport();
  applyingProject = false;
  setDirty(!clean);
  runWeb();
  updateProjectLabel();
}

function updateProjectLabel() {
  sel("#projectLabel").textContent = projectName();
}

function fileIcon(filePath) {
  const extension = filePath.toLowerCase().split(".").pop();
  return { html: "◇", css: "✦", js: "◆", json: "{}", md: "▤" }[extension] || "·";
}

function renderExplorer() {
  const tree = sel("#fileTree");
  tree.replaceChildren();
  [...project.files].sort((a, b) => a.path.localeCompare(b.path)).forEach((file) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `file-item${file.path === activeFilePath ? " active" : ""}${file.path === project.entryFile ? " entry" : ""}`;
    item.dataset.path = file.path;
    item.setAttribute("role", "treeitem");
    const icon = document.createElement("span");
    icon.className = "file-icon";
    icon.textContent = fileIcon(file.path);
    const label = document.createElement("span");
    label.textContent = file.path;
    item.append(icon, label);
    tree.appendChild(item);
  });
}

function renderTabs() {
  const tabs = sel("#fileTabs");
  tabs.replaceChildren();
  project.files.forEach((file) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `file-tab${file.path === activeFilePath ? " active" : ""}`;
    tab.dataset.path = file.path;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(file.path === activeFilePath));
    tab.textContent = file.path;
    tabs.appendChild(tab);
  });
}

function switchFile(filePath, focus = true) {
  const file = getFile(filePath);
  const session = getSession(filePath);
  if (!file || !session) return;
  activeFilePath = filePath;
  editor.setSession(session);
  editor.session.setMode(`ace/mode/${file.language || languageForPath(file.path)}`);
  sel("#activeFileLabel").textContent = file.path;
  renderExplorer();
  renderTabs();
  if (focus) editor.focus();
}

function formatCurrentFile() {
  const session = getSession(activeFilePath);
  if (!session) return;
  const value = session.getValue()
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
  if (value !== session.getValue()) {
    session.setValue(`${value}\n`, -1);
    log(`Formatted ${activeFilePath}`, "success");
  } else {
    log(`${activeFilePath} is already formatted`);
  }
}

function normalizeNewFilePath(value) {
  return String(value || "").trim().replace(/^\.\//, "");
}

function addFile(defaultPath = "") {
  const filePath = normalizeNewFilePath(window.prompt("New file path", defaultPath || "components/example.html"));
  if (!filePath) return;
  if (!isValidFilePath(filePath)) {
    log("Use a relative path without backslashes or '..'", "error");
    return;
  }
  if (getFile(filePath)) {
    log(`A file named ${filePath} already exists`, "warning");
    switchFile(filePath);
    return;
  }
  const file = { path: filePath, language: languageForPath(filePath), content: "" };
  project.files.push(file);
  sessions.set(file.path, createSession(file));
  setDirty(true);
  renderExplorer();
  renderTabs();
  switchFile(file.path);
  log(`Created ${file.path}`, "success");
}

function renameFile(filePath) {
  const file = getFile(filePath);
  if (!file) return;
  const nextPath = normalizeNewFilePath(window.prompt("Rename file", file.path));
  if (!nextPath || nextPath === file.path) return;
  if (!isValidFilePath(nextPath)) {
    log("Use a relative path without backslashes or '..'", "error");
    return;
  }
  if (getFile(nextPath)) {
    log(`A file named ${nextPath} already exists`, "warning");
    return;
  }
  const session = sessions.get(file.path);
  file.path = nextPath;
  file.language = languageForPath(nextPath);
  sessions.delete(filePath);
  sessions.set(nextPath, session);
  if (project.entryFile === filePath) project.entryFile = nextPath;
  if (activeFilePath === filePath) activeFilePath = nextPath;
  setDirty(true);
  renderExplorer();
  renderTabs();
  switchFile(activeFilePath, false);
  log(`Renamed file to ${nextPath}`, "success");
}

function deleteFile(filePath) {
  if (project.files.length === 1) {
    log("A workspace must keep at least one file", "warning");
    return;
  }
  const file = getFile(filePath);
  if (!file || !window.confirm(`Delete ${filePath}?`)) return;
  project.files = project.files.filter((item) => item.path !== filePath);
  sessions.delete(filePath);
  if (project.entryFile === filePath) project.entryFile = project.files[0].path;
  if (activeFilePath === filePath) activeFilePath = project.entryFile;
  setDirty(true);
  renderExplorer();
  renderTabs();
  switchFile(activeFilePath);
  log(`Deleted ${filePath}`, "success");
}

function setEntryFile() {
  project.entryFile = activeFilePath;
  setDirty(true);
  renderExplorer();
  log(`${activeFilePath} is now the preview entry`, "success");
}

function escapeScript(value) {
  return String(value).replace(/<\/script/gi, "<\\/script");
}

function escapeStyle(value) {
  return String(value).replace(/<\/style/gi, "<\\/style");
}

function fileContents() {
  return project.files.map((file) => ({
    ...file,
    content: getSession(file.path)?.getValue() ?? file.content,
  }));
}

function buildWebSrcDoc(withTests = false, runId = createRunId()) {
  const files = fileContents();
  const entry = files.find((file) => file.path === project.entryFile) || files[0];
  let html = entry.language === "html" ? entry.content : `<main>${entry.content}</main>`;
  const cssFiles = files.filter((file) => file.language === "css");
  const jsFiles = files.filter((file) => file.language === "javascript");
  const assetFiles = files.filter((file) => /\.svg$/i.test(file.path));
  const referencedStyles = new Set();
  const referencedScripts = new Set();

  html = html.replace(/\b(src|href)=["']([^"']+\.svg)["']/gi, (attribute, name, href) => {
    const file = assetFiles.find((item) => item.path === href);
    return file ? `${name}="data:image/svg+xml;charset=utf-8,${encodeURIComponent(file.content)}"` : attribute;
  });

  html = html.replace(/<link\b([^>]*?)href=["']([^"']+)["']([^>]*)>/gi, (tag, before, href, after) => {
    const file = cssFiles.find((item) => item.path === href);
    if (!file) return tag;
    referencedStyles.add(file.path);
    return `<style data-webcode-file="${file.path}">${escapeStyle(file.content)}</style>`;
  });
  html = html.replace(/<script\b([^>]*?)src=["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (tag, before, src, after) => {
    const file = jsFiles.find((item) => item.path === src);
    if (!file) return tag;
    referencedScripts.add(file.path);
    return `<script data-webcode-file="${file.path}">${escapeScript(file.content)}</script>`;
  });

  const extraStyles = cssFiles
    .filter((file) => !referencedStyles.has(file.path) && file.path !== entry.path)
    .map((file) => `<style data-webcode-file="${file.path}">${escapeStyle(file.content)}</style>`)
    .join("\n");
  const extraScripts = jsFiles
    .filter((file) => !referencedScripts.has(file.path) && file.path !== entry.path)
    .map((file) => `<script data-webcode-file="${file.path}">${escapeScript(file.content)}</script>`)
    .join("\n");
  const styles = extraStyles ? `${extraStyles}\n` : "";
  const scripts = extraScripts ? `${extraScripts}\n` : "";
  const testCode = withTests ? escapeScript(sel("#testArea").value.trim()) : "";
  const harness = `
    const __webcodeRunId = ${JSON.stringify(runId)};
    let __webcodeFailed = 0;
    let __webcodePassed = 0;
    const __webcodeSerialize = (value) => {
      if (typeof value === "string") return value;
      try { return JSON.stringify(value); } catch { return String(value); }
    };
    const __webcodeSend = (type, payload = []) => {
      parent.postMessage({ source: "webcode-preview", runId: __webcodeRunId, type, payload: payload.map(__webcodeSerialize) }, "*");
    };
    ["log", "info", "warn", "error"].forEach((level) => {
      const original = console[level];
      console[level] = (...args) => { __webcodeSend("console", [level, ...args]); original(...args); };
    });
    window.addEventListener("error", (event) => __webcodeSend("runtime-error", [event.message, event.filename, event.lineno]));
    window.addEventListener("unhandledrejection", (event) => __webcodeSend("runtime-error", [event.reason?.message || event.reason]));
    const assert = (condition, message = "Assertion failed") => {
      if (!condition) throw new Error(message);
    };
    const expect = (actual) => ({
      toBe(expected) { assert(actual === expected, "Expected " + JSON.stringify(actual) + " to be " + JSON.stringify(expected)); },
      toContain(expected) { assert(actual?.includes?.(expected), "Expected value to contain " + JSON.stringify(expected)); },
    });
    const test = (name, callback) => {
      try { callback(); __webcodePassed += 1; __webcodeSend("test-case", [name, "pass"]); }
      catch (error) { __webcodeFailed += 1; __webcodeSend("test-case", [name, "fail", error.message || error]); }
    };
    try {
      ${withTests ? (testCode
        ? `${testCode}\nif (!__webcodeFailed) __webcodeSend("test-pass", [String(__webcodePassed) + " test(s) passed"]); else __webcodeSend("test-fail", [String(__webcodeFailed) + " test(s) failed"]);`
        : `__webcodeSend("test-warning", ["No tests provided"]);`) : ""}
    } catch (error) {
      __webcodeSend(${withTests ? '"test-fail"' : '"runtime-error"'}, [error.message || error]);
    }
  `;

  const cssBlock = styles;
  const documentHtml = html.includes("<html")
    ? html
    : `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${escapeStyle(cssBlock)}</style></head><body>${html}${scripts}<script>${escapeScript(harness)}</script></body></html>`;

  if (html.includes("<html")) {
    return documentHtml
      .replace(/<\/head>/i, `<style>${escapeStyle(cssBlock)}</style></head>`)
      .replace(/<\/body>/i, `${scripts}<script>${escapeScript(harness)}</script></body>`);
  }
  return documentHtml;
}

function runWeb(withTests = false) {
  activeRunId = createRunId();
  if (withTests) {
    testRunState = { passed: 0, failed: 0 };
    testResults.replaceChildren();
    const pending = document.createElement("span");
    pending.className = "muted";
    pending.textContent = "Running tests…";
    testResults.appendChild(pending);
  }
  preview.srcdoc = buildWebSrcDoc(withTests, activeRunId);
  sel("#previewState").textContent = withTests ? "Running tests" : "Updated";
  setStatus(withTests ? "Running tests" : "Preview updated", "running");
  log(withTests ? "Running workspace tests" : `Preview updated from ${project.entryFile}`);
}

async function openPreview() {
  const source = buildWebSrcDoc(false, createRunId());
  try {
    if (electronAPI) {
      await electronAPI.openPreview(source);
      return;
    }
    const previewWindow = window.open("about:blank", "webcode-preview");
    if (!previewWindow) throw new Error("Preview window was blocked");
    previewWindow.document.write(source);
    previewWindow.document.close();
  } catch (error) {
    log(`Unable to open preview: ${error.message}`, "error");
    setStatus("Preview failed", "error");
  }
}

async function saveProject() {
  const value = normalizeProject(projectJSON());
  try {
    let filePath = currentFilePathOnDisk;
    if (electronAPI) {
      const result = await electronAPI.saveProject(value);
      if (result.canceled) return;
      filePath = result.filePath;
    } else {
      const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "project.webcode.json";
      link.click();
      URL.revokeObjectURL(link.href);
    }
    project = value;
    currentFilePathOnDisk = filePath;
    clearRecovery();
    rememberRecent(filePath);
    setDirty(false);
    updateProjectLabel();
    log("Project saved", "success");
  } catch (error) {
    log(`Unable to save project: ${error.message}`, "error");
    setStatus("Save failed", "error");
  }
}

async function loadProjectFromDisk() {
  if (!electronAPI) {
    sel("#openFile").click();
    return;
  }
  try {
    const result = await electronAPI.loadProject();
    if (result.canceled) return;
    applyProject(result.project, { clean: true, filePath: result.filePath });
    clearRecovery();
    rememberRecent(result.filePath);
    log("Project loaded", "success");
  } catch (error) {
    log(`Unable to load project: ${error.message}`, "error");
    setStatus("Load failed", "error");
  }
}

async function loadRecentProject(filePath) {
  if (!electronAPI) {
    log("Recent project reopening is available in the desktop app", "warning");
    return;
  }
  try {
    const result = await electronAPI.loadRecentProject(filePath);
    if (result.canceled) return;
    applyProject(result.project, { clean: true, filePath: result.filePath });
    clearRecovery();
    rememberRecent(result.filePath);
    sel("#recentDialog").close();
    log("Recent project loaded", "success");
  } catch (error) {
    log(`Unable to load recent project: ${error.message}`, "error");
    setStatus("Load failed", "error");
  }
}

function createNewProject() {
  if (dirty && !window.confirm("Discard unsaved changes and create a new project?")) return;
  currentFilePathOnDisk = "";
  applyProject(createDefaultProject(), { clean: false });
  log("New workspace created", "success");
}

function updateViewport() {
  const viewport = sel("#viewport").value;
  sel("#previewFrameWrap").className = `preview-frame-wrap preview-${viewport}`;
}

function rememberRecent(filePath) {
  if (!filePath) return;
  recentProjects = [{ path: filePath, name: filePath.split(/[\\/]/).pop(), openedAt: new Date().toISOString() }, ...recentProjects.filter((item) => item.path !== filePath)].slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recentProjects));
}

function loadRecent() {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    recentProjects = Array.isArray(value) ? value.filter((item) => item?.path && item?.name) : [];
  } catch {
    recentProjects = [];
  }
}

function openRecentDialog() {
  const list = sel("#recentList");
  list.replaceChildren();
  if (!recentProjects.length) {
    const empty = document.createElement("div");
    empty.className = "recent-empty muted";
    empty.textContent = "No saved projects yet.";
    list.appendChild(empty);
  } else {
    recentProjects.forEach((item) => {
      const row = document.createElement("div");
      row.className = "recent-item";
      const label = document.createElement("span");
      label.textContent = item.name;
      label.title = item.path;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn secondary small";
      button.textContent = "Open";
      button.addEventListener("click", () => loadRecentProject(item.path));
      row.append(label, button);
      list.appendChild(row);
    });
  }
  sel("#recentDialog").showModal();
}

function showSearchResults(query = "") {
  const container = sel("#searchResults");
  container.replaceChildren();
  if (!query) {
    container.textContent = "Type to search across the workspace.";
    return;
  }
  const results = [];
  fileContents().forEach((file) => file.content.split("\n").forEach((line, index) => {
    if (line.toLowerCase().includes(query.toLowerCase())) results.push({ file, line, lineNumber: index + 1 });
  }));
  if (!results.length) {
    container.textContent = "No matches found.";
    return;
  }
  results.slice(0, 100).forEach(({ file, line, lineNumber }) => {
    const result = document.createElement("button");
    result.type = "button";
    result.className = "search-result";
    result.innerHTML = `<span><strong>${file.path}</strong> · line ${lineNumber}<br><span class="muted"></span></span><span>→</span>`;
    result.querySelector(".muted").textContent = line.trim().slice(0, 120);
    result.addEventListener("click", () => {
      switchFile(file.path);
      editor.gotoLine(lineNumber, 0, true);
      sel("#searchDialog").close();
    });
    container.appendChild(result);
  });
}

function replaceAllMatches() {
  const query = sel("#searchQuery").value;
  const replacement = sel("#replaceQuery").value;
  if (!query) return;
  let count = 0;
  fileContents().forEach((file) => {
    const session = getSession(file.path);
    const source = session.getValue();
    const matches = source.split(query).length - 1;
    if (matches) {
      session.setValue(source.split(query).join(replacement), -1);
      count += matches;
    }
  });
  showSearchResults(query);
  log(`Replaced ${count} match${count === 1 ? "" : "es"}`, count ? "success" : "warning");
}

const commands = [
  ["new", "New workspace", createNewProject, "Ctrl/Cmd+N"],
  ["save", "Save project", saveProject, "Ctrl/Cmd+S"],
  ["load", "Open project", loadProjectFromDisk, "Ctrl/Cmd+O"],
  ["run", "Run preview", () => runWeb(), "Ctrl/Cmd+Enter"],
  ["tests", "Run validation tests", () => runWeb(true), ""],
  ["search", "Search workspace", () => sel("#searchDialog").showModal(), "Ctrl/Cmd+F"],
  ["format", "Format current file", formatCurrentFile, ""],
  ["entry", "Use current file as entry", setEntryFile, ""],
  ["delete", "Delete current file", () => deleteFile(activeFilePath), ""],
  ["auto", "Toggle auto-run", () => { sel("#autoRun").click(); }, ""],
];

function renderCommands(query = "") {
  const list = sel("#commandList");
  list.replaceChildren();
  commands.filter(([, label]) => label.toLowerCase().includes(query.toLowerCase())).forEach(([id, label, action, shortcut]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "command-item";
    button.dataset.command = id;
    button.innerHTML = `<span>${label}</span><span class="command-key">${shortcut}</span>`;
    button.addEventListener("click", () => {
      sel("#commandDialog").close();
      action();
    });
    list.appendChild(button);
  });
}

function openCommandPalette() {
  sel("#commandQuery").value = "";
  renderCommands();
  sel("#commandDialog").showModal();
  sel("#commandQuery").focus();
}

function addTestResult(name, passed, message = "") {
  const row = document.createElement("div");
  row.className = `test-result ${passed ? "pass" : "fail"}`;
  row.textContent = `${passed ? "✓" : "✕"} ${name}${message ? ` — ${message}` : ""}`;
  testResults.appendChild(row);
}

sel("#fileTree").addEventListener("click", (event) => {
  const item = event.target.closest(".file-item");
  if (item) switchFile(item.dataset.path);
});
sel("#fileTree").addEventListener("dblclick", (event) => {
  const item = event.target.closest(".file-item");
  if (item) renameFile(item.dataset.path);
});
sel("#fileTree").addEventListener("contextmenu", (event) => {
  const item = event.target.closest(".file-item");
  if (!item) return;
  event.preventDefault();
  if (window.confirm(`Delete ${item.dataset.path}?`)) deleteFile(item.dataset.path);
});
sel("#fileTabs").addEventListener("click", (event) => {
  const tab = event.target.closest(".file-tab");
  if (tab) switchFile(tab.dataset.path);
});
sel("#newFileBtn").addEventListener("click", () => addFile("components/example.html"));
sel("#newFolderFileBtn").addEventListener("click", () => addFile("components/example.js"));
sel("#setEntryBtn").addEventListener("click", setEntryFile);
sel("#formatBtn").addEventListener("click", formatCurrentFile);
sel("#searchBtn").addEventListener("click", () => { sel("#searchDialog").showModal(); sel("#searchQuery").focus(); });
sel("#runWeb").addEventListener("click", () => runWeb());
sel("#runTests").addEventListener("click", () => runWeb(true));
sel("#openPreview").addEventListener("click", openPreview);
sel("#saveBtn").addEventListener("click", saveProject);
sel("#loadBtn").addEventListener("click", loadProjectFromDisk);
sel("#newBtn").addEventListener("click", createNewProject);
sel("#recentBtn").addEventListener("click", openRecentDialog);
sel("#commandBtn").addEventListener("click", openCommandPalette);
sel("#clearLog").addEventListener("click", () => out.replaceChildren());
sel("#assignment").addEventListener("input", markDirty);
sel("#testArea").addEventListener("input", markDirty);
sel("#autoRun").addEventListener("change", () => { project.settings.autoRun = sel("#autoRun").checked; setDirty(true); });
sel("#viewport").addEventListener("change", () => { project.settings.viewport = sel("#viewport").value; updateViewport(); setDirty(true); });
sel("#searchQuery").addEventListener("input", (event) => showSearchResults(event.target.value));
sel("#replaceAllBtn").addEventListener("click", replaceAllMatches);
sel("#commandQuery").addEventListener("input", (event) => renderCommands(event.target.value));
sel("#openFile").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  try {
    applyProject(JSON.parse(await file.text()), { clean: true, filePath: file.name });
    clearRecovery();
    log("Project loaded", "success");
  } catch (error) {
    log(`Invalid WebCode project: ${error.message}`, "error");
    setStatus("Load failed", "error");
  }
});

window.addEventListener("message", (event) => {
  if (event.source !== preview.contentWindow) return;
  const message = event.data;
  if (!message || message.source !== "webcode-preview" || message.runId !== activeRunId) return;
  const payload = (message.payload || []).join(" ");
  if (message.type === "console") {
    const [level, ...values] = message.payload || [];
    log(`[Preview] ${values.join(" ")}`, level === "error" ? "error" : level === "warn" ? "warning" : "info");
  } else if (message.type === "runtime-error") {
    log(`[Preview error] ${payload}`, "error");
    setStatus("Runtime error", "error");
    sel("#previewState").textContent = "Runtime error";
  } else if (message.type === "test-case") {
    const [name, result, messageText] = message.payload || [];
    const passed = result === "pass";
    testRunState[passed ? "passed" : "failed"] += 1;
    addTestResult(name, passed, messageText);
  } else if (message.type === "test-pass") {
    log(`[Tests passed] ${payload}`, "success");
    setStatus("Tests passed", "saved");
    sel("#previewState").textContent = "Tests passed";
  } else if (message.type === "test-fail") {
    log(`[Tests failed] ${payload}`, "error");
    setStatus("Tests failed", "error");
    sel("#previewState").textContent = "Tests failed";
  } else if (message.type === "test-warning") {
    log(`[Tests] ${payload}`, "warning");
    testResults.replaceChildren();
    const warning = document.createElement("span");
    warning.className = "muted";
    warning.textContent = "No tests provided.";
    testResults.appendChild(warning);
  }
});

window.addEventListener("keydown", (event) => {
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.key.toLowerCase() === "s") { event.preventDefault(); saveProject(); }
  if (modifier && event.key === "Enter") { event.preventDefault(); runWeb(); }
  if (modifier && event.key.toLowerCase() === "f") { event.preventDefault(); sel("#searchDialog").showModal(); sel("#searchQuery").focus(); }
  if (modifier && event.shiftKey && event.key.toLowerCase() === "p") { event.preventDefault(); openCommandPalette(); }
});

electronAPI?.onNew(createNewProject);
electronAPI?.onSave(saveProject);
electronAPI?.onLoad(loadProjectFromDisk);

loadRecent();
try {
  const rawRecovery = localStorage.getItem(RECOVERY_KEY);
  if (rawRecovery) {
    const recovery = JSON.parse(rawRecovery);
    applyProject(recovery.project || recovery, { clean: false });
    log("Recovered the latest unsaved workspace", "warning");
  } else {
    applyProject(createDefaultProject());
  }
} catch (error) {
  log(`Unable to restore recovery snapshot: ${error.message}`, "error");
  applyProject(createDefaultProject());
}

log("Welcome to WebCode");
