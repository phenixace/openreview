import { pathToFileURL } from "node:url";

const ORIGINS = {
  dynasty: { base: 8 },
  ordinary: { base: 0 },
  wild: { base: -7 },
};

function hashSeed(seed) {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRandom(seed) {
  let state = hashSeed(String(seed));
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function simulatePaperDecision({ random, originKey, method, semester }) {
  const origin = ORIGINS[originKey];
  const autoShare = clamp(18 + (semester - 1) * 5, 18, 90);
  const autoResearchNormalized = autoShare >= 80;
  const quality = method === "manual" ? randomInt(random, 46, 86) : randomInt(random, 26, 84);
  const novelty = method === "manual" ? randomInt(random, 38, 84) : randomInt(random, 28, 96);
  const rigor = method === "manual" ? randomInt(random, 52, 90) : randomInt(random, 18, 72);
  const aiSmell = method === "manual" ? randomInt(random, 2, 20) : randomInt(random, 70, 99);
  const reviewerDetectionChance = clamp(aiSmell - 84 + autoShare * 0.08, 1, 55);
  const detectedBy = [0, 1, 2].filter(
    () => randomInt(random, 1, 100) <= reviewerDetectionChance,
  ).length;
  const smellPenalty = autoResearchNormalized ? 0 : detectedBy * -8;
  const composite =
    quality * 0.35 +
    novelty * 0.29 +
    rigor * 0.25 +
    origin.base +
    2 +
    smellPenalty;
  const rankPercentile = clamp(
    Math.round(104 - composite + autoShare * 0.09 + randomInt(random, -15, 16)),
    1,
    99,
  );
  const acceptedRate = randomInt(random, 28, 32);
  const nearCutoff = rankPercentile <= acceptedRate + 14;
  const strictTop = rankPercentile <= acceptedRate;
  const eliteRescue = originKey === "dynasty" ? 10 : 0;
  const fuzzyProbability = strictTop ? 48 : nearCutoff ? 18 : 3;
  const probability = clamp(
    fuzzyProbability +
      eliteRescue +
      (quality - 65) * 0.15 -
      (autoResearchNormalized ? 0 : detectedBy * 5) -
      randomInt(random, -9, 5),
    3,
    82,
  );
  const sampledAccepted = randomInt(random, 1, 100) <= probability;
  const centerBase = Math.round(composite / 13);
  const center = clamp(centerBase + randomInt(random, -1, 1), 2, 9);
  const scores = [
    clamp(center + randomInt(random, -2, 1), 1, 10),
    clamp(center + randomInt(random, -1, 2), 1, 10),
    clamp(center + randomInt(random, -2, 2), 1, 10),
  ];
  const scoreAverage = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const allPositiveScores = scores.every((score) => score >= 5);
  const lowScorePanel = scoreAverage < 5;
  const veryLowScorePanel = scoreAverage < 4;
  const lowScoreRescueProbability = veryLowScorePanel
    ? originKey === "dynasty" ? 5 : 1
    : originKey === "dynasty" ? 10 : 3;
  const lowScoreRescue =
    lowScorePanel && randomInt(random, 1, 100) <= lowScoreRescueProbability;
  const positiveScoresOverruled =
    allPositiveScores && randomInt(random, 1, 100) <= 20;
  const accepted = allPositiveScores
    ? !positiveScoresOverruled
    : lowScorePanel
      ? lowScoreRescue
      : sampledAccepted;

  return {
    accepted,
    allPositiveScores,
    lowScorePanel,
    scoreAverage,
  };
}

export function simulateBalance({
  seed = "reviewer-2",
  runs = 5000,
  semesters = [1, 10, 18],
} = {}) {
  const results = [];
  for (const originKey of Object.keys(ORIGINS)) {
    for (const method of ["manual", "auto"]) {
      for (const semester of semesters) {
        const random = createSeededRandom(`${seed}:${originKey}:${method}:${semester}`);
        let accepted = 0;
        let lowScorePanels = 0;
        let lowScoreAccepted = 0;
        let positivePanels = 0;
        let scoreTotal = 0;
        for (let index = 0; index < runs; index += 1) {
          const decision = simulatePaperDecision({ random, originKey, method, semester });
          accepted += Number(decision.accepted);
          lowScorePanels += Number(decision.lowScorePanel);
          lowScoreAccepted += Number(decision.lowScorePanel && decision.accepted);
          positivePanels += Number(decision.allPositiveScores);
          scoreTotal += decision.scoreAverage;
        }
        results.push({
          origin: originKey,
          method,
          semester,
          runs,
          acceptanceRate: Number((accepted / runs * 100).toFixed(2)),
          lowScorePanelRate: Number((lowScorePanels / runs * 100).toFixed(2)),
          lowScoreAcceptanceRate: Number(
            (lowScoreAccepted / Math.max(1, lowScorePanels) * 100).toFixed(2),
          ),
          positivePanelRate: Number((positivePanels / runs * 100).toFixed(2)),
          averageScore: Number((scoreTotal / runs).toFixed(2)),
        });
      }
    }
  }
  return { seed, runs, results };
}

function readArgument(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find((argument) => argument.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const seed = readArgument("seed", "reviewer-2");
  const runs = Number(readArgument("runs", "5000"));
  const report = simulateBalance({ seed, runs });
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`PeerReview balance simulation · seed=${report.seed} · runs/scenario=${report.runs}`);
    console.table(report.results);
  }
}
