import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import {
  validate,
  theory,
  mulberry32,
  moments,
  summary,
  simulate,
  simulationSteps,
  binomialPMF,
  exactDeviation,
  llnRows,
  histogram,
  histSpec,
  cdfDistance,
  normalCDF,
  normalPDF,
  samplingRows,
  csvFinal,
  csvSweep,
  wilson,
} from "../js/core.js";
let assertions = 0;
const checks = [],
  started = performance.now();
const ok = (x, msg) => {
  assert.ok(x, msg);
  assertions++;
};
const eq = (a, b) => {
  assert.deepEqual(a, b);
  assertions++;
};
const close = (a, b, tol = 1e-10) => ok(Math.abs(a - b) <= tol, `${a} != ${b}`);
const bad = (fn) => {
  assert.throws(fn);
  assertions++;
};
const base = { model: "rademacher", n: 100, m: 1000, p: 0.5, seed: 20261028 };
for (const input of [
  { n: 0 },
  { n: 1.1 },
  { m: 0 },
  { m: 20001 },
  { n: 20001 },
  { seed: -1 },
  { seed: 4294967296 },
  { n: " " },
  { model: "invalid" },
  { n: 20000, m: 20000 },
])
  bad(() => validate({ ...base, ...input }));
for (const p of [-0.1, 1.1, NaN, ""])
  bad(() => validate({ ...base, model: "bernoulli", p }));
eq(validate({ ...base, p: "ignored" }).p, 0.5);
checks.push(
  "Parameter validation: integer ranges, seed bounds, invalid model/probabilities and 100-million-increment cap.",
);
for (const p of [0, 1]) {
  const r = simulate({ ...base, model: "bernoulli", n: 1000, m: 50, p });
  for (const s of r.totals) eq(s, p * 1000);
  for (const path of r.paths) for (const x of path.increments) eq(x, p);
  eq(r.summary.total.variance, 0);
  eq(r.summary.normalized.variance, 0);
  for (const row of llnRows(r, 0.1)) eq(row.exceed, 0);
  for (const q of ["total", "average", "normalized"]) {
    const h = histogram(r.totals, 1000, "bernoulli", p, q);
    close(h.area, 1);
    ok(h.rows.every((b) => Number.isFinite(b.density)));
  }
}
checks.push(
  "Bernoulli p=0 and p=1: all increments, final scores, zero variances, zero deviations and density areas.",
);
for (const model of ["bernoulli", "rademacher"]) {
  const r = simulate({ ...base, model, n: 301, m: 45 });
  for (const path of r.paths) {
    let sum = 0;
    eq(path.totals[0], 0);
    for (let i = 0; i < 301; i++) {
      const x = path.increments[i];
      ok(model === "bernoulli" ? x === 0 || x === 1 : x === -1 || x === 1);
      sum += x;
      eq(path.totals[i + 1], sum);
    }
    eq(sum, r.totals[path.attacker - 1]);
  }
  if (model === "rademacher")
    for (const s of r.totals) {
      eq((s + 301) % 2, 0);
      ok(Math.abs(s) <= 301);
    }
  eq(r, simulate({ ...base, model, n: 301, m: 45 }));
  const bigger = simulate({ ...base, model, n: 301, m: 100 });
  eq(r.totals, bigger.totals.slice(0, 45));
  eq(r, simulate({ ...base, model, n: 301, m: 45 }, { keepPaths: 8 }));
}
checks.push(
  "Path integrity: allowed increment support, cumulative sums, endpoints, Rademacher parity, exact seeded repeatability and nested-m prefixes.",
);
const a = mulberry32(0),
  b = mulberry32(0);
for (let i = 0; i < 1000; i++) {
  const x = a();
  eq(x, b());
  ok(x >= 0 && x < 1);
}
eq(moments([1, 2, 3]).mean, 2);
eq(moments([1, 2, 3]).variance, 1);
eq(moments([5]).variance, null);
eq(simulate({ ...base, n: 1, m: 1 }).summary.total.variance, null);
checks.push(
  "PRNG determinism and [0,1) support; Welford moments and m=1 undefined sample variance.",
);
function choose(n, k) {
  let v = 1;
  for (let i = 1; i <= k; i++) v *= (n - i + 1) / i;
  return v;
}
for (const n of [1, 2, 3, 10, 30])
  for (const p of [0, 0.1, 0.5, 0.8, 1]) {
    const pmf = binomialPMF(n, p);
    close(
      pmf.reduce((a, b) => a + b, 0),
      1,
    );
    for (let k = 0; k <= n; k++)
      close(pmf[k], choose(n, k) * p ** k * (1 - p) ** (n - k), 1e-12);
    close(
      pmf.reduce((a, v, k) => a + v * k, 0),
      n * p,
    );
    close(
      pmf.reduce((a, v, k) => a + v * (k - n * p) ** 2, 0),
      n * p * (1 - p),
    );
  }
for (const p of [1e-6, 0.5, 0.999999]) {
  const pmf = binomialPMF(20000, p);
  ok(pmf.every((x) => Number.isFinite(x) && x >= 0));
  close(
    pmf.reduce((a, b) => a + b, 0),
    1,
    1e-12,
  );
  close(
    pmf.reduce((a, v, k) => a + v * k, 0),
    20000 * p,
    1e-7,
  );
}
checks.push(
  "Finite-n exact law: PMF recurrence checked independently against binomial coefficients; normalization, mean and variance; stable n=20,000 rare-event cases.",
);
for (const model of ["bernoulli", "rademacher"])
  for (const n of [1, 10, 100, 1000]) {
    const th = theory(model, 0.3, n);
    close(th.total.variance, n * th.sigma2);
    close(th.average.variance, th.sigma2 / n);
    close(th.normalized.variance, th.sigma2);
    close(th.normalized.mean, th.mu * Math.sqrt(n));
  }
eq(theory("rademacher", 0.9, 1000).normalized, { mean: 0, variance: 1 });
const r = simulate({ ...base, n: 1000, m: 2000 });
for (const s of r.snapshots) {
  const momentsRaw = moments(s.totals);
  close(s.summary.average.variance, momentsRaw.variance / s.n ** 2);
  close(s.summary.normalized.variance, momentsRaw.variance / s.n);
  for (const q of ["total", "average", "normalized"]) {
    const h = histogram(s.totals, s.n, "rademacher", 0.5, q);
    close(h.area, 1, 1e-12);
    eq(
      h.rows.reduce((a, b) => a + b.count, 0),
      2000,
    );
    for (const bin of h.rows)
      close(bin.density, bin.count / (2000 * bin.width));
  }
}
checks.push(
  "All mean/variance scaling identities and data-derived histogram areas/counts/densities at every checkpoint.",
);
close(exactDeviation(10, "bernoulli", 0.5, 0.1), 0.34375, 1e-12);
close(exactDeviation(10, "rademacher", 0.5, 0.2), 0.34375, 1e-12);
const boundary = {
  config: { model: "bernoulli", p: 0.5, m: 3 },
  snapshots: [
    {
      n: 10,
      totals: Int32Array.of(4, 5, 6),
      summary: summary(Int32Array.of(4, 5, 6), 10),
    },
  ],
};
eq(llnRows(boundary, 0.1)[0].exceed, 0);
for (const model of ["rademacher", "bernoulli"])
  for (const n of [10, 30, 100, 300, 1000])
    for (const epsilon of [0.01, 0.1, 0.3]) {
      const variance = theory(model, 0.2).sigma2;
      ok(
        exactDeviation(n, model, 0.2, epsilon) <=
          Math.min(1, variance / (n * epsilon ** 2)) + 1e-12,
      );
    }
ok(wilson(0, 100)[1] > 0);
ok(wilson(100, 100)[0] < 1);
checks.push(
  "Strict epsilon boundary, independently known exact tail probabilities, Chebyshev bounds, Wilson boundary uncertainty.",
);
close(normalPDF(0), 1 / Math.sqrt(2 * Math.PI));
close(normalCDF(0), 0.5);
close(normalCDF(1.959963984540054), 0.975, 8e-8);
close(normalCDF(-1.959963984540054), 0.025, 8e-8);
close(normalCDF(-8), 1 - normalCDF(8), 1e-15);
ok(
  cdfDistance([], 1000, "rademacher", 0.5, true) <
    cdfDistance([], 10, "rademacher", 0.5, true),
);
close(cdfDistance([], 1, "rademacher", 0.5, true), 0.341344746, 1e-7);
checks.push(
  "Normal PDF/CDF reference values, both sides of discrete CDF jumps, decreasing endpoint exact-normal gap.",
);
const stats = [];
for (const model of ["bernoulli", "rademacher"]) {
  const result = simulate({ ...base, model, n: 1000, m: 5000 });
  const th = theory(model, 0.5, 1000),
    e = result.summary.normalized,
    meanSE = Math.sqrt(th.normalized.variance / 5000),
    sigma2 = th.sigma2,
    mu4 =
      model === "rademacher"
        ? 3 - 2 / 1000
        : 3 * sigma2 ** 2 + (sigma2 / 1000) * (1 - 6 * sigma2),
    varianceSE = Math.sqrt(
      (mu4 - ((5000 - 3) / (5000 - 1)) * sigma2 ** 2) / 5000,
    );
  ok(Math.abs(e.mean - th.normalized.mean) < 6 * meanSE);
  ok(Math.abs(e.variance - sigma2) < 8 * varianceSE);
  const rows = llnRows(result, 0.1);
  ok(rows.at(-1).variance < rows[0].variance);
  for (const row of rows) {
    const expected = row.exactProbability,
      se = Math.sqrt((expected * (1 - expected)) / 5000);
    ok(Math.abs(row.probability - expected) < 7 * se + 3 / 5000);
  }
  stats.push({
    model,
    normalizedMean: e.mean,
    theoreticalMean: th.normalized.mean,
    normalizedVariance: e.variance,
    theoreticalVariance: sigma2,
    meanSE,
    varianceSE,
  });
}
checks.push(
  "Statistical tests (fixed seed): empirical means within 6 Monte Carlo SE, sample variances within 8 exact variance-estimator SE; tail frequencies within predeclared uncertainty tolerances.",
);
const small = simulate({ ...base, n: 30, m: 50 }, { keepPaths: 2 });
eq(csvFinal(small).trim().split("\n").length, 51);
ok(csvFinal(small).startsWith("model,n,m,p,seed,"));
for (const line of csvFinal(small).trim().split("\n").slice(1)) {
  const fields = line.split(",");
  eq(fields[0], "rademacher");
  eq(Number(fields[4]), base.seed);
}
const csv = csvSweep(small, 0.1);
eq(csv.trim().split("\n").length, small.snapshots.length * 50 + 1);
const spec = histSpec(r.totals, 1000, "rademacher");
for (const m of [50, 100, 500, 1000, 2000])
  close(
    histogram(r.totals.slice(0, m), 1000, "rademacher", 0.5, "normalized", spec)
      .area,
    1,
    1e-12,
  );
const sampling = samplingRows(r, [50, 500, 2000]);
sampling.forEach((row) => close(row.meanSE, 1 / Math.sqrt(row.m)));
const iter = simulationSteps({ ...base, n: 1000, m: 1000 });
const progress = iter.next();
ok(!progress.done && progress.value.completed === 65536);
checks.push(
  "CSV contains parameters, seed and every attacker; nested-m fixed-bin histograms; correct Monte Carlo SE; generator emits chunk progress.",
);
const fixture = {};
for (const model of ["bernoulli", "rademacher"]) {
  const result = simulate({ ...base, model, n: 30, m: 50 }, { keepPaths: 2 });
  fixture[model] = {
    config: result.config,
    totals: Array.from(result.totals),
    firstPath: Array.from(result.paths[0].increments),
    summary: result.summary,
  };
}
await writeFile(
  new URL("../results/browser-fixture.json", import.meta.url),
  JSON.stringify(fixture, null, 2) + "\n",
);
const report = {
  status: "passed",
  assertions,
  checks,
  statisticalChecks: stats,
  elapsedMs: performance.now() - started,
  runtime: process.version,
  generatedAt: new Date().toISOString(),
};
await writeFile(
  new URL("../results/math-tests.json", import.meta.url),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
