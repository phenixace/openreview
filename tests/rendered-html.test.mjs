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
  assert.match(html, /全网最真实的Openreview模拟器/);
  assert.match(html, /请选择你的学术出生点/);
  assert.match(html, /学阀世家/);
  assert.match(html, /普通组/);
  assert.match(html, /导师失联/);
  assert.match(html, /AutoResearch/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("ships game-specific metadata and social artwork", async () => {
  const [page, layout, styles, supabaseClient, supabaseSchema, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/supabase.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /MONTH \$\{trainingMonth\}/);
  assert.match(page, /randomEvents/);
  assert.match(page, /restEvents/);
  assert.match(page, /socialEvents/);
  assert.match(page, /bossEncounterEvents/);
  assert.match(page, /socialMonth/);
  assert.match(page, /randomInt\(1, 100\) <= 5/);
  assert.match(page, /大佬对你留下了深刻印象/);
  assert.match(page, /大佬忽略了你/);
  assert.match(page, /大佬开始凝视/);
  assert.match(page, /trainingSuccessChance/);
  assert.match(page, /休整恢复精力/);
  assert.match(page, /去 social 大佬/);
  assert.match(page, /青年学者交流群 48/);
  assert.match(page, /进修失败/);
  assert.match(page, /arxivExposureRisk/);
  assert.match(page, /origin\.arxiv \+ arxivFavorAdjustment/);
  assert.match(page, /origin\.arxivExposure - arxivFavorAdjustment/);
  assert.match(page, /暴露风险/);
  assert.match(page, /clamp\(value \+ result\.favorDelta, -100, 100\)/);
  assert.match(page, /reportAutoResearch/);
  assert.match(page, /主动举报 AutoResearch/);
  assert.match(page, /reportSuccessChance/);
  assert.match(page, /查看全服彩蛋触发次数/);
  assert.match(page, /positiveScoresOverruled/);
  assert.match(page, /scores\.every\(\(score\) => score >= 5\)/);
  assert.match(page, /POSITIVE_SCORE_AC_REJECT_RATE = 20/);
  assert.match(page, /allPositiveScores \? !positiveScoresOverruled : sampledAccepted/);
  assert.match(page, /三位评审均给出正面评分/);
  assert.match(page, /reviewers’ opinions justify another round/);
  assert.match(page, /\["ICML", "ACL", "NeurIPS", "AAAI", "ICLR"\]/);
  assert.match(page, /ROUNDS_PER_YEAR = 5/);
  assert.match(page, /MAX_PHD_ROUNDS = PHD_YEARS \* ROUNDS_PER_YEAR/);
  assert.match(page, /HAIYOU_ROUNDS = HAIYOU_YEARS \* ROUNDS_PER_YEAR/);
  assert.match(page, /额外 5 年、25 轮/);
  assert.match(page, /conferenceForSemester/);
  assert.match(page, /clamp\(18 \+ \(semester - 1\) \* 5, 18, 90\)/);
  assert.match(page, /4200 \+ \(semester - 1\) \* 1750/);
  assert.match(page, /autoResearchNormalized/);
  assert.match(page, /randomInt\(70, 99\)/);
  assert.match(page, /paper\.aiSmell - 84/);
  assert.match(page, /skills\.detection \* 12/);
  assert.match(page, /method === "manual" \? 28 : 9/);
  assert.match(page, /rejectReviewLibrary/);
  assert.match(page, /rejectReviewEasterEggs/);
  assert.match(page, /temperature=0/);
  assert.match(page, /out of scope/);
  assert.match(page, /海优加压阶段/);
  assert.match(page, /CONFERENCE SCORE DISTRIBUTION/);
  assert.match(layout, /PeerReview™ — 3 Accepts or Perish/);
  assert.match(layout, /全网最真实的 OpenReview 模拟器/);
  assert.match(styles, /@media \(max-width: 600px\)[\s\S]*\.vitals-sidebar[\s\S]*display: grid/);
  assert.match(styles, /@media \(max-width: 600px\)[\s\S]*\.skill-sidebar[\s\S]*display: grid/);
  assert.match(supabaseClient, /sb_publishable_/);
  assert.doesNotMatch(supabaseClient, /sb_secret_|service_role/);
  assert.match(supabaseClient, /fetchPublicGameStats/);
  assert.match(supabaseSchema, /enable row level security/);
  assert.match(supabaseSchema, /get_public_game_stats/);
  assert.match(supabaseSchema, /grant insert on table public\.player_feedback/);
  assert.match(layout, /og\.jpg/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await access(new URL("../public/og.jpg", import.meta.url));
  await access(new URL("../public/favicon.png", import.meta.url));
  assert.deepEqual(await readdir(new URL("../app/_sites-preview/", import.meta.url)), []);
});
