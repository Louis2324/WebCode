import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultProject,
  isProject,
  isValidFilePath,
  normalizeProject,
} from "../dist/project.js";

test("creates a valid default workspace", () => {
  const project = createDefaultProject();

  assert.equal(isProject(project), true);
  assert.equal(project.version, 2);
  assert.equal(project.kind, "workspace");
  assert.equal(project.entryFile, "index.html");
  assert.deepEqual(project.files.map((file) => file.path), [
    "index.html",
    "styles.css",
    "script.js",
  ]);
});

test("migrates a legacy three-editor project", () => {
  const project = normalizeProject({
    version: 1,
    kind: "web-only",
    assignment: "Build a card",
    test: "assert(true)",
    html: "<article></article>",
    css: "article { color: red; }",
    js: "console.log('ready')",
    extra: "ignored",
  });

  assert.equal(project.version, 2);
  assert.equal(project.kind, "workspace");
  assert.equal(project.entryFile, "index.html");
  assert.equal(project.files[1].content, "article { color: red; }");
  assert.equal(project.assignment, "Build a card");
});

test("normalizes workspace files and settings", () => {
  const project = normalizeProject({
    version: 2,
    kind: "workspace",
    assignment: "Build a card",
    test: "assert(true)",
    entryFile: "missing.html",
    files: [
      { path: "README.md", content: "# Notes" },
      { path: "app.html", language: "html", content: "<main />" },
    ],
    settings: { autoRun: 1, viewport: "mobile" },
  });

  assert.equal(project.entryFile, "README.md");
  assert.equal(project.files[0].language, "text");
  assert.equal(project.settings.autoRun, true);
  assert.equal(project.settings.viewport, "mobile");
});

test("rejects invalid projects and unsafe file paths", () => {
  assert.equal(isProject({ version: 2, kind: "workspace" }), false);
  assert.equal(isProject({ version: 1, kind: "other" }), false);
  assert.equal(isValidFilePath("../secret.js"), false);
  assert.equal(isValidFilePath("folder\\file.js"), false);
  assert.throws(
    () => normalizeProject({
      version: 2,
      kind: "workspace",
      assignment: "",
      test: "",
      entryFile: "index.html",
      files: [{ path: "index.html", content: 42 }],
    }),
    /Invalid WebCode project file/,
  );
});
