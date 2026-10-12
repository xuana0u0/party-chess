/* 校验 EXAM_BANK 答案是否与题干规律/公式一致（安全版） */
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/const EXAM_BANK = (\[[\s\S]*?\n\];)/);
const BANK = eval(m[1].replace(/;$/, ''));

function isPrime(v){ if(v<2) return false; v=Math.round(v); for(let d=2; d*d<=v; d++) if(v%d===0) return false; return true; }
function isComp(v){ v=Math.round(v); if(v<4) return false; return !isPrime(v); }
function nextPrime(x){ let v=Math.ceil(x)+((x%1===0)?1:0); while(!isPrime(v)) v++; return v; }
function nextComp(x){ let v=Math.ceil(x)+((x%1===0)?1:0); while(!isComp(v)) v++; return v; }

function parseNum(x){ x=String(x).trim(); if(x.includes('/')){const [a,b]=x.split('/').map(Number); return a/b;} return Number(x); }
function parseSeq(q){ let s=q.replace(/（[^）]*）/g,''); return s.split(/[，,\s]+/).map(x=>x.trim()).filter(x=>x.length).map(parseNum); }
function near(a,b){ return Math.abs(a-b)<1e-6; }

function polyExtrapolate(seq){
  const n=seq.length; let d=seq.slice(); const diffs=[];
  while(d.length>1){
    const nd=[];
    for(let i=1;i<d.length;i++) nd.push(d[i]-d[i-1]);
    diffs.push(nd);
    if(nd.every(x=>near(x,nd[0]))){
      let vals=[seq[n-1]]; let dd=diffs.map(dl=>dl[dl.length-1]);
      let ext=dd[dd.length-1];
      for(let k=dd.length-2;k>=0;k--) ext=dd[k]+ext;
      return vals[0]+ext;
    }
    d=nd;
  }
  return null;
}

function expectedNum(t, seq){
  const n=seq.length, last=seq[n-1];
  switch(t){
    case '一级等差': return last+(seq[1]-seq[0]);
    case '二级等差': return last+(seq[n-1]-seq[n-2])+(seq[n-1]-2*seq[n-2]+seq[n-3]);
    case '三级等差': return polyExtrapolate(seq);
    case '等比': { const r=seq[1]/seq[0]; if(seq.slice(1).every((v,i)=>near(v,seq[i]*r))) return last*r; return null; }
    case '差后等比': { const d=seq.slice(1).map((v,i)=>v-seq[i]); const r=d[1]/d[0]; if(d.slice(1).every((v,i)=>near(v,d[i]*r))) return last+d[d.length-1]*r; return null; }
    case '平方数列': { const p=Math.round(Math.sqrt(seq[0])); if(seq.every((v,i)=>near(v,(i+p)*(i+p)))) return (n+p)*(n+p); return null; }
    case '平方修正': { const p=(seq[1]-seq[0]-1)/2; const c=seq[0]-p*p; if(seq.every((v,i)=>near(v,(i+p)*(i+p)+c))) return (n+p)*(n+p)+c; return null; }
    case '立方数列': { const p=Math.round(Math.cbrt(seq[0])); if(seq.every((v,i)=>near(v,Math.pow(i+p,3)))) return Math.pow(n+p,3); return null; }
    case '立方修正': { for(const p of [1,2,3]){ const c=seq[0]-Math.pow(p,3); if(seq.every((v,i)=>near(v,Math.pow(i+p,3)+c))) return Math.pow(n+p,3)+c; } return null; }
    case '递推和': return last+seq[n-2];
    case '三项递推和': return last+seq[n-2]+seq[n-3];
    case '倍数递推': { const k=(seq[2]-seq[1])/(seq[1]-seq[0]); const c=seq[1]-seq[0]*k; if(seq.slice(2).every((v,i)=>near(v,seq[i+1]*k+c))) return last*k+c; return null; }
    case '混合递推': { const k=(seq[2]-seq[1])/seq[0]; if(seq.slice(2).every((v,i)=>near(v,seq[i+1]+seq[i]*k))) return last+seq[n-2]*k; return null; }
    case '质数列': return nextPrime(last);
    case '合数列': return nextComp(last);
    case '间隔数列': { const oddP=seq.filter((_,i)=>i%2===1),evenP=seq.filter((_,i)=>i%2===0); const useOdd=(n%2===1); const sub=useOdd?oddP:evenP; const d=sub[1]-sub[0]; if(sub.slice(1).every((v,i)=>near(v,sub[i]+d))) return sub[sub.length-1]+d; return null; }
    case '分组数列': { const k=seq[1]/seq[0]; if(near(seq[3],seq[2]*k)) return last*k; return null; }
    case '幂次修正': { for(const base of [2,3]) for(const sign of [1,-1]){ let ok=true; for(let i=0;i<n;i++) if(!near(seq[i],Math.pow(base,i+1)+sign*(i+1))){ok=false;break;} if(ok) return Math.pow(base,n+1)+sign*(n+1); } return null; }
    case '乘积分解': { const p=seq[0]-1; if(seq.every((v,i)=>near(v,(i+1)*(i+1+p)))) return (n+1)*(n+1+p); return null; }
  }
  return null;
}

/* 分数数列：分子分母分别外推（常数/等差/二次） */
function extrapolate(arr){
  if(arr.every(x=>near(x,arr[0]))) return arr[0];
  const d1=arr.slice(1).map((v,i)=>v-arr[i]);
  if(d1.every(x=>near(x,d1[0]))) return arr[arr.length-1]+d1[0];
  const d2=d1.slice(1).map((v,i)=>v-d1[i]);
  if(d2.every(x=>near(x,d2[0]))) return arr[arr.length-1]+d1[d1.length-1]+d2[0];
  return null;
}
function expectedFrac(q){
  const toks=q.replace(/（[^）]*）/g,'').split(/[，,\s]+/).map(x=>x.trim()).filter(x=>x.length);
  const fr=toks.map(s=>{const [a,b]=s.split('/').map(Number); return {a,b};});
  const nN=extrapolate(fr.map(f=>f.a)), nD=extrapolate(fr.map(f=>f.b));
  if(nN===null||nD===null) return null;
  return { num:nN, den:nD, str:nN+'/'+nD, val:nN/nD };
}

/* 通用多套路（无 t 标签手写题） */
function fact(k){ let r=1; for(let i=2;i<=k;i++) r*=i; return r; }
function generalExp(seq){
  const n=seq.length;
  const cands=[];
  const add=v=>{ if(v!==null&&Number.isFinite(v)) cands.push(Math.round(v*1e6)/1e6); };
  for(const t of ['一级等差','等比','平方数列','立方数列','平方修正','立方修正','递推和','三项递推和','倍数递推','混合递推','质数列','合数列','间隔数列','分组数列','幂次修正','乘积分解'])
    add(expectedNum(t,seq));
  add(polyExtrapolate(seq));                                   // 覆盖二级/三级等差
  if(seq.every((v,i)=>near(v,fact(i+1)))) add(fact(n+1));     // 阶乘
  const sos=i=>i*(i+1)*(2*i+1)/6;
  if(seq.every((v,i)=>near(v,sos(i+1)))) add(sos(n+1));        // 平方累加
  if(seq.every((v,i)=>near(v,Math.pow(i+1,4)))) add(Math.pow(n+1,4)); // 四次方
  return cands;
}

/* 数学运算：仅校验带 t 的生成题 */
function expectedMath(t, q){
  const g=(re)=>{ const mm=q.match(re); return mm?Number(mm[1]):null; };
  switch(t){
    case '工程问题': { const a=g(/甲[^\d]*(\d+)\s*天/), b=g(/乙[^\d]*(\d+)\s*天/); return 1/(1/a+1/b); }
    case '行程问题': { const d=g(/相距\s*(\d+)\s*千米/), v1=g(/速度分别为\s*(\d+)\s*千米/), v2=g(/和\s*(\d+)\s*千米/); return d/(v1+v2); }
    case '利润问题': { const p=g(/进价\s*(\d+)/), m=g(/标价\s*(\d+)/); const zh={'零':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9}; let z=g(/打\s*(\d+)\s*折/); if(z===null){ const zc=q.match(/打\s*([零一二三四五六七八九])\s*折/); z=zc?zh[zc[1]]:null; } return (m*z/10-p)/p*100; }
    case '浓度问题': { const c=g(/含盐\s*(\d+)/), w=g(/盐水\s*(\d+)\s*克/), w2=g(/加入\s*(\d+)\s*克水/); return (w*c/100)/(w+w2)*100; }
    case '排列组合': { const n=g(/从\s*(\d+)\s*个人/), k=g(/选出\s*(\d+)\s*人/); let r=1; for(let i=0;i<k;i++) r*=(n-i); return r; }
    case '年龄问题': { const f=g(/父亲今年\s*(\d+)/), s=g(/儿子\s*(\d+)/), k=g(/的\s*(\d+)\s*倍/); return (f-k*s)/(k-1); }
    case '植树问题': { const l=g(/(\d+)\s*米长的路/), g2=g(/每隔\s*(\d+)\s*米/); return l/g2+1; }
    case '容斥原理': { const t=g(/某班\s*(\d+)\s*人/), x=g(/竞赛\s*(\d+)\s*人/), y=g(/英语竞赛\s*(\d+)\s*人/), z=g(/都参加\s*(\d+)\s*人/); return t-(x+y-z); }
    case '鸡兔同笼': { const h=g(/(\d+)\s*个头/), f=g(/(\d+)\s*只脚/); return (f-2*h)/2; }
    case '页码问题': { const p=g(/共\s*(\d+)\s*页/); let r=0; if(p>=1)r+=Math.min(p,9); if(p>=10)r+=Math.min(p-9,90)*2; if(p>=100)r+=(p-99)*3; return r; }
  }
  return null;
}

const problems=[];
let numChecked=0, numMismatch=0, noTflag=0;
const log=[];
for(const q of BANK){
  if(q.c!=='数字推理') continue;
  let exp=null, expStr=null, label='';
  if(q.t==='分数数列'){ const f=expectedFrac(q.q); if(f){ exp=f.val; expStr=f.str; } label='分数数列'; }
  else if(q.t){ exp=expectedNum(q.t, parseSeq(q.q)); if(exp!==null) expStr=String(Math.round(exp*1e6)/1e6); label=q.t; }
  else {
    const cands=generalExp(parseSeq(q.q)); const oa=parseNum(q.o[q.a]);
    if(cands.some(c=>near(c,oa))) continue;
    noTflag++; problems.push({ cat:q.c, q:q.q, issue:'无t手写题：o[a]='+q.o[q.a]+' 不在规律候选中', cands });
    continue;
  }
  if(exp===null){ problems.push({ cat:q.c, t:label, q:q.q, issue:'该套路公式无法推导（规律与标签不符）', oa:q.o[q.a] }); continue; }
  const oa=parseNum(q.o[q.a]); numChecked++;
  if(!near(oa,exp)){ numMismatch++; problems.push({ cat:q.c, t:label, q:q.q, issue:'答案不符', shown:q.o.join('/'), a:q.a, oa:q.o[q.a], expected:expStr }); }
}
const out=[];
out.push('数字推理（带t）校验:'+numChecked+' 不匹配:'+numMismatch+' 无t需复核:'+noTflag);

let mChecked=0, mMismatch=0;
const stripPct=s=>Number(String(s).replace('%',''));
for(const q of BANK){
  if(q.c!=='数学运算'||!q.t) continue;
  const exp=expectedMath(q.t,q.q);
  if(exp===null){ problems.push({cat:q.c,t:q.t,q:q.q,issue:'公式解析失败',oa:q.o[q.a]}); continue; }
  mChecked++;
  if(!near(stripPct(q.o[q.a]),exp)){ mMismatch++; problems.push({cat:q.c,t:q.t,q:q.q,issue:'答案不符',shown:q.o.join('/'),a:q.a,oa:q.o[q.a],expected:Math.round(exp*1e3)/1e3}); }
}
out.push('数学运算（带t）校验:'+mChecked+' 不匹配:'+mMismatch);
out.push('=== 问题题 ===');
for(const p of problems) out.push(JSON.stringify(p));
if(!problems.length) out.push('（无）');
fs.writeFileSync('_verify_result.txt', out.join('\n'), 'utf8');
console.log(out.join('\n'));
