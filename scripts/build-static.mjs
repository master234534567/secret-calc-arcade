// Post-build script for static hosting (GitHub Pages).
// The production build outputs a server bundle (dist/server/index.mjs) and
// client assets (dist/client/). Static hosts can't run the server, so we
// render "/" once through the server bundle and save the resulting HTML as
// dist/client/index.html. The app hydrates client-side from there.
import { copyFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const base = process.env.VITE_BASE_PATH ?? "/";

console.log("📦 Loading server entry...");
const serverEntry = await import(
  new URL("../dist/server/index.mjs", import.meta.url)
);
const app = serverEntry.default ?? serverEntry;
console.log("✅ Server entry loaded");

console.log(`🌐 Rendering with base path: ${base}`);
const request = new Request(`http://static.local${base}`);
const response = await app.fetch(request, {}, { waitUntil() {} });

if (!response.ok) {
  console.error(`❌ Failed to render /: ${response.status} ${response.statusText}`);
  const bodyText = await response.text();
  console.error("Response body:", bodyText);
  throw new Error(`Failed to render /: ${response.status} ${response.statusText}`);
}

const html = await response.text();
console.log("✅ Successfully rendered HTML");
console.log(`📊 Generated HTML length: ${html.length} bytes`);

if (html.length < 500) {
  console.warn("⚠️  HTML output is suspiciously small!");
  console.log("HTML preview:", html);
}

const clientDir = new URL("../dist/client/", import.meta.url).pathname;

await writeFile(join(clientDir, "index.html"), html, "utf8");
console.log("✅ Written to dist/client/index.html");

// SPA fallback so deep links/refresh on GitHub Pages serve the app.
await copyFile(join(clientDir, "index.html"), join(clientDir, "404.html"));
console.log("✅ Copied to dist/client/404.html");

console.log(`🎉 Static HTML written to dist/client/index.html (${html.length} bytes)`);
