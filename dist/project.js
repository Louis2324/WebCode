export const PROJECT_VERSION = 2;
export const PROJECT_KIND = "workspace";
export const LEGACY_PROJECT_VERSION = 1;
export const LEGACY_PROJECT_KIND = "web-only";

const PATH_PATTERN = /^[a-zA-Z0-9_./-]+$/;
const DEFAULT_FILES = [
  {
    path: "index.html",
    language: "html",
    content: `<main class="hero">
  <h1>Welcome to WebCode</h1>
  <p>Build something small and beautiful.</p>
</main>`,
  },
  {
    path: "styles.css",
    language: "css",
    content: `.hero {
  max-width: 36rem;
  margin: 4rem auto;
  padding: 2rem;
  text-align: center;
  font-family: system-ui, sans-serif;
}

.hero h1 {
  color: #2563eb;
}`,
  },
  {
    path: "script.js",
    language: "javascript",
    content: `document.querySelector(".hero")?.addEventListener("click", () => {
  console.log("Hello from WebCode");
});`,
  },
];

export function languageForPath(filePath = "") {
  const extension = filePath.toLowerCase().split(".").pop();
  if (extension === "html" || extension === "htm") return "html";
  if (extension === "css") return "css";
  if (extension === "js" || extension === "mjs" || extension === "cjs") return "javascript";
  if (extension === "json") return "json";
  if (extension === "md" || extension === "markdown") return "text";
  return "text";
}

export function isValidFilePath(filePath) {
  return typeof filePath === "string"
    && filePath.length > 0
    && filePath.length <= 180
    && !filePath.startsWith("/")
    && !filePath.includes("\\")
    && !filePath.split("/").includes("..")
    && PATH_PATTERN.test(filePath);
}

function normalizeFile(file) {
  if (!file || typeof file !== "object" || !isValidFilePath(file.path)) {
    throw new TypeError("Invalid WebCode file path");
  }
  if (typeof file.content !== "string") {
    throw new TypeError("Invalid WebCode file content");
  }

  return {
    path: file.path,
    language: typeof file.language === "string" ? file.language : languageForPath(file.path),
    content: file.content,
  };
}

function normalizeFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new TypeError("A WebCode project needs at least one file");
  }

  const normalized = files.map(normalizeFile);
  const paths = new Set();
  for (const file of normalized) {
    if (paths.has(file.path)) throw new TypeError(`Duplicate WebCode file: ${file.path}`);
    paths.add(file.path);
  }
  return normalized;
}

export function createDefaultProject() {
  return {
    version: PROJECT_VERSION,
    kind: PROJECT_KIND,
    assignment: "",
    test: "",
    entryFile: "index.html",
    files: DEFAULT_FILES.map((file) => ({ ...file })),
    settings: {
      autoRun: false,
      viewport: "responsive",
    },
  };
}

function isLegacyProject(value) {
  return value
    && typeof value === "object"
    && !Array.isArray(value)
    && value.version === LEGACY_PROJECT_VERSION
    && value.kind === LEGACY_PROJECT_KIND
    && ["assignment", "test", "html", "css", "js"].every(
      (field) => typeof value[field] === "string",
    );
}

function isWorkspaceProject(value) {
  return value
    && typeof value === "object"
    && !Array.isArray(value)
    && value.version === PROJECT_VERSION
    && value.kind === PROJECT_KIND
    && typeof value.assignment === "string"
    && typeof value.test === "string"
    && typeof value.entryFile === "string"
    && Array.isArray(value.files)
    && value.files.length > 0
    && value.files.every((file) => file && typeof file === "object"
      && isValidFilePath(file.path)
      && typeof file.content === "string")
    && new Set(value.files.map((file) => file.path)).size === value.files.length;
}

export function isProject(value) {
  return isLegacyProject(value) || isWorkspaceProject(value);
}

export function normalizeProject(value) {
  if (isLegacyProject(value)) {
    return {
      version: PROJECT_VERSION,
      kind: PROJECT_KIND,
      assignment: value.assignment,
      test: value.test,
      entryFile: "index.html",
      files: [
        { path: "index.html", language: "html", content: value.html },
        { path: "styles.css", language: "css", content: value.css },
        { path: "script.js", language: "javascript", content: value.js },
      ],
      settings: { autoRun: false, viewport: "responsive" },
    };
  }

  if (!isWorkspaceProject(value)) {
    throw new TypeError("Invalid WebCode project file");
  }

  const files = normalizeFiles(value.files);
  const entryFile = files.some((file) => file.path === value.entryFile)
    ? value.entryFile
    : files[0].path;

  return {
    version: PROJECT_VERSION,
    kind: PROJECT_KIND,
    assignment: value.assignment,
    test: value.test,
    entryFile,
    files,
    settings: {
      autoRun: Boolean(value.settings?.autoRun),
      viewport: ["responsive", "mobile", "tablet", "desktop"].includes(value.settings?.viewport)
        ? value.settings.viewport
        : "responsive",
    },
  };
}
