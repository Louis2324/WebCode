import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultProject,
  isProject,
  normalizeProject,
} from "../dist/project.js";

test("creates a valid default project", () => {
  const project = createDefaultProject();

  assert.equal(isProject(project), true);
  assert.equal(project.version, 1);
  assert.equal(project.kind, "web-only");
  assert.match(project.html, /Welcome/);
});

test("normalizes valid project data", () => {
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

  assert.deepEqual(Object.keys(project).sort(), [
    "assignment",
    "css",
    "html",
    "js",
    "kind",
    "test",
    "version",
  ]);
  assert.equal(project.assignment, "Build a card");
});

test("rejects invalid project versions and field types", () => {
  assert.equal(isProject({ version: 2, kind: "web-only" }), false);
  assert.equal(isProject({ version: 1, kind: "other" }), false);
  assert.throws(
    () => normalizeProject({ version: 1, kind: "web-only", html: 42 }),
    /Invalid WebCode project file/,
  );
});

