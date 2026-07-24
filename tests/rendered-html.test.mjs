import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
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
}

test("server-renders the PeerReview game setup", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>PeerReview™ — 3 Accepts or Perish<\/title>/i);
  assert.match(html, /PhD Survival Track/);
  assert.match(html, /请选择你的学术出生点/);
  assert.match(html, /学阀世家/);
  assert.match(html, /普通组/);
  assert.match(html, /导师失联/);
  assert.match(html, /AutoResearch/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("ships game-specific metadata and social artwork", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /MONTH \$\{trainingMonth\}/);
  assert.match(page, /randomEvents/);
  assert.match(page, /rejectReviewLibrary/);
  assert.match(page, /rejectReviewEasterEggs/);
  assert.match(page, /temperature=0/);
  assert.match(page, /out of scope/);
  assert.match(page, /海优加压阶段/);
  assert.match(page, /CONFERENCE SCORE DISTRIBUTION/);
  assert.match(layout, /PeerReview™ — 3 Accepts or Perish/);
  assert.match(layout, /og\.jpg/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await access(new URL("../public/og.jpg", import.meta.url));
  await access(new URL("../public/favicon.png", import.meta.url));
  assert.deepEqual(await readdir(new URL("../app/_sites-preview/", import.meta.url)), []);
});
