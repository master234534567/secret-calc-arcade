// Back-compat wrapper for the current Nitro build output.
// The app generates a server bundle under .output/server/index.mjs, not
// dist/server/index.mjs, so this script delegates to the canonical GitHub Pages
// generator used by the repository's deploy workflow.

const base = process.env.VITE_BASE_PATH ?? "/";
console.log(`📦 Using Nitro GitHub Pages generator with base ${base}`);
await import("./generate-gh-pages.mjs");
console.log("✅ Static entry generation completed via the canonical GitHub Pages script.");
