# Thiết lập quản trị (chủ tài khoản)

Project đã chọn: `dashboard` — `vgciiqtwmxcdqppntgnt`, tổ chức Free. Không cần project mới hoặc backend riêng.

## Trạng thái hiện tại và các bước chỉ dùng nếu cần

SQL ngày 2026-10-24 đã xác nhận **một admin active có email confirmed**; không tạo thêm user hoặc INSERT `admin_profiles` vào project hiện tại. Chưa có bằng chứng đã tắt server signup/anonymous sign-ins. Chủ tài khoản cần kiểm tra hai cài đặt này trong Supabase Dashboard → Authentication; không gửi mật khẩu, OTP hoặc token vào chat. Giao diện website không có chức năng signup không đồng nghĩa signup phía server đã tắt.

Các bước dưới đây chỉ áp dụng cho **project mới chưa có admin** hoặc khi tái thiết lập theo quy trình được phê duyệt:

1. Trong Supabase Dashboard → Authentication → Users, tạo duy nhất tài khoản email/password bằng luồng của Dashboard, xác nhận email nếu cần. Tắt **Allow new users to sign up**, giữ anonymous sign-in tắt. Tên/vị trí mục có thể thay đổi.
2. Dùng User UID của tài khoản đã tạo để cấp quyền trong SQL Editor, chỉ khi bảng chưa có active admin. Không công khai UID hoặc credential.

```sql
insert into public.admin_profiles(user_id, role, active)
values ('THAY-BANG-USER-UID'::uuid, 'admin', true);
```

Unique index chỉ cho phép một admin active; client không có quyền tự thêm/sửa profile. Không ghi UID thật vào repo. **Không chạy câu lệnh mẫu trên project hiện tại vì đã có active admin.**

## Chạy và cập nhật nội dung

Theo README để chạy local. Mở “Đăng nhập quản trị” → email/password. Phiên ở bộ nhớ; refresh trang cần đăng nhập lại. Mọi thao tác ghi phải qua RLS; quyền owner ChatGPT/Sites không thay quyền Supabase admin.

Toolbar: tạo chủ đề, tạo bài, xem thùng rác, xuất metadata, dọn tệp thừa được ghi nhận. Trong bài: chỉnh tiêu đề/nội dung, chọn cột, trạng thái, vị trí, nhiều ảnh/tài liệu hoặc liên kết; chọn thumbnail, xem trước; “Lưu nháp” lưu lên Supabase với trạng thái draft, còn autosave chỉ lưu trên thiết bị. “Lưu thay đổi” theo trạng thái đang chọn.

Nút ↑/↓ thay đổi thứ tự nguyên tử và kiểm tra phiên bản. Chuyển cột qua trường Chủ đề. Xóa bài là xóa mềm, khôi phục về draft trong 30 ngày. Xóa cột có bài (kể cả deleted) bị chặn; chuyển mọi bài ra trước. Không tự purge dữ liệu hoặc tệp.

Ảnh/file <2.000.000 byte, tối đa 10 tài nguyên/bài. Xóa rồi chọn tệp mới để thay tệp; có thể đổi thứ tự và chọn ảnh đại diện. Không upload video gốc. Tệp nháp được lưu IndexedDB; không gửi Base64 vào localStorage. Dọn tệp thừa chỉ xét các path do lỗi upload/thay file đã được ghi nhận và kiểm tra không còn metadata tham chiếu; không quét/xóa tùy ý toàn bucket.

## Gate trước phát hành

Admin hiện đã tồn tại; bước chưa nghiệm thu là kiểm tra login/logout thật; draft/publish/hide/delete/restore; ảnh/PDF upload và mở ở client ẩn danh; sắp xếp/chuyển cột; non-admin denial qua JWT thật; hai browser context độc lập nhận published qua refresh/active. Cần kiểm tra tắt signup qua cấu hình/Auth API. Test SQL rollback không thay thế các test end-to-end này.
