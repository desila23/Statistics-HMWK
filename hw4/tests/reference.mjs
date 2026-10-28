import {
  simulate,
  llnRows,
  theory,
  cdfDistance,
  samplingRows,
} from "../js/core.js";
import { writeFile } from "node:fs/promises";
const cases = [];
for (const model of ["rademacher", "bernoulli"]) {
  const result = simulate(
    { model, n: 1000, m: 5000, p: 0.5, seed: 20261028 },
    { keepPaths: 0 },
  );
  cases.push({
    config: result.config,
    incrementTheory: theory(model, 0.5),
    lln: llnRows(result, 0.1),
    checkpoints: result.snapshots.map((s) => ({
      n: s.n,
      summary: s.summary,
      exactCDFGap: cdfDistance([], s.n, model, 0.5, true),
      empiricalCDFGap: cdfDistance(s.totals, s.n, model, 0.5),
    })),
  });
}
const clt = simulate(
  { model: "rademacher", n: 1000, m: 5000, p: 0.5, seed: 20261030 },
  { keepPaths: 0 },
);
const sampling = simulate(
  { model: "rademacher", n: 100, m: 5000, p: 0.5, seed: 20261031 },
  { keepPaths: 0 },
);
const report = {
  generatedAt: new Date().toISOString(),
  runtime: process.version,
  description:
    "All results calculated by the shipped engine. No values are hard-coded into UI charts.",
  cases,
  clt: {
    config: clt.config,
    rows: clt.snapshots
      .filter((s) => [10, 30, 100, 1000].includes(s.n))
      .map((s) => ({
        n: s.n,
        mean: s.summary.normalized.mean,
        variance: s.summary.normalized.variance,
        exactCDFGap: cdfDistance([], s.n, "rademacher", 0.5, true),
        empiricalCDFGap: cdfDistance(s.totals, s.n),
      })),
  },
  sampling: { config: sampling.config, rows: samplingRows(sampling) },
};
await writeFile(
  new URL("../results/reference.json", import.meta.url),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
