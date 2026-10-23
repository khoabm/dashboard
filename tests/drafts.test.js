import test from 'node:test';
import assert from 'node:assert/strict';
import {saveDraft,readDraft,draftKey,removeDraft} from '../src/services/drafts.js';
const map=new Map();globalThis.localStorage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
test('text draft survives recovery without files or auth credentials',()=>{
 const key=draftKey('user-a','post-a');
 saveDraft(key,{title:'Chưa đăng',body:'Nội dung',password:'never',access_token:'never',attachments:[{id:'new',file:{},file_name:'unsaved.png'},{id:'saved',storage_path:'post/file.png',file_name:'saved.png'}]});
 const value=readDraft(key);assert.equal(value.title,'Chưa đăng');assert.equal(value.attachments.length,1);
 assert.equal(value.password,undefined);assert.equal(value.access_token,undefined);assert.equal(value.attachments[0].file,undefined);
 assert.notEqual(draftKey('user-b','post-a'),key);removeDraft(key);assert.equal(readDraft(key),null);
});
