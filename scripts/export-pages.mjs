import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "pages-dist");
const client = path.join(root, "dist", "client");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(client, output, { recursive: true });

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("pages-export", `${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const response = await worker.fetch(
  new Request("https://example.invalid/", {
    headers: { accept: "text/html" },
  }),
  {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  },
  {
    waitUntil() {},
    passThroughOnException() {},
  },
);

if (!response.ok) {
  throw new Error(`Static render failed with status ${response.status}`);
}

let html = await response.text();
html = html
  .replaceAll('"/assets/', '"./assets/')
  .replaceAll('\\"/assets/', '\\"./assets/')
  .replaceAll('"/favicon.png', '"./favicon.png')
  .replaceAll('\\"/favicon.png', '\\"./favicon.png')
  .replaceAll('"/og.png', '"./og.png')
  .replaceAll('\\"/og.png', '\\"./og.png');

await writeFile(path.join(output, "index.html"), html, "utf8");
await writeFile(path.join(output, "404.html"), html, "utf8");
await writeFile(path.join(output, ".nojekyll"), "", "utf8");

console.log(`GitHub Pages export created at ${output}`);
