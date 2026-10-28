/* All calculations are independent of the DOM. PRNGs are for Monte Carlo, not cryptography. */
export const LIMITS = Object.freeze({
  n: 20000,
  m: 20000,
  operations: 100000000,
  paths: 8,
});
export function int(value, min, max, name = "Value") {
  if (String(value).trim() === "") throw Error(`${name} is required.`);
  const x = Number(value);
  if (!Number.isSafeInteger(x) || x < min || x > max)
    throw Error(`${name} must be an integer in [${min}, ${max}].`);
  return x;
}
export function validate(input) {
  const model = input.model;
  if (!["bernoulli", "rademacher"].includes(model))
    throw Error("Choose Bernoulli or Rademacher.");
  const n = int(input.n, 1, LIMITS.n, "Systems n"),
    m = int(input.m, 1, LIMITS.m, "Attackers m"),
    seed = int(input.seed, 0, 4294967295, "Seed");
  let p = model === "rademacher" ? 0.5 : Number(input.p);
  if (
    model === "bernoulli" &&
    (String(input.p).trim() === "" || !Number.isFinite(p) || p < 0 || p > 1)
  )
    throw Error("Probability p must be a number in [0, 1].");
  if (n * m > LIMITS.operations)
    throw Error("Use at most 100,000,000 increments (n × m). Reduce n or m.");
  return { model, n, m, p, seed };
}
export function theory(model, p = 0.5, n = 1) {
  if (!["bernoulli", "rademacher"].includes(model))
    throw Error("Unknown model.");
  const mu = model === "rademacher" ? 0 : p,
    sigma2 = model === "rademacher" ? 1 : p * (1 - p);
  return {
    mu,
    sigma2,
    total: { mean: n * mu, variance: n * sigma2 },
    average: { mean: mu, variance: sigma2 / n },
    normalized: { mean: mu * Math.sqrt(n), variance: sigma2 },
  };
}
export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}
export function moments(values) {
  let mean = 0,
    M2 = 0,
    n = 0;
  for (const value of values) {
    n++;
    const d = value - mean;
    mean += d / n;
    M2 += d * (value - mean);
  }
  return {
    count: n,
    mean: n ? mean : null,
    variance: n > 1 ? Math.max(0, M2 / (n - 1)) : null,
    populationVariance: n ? Math.max(0, M2 / n) : null,
  };
}
export function summary(totals, n) {
  const a = moments(totals);
  return {
    total: a,
    average: {
      ...a,
      mean: a.mean / n,
      variance: a.variance === null ? null : a.variance / n ** 2,
      populationVariance: a.populationVariance / n ** 2,
    },
    normalized: {
      ...a,
      mean: a.mean / Math.sqrt(n),
      variance: a.variance === null ? null : a.variance / n,
      populationVariance: a.populationVariance / n,
    },
  };
}
export function checkpoints(n, extra = []) {
  return [
    ...new Set(
      [10, 30, 100, 300, 1000, 3000, 5000, 10000, n, ...extra].filter(
        (x) => Number.isSafeInteger(x) && x >= 1 && x <= n,
      ),
    ),
  ].sort((a, b) => a - b);
}
export function* simulationSteps(input, options = {}) {
  const config = validate(input),
    { n, m, model, p, seed } = config,
    points = checkpoints(n, options.checkpoints || []),
    snapshots = points.map((t) => ({ n: t, totals: new Int32Array(m) })),
    byTime = new Map(snapshots.map((s) => [s.n, s]));
  const keep = Math.min(m, options.keepPaths ?? LIMITS.paths, LIMITS.paths),
    paths = Array.from({ length: keep }, (_, i) => ({
      attacker: i + 1,
      increments: new Int8Array(n),
      totals: new Int32Array(n + 1),
    })),
    rng = mulberry32(seed);
  let completed = 0,
    nextYield = 65536;
  for (let j = 0; j < m; j++) {
    let total = 0;
    for (let t = 1; t <= n; t++) {
      const u = rng(),
        x = model === "bernoulli" ? (u < p ? 1 : 0) : u < 0.5 ? 1 : -1;
      total += x;
      if (j < keep) {
        paths[j].increments[t - 1] = x;
        paths[j].totals[t] = total;
      }
      const snapshot = byTime.get(t);
      if (snapshot) snapshot.totals[j] = total;
      completed++;
      if (completed >= nextYield) {
        yield { completed, total: n * m };
        nextYield += 65536;
      }
    }
  }
  for (const s of snapshots) s.summary = summary(s.totals, s.n);
  return {
    config,
    paths,
    snapshots,
    totals: snapshots.at(-1).totals,
    summary: snapshots.at(-1).summary,
    completed,
    algorithm: "Mulberry32 / attacker-major / one uniform per increment",
  };
}
export function simulate(config, options) {
  const iterator = simulationSteps(config, options);
  for (;;) {
    const step = iterator.next();
    if (step.done) return step.value;
  }
}
export function wilson(success, total) {
  if (
    !Number.isInteger(success) ||
    !Number.isInteger(total) ||
    total < 1 ||
    success < 0 ||
    success > total
  )
    throw Error("Invalid binomial counts.");
  const z = 1.959963984540054,
    p = success / total,
    d = 1 + (z * z) / total,
    c = (p + (z * z) / (2 * total)) / d,
    h = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total ** 2))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}
export function binomialPMF(n, p) {
  int(n, 1, LIMITS.n, "n");
  if (!Number.isFinite(p) || p < 0 || p > 1) throw Error("Invalid p.");
  const out = new Float64Array(n + 1);
  if (p === 0) {
    out[0] = 1;
    return out;
  }
  if (p === 1) {
    out[n] = 1;
    return out;
  }
  const mode = Math.min(n, Math.floor((n + 1) * p));
  out[mode] = 1;
  for (let k = mode; k < n; k++)
    out[k + 1] = ((out[k] * (n - k)) / (k + 1)) * (p / (1 - p));
  for (let k = mode; k > 0; k--)
    out[k - 1] = ((out[k] * k) / (n - k + 1)) * ((1 - p) / p);
  let sum = 0;
  for (const v of out) sum += v;
  for (let k = 0; k <= n; k++) out[k] /= sum;
  return out;
}
export const totalToK = (s, n, model) =>
  model === "rademacher" ? (s + n) / 2 : s;
export const kToTotal = (k, n, model) =>
  model === "rademacher" ? 2 * k - n : k;
export function exactDeviation(n, model, p, epsilon) {
  const mu = theory(model, p).mu,
    pmf = binomialPMF(n, model === "rademacher" ? 0.5 : p);
  let sum = 0;
  for (let k = 0; k <= n; k++)
    if (
      Math.abs(kToTotal(k, n, model) - n * mu) >
      n * epsilon + 1e-12 * Math.max(1, n)
    )
      sum += pmf[k];
  return Math.min(1, sum);
}
export function llnRows(result, epsilon) {
  if (!Number.isFinite(epsilon) || epsilon <= 0)
    throw Error("Epsilon must be positive.");
  const { model, p, m } = result.config,
    { mu, sigma2 } = theory(model, p);
  return result.snapshots.map((s) => {
    let exceed = 0;
    for (const total of s.totals)
      if (Math.abs(total - s.n * mu) > s.n * epsilon + 1e-12 * Math.max(1, s.n))
        exceed++;
    return {
      n: s.n,
      m,
      mean: s.summary.average.mean,
      variance: s.summary.average.variance,
      theoreticalMean: mu,
      theoreticalVariance: sigma2 / s.n,
      exceed,
      probability: exceed / m,
      interval: wilson(exceed, m),
      exactProbability: exactDeviation(s.n, model, p, epsilon),
      chebyshev: Math.min(1, sigma2 / (s.n * epsilon ** 2)),
    };
  });
}
export const normalPDF = (x) => Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
// Abramowitz–Stegun 26.2.17: absolute CDF error below roughly 7.5e-8.
export function normalCDF(x) {
  if (x === Infinity) return 1;
  if (x === -Infinity) return 0;
  if (x === 0) return 0.5;
  const z = Math.abs(x),
    t = 1 / (1 + 0.2316419 * z);
  const tail =
    normalPDF(z) *
    t *
    (0.31938153 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x < 0 ? tail : 1 - tail;
}
export function cdfDistance(
  totals,
  n,
  model = "rademacher",
  p = 0.5,
  exact = false,
) {
  const { mu, sigma2 } = theory(model, p);
  if (!sigma2) return null;
  const counts = new Float64Array(n + 1);
  if (exact) counts.set(binomialPMF(n, model === "rademacher" ? 0.5 : p));
  else
    for (const s of totals) counts[totalToK(s, n, model)] += 1 / totals.length;
  let cumulative = 0,
    D = 0;
  for (let k = 0; k <= n; k++) {
    const x = (kToTotal(k, n, model) - n * mu) / Math.sqrt(n * sigma2),
      normal = normalCDF(x);
    D = Math.max(D, Math.abs(cumulative - normal));
    cumulative += counts[k];
    D = Math.max(D, Math.abs(cumulative - normal));
  }
  return D;
}
export function histSpec(totals, n, model, maxBins = 32) {
  let low = n,
    high = 0;
  for (const s of totals) {
    const k = totalToK(s, n, model);
    low = Math.min(low, k);
    high = Math.max(high, k);
  }
  const group = Math.max(1, Math.ceil((high - low + 1) / maxBins)),
    start = Math.max(0, low - group),
    end = Math.min(n, high + group);
  return { start, group, bins: Math.ceil((end - start + 1) / group) };
}
export function histogram(
  totals,
  n,
  model,
  p,
  quantity = "normalized",
  spec = null,
) {
  if (!["total", "average", "normalized", "standardized"].includes(quantity))
    throw Error("Unknown quantity.");
  const { mu, sigma2 } = theory(model, p);
  if (quantity === "standardized" && sigma2 === 0) return null;
  spec = spec ?? histSpec(totals, n, model);
  const { start, group, bins } = spec,
    counts = new Uint32Array(bins),
    pmf = binomialPMF(n, model === "rademacher" ? 0.5 : p);
  const scale =
      quantity === "total"
        ? 1
        : quantity === "average"
          ? 1 / n
          : quantity === "standardized"
            ? 1 / Math.sqrt(n * sigma2)
            : 1 / Math.sqrt(n),
    offset = quantity === "standardized" ? -n * mu * scale : 0,
    step = model === "rademacher" ? 2 : 1,
    width = step * group * scale;
  for (const s of totals) {
    const index = Math.floor((totalToK(s, n, model) - start) / group);
    if (index < 0 || index >= bins)
      throw Error("Histogram range excludes an observation.");
    counts[index]++;
  }
  const rows = Array.from({ length: bins }, (_, i) => {
    const k0 = start + i * group,
      k1 = k0 + group - 1,
      left = (kToTotal(k0, n, model) - step / 2) * scale + offset,
      right = left + width;
    let mass = 0;
    for (let k = k0; k <= Math.min(k1, n); k++) mass += pmf[k];
    return {
      left,
      right,
      center: (left + right) / 2,
      width,
      count: counts[i],
      density: counts[i] / (totals.length * width),
      exactDensity: mass / width,
      exactMass: mass,
    };
  });
  return {
    spec,
    rows,
    area: rows.reduce((a, r) => a + r.density * r.width, 0),
    observations: totals.length,
    quantity,
    discrete: true,
  };
}
export function samplingRows(result, sizes = [50, 100, 500, 1000, 5000]) {
  const { n, model, p } = result.config,
    pmf = binomialPMF(n, model === "rademacher" ? 0.5 : p),
    sigma2 = theory(model, p).sigma2;
  return sizes
    .filter((m) => m <= result.totals.length)
    .map((m) => {
      const values = result.totals.slice(0, m),
        s = summary(values, n),
        freq = new Uint32Array(n + 1);
      for (const v of values) freq[totalToK(v, n, model)]++;
      let tv = 0;
      for (let k = 0; k <= n; k++) tv += Math.abs(freq[k] / m - pmf[k]);
      return {
        m,
        mean: s.normalized.mean,
        variance: s.normalized.variance,
        meanSE: Math.sqrt(sigma2 / m),
        totalVariation: tv / 2,
      };
    });
}
export function csvFinal(result) {
  const { model, n, m, p, seed } = result.config;
  return (
    [
      "model,n,m,p,seed,attacker,total_score,average_score,normalized_score",
      ...Array.from(result.totals, (s, i) =>
        [model, n, m, p, seed, i + 1, s, s / n, s / Math.sqrt(n)].join(","),
      ),
    ].join("\n") + "\n"
  );
}
export function csvSweep(result, epsilon) {
  const { model, m, p, seed } = result.config;
  return (
    [
      "model,n,m,p,seed,epsilon,attacker,total_score,average_score,normalized_score",
      ...result.snapshots.flatMap((s) =>
        Array.from(s.totals, (value, i) =>
          [
            model,
            s.n,
            m,
            p,
            seed,
            epsilon,
            i + 1,
            value,
            value / s.n,
            value / Math.sqrt(s.n),
          ].join(","),
        ),
      ),
    ].join("\n") + "\n"
  );
}
