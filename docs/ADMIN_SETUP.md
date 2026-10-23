# Thiết lập quản trị (chủ tài khoản)

Project đã chọn: `dashboard` — `vgciiqtwmxcdqppntgnt`, tổ chức Free. Không cần project mới hoặc backend riêng.

## Hai bước còn cần chủ tài khoản

1. Trong Supabase Dashboard → Authentication → Users, tạo duy nhất tài khoản email/password của bạn bằng luồng của Dashboard. Tự nhập và giữ mật khẩu; không gửi mật khẩu, OTP hoặc token vào chat. Đánh dấu email confirmed nếu Dashboard cung cấp tùy chọn phù hợp. Tắt **Allow new users to sign up** trong cấu hình Authentication; tên/vị trí mục có thể đổi. Không bật anonymous sign-in hoặc đăng ký công khai. Plugin hiện tại không có công cụ cập nhật Auth settings hay tạo Auth user an toàn, nên các bước này chưa được thực hiện.
2. Copy User UID vừa tạo. Chạy SQL sau trong SQL Editor với UID thật (UID không phải mật khẩu). Nếu muốn trợ lý cấp quyền sau khi bạn tạo user, chỉ cần báo đã tạo và chỉ định tài khoản; không cần đưa credential.

```sql
insert into public.admin_profiles(user_id, role, active)
values ('THAY-BANG-USER-UID'::uuid, 'admin', true);
```

Unique index chỉ cho phép một admin active; client không có quyền tự thêm/sửa profile. Không ghi câu lệnh chứa UID thật vào repo nếu không cần thiết. Không chạy câu lệnh mẫu khi chưa thay UID.

## Chạy và cập nhật nội dung

Theo README để chạy local. Mở “Đăng nhập quản trị” → email/password. Phiên ở bộ nhớ; refresh trang cần đăng nhập lại. Mọi thao tác ghi phải qua RLS; quyền owner ChatGPT/Sites không thay quyền Supabase admin.

Toolbar: tạo chủ đề, tạo bài, xem thùng rác, xuất metadata, dọn tệp thừa được ghi nhận. Trong bài: chỉnh tiêu đề/nội dung, chọn cột, trạng thái, vị trí, nhiều ảnh/tài liệu hoặc liên kết; chọn thumbnail, xem trước; “Lưu nháp” lưu lên Supabase với trạng thái draft, còn autosave chỉ lưu trên thiết bị. “Lưu thay đổi” theo trạng thái đang chọn.

Nút ↑/↓ thay đổi thứ tự nguyên tử và kiểm tra phiên bản. Chuyển cột qua trường Chủ đề. Xóa bài là xóa mềm, khôi phục về draft trong 30 ngày. Xóa cột có bài (kể cả deleted) bị chặn; chuyển mọi bài ra trước. Không tự purge dữ liệu hoặc tệp.

Ảnh/file <2.000.000 byte, tối đa 10 tài nguyên/bài. Xóa rồi chọn tệp mới để thay tệp; có thể đổi thứ tự và chọn ảnh đại diện. Không upload video gốc. Tệp nháp được lưu IndexedDB; không gửi Base64 vào localStorage. Dọn tệp thừa chỉ xét các path do lỗi upload/thay file đã được ghi nhận và kiểm tra không còn metadata tham chiếu; không quét/xóa tùy ý toàn bucket.

## Gate trước phát hành

Sau khi có tài khoản thật: kiểm tra login/logout; draft/publish/hide/delete/restore; ảnh/PDF upload và mở ở client ẩn danh; sắp xếp/chuyển cột; non-admin denial qua JWT thật; hai browser context độc lập nhận published qua refresh/active. Cần kiểm tra tắt signup qua cấu hình/Auth API. Test SQL rollback không thay thế các test end-to-end này.
