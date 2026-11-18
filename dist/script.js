import {
  createDefaultProject,
  normalizeProject,
} from "./project.js";

const sel = (selector) => document.querySelector(selector);
const selAll = (selector) => Array.from(document.querySelectorAll(selector));
const ace = window.ace;
const electronAPI = window.electronAPI;
const out = sel("#output");
const preview = sel("#preview");
const status = sel("#status");
const STORAGE_KEY = "webcode:draft:v1";
const TAB_ORDER = ["html", "css", "js"];

let currentFilePath = "";
let dirty = false;
let applyingProject = false;
let draftTimer;
let activeRunId = "";

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
    scheduleDraft();
  } else {
    setStatus(currentFilePath ? `Saved: ${currentFilePath}` : "Saved", "saved");
  }
}

function scheduleDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projectJSON()));
    } catch (error) {
      log(`Unable to create recovery draft: ${error.message}`, "warning");
    }
  }, 400);
}

function markDirty() {
  if (!applyingProject) setDirty(true);
}

function projectJSON() {
  return {
    version: 1,
    kind: "web-only",
    assignment: sel("#assignment").value,
    test: sel("#testArea").value,
    html: editors.html.getValue(),
    css: editors.css.getValue(),
    js: editors.js.getValue(),
  };
}

function applyProject(value, { clean = true, filePath = "" } = {}) {
  const project = normalizeProject(value);
  applyingProject = true;
  sel("#assignment").value = project.assignment;
  sel("#testArea").value = project.test;
  editors.html.setValue(project.html, -1);
  editors.css.setValue(project.css, -1);
  editors.js.setValue(project.js, -1);
  applyingProject = false;
  currentFilePath = filePath;
  setDirty(!clean);
  runWeb();
}

function formatValue(value) {
  if (typeof value === "string") return value;
  if (value === undefined) return "undefined";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function escapeScript(value) {
  return String(value).replace(/<\/script/gi, "<\\/script");
}

function escapeStyle(value) {
  return String(value).replace(/<\/style/gi, "<\\/style");
}

function buildWebSrcDoc(withTests = false, runId = createRunId()) {
  const html = editors.html.getValue();
  const css = escapeStyle(editors.css.getValue());
  const js = escapeScript(editors.js.getValue());
  const tests = escapeScript(sel("#testArea").value.trim());
  const testCode = withTests && tests
    ? `\n/* WebCode tests */\n${tests}\n__webcodeSend("test-pass", ["All tests passed"]);`
    : withTests
      ? `__webcodeSend("test-warning", ["No tests provided"]);`
      : "";

  const harness = `
    const __webcodeRunId = ${JSON.stringify(runId)};
    const __webcodeSerialize = (value) => {
      if (typeof value === "string") return value;
      try { return JSON.stringify(value); } catch { return String(value); }
    };
    const __webcodeSend = (type, payload = []) => {
      parent.postMessage({
        source: "webcode-preview",
        runId: __webcodeRunId,
        type,
        payload: payload.map(__webcodeSerialize),
      }, "*");
    };
    ["log", "info", "warn", "error"].forEach((level) => {
      const original = console[level];
      console[level] = (...args) => {
        __webcodeSend("console", [level, ...args]);
        original(...args);
      };
    });
    window.addEventListener("error", (event) => {
      __webcodeSend("runtime-error", [event.message, event.filename, event.lineno]);
    });
    window.addEventListener("unhandledrejection", (event) => {
      __webcodeSend("runtime-error", [event.reason?.message || event.reason]);
    });
    const assert = (condition, message = "Assertion failed") => {
      if (!condition) throw new Error(message);
    };
    const expect = (actual) => ({
      toBe(expected) {
        assert(actual === expected, \`Expected \${JSON.stringify(actual)} to be \${JSON.stringify(expected)}\`);
      },
      toContain(expected) {
        assert(actual?.includes?.(expected), \`Expected value to contain \${JSON.stringify(expected)}\`);
      },
    });
    try {
      ${js}
      ${testCode}
    } catch (error) {
      __webcodeSend(${withTests ? '"test-fail"' : '"runtime-error"'}, [error.message || error]);
    }
  `;

  return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <style>${css}</style>
      </head>
      <body>${html}<script>${escapeScript(harness)}</script></body>
    </html>`;
}

function runWeb(withTests = false) {
  activeRunId = createRunId();
  preview.srcdoc = buildWebSrcDoc(withTests, activeRunId);
  setStatus(withTests ? "Running tests" : "Preview updated", "running");
  log(withTests ? "Running tests" : "Preview updated");
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
  const project = projectJSON();
  try {
    if (electronAPI) {
      const result = await electronAPI.saveProject(project);
      if (result.canceled) return;
      currentFilePath = result.filePath;
    } else {
      const blob = new Blob([`${JSON.stringify(project, null, 2)}\n`], {
        type: "application/json",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "project.webcode.json";
      link.click();
      URL.revokeObjectURL(link.href);
    }
    localStorage.removeItem(STORAGE_KEY);
    setDirty(false);
    log("Project saved");
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
    localStorage.removeItem(STORAGE_KEY);
    log("Project loaded");
  } catch (error) {
    log(`Unable to load project: ${error.message}`, "error");
    setStatus("Load failed", "error");
  }
}

function createNewProject() {
  if (dirty && !window.confirm("Discard unsaved changes and create a new project?")) return;
  currentFilePath = "";
  localStorage.removeItem(STORAGE_KEY);
  applyProject(createDefaultProject(), { clean: false });
  log("New project created");
}

const wraps = Object.fromEntries(
  selAll("#webEditors .editor-wrap").map((wrapper) => [wrapper.dataset.pane, wrapper]),
);
const editors = {
  html: null,
  css: null,
  js: null,
};

ace.config.set("basePath", "./vendor/ace/");
ace.config.set("modePath", "./vendor/ace/");
ace.config.set("themePath", "./vendor/ace/");
ace.config.set("workerPath", "./vendor/ace/");

function makeEditor(id, mode) {
  const editor = ace.edit(id, {
    theme: "ace/theme/dracula",
    mode,
    tabSize: 2,
    useSoftTabs: true,
    showPrintMargin: false,
    wrap: true,
  });

  editor.session.setUseWrapMode(true);
  editor.session.on("change", markDirty);
  editor.commands.addCommand({
    name: "run",
    bindKey: { win: "Ctrl-Enter", mac: "Command-Enter" },
    exec: () => runWeb(),
  });
  editor.commands.addCommand({
    name: "save",
    bindKey: { win: "Ctrl-S", mac: "Command-S" },
    exec: () => saveProject(),
  });
  return editor;
}

editors.html = makeEditor("ed_html", "ace/mode/html");
editors.css = makeEditor("ed_css", "ace/mode/css");
editors.js = makeEditor("ed_js", "ace/mode/javascript");

function activePane() {
  return sel("#webTabs .tab.active")?.dataset.pane || "html";
}

function showPane(name, focusTab = false) {
  TAB_ORDER.forEach((tab) => {
    wraps[tab].hidden = tab !== name;
  });
  selAll("#webTabs .tab").forEach((tab) => {
    const selected = tab.dataset.pane === name;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focusTab) tab.focus();
  });
  requestAnimationFrame(() => {
    editors[name]?.resize(true);
    editors[name]?.focus();
  });
}

sel("#webTabs").addEventListener("click", (event) => {
  const tab = event.target.closest(".tab");
  if (tab) showPane(tab.dataset.pane);
});

sel("#webTabs").addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const index = TAB_ORDER.indexOf(activePane());
  const next = event.key === "Home"
    ? 0
    : event.key === "End"
      ? TAB_ORDER.length - 1
      : (index + (event.key === "ArrowLeft" ? -1 : 1) + TAB_ORDER.length) % TAB_ORDER.length;
  showPane(TAB_ORDER[next], true);
});

window.addEventListener("message", (event) => {
  const message = event.data;
  if (!message || message.source !== "webcode-preview" || message.runId !== activeRunId) return;
  const payload = (message.payload || []).map(formatValue).join(" ");

  if (message.type === "console") {
    const [level, ...values] = message.payload || [];
    log(`[Preview] ${values.map(formatValue).join(" ")}`, level === "error" ? "error" : level === "warn" ? "warning" : "info");
  } else if (message.type === "runtime-error") {
    log(`[Preview error] ${payload}`, "error");
    setStatus("Runtime error", "error");
  } else if (message.type === "test-pass") {
    log(`[Tests passed] ${payload}`, "success");
    setStatus("Tests passed", "saved");
  } else if (message.type === "test-fail") {
    log(`[Tests failed] ${payload}`, "error");
    setStatus("Tests failed", "error");
  } else if (message.type === "test-warning") {
    log(`[Tests] ${payload}`, "warning");
    setStatus("No tests provided", "dirty");
  }
});

sel("#clearLog").addEventListener("click", () => {
  out.replaceChildren();
});
sel("#runWeb").addEventListener("click", () => runWeb());
sel("#runTests").addEventListener("click", () => runWeb(true));
sel("#openPreview").addEventListener("click", openPreview);
sel("#saveBtn").addEventListener("click", saveProject);
sel("#loadBtn").addEventListener("click", loadProjectFromDisk);
sel("#newBtn").addEventListener("click", createNewProject);
sel("#assignment").addEventListener("input", markDirty);
sel("#testArea").addEventListener("input", markDirty);

sel("#openFile").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  try {
    applyProject(JSON.parse(await file.text()), { clean: true, filePath: file.name });
    localStorage.removeItem(STORAGE_KEY);
    log("Project loaded");
  } catch (error) {
    log(`Invalid WebCode project: ${error.message}`, "error");
    setStatus("Load failed", "error");
  }
});

electronAPI?.onNew(createNewProject);
electronAPI?.onSave(saveProject);
electronAPI?.onLoad(loadProjectFromDisk);

showPane("html");
try {
  const draft = localStorage.getItem(STORAGE_KEY);
  if (draft) {
    applyProject(JSON.parse(draft), { clean: false });
    log("Recovered unsaved draft", "warning");
  } else {
    applyProject(createDefaultProject());
  }
} catch (error) {
  log(`Unable to restore draft: ${error.message}`, "error");
  applyProject(createDefaultProject());
}

log("Welcome to WebCode");
