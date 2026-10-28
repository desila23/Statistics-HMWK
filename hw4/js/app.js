import {
  validate,
  int,
  theory,
  llnRows,
  histSpec,
  moments,
  summary,
  cdfDistance,
  samplingRows,
  csvFinal,
  csvSweep,
} from "./core.js";
import {
  plot,
  lineDataset,
  pathPlot,
  densityPlot,
  refreshTheme,
} from "./charts.js";
const $ = (id) => document.getElementById(id),
  state = {
    lab: null,
    comparison: null,
    sweep: null,
    clt: null,
    sampling: null,
  },
  jobs = new Map();
const number = (x) =>
    x === null || x === undefined
      ? "—"
      : Math.abs(x) > 0 && Math.abs(x) < 0.0001
        ? x.toExponential(3)
        : Number(x).toLocaleString("en-US", { maximumFractionDigits: 5 }),
  percent = (x) => (x * 100).toFixed(2) + "%",
  modelName = (model) => (model === "rademacher" ? "Rademacher" : "Bernoulli");
const labels = { total: "Sₙ", average: "Sₙ/n", normalized: "Sₙ/√n" };
function status(area, text, error = false) {
  $(area + "-status").textContent = text;
  $(area + "-status").classList.toggle("error", error);
}
function describe(c) {
  return `${modelName(c.model)}${c.model === "bernoulli" ? `(p = ${c.p})` : ""} · n = ${number(c.n)} · m = ${number(c.m)} · seed ${c.seed}`;
}
function save(name, content, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([content], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function setBusy(area, busy) {
  $(area + "-run").disabled = busy;
  $(area + "-stop").disabled = !busy;
}
function stop(area, quiet = false) {
  const job = jobs.get(area);
  if (job) {
    job.worker.terminate();
    jobs.delete(area);
    setBusy(area, false);
    if (!quiet)
      status(
        area,
        "Stopped. Partial paths are discarded; the last completed results stay visible.",
      );
  }
}
function launch(area, input, done, options = {}) {
  let config;
  try {
    config = validate(input);
  } catch (error) {
    status(area, error.message, true);
    return;
  }
  stop(area, true);
  setBusy(area, true);
  $(area + "-progress").value = 0;
  status(
    area,
    `Simulating ${number(config.n * config.m)} increments · ${describe(config)}…`,
  );
  let worker;
  try {
    worker = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });
  } catch (error) {
    setBusy(area, false);
    status(area, error.message, true);
    return;
  }
  const job = { worker, config };
  jobs.set(area, job);
  worker.onmessage = ({ data }) => {
    if (jobs.get(area) !== job) return;
    if (data.type === "progress") {
      $(area + "-progress").value = (data.completed / data.total) * 100;
      status(
        area,
        `${((data.completed / data.total) * 100).toFixed(0)}% · ${number(data.completed)} / ${number(data.total)} increments`,
      );
      return;
    }
    worker.terminate();
    jobs.delete(area);
    setBusy(area, false);
    if (data.type === "error") {
      status(area, data.message, true);
      return;
    }
    $(area + "-progress").value = 100;
    try {
      done(data.result);
      status(
        area,
        `Completed · ${describe(data.result.config)} · worker wall time ${number(Math.round(data.result.elapsedMs))} ms${config.m < 500 ? " · Small ensemble: estimates can be noisy." : ""}`,
      );
    } catch (error) {
      status(area, "Result display failed: " + error.message, true);
      console.error(error);
    }
  };
  worker.onerror = (e) => {
    worker.terminate();
    jobs.delete(area);
    setBusy(area, false);
    status(area, "Worker error: " + e.message, true);
  };
  worker.postMessage({
    config,
    checkpoints: options.checkpoints || [],
    keepPaths: options.keepPaths ?? 8,
  });
}
for (const area of ["lab", "sweep", "clt", "sampling"]) {
  $(area + "-stop").onclick = () => stop(area);
  for (const el of $(area + "-form").querySelectorAll("input,select"))
    el.addEventListener("input", () => {
      if (state[area])
        status(
          area,
          "Inputs changed. Displayed charts retain the parameters of the last completed run until you rerun.",
        );
    });
}
function read(area, n = null, m = null) {
  return {
    model: $(area + "-model")?.value || "rademacher",
    n: n ?? $(area + "-n").value,
    m: m ?? $(area + "-m").value,
    p: $(area + "-p")?.value ?? 0.5,
    seed: $(area + "-seed").value,
  };
}
for (const area of ["lab", "sweep", "sampling"]) {
  $(area + "-model").addEventListener("change", () => {
    $(area + "-p-field").hidden = $(area + "-model").value !== "bernoulli";
  });
}
function runLab() {
  launch("lab", read("lab"), (result) => {
    state.lab = result;
    state.comparison = null;
    renderLab();
  });
}
$("lab-form").onsubmit = (e) => {
  e.preventDefault();
  runLab();
};
function renderLab() {
  const r = state.lab,
    c = r.config,
    t = theory(c.model, c.p, c.n);
  $("lab-active").textContent = modelName(c.model).toUpperCase();
  $("lab-description").textContent =
    describe(c) + ` · ${number(c.n * c.m)} generated increments`;
  pathPlot("paths-chart", r, "total", state.comparison);
  pathPlot("averages-chart", r, "average", state.comparison);
  $("paths-note").textContent = state.comparison
    ? "Four paths per model; B = Bernoulli, R = Rademacher. Same seed pairs the uniforms across models; paths within each model follow separate sequences."
    : `${r.paths.length} of ${number(c.m)} attackers shown. Each makes ${number(c.n)} attempts. Display uses at most about 450 coordinates per path; all steps are available in the path export.`;
  $("averages-note").textContent = state.comparison
    ? `Original: ${describe(c)}. Comparison: ${modelName(state.comparison.config.model)}${state.comparison.config.model === "bernoulli" ? `(p=${state.comparison.config.p})` : ""}. Cross-model curves are paired, not independent.`
    : `Reference μ = ${number(t.mu)}. Early averages fluctuate strongly; the LLN does not require a monotone approach to μ.`;
  for (const quantity of ["total", "average", "normalized"]) {
    densityPlot(quantity + "-chart", r.totals, c.n, c.model, c.p, quantity, {
      reference: t[quantity].mean,
    });
    $(quantity + "-note").textContent =
      `${labels[quantity]} · mean ${number(r.summary[quantity].mean)} (theory ${number(t[quantity].mean)}) · variance ${number(r.summary[quantity].variance)} (theory ${number(t[quantity].variance)}). Dotted line: theoretical mean.${t.sigma2 === 0 ? " Degenerate law: all attackers have the same score." : ""}`;
  }
  $("lab-summary").innerHTML = ["total", "average", "normalized"]
    .map((q) => {
      const e = r.summary[q],
        a = t[q];
      return `<tr><th>${labels[q]}</th><td>${number(e.mean)}</td><td>${number(a.mean)}</td><td>${number(e.mean - a.mean)}</td><td>${number(e.variance)}</td><td>${number(a.variance)}</td><td>${number(e.variance === null ? null : e.variance - a.variance)}</td></tr>`;
    })
    .join("");
  $("inspect-path").innerHTML = r.paths
    .map((path, i) => `<option value="${i}">Attacker ${path.attacker}</option>`)
    .join("");
  $("inspect-step").max = c.n;
  $("inspect-step").value = Math.min(
    c.n,
    Math.max(1, Number($("inspect-step").value) || 1),
  );
  inspectPath();
  $("lab-export").disabled = false;
  $("lab-compare").disabled = false;
}
$("lab-compare").onclick = () => {
  if (!state.lab) return;
  const original = state.lab,
    c = original.config,
    other = {
      ...c,
      model: c.model === "rademacher" ? "bernoulli" : "rademacher",
      p: $("lab-p").value,
    };
  launch("lab", other, (result) => {
    if (state.lab !== original) return;
    state.comparison = result;
    renderLab();
  });
};
$("lab-new-seed").onclick = () => {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  $("lab-seed").value = a[0];
  status(
    "lab",
    "New seed selected. Run Simulation to generate a new ensemble.",
  );
};
$("lab-reset").onclick = () => {
  stop("lab", true);
  $("lab-form").reset();
  $("lab-p-field").hidden = true;
  runLab();
};
$("lab-export").onclick = () => {
  if (state.lab)
    save(
      `hw4-lab-${state.lab.config.model}-seed-${state.lab.config.seed}.csv`,
      csvFinal(state.lab),
    );
};
function inspectPath() {
  if (!state.lab) return;
  try {
    const i = int(
        $("inspect-path").value,
        0,
        state.lab.paths.length - 1,
        "Attacker",
      ),
      t = int($("inspect-step").value, 1, state.lab.config.n, "Step"),
      path = state.lab.paths[i],
      s = path.totals[t];
    $("inspect-output").textContent =
      `Attacker ${path.attacker} · step ${t}: Xₜ = ${path.increments[t - 1]}, Sₜ = ${s}, Sₜ/t = ${number(s / t)}, Sₜ/√t = ${number(s / Math.sqrt(t))}`;
  } catch (error) {
    $("inspect-output").textContent = error.message;
  }
}
$("inspect-run").onclick = inspectPath;
$("inspect-path").onchange = inspectPath;
$("path-export").onclick = () => {
  if (!state.lab) return;
  const r = state.lab,
    path = r.paths[Number($("inspect-path").value)],
    c = r.config,
    lines = [
      "model,n,m,p,seed,attacker,step,increment,total,average,normalized",
    ];
  for (let t = 1; t <= c.n; t++)
    lines.push(
      [
        c.model,
        c.n,
        c.m,
        c.p,
        c.seed,
        path.attacker,
        t,
        path.increments[t - 1],
        path.totals[t],
        path.totals[t] / t,
        path.totals[t] / Math.sqrt(t),
      ].join(","),
    );
  save(`hw4-path-${path.attacker}-seed-${c.seed}.csv`, lines.join("\n") + "\n");
};
function epsilon() {
  const e = Number($("sweep-epsilon").value);
  if (!Number.isFinite(e) || e < 0.001 || e > 2)
    throw Error("Epsilon must be in [0.001, 2].");
  return e;
}
function runSweep() {
  try {
    epsilon();
    launch(
      "sweep",
      read("sweep"),
      (result) => {
        state.sweep = result;
        renderSweep();
      },
      { keepPaths: 0 },
    );
  } catch (error) {
    status("sweep", error.message, true);
  }
}
$("sweep-form").onsubmit = (e) => {
  e.preventDefault();
  runSweep();
};
$("sweep-epsilon").addEventListener("input", () => {
  if (!state.sweep) return;
  try {
    renderSweep();
    status(
      "sweep",
      `Deviation frequencies recalculated for ε = ${epsilon()} using the completed run: ${describe(state.sweep.config)}.`,
    );
  } catch (error) {
    status("sweep", error.message, true);
  }
});
function renderSweep() {
  const r = state.sweep,
    c = r.config,
    e = epsilon(),
    rows = llnRows(r, e),
    t = theory(c.model, c.p),
    xs = rows.map((x) => x.n);
  plot(
    "lln-mean-chart",
    [
      lineDataset(
        "Mean across attacker averages",
        rows.map((x) => ({ x: x.n, y: x.mean })),
        "teal",
      ),
      lineDataset(
        "Theoretical μ",
        xs.map((x) => ({ x, y: t.mu })),
        "violet",
        { borderDash: [5, 4], pointRadius: 0 },
      ),
    ],
    "Systems n · logarithmic scale",
    "Ensemble mean of Sₙ/n",
    { x: { type: "logarithmic" } },
  );
  plot(
    "deviation-chart",
    [
      lineDataset(
        "Empirical deviation frequency",
        rows.map((x) => ({ x: x.n, y: x.probability })),
        "teal",
      ),
      lineDataset(
        "Exact finite-n probability",
        rows.map((x) => ({ x: x.n, y: x.exactProbability })),
        "violet",
        { borderDash: [5, 3], pointRadius: 2 },
      ),
      lineDataset(
        "Chebyshev upper bound",
        rows.map((x) => ({ x: x.n, y: x.chebyshev })),
        "gold",
        { borderDash: [3, 3], pointRadius: 2 },
      ),
    ],
    "Systems n · logarithmic scale",
    "Probability of |Sₙ/n − μ| > ε",
    { x: { type: "logarithmic" }, y: { min: 0, max: 1 } },
  );
  $("lln-mean-note").textContent =
    `${describe(c)}. This mean is an ensemble estimator; convergence of individual averages is evaluated through their dispersion and deviation frequency.`;
  $("lln-deviation-note").textContent =
    `Strict deviation > ${e}; μ = ${number(t.mu)}. Bounds are capped at 1. A measured zero has nonzero Monte Carlo uncertainty.`;
  $("lln-table").innerHTML = rows
    .map(
      (x) =>
        `<tr><th>${number(x.n)}</th><td>${number(x.mean)}</td><td>${number(x.variance)}</td><td>${x.exceed} / ${x.m}</td><td>${percent(x.probability)}</td><td>${percent(x.interval[0])}–${percent(x.interval[1])}</td><td>${number(x.exactProbability)}</td><td>${number(x.chebyshev)}</td></tr>`,
    )
    .join("");
  const first = rows[0],
    last = rows.at(-1);
  const interpretation = `${modelName(c.model)}${c.model === "bernoulli" ? `(p=${c.p})` : ""}, m = ${number(c.m)}, seed ${c.seed}: the observed deviation frequency at ε = ${e} was ${percent(first.probability)} for n = ${first.n} and ${percent(last.probability)} for n = ${number(last.n)}. The sample variance of the average changed from ${number(first.variance)} to ${number(last.variance)}, compared with theoretical values ${number(first.theoreticalVariance)} and ${number(last.theoreticalVariance)}. The exact deviation probability at the final n is ${number(last.exactProbability)}. Finite-sample fluctuations can interrupt a decreasing empirical trend; simulation illustrates rather than proves the LLN.`;
  $("lln-interpretation").textContent = interpretation;
  $("conclusion-lln").textContent = interpretation;
  for (const q of ["total", "average", "normalized"]) {
    plot(
      `variance-${q}-chart`,
      [
        lineDataset(
          "Theory",
          r.snapshots.map((s) => ({
            x: s.n,
            y: theory(c.model, c.p, s.n)[q].variance,
          })),
          "violet",
          { pointRadius: 0 },
        ),
        lineDataset(
          "Sample variance",
          r.snapshots.map((s) => ({ x: s.n, y: s.summary[q].variance })),
          "teal",
          { showLine: false, pointRadius: 4, borderWidth: 0 },
        ),
      ],
      "Systems n · log scale",
      `Variance of ${labels[q]}`,
      { x: { type: "logarithmic" }, y: { beginAtZero: true } },
    );
  }
  $("variance-note").textContent =
    `Source: ${describe(c)}. Increment variance σ² = ${number(t.sigma2)}. Every point uses all ${number(c.m)} attacker scores at that checkpoint. ${c.m === 1 ? "Sample variance is undefined for one attacker; theory remains defined." : ""}`;
  $("variance-table").innerHTML = r.snapshots
    .map((s) => {
      const th = theory(c.model, c.p, s.n);
      return `<tr><th>${number(s.n)}</th>${["total", "average", "normalized"].map((q) => `<td>${number(s.summary[q].variance)} / ${number(th[q].variance)}</td>`).join("")}</tr>`;
    })
    .join("");
  $("sweep-export").disabled = false;
}
$("sweep-export").onclick = () => {
  if (state.sweep)
    save(
      `hw4-increasing-n-${state.sweep.config.model}-seed-${state.sweep.config.seed}.csv`,
      csvSweep(state.sweep, epsilon()),
    );
};
let cltN = 1000,
  cltRequestedN = 1000;
function runCLT() {
  try {
    const requested = int($("clt-n").value, 1, 20000, "Displayed n");
    launch(
      "clt",
      {
        model: "rademacher",
        n: Math.max(1000, requested),
        m: $("clt-m").value,
        p: 0.5,
        seed: $("clt-seed").value,
      },
      (result) => {
        state.clt = result;
        cltN = requested;
        cltRequestedN = requested;
        renderCLT();
      },
      { keepPaths: 0, checkpoints: [requested] },
    );
  } catch (error) {
    status("clt", error.message, true);
  }
}
$("clt-form").onsubmit = (e) => {
  e.preventDefault();
  runCLT();
};
function cltSnapshots() {
  const desired = new Set([10, 30, 100, 1000, cltRequestedN]);
  return state.clt.snapshots.filter((s) => desired.has(s.n));
}
function renderCLT() {
  const r = state.clt,
    c = r.config,
    snapshot = r.snapshots.find((s) => s.n === cltN);
  if (!snapshot) return;
  const snaps = cltSnapshots();
  $("clt-tabs").innerHTML = snaps
    .map(
      (s) =>
        `<button type="button" data-clt-n="${s.n}" class="${s.n === cltN ? "active" : ""}" aria-pressed="${s.n === cltN}">n = ${number(s.n)}</button>`,
    )
    .join("");
  document.querySelectorAll("[data-clt-n]").forEach(
    (b) =>
      (b.onclick = () => {
        cltN = Number(b.dataset.cltN);
        $("clt-n").value = cltN;
        renderCLT();
      }),
  );
  densityPlot(
    "clt-chart",
    snapshot.totals,
    cltN,
    "rademacher",
    0.5,
    "normalized",
    { normal: true },
  );
  $("clt-title").textContent =
    `Sₙ/√n · n = ${number(cltN)} · m = ${number(c.m)}`;
  $("clt-mean").textContent = number(snapshot.summary.normalized.mean);
  $("clt-var").textContent = number(snapshot.summary.normalized.variance);
  const exact = cdfDistance([], cltN, "rademacher", 0.5, true),
    empirical = cdfDistance(snapshot.totals, cltN);
  $("clt-exact-gap").textContent = number(exact);
  $("clt-emp-gap").textContent = number(empirical);
  $("clt-note").textContent =
    `The normalized lattice spacing is 2/√n = ${number(2 / Math.sqrt(cltN))}. The bars are grouped discrete outcomes, not continuous observations. Their area equals one. Standard-normal mean/variance = 0/1 at every checkpoint. Seed ${c.seed}; ${number(c.m)} attackers.`;
  const rows = snaps.map((s) => ({
    n: s.n,
    mean: s.summary.normalized.mean,
    variance: s.summary.normalized.variance,
    exact: cdfDistance([], s.n, "rademacher", 0.5, true),
    empirical: cdfDistance(s.totals, s.n),
  }));
  $("clt-table").innerHTML = rows
    .map(
      (x) =>
        `<tr><th>${number(x.n)}</th><td>${number(2 / Math.sqrt(x.n))}</td><td>${number(x.mean)} / 0</td><td>${number(x.variance)} / 1</td><td>${number(x.exact)}</td><td>${number(x.empirical)}</td></tr>`,
    )
    .join("");
  const first = rows[0],
    last = rows.at(-1);
  $("conclusion-clt").textContent =
    `In the Rademacher comparison (m = ${number(c.m)}, seed ${c.seed}), the exact finite-n CDF gap to Φ changed from ${number(first.exact)} at n = ${first.n} to ${number(last.exact)} at n = ${number(last.n)}. The corresponding empirical gaps were ${number(first.empirical)} and ${number(last.empirical)}. The displayed n = ${number(cltN)} sample has mean ${number(snapshot.summary.normalized.mean)} and variance ${number(snapshot.summary.normalized.variance)}, against exact values 0 and 1. The remaining empirical discrepancy includes Monte Carlo noise; no hypothesis-test p-value is inferred.`;
  $("clt-export").disabled = false;
}
$("clt-export").onclick = () => {
  if (!state.clt) return;
  const r = state.clt,
    s = r.snapshots.find((s) => s.n === cltN);
  save(
    `hw4-clt-n-${cltN}-seed-${r.config.seed}.csv`,
    csvFinal({ config: { ...r.config, n: cltN }, totals: s.totals }),
  );
};
let samplingM = 5000;
function runSampling() {
  launch(
    "sampling",
    read("sampling", null, 5000),
    (result) => {
      state.sampling = result;
      samplingM = 5000;
      renderSampling();
    },
    { keepPaths: 0 },
  );
}
$("sampling-form").onsubmit = (e) => {
  e.preventDefault();
  runSampling();
};
function renderSampling() {
  const r = state.sampling,
    c = r.config,
    rows = samplingRows(r),
    current = r.totals.slice(0, samplingM),
    spec = histSpec(r.totals, c.n, c.model),
    t = theory(c.model, c.p, c.n);
  $("sampling-tabs").innerHTML = rows
    .map(
      (x) =>
        `<button type="button" data-sampling-m="${x.m}" class="${x.m === samplingM ? "active" : ""}" aria-pressed="${x.m === samplingM}">m = ${number(x.m)}</button>`,
    )
    .join("");
  document.querySelectorAll("[data-sampling-m]").forEach(
    (b) =>
      (b.onclick = () => {
        samplingM = Number(b.dataset.samplingM);
        renderSampling();
      }),
  );
  densityPlot("sampling-hist-chart", current, c.n, c.model, c.p, "normalized", {
    spec,
    reference: t.normalized.mean,
    label: `Empirical · m = ${number(samplingM)}`,
  });
  plot(
    "sampling-distance-chart",
    [
      lineDataset(
        "TV distance to exact discrete PMF",
        rows.map((x) => ({ x: x.m, y: x.totalVariation })),
        "teal",
      ),
    ],
    "Attackers m · logarithmic scale",
    "Total variation distance",
    { x: { type: "logarithmic" }, y: { beginAtZero: true }, legend: false },
  );
  $("sampling-note").textContent =
    `Fixed n = ${c.n}; ${modelName(c.model)}${c.model === "bernoulli" ? `(p=${c.p})` : ""}; seed ${c.seed}. Single-attacker normalized mean = ${number(t.normalized.mean)}, variance = ${number(t.normalized.variance)} for every m. Currently showing ${number(samplingM)} attackers. The exact law and display bins are unchanged.`;
  $("sampling-table").innerHTML = rows
    .map(
      (x) =>
        `<tr><th>${number(x.m)}</th><td>${number(x.mean)}</td><td>${number(x.variance)}</td><td>${number(x.meanSE)}</td><td>${number(x.totalVariation)}</td></tr>`,
    )
    .join("");
}
const help = {
  paths: [
    "One curve, one attacker",
    "Each path is built from n separately generated increments. We retain at most eight complete paths, and show at most about 450 display coordinates per curve at large n. Downsampling affects only the picture. The exported retained path contains every increment, cumulative total, running average and square-root normalization. All m paths contribute to final distributions and moments.",
  ],
  averages: [
    "Concentration, not monotone motion",
    "Sₜ/t can move away from μ on some steps. The LLN says that for a fixed ε, the probability of a deviation greater than ε becomes small as t grows. The separate increasing-n experiment estimates that probability over many attackers. An ensemble mean near μ alone is not sufficient evidence of concentration.",
  ],
  histogram: [
    "Put probability mass on a common scale",
    "The count in each bin is divided by m times the bin width. The resulting bar area equals the observed relative frequency, so the histogram integrates to one. The exact-law line aggregates binomial probabilities over precisely the same lattice cells and divides by the same width. These are binned discrete distributions, not claims that the scores are continuous.",
  ],
  normalized: [
    "Constant variance does not imply zero mean",
    "For either model, Var(Sₙ/√n) = σ². Its expected value is μ√n. Rademacher has μ = 0, so no centring is needed for its standard-normal limit. Bernoulli generally has a growing normalized mean and needs separate centring and standardization for a CLT to N(0,1).",
  ],
  lln: [
    "A theorem about individual averages",
    "Each point is the mean of m attacker averages, but the LLN is about concentration of the whole per-attacker distribution. Read the deviation-frequency and variance charts alongside it. The same paths supply prefixes at increasing n, making this a paired comparison rather than independent experiments at every n.",
  ],
  deviation: [
    "A strict threshold and an upper bound",
    "An exceedance means |Sₙ/n − μ| > ε, with strict inequality. The empirical probability is the number of exceeding attackers divided by m. The exact curve uses the binomial law; Chebyshev is a valid, often loose upper bound capped at 1. Wilson intervals describe the sampling error of the estimated frequency. Zero observed exceedances do not imply zero theoretical risk.",
  ],
  clt: [
    "Approximate a discrete distribution",
    "At finite n, Rademacher totals have the same parity as n; normalized scores have spacing 2/√n. We aggregate adjacent lattice cells into density bins. The Gaussian overlay is the fixed standard-normal density, not a fitted curve. The CDF gap includes left and right limits of the discrete jumps; it decreases in theory as the lattice becomes finer, while its empirical estimate retains Monte Carlo noise.",
  ],
};
function openHelp(key) {
  const [title, text] = help[key];
  $("help-title").textContent = title;
  const p = document.createElement("p");
  p.textContent = text;
  $("help-body").replaceChildren(p);
  $("help").showModal();
}
document
  .querySelectorAll("[data-help]")
  .forEach((b) => (b.onclick = () => openHelp(b.dataset.help)));
$("close-help").onclick = $("done-help").onclick = () => $("help").close();
$("help").onclick = (e) => {
  if (e.target === $("help")) {
    const r = $("help").getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      $("help").close();
  }
};
function themeLabel() {
  const dark = document.documentElement.dataset.theme === "dark";
  $("theme").querySelector("span").textContent = dark ? "Light" : "Dark";
  $("theme").setAttribute(
    "aria-label",
    `Switch to ${dark ? "light" : "dark"} theme`,
  );
}
$("theme").onclick = () => {
  document.documentElement.dataset.theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem("statsTheme", document.documentElement.dataset.theme);
  } catch {}
  themeLabel();
  refreshTheme();
};
themeLabel();
// Independent initial experiments run off the UI thread; no invented chart data.
runLab();
runSweep();
runCLT();
runSampling();
