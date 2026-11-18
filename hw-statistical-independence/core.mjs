export const limits=Object.freeze({characters:1000000,rows:20000,categories:20,total:10000000});

/** Small strict CSV reader: quoted commas/newlines, doubled quotes and CRLF. */
export function parseCSV(text,delimiter=','){
  if(typeof text!=='string'||text.length>limits.characters)throw Error('Use a CSV of at most 1,000,000 characters.');
  text=text.replace(/^\uFEFF/,'');
  const rows=[];let row=[],field='',quoted=false,closed=false,started=false;
  const cell=()=>{row.push(field);field='';closed=false;started=false;};
  const end=()=>{cell();if(row.some(s=>s.trim()!==''))rows.push(row);row=[];if(rows.length>limits.rows+1)throw Error('Use at most 20,000 data rows.');};
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){
      if(ch==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}
      else field+=ch;
    }else if(ch==='"'){
      if(started||closed)throw Error('A quote must begin a CSV field.');
      quoted=true;started=true;
    }else if(ch===delimiter){cell();}
    else if(ch==='\r'||ch==='\n'){if(ch==='\r'&&text[i+1]==='\n')i++;end();}
    else{
      if(closed)throw Error('Unexpected text after a closing quote.');
      field+=ch;started=true;
    }
  }
  if(quoted)throw Error('Unclosed quoted CSV field.');
  if(field!==''||row.length||closed)end();
  if(rows.length<2)throw Error('Include a header and at least one data row.');
  const header=rows.shift().map(s=>s.trim());
  if(header.some(s=>!s)||new Set(header).size!==header.length)throw Error('Header names must be nonempty and unique.');
  if(header.length<2||header.length>50)throw Error('Use 2 to 50 columns.');
  if(rows.some(r=>r.length!==header.length))throw Error('Every data row must have the same number of fields as the header.');
  return {header,rows};
}
export function contingency(data,xColumn,fColumn,countColumn=-1){
  const {header,rows}=data;
  for(const col of [xColumn,fColumn])if(!Number.isInteger(col)||col<0||col>=header.length)throw Error('Choose valid X and F columns.');
  if(xColumn===fColumn)throw Error('Choose different columns for X and F.');
  if(!Number.isInteger(countColumn)||countColumn< -1||countColumn>=header.length||[xColumn,fColumn].includes(countColumn))throw Error('The count column must differ from X and F.');
  const xLabels=[],fLabels=[],xs=new Map(),fs=new Map(),entries=[];
  let missing=0,zero=0,total=0,used=0;
  for(let i=0;i<rows.length;i++){
    const row=rows[i],x=row[xColumn].trim(),f=row[fColumn].trim();
    if(!x||!f){missing++;continue;}
    let count=1;
    if(countColumn>=0){
      const raw=row[countColumn].trim();
      if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw)))throw Error('Row '+(i+2)+': count must be a nonnegative integer.');
      count=Number(raw);
    }
    if(!count){zero++;continue;}
    total+=count;
    if(total>limits.total)throw Error('Use at most 10 million total observations.');
    for(const [label,list,map] of [[x,xLabels,xs],[f,fLabels,fs]]){
      if(!map.has(label)){
        if(list.length>=limits.categories)throw Error('Use at most 20 categories per variable. Bin numeric data first.');
        map.set(label,list.length);list.push(label);
      }
    }
    entries.push([xs.get(x),fs.get(f),count]);used++;
  }
  if(!total)throw Error('No observations remain after excluding missing pairs and zero counts.');
  const observed=xLabels.map(()=>fLabels.map(()=>0));
  for(const [i,j,count] of entries)observed[i][j]+=count;
  return {xName:header[xColumn],fName:header[fColumn],xLabels,fLabels,observed,total,used,missing,zero,inputRows:rows.length,weighted:countColumn>=0};
}
export function logGamma(z){
  const p=[676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  z-=1;let x=.99999999999980993;
  for(let i=0;i<p.length;i++)x+=p[i]/(z+i+1);
  const t=z+7.5;
  return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);
}
/** Upper regularized incomplete gamma, for chi-square survival probabilities. */
export function gammaQ(a,x){
  if(!(a>0)||!(x>=0))throw Error('Invalid gamma arguments.');
  if(x===0)return 1;
  if(x===Infinity)return 0;
  const pref=Math.exp(a*Math.log(x)-x-logGamma(a)),eps=4*Number.EPSILON,tiny=1e-300;
  if(x<a+1){
    let term=1/a,sum=term;
    for(let i=1;i<=10000;i++){term*=x/(a+i);sum+=term;if(term<eps*sum)return Math.max(0,Math.min(1,1-pref*sum));}
  }else{
    const safe=v=>Math.abs(v)<tiny?(v<0?-tiny:tiny):v;
    let b=x+1-a,c=1/tiny,d=1/safe(b),h=d;
    for(let i=1;i<=10000;i++){
      const an=-i*(i-a);b+=2;d=1/safe(an*d+b);c=safe(b+an/c);
      const delta=d*c;h*=delta;
      if(Math.abs(delta-1)<eps)return Math.max(0,Math.min(1,pref*h));
    }
  }
  throw Error('Incomplete gamma iteration did not converge.');
}
export const chiSquareSF=(stat,df)=>gammaQ(df/2,stat/2);
export function analyze(t){
  const {observed:O,total:N}=t,r=O.length,c=O[0].length;
  const rowTotals=O.map(row=>row.reduce((a,b)=>a+b,0));
  const colTotals=Array.from({length:c},(_,j)=>O.reduce((s,row)=>s+row[j],0));
  const expected=O.map((row,i)=>row.map((_,j)=>rowTotals[i]*colTotals[j]/N));
  const joint=O.map(row=>row.map(o=>o/N));
  const rowConditional=O.map((row,i)=>row.map(o=>o/rowTotals[i]));
  const colConditional=O.map(row=>row.map((o,j)=>o/colTotals[j]));
  const residuals=O.map((row,i)=>row.map((o,j)=>(o-expected[i][j])/Math.sqrt(expected[i][j])));
  const contributions=residuals.map(row=>row.map(x=>x*x));
  const stat=contributions.flat().reduce((a,b)=>a+b,0),df=(r-1)*(c-1);
  const sampleIndependent=O.every((row,i)=>row.every((o,j)=>o*N===rowTotals[i]*colTotals[j]));
  const minExpected=Math.min(...expected.flat()),belowFive=expected.flat().filter(x=>x<5).length;
  return {...t,rowTotals,colTotals,expected,joint,rowConditional,colConditional,residuals,contributions,stat,df,sampleIndependent,minExpected,belowFive,
    adequate:df>0&&belowFive===0,
    p:df>0?chiSquareSF(stat,df):null,
    v:df>0?Math.sqrt(stat/(N*Math.min(r-1,c-1))):null};
}
export function csvCell(value){
  const raw=String(value);
  const s=typeof value==='string'&&/^[=+\-@\t\r]/.test(raw)?"'"+raw:raw;
  return '"'+s.replaceAll('"','""')+'"';
}
export function exportCSV(a,alpha,assumed){
  const rows=[['X_variable','F_variable','X_category','F_category','N','observed','joint_relative_frequency','F_given_X','X_given_F','expected_count','pearson_residual','chi_square_contribution','chi_square','df','asymptotic_p','minimum_expected','all_expected_at_least_5','cramers_V','alpha','sampling_assumed','row_total','column_total','marginal_X','marginal_F']];
  a.observed.forEach((row,i)=>row.forEach((o,j)=>rows.push([a.xName,a.fName,a.xLabels[i],a.fLabels[j],a.total,o,a.joint[i][j],a.rowConditional[i][j],a.colConditional[i][j],a.expected[i][j],a.residuals[i][j],a.contributions[i][j],a.stat,a.df,a.adequate?a.p:'',a.minExpected,a.adequate,a.v??'',alpha,assumed,a.rowTotals[i],a.colTotals[j],a.rowTotals[i]/a.total,a.colTotals[j]/a.total])));
  return rows.map(row=>row.map(csvCell).join(',')).join('\n')+'\n';
}
