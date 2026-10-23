import {el,button} from '../utils/dom.js';
export function ToastNotification(message,error=false) {
 const root=document.querySelector('#toast');root.textContent=message;root.className=error?'toast error':'toast';
 clearTimeout(ToastNotification.timer);ToastNotification.timer=setTimeout(()=>{root.className='';root.textContent='';},6500);
}
export const LoadingState=()=>el('div',{class:'state loading',role:'status'},el('span',{class:'spinner'}),'Đang mở không gian học liệu…');
export const EmptyState=(message='Chưa có học liệu ở đây.')=>el('div',{class:'state empty'},el('span',{class:'state-icon','aria-hidden':'true'},'⌁'),el('h3',{},message),el('p',{},'Hãy thử chủ đề khác hoặc thay đổi từ khóa tìm kiếm.'));
export const ErrorState=(message,retry)=>el('div',{class:'state error'},el('h3',{},'Chưa thể tải học liệu'),el('p',{},message),button('Thử lại',retry));
export const SyncIndicator=(text)=>el('span',{class:'sync',role:'status'},el('i',{'aria-hidden':'true'}),text);
export function openDialog(title,{drawer=false}={}) {
 const previous=document.activeElement;
 const dialog=el('dialog',{class:drawer?'dialog drawer':'dialog','aria-label':title});
 const content=el('div',{class:'dialog-content'});
 const heading=el('div',{class:'dialog-heading'},el('h2',{},title));
 const close=button('×',()=>dialog.close(),'icon-button',{'aria-label':'Đóng'});
 heading.append(close);dialog.append(heading,content);document.body.append(dialog);
 dialog.addEventListener('close',()=>{dialog.remove();previous?.focus();},{once:true});
 dialog.showModal();return {dialog,content,close};
}
export function ConfirmDialog(message,description='') {
 return new Promise(resolve=>{
 const {dialog,content}=openDialog(message);
 content.append(el('p',{},description),el('div',{class:'form-actions'},button('Hủy',()=>dialog.close()),button('Xác nhận',()=>{resolve(true);dialog.close();},'button danger')));
 dialog.addEventListener('close',()=>resolve(false),{once:true});
 });
}
export const statusLabels={draft:'Bản nháp',published:'Đã xuất bản',hidden:'Đã ẩn',deleted:'Thùng rác'};
