-- Stable fixture IDs make reruns idempotent. DO NOTHING never overwrites edited placeholders.
insert into public.boards(id,title,description,settings) values
('10000000-0000-4000-8000-000000000001','KHOA HỌC TỰ NHIÊN – 8','Không gian học liệu Khoa học tự nhiên lớp 8','{"placeholder":true}') on conflict(id) do nothing;
insert into public.sections(id,board_id,title,description,color,sort_order) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Chủ đề 01','Không gian cho những khám phá đầu tiên','#dce9df',0),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Chủ đề 02','Kết nối kiến thức qua từng học liệu','#eee5d3',1),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Chủ đề 03','Quan sát, trải nghiệm và tìm hiểu thêm','#dde5ef',2) on conflict(id) do nothing;
insert into public.posts(id,section_id,title,body,status,sort_order,placeholder_kind) values
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Chào mừng đến với bảng học liệu','Placeholder · Một nơi để sắp xếp các tài liệu, hình ảnh và ý tưởng học tập. Quản trị viên có thể thay nội dung mẫu này.','published',0,'text'),
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Một góc khám phá qua hình ảnh','Placeholder · Hình minh họa mẫu giúp bạn trải nghiệm cách xem và phóng to ảnh trên bảng học liệu.','published',1,'image'),
('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','Tài liệu cho buổi học tiếp theo','Placeholder · Mở tài liệu PDF mẫu ngay trên trình duyệt, hoặc tải về để xem sau. Chưa phải học liệu chính thức.','published',0,'document'),
('30000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000002','Ghi chú nhỏ, ý tưởng lớn','Placeholder · Thẻ văn bản có thể chứa lời hướng dẫn, câu hỏi gợi mở hoặc một ghi chú ngắn cho lớp học.','published',1,'text'),
('30000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000003','Khám phá qua một đoạn video','Placeholder · Trải nghiệm cách mở video YouTube. Video mẫu chỉ minh họa chức năng, không phải nội dung bài học.','published',0,'youtube'),
('30000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000003','Mở thêm một cánh cửa tri thức','Placeholder · Liên kết mẫu dẫn đến example.org. Thay bằng website, Google Drive hoặc mô phỏng của bạn.','published',1,'link') on conflict(id) do nothing;
