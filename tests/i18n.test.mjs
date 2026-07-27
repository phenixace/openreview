import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { containsChinese, translateToEnglish } from "../app/i18n.mjs";

function collectChineseUiFragments(source) {
  const sourceFile = ts.createSourceFile(
    "page.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const fragments = new Set();
  const add = (value) => {
    const cleaned = value.replace(/\s+/g, " ").trim();
    if (containsChinese(cleaned)) fragments.add(cleaned);
  };
  const visit = (node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isJsxText(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      add(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [...fragments];
}

test("English mode covers every Chinese UI source fragment", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const fragments = collectChineseUiFragments(source).filter((fragment) => fragment !== "中");
  const gaps = fragments
    .map((sourceText) => ({ sourceText, translated: translateToEnglish(sourceText) }))
    .filter(
      ({ translated }) =>
        containsChinese(translated) || translated.includes("academic-system text"),
    );

  assert.equal(gaps.length, 0, JSON.stringify(gaps.slice(0, 10), null, 2));
  assert.ok(fragments.length > 500);
});

test("English mode translates core satire and dynamic game messages", () => {
  assert.equal(
    translateToEnglish("全网最真实的Openreview模拟器"),
    "The Internet's Most Realistic OpenReview Simulator",
  );
  assert.equal(
    translateToEnglish("第 3 轮 · ICML · 2 月行动"),
    "Round 3 · ICML · Month 2 Actions",
  );
  assert.equal(
    translateToEnglish("你以「普通组」身份注册 PeerReview。毕业要求：3 篇录用。"),
    "You registered on PeerReview as “Ordinary Lab”. Graduation requires three accepted papers.",
  );
  assert.equal(translateToEnglish(" 本轮投稿池 "), " Submission Pool ");
  assert.match(
    translateToEnglish(
      "你给大佬组论文打了 2 分。作者向大佬表达遗憾：大佬好感 −13。",
    ),
    /Powerbroker Favor −13/,
  );
  assert.match(
    translateToEnglish(
      "你的论文和我的工作很像，但你还没有引用我的论文。虽然双盲使你理论上不知道我是谁，我仍认为这体现了 related work 不充分，因此拒稿。",
    ),
    /haven't cited my paper/,
  );

  const dynamicMessages = [
    "ICML 2027 投稿完成，并同步挂上 arXiv，还请熟人 bid 了。",
    "第 2 轮 · 3 月：去 social，圈内好感 +12，大佬好感 −22，触发「你给大佬留下了坏印象」。",
    "你主动举报同行疑似 AutoResearch：举报成功：抓到批量科研痕迹；大佬好感 +12。",
    "你已有 6 篇录用，足够博士毕业，却还差 4 篇够到海优线。你拖着行李去下一站继续刷新随机种子。",
    "○ 2/3 位审稿人看出 AutoResearch 痕迹，但占比已达 85%，不再施加工具来源惩罚。",
    "大佬好感 +60 会改变公开身份的先验解释；但非学阀身份挂出后始终保留负先验与暴露风险。",
  ];
  for (const message of dynamicMessages) {
    const translated = translateToEnglish(message);
    assert.equal(containsChinese(translated), false, translated);
    assert.doesNotMatch(translated, /academic-system text/);
  }
});
