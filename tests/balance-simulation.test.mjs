import assert from "node:assert/strict";
import test from "node:test";
import { simulateBalance } from "../scripts/simulate-balance.mjs";

test("balance simulation is deterministic for a fixed seed", () => {
  const first = simulateBalance({ seed: "reviewer-2", runs: 1500, semesters: [1, 18] });
  const second = simulateBalance({ seed: "reviewer-2", runs: 1500, semesters: [1, 18] });
  assert.deepEqual(first, second);
});

test("low-score acceptance remains a rare exception", () => {
  const report = simulateBalance({ seed: "low-score-audit", runs: 12000, semesters: [10] });
  for (const result of report.results) {
    const maximum = result.origin === "dynasty" ? 11 : 4;
    assert.ok(
      result.lowScoreAcceptanceRate <= maximum,
      `${result.origin}/${result.method} low-score acceptance was ${result.lowScoreAcceptanceRate}%`,
    );
  }
});
