/*
 * ECC over F17 for teaching only. NOT SUITABLE FOR REAL CRYPTOGRAPHY.
 * Curve: y² = x³ + 7 mod 17; O (null) denotes the point at infinity.
 */
(function (global) {
  'use strict';
  const P = 17;
  const A = 0;
  const B = 7;

  function mod(value, prime = P) {
    return ((value % prime) + prime) % prime;
  }

  function inverse(value) {
    let oldR = P, r = mod(value);
    let oldT = 0, t = 1;
    if (r === 0) throw new Error('Zero has no modular inverse.');
    while (r !== 0) {
      const q = Math.floor(oldR / r);
      [oldR, r] = [r, oldR - q * r];
      [oldT, t] = [t, oldT - q * t];
    }
    if (oldR !== 1) throw new Error('The denominator is not invertible.');
    return mod(oldT);
  }

  function equals(p, q) {
    return p === null ? q === null : q !== null && p.x === q.x && p.y === q.y;
  }

  function isOnCurve(point) {
    if (point === null) return true;
    return mod(point.y * point.y - point.x ** 3 - A * point.x - B) === 0;
  }

  function allPoints() {
    const points = [];
    for (let x = 0; x < P; x++) {
      for (let y = 0; y < P; y++) {
        if (isOnCurve({ x, y })) points.push({ x, y });
      }
    }
    return points;
  }

  function addDetailed(p, q) {
    if (!isOnCurve(p) || !isOnCurve(q)) throw new Error('Point not on the curve.');
    if (p === null) return { point: q, kind: 'identity', explanation: 'O + G = G: the point at infinity is the identity element.' };
    if (q === null) return { point: p, kind: 'identity', explanation: 'P + O = P: adding infinity does not change a point.' };
    if (p.x === q.x && mod(p.y + q.y) === 0) {
      return { point: null, kind: 'infinity', explanation: 'The points are inverses (or y = 0 when doubling): their sum is O.' };
    }
    const doubling = equals(p, q);
    const numerator = doubling ? mod(3 * p.x * p.x + A) : mod(q.y - p.y);
    const denominator = doubling ? mod(2 * p.y) : mod(q.x - p.x);
    const inverseDenominator = inverse(denominator);
    const slope = mod(numerator * inverseDenominator);
    const x = mod(slope * slope - p.x - q.x);
    const y = mod(slope * (p.x - x) - p.y);
    const result = { x, y };
    if (!isOnCurve(result)) throw new Error('Internal arithmetic check failed.');
    return {
      point: result, kind: doubling ? 'doubling' : 'addition',
      numerator, denominator, inverseDenominator, slope,
      explanation: `λ = (${numerator} × ${inverseDenominator}) mod 17 = ${slope}; x₃ = ${x}, y₃ = ${y}.`
    };
  }

  function add(p, q) { return addDetailed(p, q).point; }

  function multiples(base, k) {
    if (!Number.isSafeInteger(k) || k < 0) throw new Error('k must be a nonnegative integer.');
    if (!isOnCurve(base) || base === null) throw new Error('Choose a finite point on the curve.');
    const steps = [];
    let current = null;
    for (let i = 1; i <= k; i++) {
      const previous = current;
      const calculation = addDetailed(current, base);
      current = calculation.point;
      steps.push({ k: i, previous, base, result: current, ...calculation });
    }
    return steps;
  }

  function multiply(base, k) {
    if (!Number.isSafeInteger(k) || k < 0) throw new Error('k must be a nonnegative integer.');
    if (!isOnCurve(base)) throw new Error('Point not on the curve.');
    let result = null, current = base, n = k;
    while (n > 0) {
      if (n % 2 === 1) result = add(result, current);
      current = add(current, current);
      n = Math.floor(n / 2);
    }
    return result;
  }

  function order(base) {
    if (base === null || !isOnCurve(base)) throw new Error('Expected a valid finite base point.');
    let point = null;
    for (let i = 1; i <= 2 * P + 2; i++) {
      point = add(point, base);
      if (point === null) return i;
    }
    throw new Error('Could not find the point order.');
  }

  function format(point) { return point === null ? 'O (infinity)' : `(${point.x}, ${point.y})`; }

  function countBits(n) {
    let count = 0;
    for (let i = 0; i < 5; i++) count += (n >> i) & 1;
    return count;
  }

  function pearson(samples, coordinate) {
    if (samples.length < 2) return null;
    const n = samples.length;
    const meanK = samples.reduce((s, e) => s + e.k, 0) / n;
    const meanV = samples.reduce((s, e) => s + e.point[coordinate], 0) / n;
    let covariance = 0, varianceK = 0, varianceV = 0;
    for (const sample of samples) {
      const dk = sample.k - meanK, dv = sample.point[coordinate] - meanV;
      covariance += dk * dv;
      varianceK += dk * dk;
      varianceV += dv * dv;
    }
    return varianceK * varianceV === 0 ? null : covariance / Math.sqrt(varianceK * varianceV);
  }

  function entropy(frequencies, count) {
    if (!count) return 0;
    return frequencies.reduce((h, frequency) => {
      if (!frequency) return h;
      const p = frequency / count;
      return h - p * Math.log2(p);
    }, 0);
  }

  function statistics(base, n) {
    if (!Number.isSafeInteger(n) || n < 1 || n > 200) throw new Error('Use between 1 and 200 private key values.');
    const outcomes = Array.from({ length: n }, (_, index) => ({ k: index + 1, point: multiply(base, index + 1) }));
    const samples = outcomes.filter(o => o.point !== null);
    const xFrequencies = Array(P).fill(0), yFrequencies = Array(P).fill(0);
    const xBitOnes = Array(5).fill(0), yBitOnes = Array(5).fill(0);
    for (const { point } of samples) {
      xFrequencies[point.x]++;
      yFrequencies[point.y]++;
      for (let bit = 0; bit < 5; bit++) {
        xBitOnes[bit] += (point.x >> bit) & 1;
        yBitOnes[bit] += (point.y >> bit) & 1;
      }
    }
    const transitions = [];
    for (let i = 1; i < outcomes.length; i++) {
      const previous = outcomes[i - 1].point;
      const current = outcomes[i].point;
      if (previous !== null && current !== null) {
        transitions.push(countBits(previous.x ^ current.x) + countBits(previous.y ^ current.y));
      }
    }
    return {
      n, samples, outcomes, infinityCount: n - samples.length,
      uniquePoints: new Set(samples.map(o => format(o.point))).size,
      xFrequencies, yFrequencies, xBitOnes, yBitOnes,
      xEntropy: entropy(xFrequencies, samples.length), yEntropy: entropy(yFrequencies, samples.length),
      correlationX: pearson(samples, 'x'), correlationY: pearson(samples, 'y'),
      meanAdjacentBitChanges: transitions.length ? transitions.reduce((a, b) => a + b, 0) / transitions.length : null,
      comparedTransitions: transitions.length
    };
  }

  global.ECCToy = Object.freeze({ P, A, B, mod, inverse, equals, isOnCurve, allPoints, add, addDetailed, multiples, multiply, order, format, statistics });
})(window);
