/* Optional math checks: run with `node test-ecc.js` from the project folder. */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync('./js/ecc.js', 'utf8'), context);
const ECC = context.window.ECCToy;
const g = { x: 1, y: 5 };
const asObject = p => p ? { x: p.x, y: p.y } : null;
assert.equal(ECC.allPoints().length, 17);
assert.equal(ECC.order(g), 9);
assert.equal(ECC.order({x: 6,y: 6}), 18);
assert.deepEqual(asObject(ECC.multiply(g, 6)), { x: 5, y: 8 });
assert.deepEqual(asObject(ECC.multiply(g, 9)), null);
assert.deepEqual(asObject(ECC.multiply(g, 10)), g);
for (const p of ECC.allPoints()) {
  const ord = ECC.order(p);
  for (let k = 0; k <= 100; k++) {
    const repeated = k ? ECC.multiples(p, k)[k - 1].result : null;
    assert.deepEqual(asObject(repeated), asObject(ECC.multiply(p, k)));
    assert.ok(ECC.isOnCurve(repeated));
    assert.deepEqual(asObject(ECC.multiply(p, k + ord)), asObject(ECC.multiply(p, k)));
  }
}
const sample = ECC.statistics(g, 9);
assert.equal(sample.infinityCount, 1);
assert.equal(sample.uniquePoints, 8);
assert.equal(sample.samples.length, 8);
assert.equal(sample.xFrequencies.reduce((a,b)=>a+b,0), 8);
assert.equal(sample.yFrequencies.reduce((a,b)=>a+b,0), 8);
console.log('All ECC and statistical checks passed.');
