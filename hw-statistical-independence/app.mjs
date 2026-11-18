import {parseCSV,contingency,analyze,exportCSV,limits} from './core.mjs';
import {presets} from './presets.mjs';
const $=id=>document.getElementById(id);
const fmt=(v,n=6)=>v==null?'Undefined':v===0?'0':Number(v.toPrecision(n)).toLocaleString('en-US',{maximumSignificantDigits:n});
const pct=v=>(v*100).toFixed(2)+'%';
const pLabel=v=>v===0?'< 10⁻³⁰⁰ (numeric underflow)':v<.0001?v.toExponential(4):fmt(v);
let parsed=null,result=null,source='Custom input';
const charts=new Map();
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
const delimiter=()=>$('delimiter').value==='tab'?'\t':$('delimiter').value;
function option(select,text,value){const el=document.createElement('option');el.value=value;el.textContent=text;select.append(el);}
function chooseColumns(data){
  const previous=parsed;
  const xName=previous?.header[Number($('xColumn').value)],fName=previous?.header[Number($('fColumn').value)];
  const countName=previous?.header[Number($('countColumn').value)];
  for(const id of ['xColumn','fColumn','countColumn'])$(id).replaceChildren();
  option($('countColumn'),'None · each row is one observation',-1);
  data.header.forEach((name,i)=>{for(const id of ['xColumn','fColumn','countColumn'])option($(id),name,i);});
  $('xColumn').value=data.header.includes(xName)?data.header.indexOf(xName):0;
  $('fColumn').value=data.header.includes(fName)?data.header.indexOf(fName):1;
  const detected=data.header.findIndex(h=>h.toLowerCase()==='count');
  $('countColumn').value=data.header.includes(countName)?data.header.indexOf(countName):detected;
}
function read(){
  const data=parseCSV($('csvInput').value,delimiter());
  chooseColumns(data);parsed=data;
  status('Read '+data.rows.length.toLocaleString('en')+' data rows. Select X, F and the count column, then analyze.');
  return data;
}
function run(){
  try{
    const data=parseCSV($('csvInput').value,delimiter());
    if(!parsed||JSON.stringify(parsed.header)!==JSON.stringify(data.header))chooseColumns(data);
    parsed=data;
    const next=analyze(contingency(data,Number($('xColumn').value),Number($('fColumn').value),Number($('countColumn').value)));
    next.source=source;
    result=next;
    $('inspectX').replaceChildren();
    result.xLabels.forEach((label,i)=>option($('inspectX'),label,i));
    render();
    status('Analysis complete. '+result.used.toLocaleString('en')+' input rows retained; '+result.missing+' incomplete pairs and '+result.zero+' zero-count rows excluded.');
    $('export').disabled=false;
  }catch(e){status(e.message+(result?' Previous completed results remain visible.':''),true);}
}
function load(){
  const selected=presets[$('preset').value];
  $('sampling').checked=false;source=selected.label;$('sourceNote').textContent=selected.note;$('csvInput').value=selected.csv;$('delimiter').value=',';
  parsed=null;read();$('countColumn').value=selected.count?2:-1;run();
}
function table(id,caption,heads,rows,foot=[]){
  const target=$(id);target.replaceChildren();
  const cap=document.createElement('caption');cap.textContent=caption;target.append(cap);
  const header=document.createElement('thead'),hr=document.createElement('tr');
  heads.forEach(name=>{const th=document.createElement('th');th.scope='col';th.textContent=name;hr.append(th);});header.append(hr);target.append(header);
  const body=document.createElement('tbody');
  for(const row of rows){
    const tr=document.createElement('tr');
    row.forEach((value,i)=>{const cell=document.createElement(i===0?'th':'td');if(i===0)cell.scope='row';cell.textContent=value;tr.append(cell);});
    body.append(tr);
  }
  target.append(body);
  if(foot.length){
    const footer=document.createElement('tfoot'),tr=document.createElement('tr');
    foot.forEach((value,i)=>{const cell=document.createElement(i===0?'th':'td');if(i===0)cell.scope='row';cell.textContent=value;tr.append(cell);});
    footer.append(tr);target.append(footer);
  }
}
function metrics(id,values){
  const nodes=values.map(([label,value])=>{const div=document.createElement('div'),small=document.createElement('small'),b=document.createElement('b');div.className='metric';small.textContent=label;b.textContent=value;div.append(small,b);return div;});
  $(id).replaceChildren(...nodes);
}
function renderTable(){
  if(!result)return;
  const a=result,mode=$('view').value,r=a.xLabels.length,c=a.fLabels.length;
  const matrix=a[mode];
  const percent=['joint','rowConditional','colConditional'].includes(mode);
  const value=v=>percent?pct(v):fmt(v);
  let last='Row total',footer=['Column total',...a.colTotals.map(v=>fmt(v)),fmt(a.total)];
  if(mode==='joint')footer=['Marginal P(F)',...a.colTotals.map(v=>pct(v/a.total)),'100.00%'];
  if(mode==='rowConditional'){last='Row sum';footer=['Marginal P(F)',...a.colTotals.map(v=>pct(v/a.total)),'100.00%'];}
  if(mode==='colConditional'){last='Marginal P(X)';footer=['Column sum',...Array(c).fill('100.00%'),'100.00%'];}
  const descriptions={
    observed:'Each cell counts observations with both category labels. Row totals count X; column totals count F.',
    expected:'Expected counts E = row total × column total / N. The fitted table has the same row and column totals as the observations.',
    joint:'Joint relative frequencies use N as the denominator. Every cell together sums to 100%; the margins give P(X) and P(F).',
    rowConditional:'F given X: each cell uses its row total as denominator. Each row sums to 100%. The bottom row is the unconditional marginal distribution of F, not a sum of conditional rows.',
    colConditional:'X given F: each cell uses its column total as denominator. Each column sums to 100%. The rightmost column is the unconditional marginal of X, not a row sum.'
  };
  $('viewDescription').textContent=descriptions[mode];
  const rows=matrix.map((row,i)=>[a.xLabels[i],...row.map(value),mode==='rowConditional'?'100.00%':mode==='colConditional'||mode==='joint'?pct(a.rowTotals[i]/a.total):fmt(a.rowTotals[i])]);
  table('frequencyTable',a.xName+' × '+a.fName+' · '+$('view').selectedOptions[0].textContent,[a.xName+' \\ '+a.fName,...a.fLabels,last],rows,footer);
}
function renderConditional(){
  if(!result)return;
  const a=result,i=Number($('inspectX').value)||0;
  const style=getComputedStyle(document.documentElement),color=style.getPropertyValue('--muted').trim(),grid=style.getPropertyValue('--line').trim();
  charts.get('conditional')?.destroy();
  const datasets=[
    {label:'F given '+a.xName+' = '+a.xLabels[i],data:a.rowConditional[i].map(v=>v*100),backgroundColor:'#148f82',borderRadius:3},
    {label:'Marginal F · independence prediction',data:a.colTotals.map(v=>v/a.total*100),backgroundColor:'#4d8bd0',borderRadius:3}
  ];
  charts.set('conditional',new Chart($('conditionalChart'),{type:'bar',data:{labels:a.fLabels,datasets},options:{
    responsive:true,maintainAspectRatio:false,animation:false,
    plugins:{legend:{position:'bottom',labels:{color,boxWidth:12}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.parsed.y.toFixed(2)+'%'}}},
    scales:{x:{ticks:{color,callback:function(v){const s=this.getLabelForValue(v);return s.length>16?s.slice(0,15)+'…':s;}},grid:{display:false},title:{display:true,text:a.fName+' category',color}},y:{min:0,max:100,ticks:{color,callback:v=>v+'%'},grid:{color:grid},title:{display:true,text:'Relative frequency',color}}}
  }}));
  $('conditionalNote').textContent='Conditioning on '+a.xName+' = '+a.xLabels[i]+' uses '+fmt(a.rowTotals[i])+' observations. Under empirical independence, the two bars match in every F category.';
}
function renderInference(){
  if(!result)return;
  const a=result,alpha=Number($('alpha').value),assumed=$('sampling').checked;
  metrics('testMetrics',[
    ['Pearson χ²',fmt(a.stat,8)],['Degrees of freedom',a.df],['Approximate p-value',a.df===0?'Undefined':a.adequate?pLabel(a.p):'Withheld · sparse table'],['Cramér’s V',a.v===null?'Undefined':fmt(a.v)]
  ]);
  $('adequacy').classList.toggle('warning',!a.adequate||!assumed);
  $('adequacy').textContent=a.df===0?'A variable has only one retained category. Descriptive frequencies are defined, but there is no nontrivial independence test (df = 0).':!a.adequate?
    fmt(a.minExpected)+' is the smallest expected count. '+a.belowFive+' of '+a.expected.flat().length+' cells have E < 5. This lab withholds the asymptotic p-value and the significance decision. Consider an exact or Monte Carlo method.':
    'All '+a.expected.flat().length+' expected counts are at least 5 (minimum '+fmt(a.minExpected)+'). This meets the lab’s conservative expected-count screen. '+(assumed?'Sampling assumptions are user-supplied, not verified by the data.':'The sampling-design assumption is not selected; the p-value is shown conditionally, not as a validated population inference.');
  $('interpretation').textContent=a.sampleIndependent?
    'The empirical joint frequencies factor exactly into the product of the empirical margins. X and F are independent in this finite empirical distribution. That equality does not establish independence in the population.':
    'The empirical joint frequencies do not factor exactly into the product of the margins. The sample shows an association between X and F. Sampling fluctuation can create a departure even when the population variables are independent.';
  let inference;
  if(a.df===0)inference='No population conclusion can be obtained from a chi-square test with zero degrees of freedom.';
  else if(!a.adequate)inference='No significance decision is reported because the chi-square approximation is not reliable under this lab’s expected-count rule.';
  else{
    const reject=a.p<alpha;
    inference=(assumed?'Under the stated sampling assumptions, ':'If the stated sampling assumptions hold, ')+(reject?
      'reject H₀ at α = '+alpha+' (p '+(a.p===0?'< 10⁻³⁰⁰':'= '+pLabel(a.p))+'). There is evidence of a population association under this model.':
      'fail to reject H₀ at α = '+alpha+' (p = '+pLabel(a.p)+'). The data do not provide sufficient evidence of dependence; this is not proof of independence.');
    if(!assumed)inference+=' This is a conditional calculation, not a confirmed inferential conclusion.';
  }
  $('inference').textContent=inference;
  $('effect').textContent=a.v===null?'Cramér’s V is undefined for a one-category variable.':"Cramér’s V = "+fmt(a.v)+", computed as √[χ² / (N × min(r−1,c−1))]. This is an uncorrected descriptive effect size. Its practical importance depends on the setting; it has no causal direction.";
  $('conclusion').textContent='For '+a.xName+' and '+a.fName+' in the current '+fmt(a.total)+'-observation table, '+(a.sampleIndependent?'the empirical distribution is exactly independent. ':'the empirical distribution departs from independence. ')+inference+' None of these results establishes that changing one variable causes a change in the other.';
}
function render(){
  const a=result;
  $('activeDataset').textContent=a.source+' · X = '+a.xName+' · F = '+a.fName+' · '+fmt(a.total)+' retained observations. '+(a.weighted?'Count-column mode.':'One observation per CSV row.');
  metrics('metrics',[['Observations N',fmt(a.total)],['X categories',a.xLabels.length],['F categories',a.fLabels.length],['Smallest expected count',fmt(a.minExpected)]]);
  renderTable();
  table('marginals','Counts and proportions for each variable',['Variable','Category','Count','Relative frequency'],[
    ...a.xLabels.map((s,i)=>[a.xName,s,fmt(a.rowTotals[i]),pct(a.rowTotals[i]/a.total)]),
    ...a.fLabels.map((s,j)=>[a.fName,s,fmt(a.colTotals[j]),pct(a.colTotals[j]/a.total)])
  ]);
  const cells=[];
  a.observed.forEach((row,i)=>row.forEach((o,j)=>cells.push([a.xLabels[i],a.fLabels[j],fmt(o),fmt(a.expected[i][j]),fmt(o-a.expected[i][j]),fmt(a.residuals[i][j]),fmt(a.contributions[i][j])])));
  table('diagnostics','Cell departures from the independence model',[a.xName,a.fName,'Observed','Expected','O − E','Pearson residual','χ² contribution'],cells,['Total','',fmt(a.total),fmt(a.total),'0','—',fmt(a.stat)]);
  renderConditional();renderInference();
}
for(const [key,p] of Object.entries(presets))option($('preset'),p.label,key);
$('load').onclick=load;
$('read').onclick=()=>{try{read();}catch(e){status(e.message,true);}};
$('analysisForm').onsubmit=e=>{e.preventDefault();run();};
$('view').onchange=renderTable;$('inspectX').onchange=renderConditional;
$('alpha').onchange=$('sampling').onchange=renderInference;
for(const id of ['csvInput','delimiter','xColumn','fColumn','countColumn'])$(id).addEventListener('input',()=>{
  status('Inputs changed. Analyze again to update results. Previous completed results retain their original data.');
  if(['csvInput','delimiter'].includes(id)){source='Custom input';$('sourceNote').textContent='Custom data. The sampling design and meaning of each row must be checked by the analyst.';}
});
$('file').onchange=async()=>{
  const file=$('file').files[0];if(!file)return;
  try{
    if(file.size>limits.characters)throw Error('Upload a file of at most 1,000,000 bytes.');
    $('sampling').checked=false;$('csvInput').value=await file.text();source='Uploaded CSV';$('sourceNote').textContent='Uploaded file: '+file.name+'. Choose the delimiter, read columns and check the selected variables.';
    parsed=null;read();
  }catch(e){status(e.message,true);}
};
$('export').onclick=()=>{
  if(!result)return;
  const text=exportCSV(result,Number($('alpha').value),$('sampling').checked),url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='statistical-independence-cells.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function themeLabel(){$('theme').setAttribute('aria-pressed',String(document.documentElement.dataset.theme==='dark'));}
$('theme').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('statsTheme',theme);}catch{}themeLabel();renderConditional();};
themeLabel();load();
