"""Regenerate independent SciPy fixtures. Not required to run the site."""
from pathlib import Path
import json
import numpy as np
import scipy
from scipy.stats import beta, binom, norm

convergence = []
for n,p,eps in [(1,.3,.1),(4,.5,.25),(20,.1,.05),(64,.5,.125),
                (256,.3,.1),(512,.95,.02),(2048,.05,.01),(4096,.95,.01)]:
    k = np.arange(n+1)
    z = (k-n*p)/np.sqrt(n*p*(1-p))
    gap = max(np.max(np.abs(binom.cdf(k,n,p)-norm.cdf(z))),
              np.max(np.abs(binom.cdf(k-1,n,p)-norm.cdf(z))))
    tail = binom.pmf(k,n,p)[np.abs(k/n-p)>eps+1e-14].sum()
    convergence.append([n,p,eps,float(tail),float(gap)])
posteriors = []
for a,b,n,k in [(1,1,0,0),(1,1,10,7),(2,8,10,7),(2,8,100,70),
                 (30,30,300,123),(1,1,300,300),(1,1,300,0),(30,1,0,0)]:
    A,B = a+k,b+n-k
    lo,hi = beta.ppf([.025,.975],A,B)
    posteriors.append([a,b,n,k,A,B,float(beta.mean(A,B)),float(lo),float(hi)])
Path(__file__).with_name('reference.json').write_text(json.dumps(
    dict(source='SciPy '+scipy.__version__, convergence=convergence,
         posteriors=posteriors, normal=[[x,float(norm.cdf(x))] for x in np.linspace(-8,8,321)]),
    separators=(',',':'))+'\n')
