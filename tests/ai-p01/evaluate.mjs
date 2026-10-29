/** One-shot AI-P01 on a frozen synthetic corpus; not application runtime. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const pct=(v,p)=>v.slice().sort((a,b)=>a-b)[Math.min(v.length-1,Math.floor((v.length-1)*p))]||0;
const avg=v=>v.reduce((a,b)=>a+b,0)/v.length;
function score(queries,rank){
 let n=0;const cases=queries.map(q=>{
  const ids=rank(q,n++).slice(0,3);const hits=ids.filter(id=>q.relevant.includes(id)).length;
  const first=ids.findIndex(id=>q.relevant.includes(id));
  return {id:q.id,group:q.group,p3:hits/3,r3:hits/q.relevant.length,mrr:first<0?0:1/(first+1),top:ids};
 });
 const metrics=a=>({precision3:+avg(a.map(v=>v.p3)).toFixed(4),recall3:+avg(a.map(v=>v.r3)).toFixed(4),mrr:+avg(a.map(v=>v.mrr)).toFixed(4)});
 return {all:metrics(cases),paraphrase:metrics(cases.filter(v=>v.group==='paraphrase')),cases};
}
export async function runPoc(pipeline,env){
 const raw=readFileSync(new URL('./ai-p01-fixture.json',import.meta.url));
 const hash=createHash('sha256').update(raw).digest('hex');
 const data=JSON.parse(raw);const visible=data.posts.filter(x=>x.status==='published');
 if(visible.length!==30||data.queries.length!==30||data.posts.length!==31)throw Error('fixture_integrity');
 const passages=visible.map(p=>({id:p.id,text:p.title+' '+p.body+' '+p.section.title+' '+p.section.description}));
 const lexical=score(data.queries,q=>passages.filter(p=>normalize(p.text).includes(normalize(q.query))).map(p=>p.id));
 console.log('AI_P01_BASELINE '+JSON.stringify({all:lexical.all,paraphrase:lexical.paraphrase,fixtureSha256:hash}));
 env.cacheDir=process.env.RUNNER_TEMP+'/ai-p01-model-cache';
 const transfers=new Map(),begin=performance.now();
 const extractor=await pipeline('feature-extraction','Xenova/multilingual-e5-small',{
   device:'cpu',dtype:'q8',
   progress_callback:e=>{if(e.file&&Number.isFinite(e.total))transfers.set(e.file,Math.max(transfers.get(e.file)||0,e.total));}
 });
 const loadingMs=Math.round(performance.now()-begin);
 async function embed(s){const begin=performance.now();const output=await extractor(s,{pooling:'mean',normalize:true});return {vec:Float32Array.from(output.data),ms:performance.now()-begin};}
 const docVec=[];for(const p of passages)docVec.push((await embed('passage: '+p.text)).vec);
 const queryVec=[],warm=[];for(const q of data.queries){const x=await embed('query: '+q.query);queryVec.push(x.vec);warm.push(x.ms);}
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 const semantic=score(data.queries,(_q,i)=>passages.map((p,j)=>({id:p.id,similarity:dot(queryVec[i],docVec[j])})).sort((a,b)=>b.similarity-a.similarity).map(p=>p.id));
 console.log('AI_P01_MODEL '+JSON.stringify({model:'Xenova/multilingual-e5-small',dtype:'q8',runtime:'@huggingface/transformers@4.3.1',fixtureSha256:hash,node:'24',platform:'GitHub ubuntu-24.04 4-core CPU',initializationMs:loadingMs,warmMsP50:Math.round(pct(warm,.5)),warmMsP95:Math.round(pct(warm,.95)),vectorDims:docVec[0].length,observedFileTotals:[...transfers].map(([path,bytes])=>({file:path.split('/').pop(),bytes}))}));
 console.log('AI_P01_RESULTS '+JSON.stringify({baseline:lexical.all,semantic:semantic.all,baselineParaphrase:lexical.paraphrase,semanticParaphrase:semantic.paraphrase,perQuery:semantic.cases.map(x=>({id:x.id,p3:x.p3,top:x.top}))}));
 const passes=semantic.all.precision3>=.8&&semantic.paraphrase.recall3>lexical.paraphrase.recall3;
 console.log('AI_P01_RETRIEVAL_GATE '+(passes?'PASS':'CHANGES_REQUIRED'));
 console.log('AI_P01_UNTESTED browser-mobile-performance, offline-cold, intent-action, licensed-distribution-quota; overall AI-P01 PARTIAL');
 await extractor.dispose();
}
