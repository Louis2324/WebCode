export const PROJECT_VERSION = 1;
export const PROJECT_KIND = "web-only";

export function createDefaultProject() {
  return {
    version: PROJECT_VERSION,
    kind: PROJECT_KIND,
    assignment: "",
    test: "",
    html: "<h1>Welcome to Web Code</h1>",
    css: "/* Write your styles here */",
    js: "/* Write your JavaScript here */",
  };
}

export function isProject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (value.version !== PROJECT_VERSION || value.kind !== PROJECT_KIND) return false;

  return ["assignment", "test", "html", "css", "js"].every(
    (field) => typeof value[field] === "string",
  );
}

export function normalizeProject(value) {
  if (!isProject(value)) {
    throw new TypeError("Invalid WebCode project file");
  }

  return {
    version: PROJECT_VERSION,
    kind: PROJECT_KIND,
    assignment: value.assignment,
    test: value.test,
    html: value.html,
    css: value.css,
    js: value.js,
  };
}
