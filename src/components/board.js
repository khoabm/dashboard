import {el,button} from '../utils/dom.js';
import {matches} from '../utils/validation.js';
import {EmptyState,SyncIndicator,openDialog,statusLabels} from './primitives.js';
import {AttachmentGallery} from './media.js';
import {placeholderMedia} from '../data/placeholders.js';
export function SearchBar(onSearch,value='') {
 const input=el('input',{type:'search',placeholder:'Tìm học liệu, chủ đề…','aria-label':'Tìm học liệu',value});
 input.addEventListener('input',()=>onSearch(input.value));
 return el('div',{class:'search-bar'},el('span',{'aria-hidden':'true'},'⌕'),input,el('kbd',{},'/'));
}
export function AppHeader({onLogin,onRefresh,search,admin}) {
 return el('header',{class:'app-header'},el('a',{href:'/',class:'brand','aria-label':'KHTN8 Board · Trang chính'},el('img',{src:'/placeholders/mark.svg',alt:'',width:38,height:38}),el('strong',{},'KHTN',el('span',{},'8')),el('span',{class:'brand-divider'}),el('span',{class:'brand-note'},'Không gian học liệu')),
  search,el('nav',{'aria-label':'Tiện ích'},button('↻',onRefresh,'icon-button',{'aria-label':'Làm mới học liệu'}),button(admin?'Quản trị viên':'Đăng nhập quản trị',onLogin,'button header-admin')));
}
export function AdminToolbar({onNew,onSection,onLogout,onExport,onTrash,filter}) {
 return el('div',{class:'admin-toolbar'},SyncIndicator('Chế độ quản trị'),el('div',{class:'toolbar-actions'},
 button(filter==='deleted'?'Về bảng học liệu':'Thùng rác',onTrash,'button subtle'),button('Xuất metadata',onExport,'button subtle'),button('+ Chủ đề',onSection,'button'),button('+ Tạo bài đăng',onNew,'button primary'),button('Đăng xuất',onLogout,'button subtle')));
}
const kindLabels={text:'Văn bản',image:'Hình ảnh',document:'Tài liệu PDF',youtube:'Video',link:'Liên kết'};
export function PostCard(post,{admin,onOpen,onEdit,onMove,onDelete,onRestore}) {
 const kind=post.thumbnail_url?'image':post.placeholder_kind||post.attachments[0]?.type||'text';
 const card=el('article',{class:`post-card kind-${kind}`});
 const open=button('',()=>onOpen(post),'card-open',{'aria-label':`Mở ${post.title}`});
 if(kind==='image') open.append(el('div',{class:'card-art image-art'},el('img',{src:post.thumbnail_url||'/placeholders/science.svg',alt:'',loading:'lazy',onError:event=>{event.target.src='/placeholders/science.svg';event.target.onerror=null;}}),el('span',{},post.placeholder_kind?'HÌNH MINH HỌA MẪU':'HÌNH ẢNH ĐÍNH KÈM')));
 if(kind==='document') open.append(el('div',{class:'card-art document-art'},el('span',{class:'paper'},'PDF',el('i'),el('i'),el('i')),el('span',{},'TÀI LIỆU MẪU')));
 if(kind==='youtube') open.append(el('div',{class:'card-art video-art'},el('span',{class:'play'},'▶'),el('span',{},'VIDEO MẪU')));
 const body=el('div',{class:'card-body'},el('span',{class:`resource-kind ${kind}`},kind==='link'?'↗ ':kind==='youtube'?'▷ ':kind==='document'?'▤ ':'',kindLabels[kind]||'Tài nguyên'),
 el('h3',{},post.title),el('p',{},post.body),el('div',{class:'card-meta'},post.placeholder_kind?el('span',{class:'placeholder-label'},'Placeholder'):el('span',{},`${post.attachments.length} tài nguyên`),el('span',{'aria-hidden':'true'},'↗')));
 open.append(body);card.append(open);
 if(admin) card.append(el('div',{class:'card-admin'},el('span',{class:`status-tag ${post.status}`},statusLabels[post.status]),
 post.status==='deleted'?button('Khôi phục',()=>onRestore(post),'button tiny'):el('div',{},button('↑',()=>onMove(post,-1),'icon-button small',{'aria-label':`Đưa ${post.title} lên`}),button('↓',()=>onMove(post,1),'icon-button small',{'aria-label':`Đưa ${post.title} xuống`}),button('Sửa',()=>onEdit(post),'button tiny'),button('×',()=>onDelete(post),'icon-button small',{'aria-label':`Xóa ${post.title}`}))));
 return card;
}
export function SectionColumn(section,posts,actions) {
 const column=el('section',{class:'section-column','aria-label':section.title});column.style.setProperty('--section-color',section.color);
 const heading=el('div',{class:'section-heading'},el('div',{},el('span',{class:'section-eyebrow'},'CHỦ ĐỀ'),el('h2',{},section.title)),el('span',{class:'count'},posts.length));
 if(actions.admin) heading.append(button('⋯',()=>actions.onSection(section),'icon-button',{'aria-label':`Sửa ${section.title}`}));
 column.append(heading,el('p',{class:'section-description'},section.description));
 const list=el('div',{class:'post-list'},posts.map(p=>PostCard(p,actions)));column.append(list);
 if(!posts.length) list.append(el('div',{class:'column-empty'},'Chưa có bài đăng phù hợp.'));
 if(actions.admin && actions.filter!=='deleted') column.append(button('+  Thêm bài đăng',()=>actions.onNew(section.id),'add-post'));
 return column;
}
export function BoardContainer(data,{query='',selected='all',filter='all',...actions}) {
 const board=el('main',{id:'board',class:'board','aria-label':'Bảng học liệu',tabindex:'-1'});
 let count=0;
 const sections=data.sections.filter(s=>selected==='all'||s.id===selected);
 for(const section of sections) {
  const posts=data.posts.filter(p=>p.section_id===section.id && (actions.admin?(filter==='deleted'?p.status==='deleted':p.status!=='deleted'):p.status==='published') && matches(p,section,query));
  count+=posts.length;
  board.append(SectionColumn(section,posts,{...actions,filter}));
 }
 if(!count && query) board.replaceChildren(EmptyState('Không tìm thấy học liệu.'));
 else if(!sections.length) board.append(EmptyState('Bảng chưa có chủ đề.'));
 return board;
}
export function PostPreviewModal(post,section) {
 const {dialog,content}=openDialog('Chi tiết học liệu');
 content.append(el('div',{class:'preview-meta'},section?.title||'Xem trước',post.placeholder_kind?' · Placeholder':''),el('h2',{class:'preview-title'},post.title),el('p',{class:'preview-body'},post.body));
 const media=[...(post.attachments||[])];
 if(post.placeholder_kind && placeholderMedia[post.placeholder_kind]) media.push(placeholderMedia[post.placeholder_kind]);
 const gallery=AttachmentGallery(media);content.append(gallery);
 if(!media.length) content.append(el('p',{class:'muted'},'Bài viết văn bản · Không có tệp đính kèm.'));
 dialog.addEventListener('close',gallery.cleanup,{once:true});return dialog;
}
