// One-shot production smoke. Public requests only, strict cap, no retries, no personal data.
import assert from 'node:assert/strict';
const base='https://student-dashboard-bcy.pages.dev';
const sb='https://vgciiqtwmxcdqppntgnt.supabase.co';
const ai='https://khtn8-board-assistant-mvp.joemckahn.workers.dev';
const origin=base;
let count=0;
async function probe(label,url,options={}) {
 count++;
 const response=await fetch(url,{...options,redirect:'manual',signal:AbortSignal.timeout(30000)});
 console.log(label, 'status='+response.status,'type='+response.headers.get('content-type'));
 return response;
}
const main=await probe('board',base+'/');
assert.equal(main.status,200);
const html=await main.text();
assert.match(html,/assets\//);
for(const path of ['/personal-gradebook','/personal-gradebook/admin']){
 const r=await probe(path,base+path);
 assert.equal(r.status,200);
 assert.match(await r.text(),/assets\//);
}
const manifest=await probe('manifest',base+'/manifest.webmanifest');
assert.equal(manifest.status,200);
assert.equal((await manifest.json()).display,'standalone');
const sw=await probe('service-worker',base+'/sw.js');
assert.equal(sw.status,200);
assert.match(await sw.text(),/offline.html/);
for(const p of ['/functions/v1/grades-admin','/functions/v1/student-lookup']){
 const res=await probe('CORS '+p,sb+p,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,apikey,authorization'}});
 assert.equal(res.status,204);
 assert.equal(res.headers.get('access-control-allow-origin'),origin);
}
const unauthorized=await probe('admin deny',sb+'/functions/v1/grades-admin',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({op:'class.read'})});
assert.equal(unauthorized.status,401);
const health=await probe('AI health',ai+'/health',{headers:{Origin:origin}});
assert.equal(health.status,200);
const healthy=await health.json();
assert.equal(healthy.enabled,true);
console.log('published board count',healthy.publicPosts);
const answer=await probe('AI single live inference',ai+'/chat',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({query:'Vì sao bầu trời có màu xanh?',history:[]})});
assert.equal(answer.status,200);
const payload=await answer.json();
assert.equal(payload.mode,'ai');
assert.equal(typeof payload.answer,'string');
assert.ok(payload.answer.length>10);
console.log('AI answer verified: nonempty; no text logged');
console.log('PRODUCTION SMOKE PASS; HTTP requests',count);
