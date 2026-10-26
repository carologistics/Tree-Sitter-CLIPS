// bindings/node/index.js
//
// The actual Node.js entry point for this package (per package.json's
// "main"/"exports") -- what `import Clips from 'tree-sitter-clips'`
// resolves to. Loads the native addon compiled from src/parser.c (via
// node-gyp-build, falling back to a Bun-compatible static import path),
// attaches src/node-types.json for static node-type introspection, and
// lazily exposes each queries/*.scm file's source text as a getter
// (HIGHLIGHTS_QUERY, LOCALS_QUERY, TAGS_QUERY -- see language.ts in the
// clips-language-server package, which reads these directly instead of
// loading the .scm files itself). Mostly generated boilerplate from
// `tree-sitter init`/`tree-sitter generate`, not hand-authored
// CLIPS-specific logic -- but it's genuinely ESM (uses top-level
// `await`), which is why everything that consumes this package must be
// ESM too; see this repo's package.json and bindings/node/package.json
// for how that's scoped.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));

const binding = typeof process.versions.bun === "string"
  // Support `bun build --compile` by being statically analyzable enough to find the .node file at build-time
  ? await import(`${root}/prebuilds/${process.platform}-${process.arch}/tree-sitter-clips.node`)
  : (await import("node-gyp-build")).default(root);

try {
  const nodeTypes = await import(`${root}/src/node-types.json`, { with: { type: "json" } });
  binding.nodeTypeInfo = nodeTypes.default;
} catch { }

const queries = [
  ["HIGHLIGHTS_QUERY", `${root}/queries/highlights.scm`],
  ["INJECTIONS_QUERY", `${root}/queries/injections.scm`],
  ["LOCALS_QUERY", `${root}/queries/locals.scm`],
  ["TAGS_QUERY", `${root}/queries/tags.scm`],
];

for (const [prop, path] of queries) {
  Object.defineProperty(binding, prop, {
    configurable: true,
    enumerable: true,
    get() {
      delete binding[prop];
      try {
        binding[prop] = readFileSync(path, "utf8");
      } catch { }
      return binding[prop];
    }
  });
}

export default binding;
