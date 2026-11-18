import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { createDefaultProject, normalizeProject } from "../dist/project.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const measuredFiles = [
  "dist/index.html",
  "dist/styles.css",
  "dist/script.js",
  "dist/project.js",
  "main.js",
  "preload.js",
  "menu.js",
];
const rendererFiles = ["dist/index.html", "dist/styles.css", "dist/script.js", "dist/project.js"];
const operationCount = 10_000;
const limits = {
  normalizeMs: 250,
  rendererBytes: 1_000_000,
};

async function totalBytes(files) {
  const entries = await Promise.all(
    files.map(async (relativePath) => ({
      path: relativePath,
      bytes: (await fs.stat(path.join(root, relativePath))).size,
    })),
  );
  return {
    total: entries.reduce((sum, entry) => sum + entry.bytes, 0),
    files: entries,
  };
}

const project = createDefaultProject();
const startedAt = performance.now();
for (let index = 0; index < operationCount; index += 1) {
  normalizeProject(project);
}
const normalizeMs = performance.now() - startedAt;
const sourceSize = await totalBytes(measuredFiles);
const rendererSize = await totalBytes(rendererFiles);
const result = {
  node: process.version,
  operationCount,
  normalizeMs: Number(normalizeMs.toFixed(2)),
  sourceBytes: sourceSize,
  rendererBytes: rendererSize,
  limits,
  checks: {
    normalize: normalizeMs <= limits.normalizeMs,
    rendererSize: rendererSize.total <= limits.rendererBytes,
  },
};

console.log(JSON.stringify(result, null, 2));

if (process.argv.includes("--check") && Object.values(result.checks).some((passed) => !passed)) {
  process.exitCode = 1;
}
