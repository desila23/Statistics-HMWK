"""Generate independent reference fixtures with SciPy (not needed at runtime)."""
import json
from pathlib import Path
import scipy
from scipy.stats import chi2, chi2_contingency

tables = {
    "product": [[30,20],[30,20]],
    "association": [[15,45],[45,15]],
    "sparse": [[1,0],[0,2]],
    "nist": [[15,21,45,13],[26,31,34,5],[33,17,49,20]],
    "scipy_published": [[10,10,20],[20,20,20]],
    "unequal": [[51,7,12],[9,23,3],[11,17,40]],
    "zero_cell": [[0,30],[20,10]],
}
cases = []
for name, observed in tables.items():
    statistic, p, df, expected = chi2_contingency(observed, correction=False)
    cases.append(dict(name=name, observed=observed, statistic=float(statistic),
                      p=float(p), df=int(df), expected=expected.tolist()))
sf = [dict(df=df, statistic=t, p=float(chi2.sf(t,df)))
      for df in [1,2,3,6,10,25,100,200,361]
      for t in [0,.0001,.1,1,2,5,10,20,50,100,200,400,800,1200]]
target = Path(__file__).with_name("reference.json")
target.write_text(json.dumps(dict(source="SciPy "+scipy.__version__,
                                 correction=False, tables=cases, survival=sf),indent=2)+"\n")
