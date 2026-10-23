import {newId} from '../utils/id.js';
import {requireClient,result} from './client.js';
import {config} from '../config/public.js';
import {assertUploadBudget} from '../utils/quota.js';
import {validateFile,verifyFileSignature} from '../utils/validation.js';
export async function attachmentUrl(attachment) {
 if(attachment.external_url) return attachment.external_url;
 if(attachment.file) return URL.createObjectURL(attachment.file);
 return (await result(requireClient().storage.from(config.bucket).createSignedUrl(attachment.storage_path,config.signedUrlSeconds))).signedUrl;
}
export async function uploadAttachments(postId,attachments,onProgress=()=>{}) {
 const uploaded=[], paths=[];
 const incoming=attachments.reduce((sum,a)=>sum+(a.file?.size||0),0);
 if(incoming){const usage=await result(requireClient().rpc('app_usage'));assertUploadBudget(usage.storage_bytes,incoming);}
 try {
  for(let i=0;i<attachments.length;i++) {
   const a=attachments[i];
   if(!a.file) {uploaded.push(a);continue;}
   const error=validateFile(a.file);
   if(error || !await verifyFileSignature(a.file)) throw Error(error||'Nội dung tệp không khớp định dạng.');
   const path=`${postId}/${newId()}.${a.file.name.split('.').pop().toLowerCase()}`;
   await result(requireClient().storage.from(config.bucket).upload(path,a.file,{contentType:a.file.type,upsert:false,cacheControl:'60'}));
   paths.push(path); uploaded.push({...a,file:undefined,storage_path:path,mime_type:a.file.type,size_bytes:a.file.size});
   onProgress(i+1,attachments.length);
  }
  return {attachments:uploaded,paths};
 } catch(error) {await cleanup(paths).catch(()=>{});error.orphanPaths=paths;throw error;}
}
function pendingPaths() {try{return JSON.parse(localStorage.getItem('khtn8:cleanup')||'[]');}catch{return [];}}
export async function cleanup(paths) {
 if(!paths.length)return;
 const pending=[...new Set([...pendingPaths(),...paths])];
 try{localStorage.setItem('khtn8:cleanup',JSON.stringify(pending));}catch{}
 // A response can be lost after a successful commit. Never remove referenced objects.
 const referenced=await result(requireClient().from('attachments').select('storage_path').in('storage_path',paths));
 const unused=paths.filter(path=>!referenced.some(a=>a.storage_path===path));
 if(unused.length) await result(requireClient().storage.from(config.bucket).remove(unused));
 try{localStorage.setItem('khtn8:cleanup',JSON.stringify(pending.filter(p=>!paths.includes(p))));}catch{}
}
export const cleanupPending=()=>cleanup(pendingPaths());
