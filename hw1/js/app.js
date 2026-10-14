/* Page controls and visualizations. Pure mathematical operations live in ecc.js. */
(function () {
  'use strict';
  const ECC = window.ECCToy;
  const byId = id => document.getElementById(id);
  const state = { base: { x: 1, y: 5 }, k: 6, steps: [], index: -1, timer: null, n: 8, stats: null };
  const svgNS = 'http://www.w3.org/2000/svg';
  const points = ECC.allPoints();
  const pointOptions = points.map(point => ({ ...point, pointOrder: ECC.order(point) }));

  function text(id, value) { byId(id).textContent = String(value); }
  function formatNumber(value, digits = 3) { return value === null || !Number.isFinite(value) ? 'n/a' : value.toFixed(digits); }
  function setError(id, message = '') {
    const error = byId(id);
    error.hidden = !message;
    error.textContent = message;
  }
  function readInteger(id, min, max, errorId) {
    const input = byId(id);
    const raw = input.value.trim();
    const value = Number(raw);
    if (!raw || !Number.isSafeInteger(value) || value < min || value > max) {
      setError(errorId, `Enter a whole number from ${min} to ${max}.`);
      return null;
    }
    setError(errorId);
    return value;
  }
  function initializeBasePoints() {
    const select = byId('base-point');
    const sorted = [...pointOptions].sort((a, b) => (a.x === 1 && a.y === 5 ? -1 : b.x === 1 && b.y === 5 ? 1 : a.x - b.x || a.y - b.y));
    for (const point of sorted) {
      const option = document.createElement('option');
      option.value = `${point.x},${point.y}`;
      option.textContent = `${ECC.format(point)} · order ${point.pointOrder}${point.pointOrder === 18 ? ' (full group)' : ''}`;
      select.append(option);
    }
    select.value = '1,5';
  }

  function stopAnimation() {
    if (state.timer !== null) {
      window.clearInterval(state.timer);
      state.timer = null;
    }
    byId('play-steps').innerHTML = '▶ <span>Play</span>';
    byId('play-steps').setAttribute('aria-label', 'Play animation');
  }
  function calculate() {
    const k = readInteger('private-key', 1, 200, 'input-error');
    if (k === null) return;
    stopAnimation();
    const [x, y] = byId('base-point').value.split(',').map(Number);
    state.base = { x, y };
    state.k = k;
    state.steps = ECC.multiples(state.base, k);
    state.index = k - 1;
    const result = state.steps[k - 1].result;
    const fast = ECC.multiply(state.base, k);
    if (!ECC.equals(result, fast)) {
      setError('input-error', 'The two algorithms disagree. This indicates an internal error.');
      return;
    }
    const pointOrder = ECC.order(state.base);
    text('public-key', result === null ? 'O (∞)' : ECC.format(result));
    text('result-detail', `Q = ${k} × ${ECC.format(state.base)}`);
    text('point-order', pointOrder);
    text('cycle-position', `${k % pointOrder} / ${pointOrder}`);
    text('method-check', '✓ MATCH');
    renderStepsTable();
    selectStep(state.index, false);
    drawCurve();
    runStatistics();
  }
  function renderStepsTable() {
    const fragment = document.createDocumentFragment();
    for (const step of state.steps) {
      const tr = document.createElement('tr');
      tr.dataset.step = String(step.k - 1);
      tr.tabIndex = 0;
      tr.setAttribute('aria-label', `Show calculation for ${step.k} times G`);
      for (const cellValue of [String(step.k).padStart(2, '0'), step.k === 1 ? 'O + G' : `${step.k - 1}G + G`, ECC.format(step.result)]) {
        const td = document.createElement('td');
        td.textContent = cellValue;
        tr.append(td);
      }
      tr.addEventListener('click', () => { stopAnimation(); selectStep(step.k - 1); });
      tr.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stopAnimation(); selectStep(step.k - 1); }
      });
      fragment.append(tr);
    }
    byId('steps-body').replaceChildren(fragment);
  }
  function selectStep(index, scroll = true) {
    state.index = Math.max(-1, Math.min(state.steps.length - 1, index));
    const step = state.steps[state.index];
    text('step-count', `Step ${state.index + 1} of ${state.k}`);
    byId('step-progress').style.width = `${((state.index + 1) / state.k) * 100}%`;
    byId('previous-step').disabled = state.index < 0;
    byId('next-step').disabled = state.index >= state.k - 1;
    for (const tr of byId('steps-body').rows) {
      const active = Number(tr.dataset.step) === state.index;
      tr.classList.toggle('active', active);
      tr.setAttribute('aria-current', active ? 'step' : 'false');
    }
    if (step) {
      text('current-operation', step.k === 1 ? '1G = O + G' : `${step.k}G = ${step.k - 1}G + G`);
      text('current-result', step.result === null ? 'O (∞)' : ECC.format(step.result));
      const kind = step.kind === 'doubling' ? 'Point doubling. ' : step.kind === 'addition' ? 'Point addition. ' : '';
      text('current-explanation', kind + step.explanation);
    } else {
      text('current-operation', 'Start at O');
      text('current-result', 'O (∞)');
      text('current-explanation', 'The initial accumulator is the point at infinity, before adding G.');
    }
    if (scroll && step) {
      const activeRow = byId('steps-body').querySelector('tr.active');
      const wrap = document.querySelector('.step-list-wrap');
      if (activeRow && wrap) {
        const top = activeRow.offsetTop;
        if (top < wrap.scrollTop) wrap.scrollTop = top;
        else if (top + activeRow.offsetHeight > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = top + activeRow.offsetHeight - wrap.clientHeight;
      }
    }
    drawCurve();
  }
  function toggleAnimation() {
    if (state.timer !== null) { stopAnimation(); return; }
    if (state.index === state.k - 1) selectStep(-1, false);
    byId('play-steps').innerHTML = '❚❚ <span>Pause</span>';
    byId('play-steps').setAttribute('aria-label', 'Pause animation');
    state.timer = window.setInterval(() => {
      if (state.index < state.k - 1) selectStep(state.index + 1);
      if (state.index === state.k - 1) stopAnimation();
    }, 850);
  }

  function svg(tag, attributes, label) {
    const node = document.createElementNS(svgNS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    if (label !== undefined) node.textContent = label;
    return node;
  }
  function drawCurve() {
    const container = byId('curve-plot');
    // SVG colors are selected from the same theme as the rest of the page.
    const dark = document.documentElement.dataset.theme === 'dark';
    const palette = dark ? {
      bg: '#142131', grid: '#33465b', faint: '#27394b', tick: '#9cb0c5',
      point: '#8b9db1', outline: '#142131', base: '#39ceba', result: '#9aa7ff'
    } : {
      bg: '#fbfcfe', grid: '#e5eaf1', faint: '#f1f4f7', tick: '#8997a8',
      point: '#b6c4d5', outline: '#ffffff', base: '#0e9889', result: '#6269d6'
    };
    const list = [];
    const left = 55, top = 41, dx = 32.5, dy = 19;
    const xp = x => left + dx * x;
    const yp = y => top + dy * (16 - y);
    const selected = state.index === -1 ? null : state.steps[state.index]?.result ?? null;
    const background = svg('rect', { x: left, y: top, width: dx * 16, height: dy * 16, rx: 5, fill: palette.bg });
    list.push(background);
    for (let n = 0; n <= 16; n++) {
      const stroke = n % 4 === 0 ? palette.grid : palette.faint;
      list.push(svg('line', { x1: xp(n), y1: top, x2: xp(n), y2: yp(0), stroke, 'stroke-width': 1 }));
      list.push(svg('line', { x1: left, y1: yp(n), x2: xp(16), y2: yp(n), stroke, 'stroke-width': 1 }));
      if (n % 4 === 0) {
        list.push(svg('text', { x: xp(n), y: yp(0) + 24, 'text-anchor': 'middle', fill: palette.tick, 'font-size': 11 }, n));
        list.push(svg('text', { x: left - 15, y: yp(n) + 4, 'text-anchor': 'middle', fill: palette.tick, 'font-size': 11 }, n));
      }
    }
    list.push(svg('text', { x: xp(16) + 20, y: yp(0) + 23, fill: palette.tick, 'font-size': 14, 'font-weight': 700 }, 'x'));
    list.push(svg('text', { x: left - 16, y: top - 16, fill: palette.tick, 'font-size': 14, 'font-weight': 700 }, 'y'));
    for (const point of points) {
      const isBase = ECC.equals(point, state.base);
      const isResult = ECC.equals(point, selected);
      const group = svg('g', {});
      if (isResult) group.append(svg('circle', { cx: xp(point.x), cy: yp(point.y), r: 14, fill: dark ? 'rgba(154,167,255,0.20)' : 'rgba(89,97,215,0.12)' }));
      if (isBase) group.append(svg('circle', { cx: xp(point.x), cy: yp(point.y), r: 13, fill: 'none', stroke: palette.base, 'stroke-width': 2.5 }));
      group.append(svg('circle', { cx: xp(point.x), cy: yp(point.y), r: isResult ? 7.8 : 5.7, fill: isResult ? palette.result : isBase ? palette.base : palette.point, stroke: palette.outline, 'stroke-width': isResult ? 2 : 1.3 }));
      group.append(svg('title', {}, `${ECC.format(point)}${isBase ? ' — base G' : ''}${isResult ? ' — current result' : ''}`));
      list.push(group);
      if (isResult) {
        const name = svg('text', { x: xp(point.x) + 13, y: yp(point.y) - 12, fill: palette.result, 'font-size': 13, 'font-weight': 800, 'paint-order': 'stroke', stroke: palette.bg, 'stroke-width': 4 }, 'Q');
        list.push(name);
      }
    }
    container.replaceChildren(...list);
    const label = selected === null ? 'current result is infinity or the calculation has not started' : `current result ${ECC.format(selected)}`;
    container.setAttribute('aria-label', `All 17 finite curve points. G = ${ECC.format(state.base)}; ${label}.`);
  }

  function drawFrequencies(id, frequencies) {
    const container = byId(id);
    const max = Math.max(1, ...frequencies);
    const fragment = document.createDocumentFragment();
    frequencies.forEach((value, index) => {
      const column = document.createElement('div');
      column.className = 'freq-col';
      column.title = `Coordinate ${index}: ${value} occurrences`;
      const bar = document.createElement('div');
      bar.className = 'freq-bar';
      bar.style.height = `${value ? Math.max(5, (value / max) * 145) : 0}px`;
      const tick = document.createElement('span');
      tick.className = 'freq-tick';
      tick.textContent = index % 4 === 0 ? index : '';
      column.append(bar, tick);
      fragment.append(column);
    });
    container.replaceChildren(fragment);
    container.setAttribute('aria-label', frequencies.map((value, index) => `${index}: ${value}`).join(', '));
  }
  function drawBits(stats) {
    const fragment = document.createDocumentFragment();
    const header = document.createElement('div');
    header.className = 'bit-head';
    for (const title of ['POSITION', 'X: 1-BITS', 'POSITION', 'Y: 1-BITS']) {
      const element = document.createElement('b'); element.textContent = title; header.append(element);
    }
    fragment.append(header);
    for (let i = 4; i >= 0; i--) {
      const row = document.createElement('div'); row.className = 'bit-row';
      for (const [series, values] of [['x', stats.xBitOnes], ['y', stats.yBitOnes]]) {
        const label = document.createElement('label'); label.textContent = `bit ${i}`;
        const wrap = document.createElement('div'); wrap.className = 'bit-meter-wrap';
        const meter = document.createElement('div'); meter.className = 'bit-meter' + (series === 'y' ? ' indigo' : '');
        const fill = document.createElement('span');
        const fraction = stats.samples.length ? values[i] / stats.samples.length : 0;
        fill.style.width = `${fraction * 100}%`;
        meter.append(fill);
        const number = document.createElement('span'); number.className = 'bit-num'; number.textContent = stats.samples.length ? `${(fraction * 100).toFixed(0)}%` : 'n/a';
        wrap.append(meter, number);
        row.append(label, wrap);
      }
      fragment.append(row);
    }
    byId('bit-chart').replaceChildren(fragment);
  }
  function runStatistics() {
    const n = readInteger('sample-count', 1, 200, 'stats-error');
    if (n === null) return;
    state.n = n;
    const s = ECC.statistics(state.base, n);
    state.stats = s;
    text('scalars-tested', s.n);
    text('finite-outputs', s.samples.length);
    text('unique-points', s.uniquePoints);
    text('infinity-count', s.infinityCount);
    drawFrequencies('x-chart', s.xFrequencies);
    drawFrequencies('y-chart', s.yFrequencies);
    text('x-entropy', `Observed Shannon entropy H(X) = ${s.xEntropy.toFixed(3)} bits`);
    text('y-entropy', `Observed Shannon entropy H(Y) = ${s.yEntropy.toFixed(3)} bits`);
    drawBits(s);
    text('correlation-x', formatNumber(s.correlationX));
    text('correlation-y', formatNumber(s.correlationY));
    text('adjacent-bits', s.meanAdjacentBitChanges === null ? 'n/a' : `${s.meanAdjacentBitChanges.toFixed(2)} / 10`);
    text('adjacent-note', `${s.comparedTransitions} valid adjacent pairs compared; x and y encoded with five bits each.`);
    const order = ECC.order(state.base);
    text('cycle-observation', `This base point has order ${order}: ${order}G = O and ${order + 1}G = G. Every ${order} values of k, the outputs repeat. ${s.infinityCount} of the ${n} sampled outputs are O (infinity), with no x/y coordinates. These outputs are excluded from coordinate statistics but counted separately.`);
  }

  // ---- Theme: stored locally, with system preference as the fallback. ----
  function initTheme() {
    let stored = null;
    try { stored = window.localStorage.getItem('ecc-lab-theme'); } catch (_) { /* storage is optional */ }
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(stored === 'dark' || (!stored && systemDark) ? 'dark' : 'light', false);
  }
  function setTheme(theme, save = true) {
    document.documentElement.dataset.theme = theme;
    const dark = theme === 'dark';
    byId('theme-toggle').setAttribute('aria-pressed', String(dark));
    byId('theme-toggle').setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
    byId('theme-toggle').title = `Switch to ${dark ? 'light' : 'dark'} theme`;
    byId('theme-toggle').querySelector('.theme-icon').textContent = dark ? '☀' : '☾';
    byId('theme-toggle').querySelector('.theme-label').textContent = dark ? 'Light' : 'Dark';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#0e1724' : '#f7f8fb';
    if (save) { try { window.localStorage.setItem('ecc-lab-theme', theme); } catch (_) { /* ignore */ } }
    if (state.steps.length) drawCurve();
  }

  // ---- Statistical explanations: always refer to the current sample. ----
  const explanationTitles = {
    x: 'X-coordinate frequencies', y: 'Y-coordinate frequencies',
    bits: 'Bit distribution', relationships: 'Input / output relationships'
  };
  let lastModalTrigger = null;
  const fmtPoint = p => ECC.format(p);
  function frequencyExample(frequencies) {
    const max = Math.max(...frequencies);
    const values = frequencies.map((count, coord) => ({ count, coord }))
      .filter(item => item.count === max && max > 0)
      .map(item => item.coord).join(', ');
    return { max, values };
  }
  function explanationHTML(kind) {
    const s = state.stats;
    if (!s) return '<p>Run the experiment to see the explanation.</p>';
    const context = `This experiment uses <strong>N = ${state.n}</strong> private scalars (k = 1 through ${state.n}) and base point <strong>G = ${fmtPoint(state.base)}</strong>. It produces <strong>${s.samples.length} finite outputs</strong> and <strong>${s.infinityCount} occurrence(s) of O</strong>.`;
    const xSample = frequencyExample(s.xFrequencies);
    const ySample = frequencyExample(s.yFrequencies);
    const entropy = values => (-values.filter(v => v > 0).reduce((acc, count) => {
      const p = count / s.samples.length; return acc + p * Math.log2(p);
    }, 0));
    switch (kind) {
      case 'x': return `
        <p>Every public key is a point <strong>Q = (x, y)</strong>. We count how many results have x = 0, x = 1, …, x = 16. A taller bar means that value appeared more often.</p>
        <p>${context}</p>
        <div class="example-result"><span>Most frequent x value(s)</span><strong>${xSample.values || 'none'} · ${xSample.max} occurrence(s)</strong></div>
        <p>The observed <strong>Shannon entropy H(X) = ${entropy(s.xFrequencies).toFixed(3)} bits</strong> summarizes the spread of coordinate values. Larger entropy means a more dispersed empirical frequency distribution, not automatically better security.</p>
        <p><strong>What it means:</strong> even if scalars are varied, points are constrained by the curve and by the subgroup generated by G. Uniformity of the x coordinates is not guaranteed.</p>`;
      case 'y': return `
        <p>Here we count the <strong>y coordinate</strong> of every finite output. For example, if three keys produce points with y = 5, the bar at 5 has height 3.</p>
        <p>${context}</p>
        <div class="example-result"><span>Most frequent y value(s)</span><strong>${ySample.values || 'none'} · ${ySample.max} occurrence(s)</strong></div>
        <p>The observed <strong>Shannon entropy H(Y) = ${entropy(s.yFrequencies).toFixed(3)} bits</strong>. This need not match the x-coordinate entropy because the algebraic constraints for the two coordinates are different.</p>
        <p><strong>What it means:</strong> the set of reachable points can produce an uneven coordinate distribution. Remember that O has no x or y coordinate and is excluded from both histograms.</p>`;
      case 'bits': {
        const n = s.samples.length;
        const pct = (ones, i) => n ? (ones[i] * 100 / n).toFixed(1) + '%' : 'n/a';
        return `<p>Each coordinate is an integer from 0 to 16, so it fits in <strong>five binary bits</strong>. For instance, 5 becomes <strong>00101</strong> and 12 becomes <strong>01100</strong>. For each bit position, the chart counts how often the bit equals 1.</p>
          <p>${context}</p>
          <div class="example-result"><span>Example: least significant bit (bit 0)</span><strong>X: ${pct(s.xBitOnes, 0)} ones · Y: ${pct(s.yBitOnes, 0)} ones</strong></div>
          <p>If a binary output behaved like independent fair bits, about 50% of its bits would be 1. But the coordinates here represent <strong>structured mathematical points</strong>, not a sequence of independently sampled random bits.</p>
          <p><strong>What it means:</strong> a 50/50 split does not prove randomness. A non-50/50 split on this tiny curve does not invalidate elliptic-curve cryptography on a real curve.</p>`;
      }
      case 'relationships': return `
        <p><strong>Pearson correlation</strong> measures linear association between two numerical variables. We compare the input scalar k with the output coordinate x, then with y. Values near +1 or −1 mean strong positive or negative linear association; values near 0 indicate little <em>linear</em> association.</p>
        <div class="example-result"><span>Observed linear correlations</span><strong>r(k, x) = ${formatNumber(s.correlationX)} · r(k, y) = ${formatNumber(s.correlationY)}</strong></div>
        <p>We also compare <strong>neighboring scalar values k and k+1</strong> and count the positions where their combined 10 coordinate bits differ. In the current sample, the mean is <strong>${s.meanAdjacentBitChanges === null ? 'n/a' : s.meanAdjacentBitChanges.toFixed(2) + ' out of 10'} changed bits</strong> across ${s.comparedTransitions} valid pairs.</p>
        <p>${context}</p>
        <p><strong>What it means:</strong> low Pearson correlation does not imply unpredictability. This neighboring-scalar comparison is only <em>avalanche-like</em>. A formal hash-function avalanche experiment would typically flip a single input bit and test output-bit changes over many input pairs. This chart does not measure cryptographic security.</p>`;
      default: return '<p>Select an experiment panel for more details.</p>';
    }
  }
  function openExplanation(card) {
    lastModalTrigger = card;
    const kind = card.dataset.explanation;
    text('explanation-title', explanationTitles[kind] || 'Statistics explained');
    byId('explanation-description').innerHTML = explanationHTML(kind);
    byId('explanation-overlay').hidden = false;
    document.body.classList.add('modal-open');
    byId('close-explanation').focus();
  }
  function closeExplanation() {
    if (byId('explanation-overlay').hidden) return;
    byId('explanation-overlay').hidden = true;
    document.body.classList.remove('modal-open');
    if (lastModalTrigger) lastModalTrigger.focus();
  }
  function initExplainers() {
    for (const card of document.querySelectorAll('.explainable-card')) {
      card.addEventListener('click', () => openExplanation(card));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openExplanation(card); }
      });
    }
    byId('close-explanation').addEventListener('click', closeExplanation);
    byId('close-explanation-bottom').addEventListener('click', closeExplanation);
    byId('explanation-overlay').addEventListener('click', e => {
      if (e.target.matches('[data-close-modal]')) closeExplanation();
    });
    document.addEventListener('keydown', e => {
      if (byId('explanation-overlay').hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); closeExplanation(); }
      // Keep keyboard focus inside the modal while it is open.
      if (e.key === 'Tab') {
        const list = [...byId('explanation-overlay').querySelectorAll('button:not([disabled])')];
        if (!list.length) return;
        if (e.shiftKey && document.activeElement === list[0]) { e.preventDefault(); list[list.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === list[list.length - 1]) { e.preventDefault(); list[0].focus(); }
      }
    });
  }

  function bindEvents() {
    byId('calculate').addEventListener('click', calculate);
    byId('private-key').addEventListener('keydown', e => { if (e.key === 'Enter') calculate(); });
    byId('base-point').addEventListener('change', calculate);
    byId('run-statistics').addEventListener('click', runStatistics);
    byId('sample-count').addEventListener('keydown', e => { if (e.key === 'Enter') runStatistics(); });
    byId('previous-step').addEventListener('click', () => { stopAnimation(); selectStep(state.index - 1); });
    byId('next-step').addEventListener('click', () => { stopAnimation(); selectStep(state.index + 1); });
    byId('reset-steps').addEventListener('click', () => { stopAnimation(); selectStep(-1, false); });
    byId('play-steps').addEventListener('click', toggleAnimation);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopAnimation(); });
  }
  initializeBasePoints();
  initTheme();
  initExplainers();
  bindEvents();
  byId('theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  calculate();
})();
