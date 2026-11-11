"""Rebuild binary64 fixtures with mpmath 1.3.0; not needed by the website."""
import json
from pathlib import Path
import mpmath as mp

mp.mp.dps = 75
ROOT = Path(__file__).resolve().parent
DISPLAY = [-38, -20, -12, -8, -6, -4, -3, -2, -1, -.5, 0, .5, 1, 1.5,
           1.732, 1.733, 1.96, 2, 3, 4, 6, 8, 12, 20, 38]
GRID = sorted(set(DISPLAY + [i / 16 for i in range(-608, 609)] +
                  [1.7320508075688772, 1.7320508075688774]))

def fixtures(points):
    rows = []
    for value in points:
        z = mp.mpf(str(value))
        q = mp.erfc(abs(z) / mp.sqrt(2)) / 2
        rows.append({"z": value, "cdf": float(q if z < 0 else 1 - q), "tail": float(q)})
    return json.dumps(rows, separators=(",", ":")) + "\n"

(ROOT / "reference.mjs").write_text(
    "// mpmath 1.3.0, 75 digits: erfc(|z|/sqrt(2))/2, rounded to binary64.\n"
    "export const reference = " + fixtures(DISPLAY), encoding="utf-8")
(ROOT / "test-reference.json").write_text(fixtures(GRID), encoding="utf-8")
