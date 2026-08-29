import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const base = process.env.VITE_BASE_PATH ?? "/";
const publicDir = new URL("../.output/public/", import.meta.url);
const serverEntryUrl = new URL("../.output/server/index.mjs", import.meta.url);

await mkdir(fileURLToPath(publicDir), { recursive: true });

console.log("📦 Loading Nitro SSR entry for GitHub Pages generation...");
const serverEntry = await import(serverEntryUrl.href);
const app = serverEntry.default ?? serverEntry;

const requestUrl = `http://localhost${base}`;
console.log(`🌐 Rendering ${requestUrl}`);
const response = await app.fetch(
  new Request(requestUrl, {
    headers: {
      host: "localhost",
    },
  }),
  {},
  { waitUntil() {} },
);

if (!response.ok) {
  const text = await response.text();
  console.error(`❌ Failed to render ${requestUrl}: ${response.status} ${response.statusText}`);
  console.error(text);
  throw new Error(`Failed to render GitHub Pages entry: ${response.status}`);
}

const html = await response.text();
const indexPath = new URL("index.html", publicDir);
const notFoundPath = new URL("404.html", publicDir);

await writeFile(indexPath, html, "utf8");
await copyFile(indexPath, notFoundPath);

console.log(`✅ Wrote ${fileURLToPath(indexPath)} and ${fileURLToPath(notFoundPath)}`);
