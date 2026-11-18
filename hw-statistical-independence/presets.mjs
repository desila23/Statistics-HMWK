// All samples except NIST are constructed illustrations, not measured attack data.
export const presets={
  association:{label:'Training × alert · illustrative association',note:'Constructed frequencies for teaching. An alert is an abstract binary outcome, not a measured cyberattack.',csv:'Training,Alert,Count\nCompleted,Flagged,15\nCompleted,Not flagged,45\nNot completed,Flagged,45\nNot completed,Not flagged,15',count:true},
  product:{label:'Exact product table · illustrative independence',note:'Constructed counts factor exactly into marginal proportions. This is empirical independence, not proof of population independence.',csv:'X,F,Count\nA,Yes,30\nA,No,20\nB,Yes,30\nB,No,20',count:true},
  sparse:{label:'Sparse sample · approximation warning',note:'Three individual observations. Expected counts are small, so this lab withholds the chi-square p-value.',csv:'X,F\nA,Yes\nB,No\nB,No',count:false},
  nist:{label:'NIST wafer defects × production shift',note:'Published NIST example: 309 defects, three shifts and four defect types. Data source: NIST/SEMATECH handbook §7.4.5.',csv:'Shift,Defect,Count\n1,A,15\n1,B,21\n1,C,45\n1,D,13\n2,A,26\n2,B,31\n2,C,34\n2,D,5\n3,A,33\n3,B,17\n3,C,49\n3,D,20',count:true}
};
