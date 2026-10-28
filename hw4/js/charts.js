import { histogram, histSpec, normalPDF } from "./core.js";
export const charts = new Map();
export function palette() {
  const s = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    ["teal", "accent", "violet", "gold", "ink", "muted", "line", "surface"].map(
      (k) => [k, s.getPropertyValue("--" + k).trim()],
    ),
  );
}
const pathColors = [
  "#169f8e",
  "#8476d5",
  "#458bd0",
  "#d79a48",
  "#b86b9d",
  "#7c9c56",
  "#54afa9",
  "#a8885b",
];
const histogramRects = {
  id: "histogramRects",
  beforeDatasetsDraw(chart) {
    const {
      ctx,
      chartArea,
      scales: { x, y },
    } = chart;
    if (!chartArea) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      chartArea.left,
      chartArea.top,
      chartArea.right - chartArea.left,
      chartArea.bottom - chartArea.top,
    );
    ctx.clip();
    chart.data.datasets.forEach((d, i) => {
      if (!d._histogram || !chart.isDatasetVisible(i)) return;
      ctx.fillStyle = d._fillColor;
      for (const r of d.data) {
        const left = x.getPixelForValue(r.left),
          right = x.getPixelForValue(r.right),
          yy = y.getPixelForValue(r.y),
          bottom = y.getPixelForValue(0);
        ctx.fillRect(left, yy, right - left, bottom - yy);
      }
    });
    ctx.restore();
  },
};
const referenceLine = {
  id: "referenceLine",
  afterDatasetsDraw(chart, _, settings) {
    if (!settings || !Number.isFinite(settings.value) || !chart.chartArea)
      return;
    const {
        ctx,
        chartArea,
        scales: { x },
      } = chart,
      xx = x.getPixelForValue(settings.value);
    if (xx < chartArea.left || xx > chartArea.right) return;
    ctx.save();
    ctx.strokeStyle = settings.color || palette().muted;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xx, chartArea.top);
    ctx.lineTo(xx, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};
if (globalThis.Chart) {
  Chart.register(histogramRects, referenceLine);
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.font.size = 10;
}
export function lineDataset(label, data, color, extra = {}) {
  const p = palette();
  return {
    type: "line",
    label,
    data,
    borderColor: p[color] || color,
    backgroundColor: p[color] || color,
    borderWidth: 2,
    pointRadius: data.length > 40 ? 0 : 3,
    pointHoverRadius: 4,
    tension: 0,
    fill: false,
    _colorKey: color,
    ...extra,
  };
}
export function plot(id, datasets, xTitle, yTitle, extra = {}) {
  if (!globalThis.Chart) throw Error("The bundled Chart.js file did not load.");
  charts.get(id)?.destroy();
  const p = palette(),
    baseLegend = Chart.defaults.plugins.legend.labels.generateLabels;
  const axis = (title) => ({
    type: "linear",
    title: { display: true, text: title, color: p.muted, font: { size: 10 } },
    grid: { color: p.line },
    ticks: { color: p.muted, maxTicksLimit: 6, font: { size: 10 } },
    border: { color: p.line },
  });
  const config = {
    type: "scatter",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      parsing: false,
      normalized: false,
      interaction: { mode: "nearest", axis: "x", intersect: false },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: p.muted,
            boxWidth: 14,
            boxHeight: 7,
            padding: 12,
            font: { size: 10 },
            generateLabels(chart) {
              return baseLegend(chart).map((label) => {
                const d = chart.data.datasets[label.datasetIndex];
                if (d._histogram) label.fillStyle = d._fillColor;
                return label;
              });
            },
          },
        },
        tooltip: {
          backgroundColor: p.ink,
          titleColor: p.surface,
          bodyColor: p.surface,
          callbacks: {
            label(c) {
              const r = c.raw;
              return c.dataset._histogram
                ? `${c.dataset.label}: density ${r.y.toPrecision(4)} · ${r.count}/${r.observations} in [${r.left.toPrecision(4)}, ${r.right.toPrecision(4)})`
                : `${c.dataset.label}: ${Number(r.y).toPrecision(5)}`;
            },
          },
        },
      },
      scales: { x: axis(xTitle), y: axis(yTitle) },
    },
  };
  config.options.scales.y.ticks.maxTicksLimit = 5;
  if (extra.x) Object.assign(config.options.scales.x, extra.x);
  if (extra.y) Object.assign(config.options.scales.y, extra.y);
  if (extra.reference !== undefined)
    config.options.plugins.referenceLine = {
      value: extra.reference,
      color: p.muted,
    };
  if (extra.legend === false) config.options.plugins.legend.display = false;
  const chart = new Chart(document.getElementById(id), config);
  charts.set(id, chart);
  return chart;
}
export function densityPlot(
  id,
  totals,
  n,
  model,
  p,
  quantity,
  {
    normal = false,
    spec = null,
    reference = null,
    label = "Empirical density",
  } = {},
) {
  const h = histogram(totals, n, model, p, quantity, spec),
    colors = palette();
  const data = h.rows.map((r) => ({
    ...r,
    x: r.center,
    y: r.density,
    observations: totals.length,
  }));
  const datasets = [
    {
      type: "bar",
      label,
      data,
      borderWidth: 0,
      backgroundColor: "transparent",
      hoverBackgroundColor: "transparent",
      borderColor: "transparent",
      barThickness: 1,
      _histogram: true,
      _fillColor: colors.teal + "70",
    },
  ];
  if (normal) {
    const lo = Math.min(-4.2, h.rows[0].left),
      hi = Math.max(4.2, h.rows.at(-1).right);
    datasets.push(
      lineDataset(
        "Standard normal φ(x)",
        Array.from({ length: 161 }, (_, i) => {
          const x = lo + ((hi - lo) * i) / 160;
          return { x, y: normalPDF(x) };
        }),
        "violet",
        { borderWidth: 2.4 },
      ),
    );
    plot(id, datasets, "Normalized score Sₙ/√n", "Probability density", {
      x: { min: lo, max: hi, offset: false },
      y: { beginAtZero: true },
      reference: 0,
    });
  } else {
    datasets.push(
      lineDataset(
        "Exact law / same bins",
        h.rows.map((r) => ({ x: r.center, y: r.exactDensity })),
        "violet",
        { pointRadius: 2, borderWidth: 1.8 },
      ),
    );
    const names = {
      total: "Total score Sₙ",
      average: "Average score Sₙ/n",
      normalized: "Normalized score Sₙ/√n",
    };
    plot(id, datasets, names[quantity], "Probability density", {
      x: { min: h.rows[0].left, max: h.rows.at(-1).right, offset: false },
      y: { beginAtZero: true },
      reference,
    });
  }
  return h;
}
export function pathPlot(id, result, quantity, comparison = null) {
  const make = (r, number, offset) =>
    r.paths.slice(0, number).map((path, i) => {
      const n = r.config.n,
        stride = Math.max(1, Math.ceil(n / 450)),
        ts = new Set([quantity === "total" ? 0 : 1, n]);
      for (let t = quantity === "total" ? 0 : 1; t <= n; t += stride) ts.add(t);
      const data = [...ts]
        .sort((a, b) => a - b)
        .map((t) => ({
          x: t,
          y: quantity === "total" ? path.totals[t] : path.totals[t] / t,
        }));
      const model = r.config.model === "rademacher" ? "R" : "B";
      return lineDataset(
        `${model} · attacker ${path.attacker}`,
        data,
        pathColors[(i + offset) % 8],
        { borderWidth: 1.4, borderDash: offset ? [4, 3] : [] },
      );
    });
  const datasets = make(result, comparison ? 4 : 8, 0);
  if (comparison) datasets.push(...make(comparison, 4, 4));
  if (quantity === "average") {
    for (const r of [result, comparison].filter(Boolean)) {
      const mu = r.config.model === "rademacher" ? 0 : r.config.p;
      datasets.push(
        lineDataset(
          `μ = ${mu} (${r.config.model === "rademacher" ? "R" : "B"})`,
          [
            { x: 1, y: mu },
            { x: r.config.n, y: mu },
          ],
          "muted",
          { borderDash: [6, 4], borderWidth: 1.8, pointRadius: 0 },
        ),
      );
    }
  }
  plot(
    id,
    datasets,
    "System / step t",
    quantity === "total" ? "Cumulative score Sₜ" : "Running average Sₜ/t",
    {
      x: {
        min: quantity === "total" ? 0 : 1,
        max: result.config.n === 1 ? 1.5 : result.config.n,
      },
    },
  );
}
export function refreshTheme() {
  const p = palette();
  for (const chart of charts.values()) {
    for (const axis of Object.values(chart.options.scales)) {
      axis.ticks.color = p.muted;
      axis.grid.color = p.line;
      axis.border.color = p.line;
      axis.title.color = p.muted;
    }
    chart.options.plugins.legend.labels.color = p.muted;
    chart.options.plugins.tooltip.backgroundColor = p.ink;
    chart.options.plugins.tooltip.titleColor = p.surface;
    chart.options.plugins.tooltip.bodyColor = p.surface;
    if (chart.options.plugins.referenceLine)
      chart.options.plugins.referenceLine.color = p.muted;
    for (const d of chart.data.datasets) {
      if (d._histogram) d._fillColor = p.teal + "70";
      if (p[d._colorKey]) {
        d.borderColor = p[d._colorKey];
        d.backgroundColor = p[d._colorKey];
      }
    }
    chart.update("none");
  }
}
