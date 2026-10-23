import {newId} from '../utils/id.js';
import {el,button,field,errorMessage} from '../utils/dom.js';
import {safeUrl,youtubeId,validateFile,verifyFileSignature,moveItem,debounce} from '../utils/validation.js';
import {savePost} from '../services/board.js';
import {uploadAttachments,cleanup} from '../services/storage.js';
import {draftKey,saveDraft,readDraft,removeDraft,filesDraft} from '../services/drafts.js';
import {openDialog,ConfirmDialog,ToastNotification} from './primitives.js';
import {PostPreviewModal} from './board.js';
export function AttachmentUploader({attachments,onChange,onError}) {
 const root=el('div');const list=el('div',{class:'editor-attachments'});const objectUrls=[];
 function render() {
  objectUrls.splice(0).forEach(url=>URL.revokeObjectURL(url));list.replaceChildren();
  attachments.forEach((a,i)=>{
   const row=el('div',{class:'editor-attachment'});
   if(a.file?.type.startsWith('image/')) {const url=URL.createObjectURL(a.file);objectUrls.push(url);row.append(el('img',{src:url,alt:`Xem trước ${a.file_name}`}));}
   row.append(el('span',{},a.file_name||a.external_url),button('↑',()=>{attachments=moveItem(attachments,i,-1);onChange(attachments);render();},'icon-button',{'aria-label':`Đưa tệp ${i+1} lên`,disabled:i===0}),button('↓',()=>{attachments=moveItem(attachments,i,1);onChange(attachments);render();},'icon-button',{'aria-label':`Đưa tệp ${i+1} xuống`,disabled:i===attachments.length-1}),button('×',()=>{attachments=attachments.filter((_,index)=>index!==i);onChange(attachments);render();},'icon-button',{'aria-label':`Bỏ ${a.file_name}`}));
   list.append(row);
  });
 }
 const files=el('input',{type:'file',multiple:true,accept:'.jpg,.jpeg,.png,.webp,.pdf,.docx,.pptx,.xlsx','aria-label':'Chọn ảnh hoặc tài liệu'});
 files.addEventListener('change',async()=>{
  for(const file of files.files) {
   const error=validateFile(file,attachments.length);
   if(error || !await verifyFileSignature(file)) {onError(error||`Tệp ${file.name} có nội dung không đúng định dạng.`);continue;}
   attachments.push({id:newId(),type:file.type.startsWith('image/')?'image':'document',file,file_name:file.name,mime_type:file.type,size_bytes:file.size});
  }
  files.value='';onChange(attachments);render();
 });
 const link=el('input',{type:'url',placeholder:'https://…','aria-label':'Địa chỉ liên kết'});
 const addLink=()=>{
  const url=safeUrl(link.value);if(!url) {onError('Chỉ nhận URL HTTPS hợp lệ, không có thông tin đăng nhập.');return;}
  if(attachments.length>=10){onError('Mỗi bài tối đa 10 tài nguyên.');return;}
  const id=youtubeId(url);onError('');
  attachments.push({id:newId(),type:id?'youtube':'link',external_url:url,file_name:id?'Video YouTube':new URL(url).hostname});link.value='';onChange(attachments);render();
 };
 root.append(el('div',{class:'upload-zone'},el('strong',{},'Ảnh & tài liệu'),el('p',{},'JPG, PNG, WebP, PDF, DOCX, PPTX, XLSX · mỗi tệp < 2 MB · tối đa 10 tài nguyên/bài'),files),list,
 el('div',{class:'link-row'},field('Hoặc thêm liên kết / YouTube',link),button('Thêm',addLink)));
 render();root.cleanup=()=>objectUrls.forEach(url=>URL.revokeObjectURL(url));root.setAttachments=value=>{attachments=value;render();};return root;
}
export async function PostEditorDrawer({post,sectionId,data,userId,onSaved,onDirty}) {
 const key=draftKey(userId,post?.id||'new');
 let model=post?structuredClone(post):{id:newId(),title:'',body:'',section_id:sectionId||data.sections[0]?.id,status:'draft',sort_order:data.posts.filter(p=>p.section_id===sectionId).length,attachments:[],thumbnail_id:null};
 let attachments=[...model.attachments],dirty=false,busy=false,closing=false;
 const original=post?.attachments||[];
 const {dialog,content,close}=openDialog(post?'Chỉnh sửa bài đăng':'Tạo bài đăng',{drawer:true});
 const title=el('input',{required:true,maxlength:200,value:model.title,placeholder:'Nhập tiêu đề học liệu…'});
 const body=el('textarea',{rows:5,maxlength:20000,placeholder:'Mô tả hoặc nội dung bài viết…'},model.body);
 const section=el('select',{required:true},data.sections.map(s=>el('option',{value:s.id,selected:s.id===model.section_id},s.title)));
 const order=el('input',{type:'number',step:1,required:true,value:model.sort_order});
 const status=el('select',{},['published','draft','hidden'].map(s=>el('option',{value:s,selected:s===model.status},({published:'Xuất bản',draft:'Bản nháp',hidden:'Ẩn khỏi người xem'})[s])));
 const thumbnail=el('select',{'aria-label':'Ảnh đại diện'});
 const error=el('p',{class:'form-error',role:'alert'}),draftStatus=el('p',{class:'draft-status',role:'status'});
 const form=el('form',{},field('Tiêu đề *',title),field('Chủ đề *',section),field('Nội dung / mô tả',body),el('div',{class:'field-row'},field('Trạng thái',status),field('Vị trí',order)),field('Ảnh đại diện',thumbnail),el('h3',{class:'editor-section-label'},'Tài nguyên đính kèm'));
 function read() {return {...model,title:title.value.trim(),body:body.value,section_id:section.value,sort_order:Number(order.value),status:status.value,thumbnail_id:thumbnail.value||null,attachments};}
 async function persist() {
  if(!dirty) return;
  try {
   saveDraft(key,read());
   await filesDraft(key,attachments.filter(a=>a.file));
   if(dialog.isConnected) draftStatus.textContent='Đã lưu nháp trên thiết bị này · chưa đồng bộ.';
  }catch{if(dialog.isConnected) draftStatus.textContent='Không đủ bộ nhớ để lưu nháp cục bộ. Hãy giữ trang mở.';}
 }
 const autosave=debounce(persist,450);
 function changed(){dirty=true;onDirty(true);draftStatus.textContent='Có thay đổi chưa lưu lên Supabase.';autosave();}
 function renderThumbnail(){const value=thumbnail.value||model.thumbnail_id;thumbnail.replaceChildren(el('option',{value:''},'Không chọn / tự động'),attachments.filter(a=>a.type==='image').map(a=>el('option',{value:a.id,selected:a.id===value},a.file_name)));}
 const uploader=AttachmentUploader({attachments,onChange:value=>{attachments=value;renderThumbnail();changed();},onError:message=>error.textContent=message});
 form.append(uploader,error,draftStatus);
 const saveDraftButton=button('Lưu nháp',()=>submit('draft'));
 const publish=el('button',{type:'submit',class:'button primary'},'Lưu thay đổi');
 form.append(el('div',{class:'form-actions'},button('Hủy',requestClose),saveDraftButton,button('Xem trước',()=>{const value=read();if(!value.title){error.textContent='Vui lòng nhập tiêu đề.';return;}PostPreviewModal(value,data.sections.find(s=>s.id===value.section_id));}),publish));
 form.addEventListener('input',changed);form.addEventListener('change',changed);
 form.addEventListener('submit',event=>{event.preventDefault();submit(status.value);});
 async function submit(nextStatus) {
  if(busy || !form.reportValidity()) return;
  const value={...read(),status:nextStatus,placeholder_kind:null};
  if(!value.title){error.textContent='Vui lòng nhập tiêu đề.';return;}
  if(!Number.isInteger(value.sort_order)){error.textContent='Vị trí phải là số nguyên.';return;}
  busy=true;close.disabled=true;publish.disabled=true;saveDraftButton.disabled=true;error.textContent='';form.classList.add('form-busy');
  let uploaded;
  try {
   if(!navigator.onLine) throw Error('Bạn đang ngoại tuyến. Nháp vẫn được giữ trên thiết bị.');
   uploaded=await uploadAttachments(value.id,attachments,(done,total)=>draftStatus.textContent=`Đang tải tệp ${done}/${total}…`);
   await savePost(value,uploaded.attachments);
   const unused=original.filter(a=>a.storage_path && !uploaded.attachments.some(b=>a.storage_path===b.storage_path)).map(a=>a.storage_path);
   await cleanup(unused).catch(()=>ToastNotification('Bài đã lưu. Một số tệp cũ chưa dọn được; có thể thử “Dọn tệp thừa”.',true));
   autosave.cancel();dirty=false;onDirty(false);removeDraft(key);await filesDraft(key,null).catch(()=>{});
   closing=true;dialog.close();await onSaved();ToastNotification(nextStatus==='published'?'Đã xuất bản bài đăng.':'Đã lưu bài đăng trên Supabase.');
  }catch(e){
   if(uploaded) await cleanup(uploaded.paths).catch(()=>{});
   error.textContent=errorMessage(e);await persist();
  }finally{busy=false;close.disabled=false;publish.disabled=false;saveDraftButton.disabled=false;form.classList.remove('form-busy');}
 }
 async function requestClose(){
  if(busy) return;
  if(dirty && !await ConfirmDialog('Rời trình soạn thảo?', 'Thay đổi chưa được lưu lên Supabase. Nháp sẽ được giữ trên thiết bị này để khôi phục.')) return;
  await persist();closing=true;dialog.close();
 }
 close.replaceWith(button('×',requestClose,'icon-button',{'aria-label':'Đóng trình soạn thảo'}));
 dialog.addEventListener('cancel',event=>{if(!closing){event.preventDefault();requestClose();}});
 dialog.addEventListener('close',()=>{autosave.cancel();onDirty(false);uploader.cleanup();},{once:true});
 renderThumbnail();content.append(form);
 const saved=readDraft(key);
 if(saved)form.inert=true;
 if(saved && await ConfirmDialog('Có bản nháp trên thiết bị', `Khôi phục nội dung đã lưu lúc ${new Date(saved.saved_at).toLocaleString('vi-VN')}? Tệp nháp được giữ riêng trên thiết bị này.`)) {
  model={...model,...saved};title.value=model.title||'';body.value=model.body||'';section.value=model.section_id;order.value=model.sort_order;status.value=model.status==='deleted'?'draft':model.status;
  let fileDraft=[];try{fileDraft=await filesDraft(key)||[];}catch{error.textContent='Không thể đọc tệp nháp. Vui lòng chọn lại tệp.';}
  if(!dialog.isConnected)return dialog;
  const recovered=[...(saved.attachments||[]),...fileDraft];attachments=(saved.attachment_order||recovered.map(a=>a.id)).map(id=>recovered.find(a=>a.id===id)).filter(Boolean);uploader.setAttachments(attachments);renderThumbnail();changed();
 } else if(saved) {removeDraft(key);await filesDraft(key,null).catch(()=>{});}
 form.inert=false;
 if(dialog.isConnected)title.focus();return dialog;
}
