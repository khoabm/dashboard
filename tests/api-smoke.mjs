// Read-only/denial smoke against the selected project; public publishable key only.
import assert from 'node:assert/strict';
const base=process.env.SUPABASE_URL||'https://vgciiqtwmxcdqppntgnt.supabase.co';
const key=process.env.SUPABASE_PUBLISHABLE_KEY||'sb_publishable_A0kgJlsUnLFL_wrtJpkvtQ_GyBAf0UY';
async function call(path,method='GET',body,extra={}){
 const response=await fetch(`${base}${path}`,{method,headers:{apikey:key,'Content-Type':'application/json',...extra},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,body:await response.json()};
}
const published=await call('/rest/v1/posts?select=id,status');assert.equal(published.status,200);assert.ok(published.body.length>=6);assert.ok(published.body.every(p=>p.status==='published'));
const privatePosts=await call('/rest/v1/posts?select=id&status=neq.published');assert.deepEqual(privatePosts.body,[]);
const fixtureId='80000000-0000-4000-8000-000000000001';
for(const [label,method,path,body] of [
 ['insert','POST','/rest/v1/posts',{id:fixtureId,section_id:'20000000-0000-4000-8000-000000000001',title:'Unauthorized fixture',status:'draft'}],
 ['update','PATCH',`/rest/v1/posts?id=eq.${fixtureId}`,{title:'Unauthorized'}],
 ['delete','DELETE',`/rest/v1/posts?id=eq.${fixtureId}`,undefined],
 ['RPC','POST','/rest/v1/rpc/save_post',{p_post:{id:fixtureId},p_attachments:[]}],
]){const result=await call(path,method,body);assert.ok([401,403].includes(result.status),`${label}: unexpected ${result.status}`);console.log(`PASS anon ${label} denied (${result.status})`);}
const storage=await fetch(`${base}/storage/v1/object/learning-resources/${fixtureId}/denied.png`,{method:'POST',headers:{apikey:key,'Content-Type':'image/png'},body:Uint8Array.from([137,80,78,71,13,10,26,10])});
const storageBody=await storage.json();assert.ok(storage.status===401||storage.status===403||String(storageBody.statusCode)==='403',`Storage denial: ${storage.status}`);
console.log('PASS anonymous public read, private visibility, Storage upload denial');
