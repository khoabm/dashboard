# PWA — Cài đặt ứng dụng web

Trang **Vui học cùng cô Quỳnh** giữ nguyên ba route `/`, `/personal-gradebook`, `/personal-gradebook/admin`. PWA chỉ cung cấp cài đặt lên thiết bị và một trang thông báo mất mạng. Không sửa logic nghiệp vụ, DB, API, Auth, điểm, upload, import, hay giao diện hiện có.

- Manifest: `/manifest.webmanifest`; icons PNG 192, 512 và maskable 512 dựa trên biểu tượng thương hiệu hiện có; launch root, standalone, theme.
- Registration: `src/utils/pwa.js` sau load trên HTTPS hoặc localhost; thất bại không ảnh hưởng app; không gọi `skipWaiting`, không tự reload hoặc ép cập nhật.
- SW: `public/sw.js` chỉ intercept navigation GET cùng origin với **network-first**. HTTP 401/403/500 vẫn truyền nguyên; fallback `offline.html` chỉ khi fetch thất bại vì mạng. Không cache ứng dụng hoặc API; cache namespace chỉ chứa offline.html. LocalStorage/IndexedDB drafts hiện có không bị động vào.
- Không hỗ trợ đọc/ghi điểm, Auth, upload, trả lời trợ lý hay đăng bài offline; không hiển thị dữ liệu người dùng đã xác thực ngoại tuyến. Khi kết nối trở lại, dùng ứng dụng online như cũ.
- Deploy: `npm ci && npm run build`; serve `dist` qua HTTPS hoặc localhost; hosting phải fallback SPA navigation về `index.html` với route `/personal-gradebook` và `/personal-gradebook/admin`, giữ file tĩnh và `sw.js` đúng URL. Không tự triển khai public web.
- Chrome/Edge: dùng Install app khi trình duyệt đề xuất; iOS Safari: Chia sẻ → Thêm vào Màn hình chính. Thiết bị/trình duyệt quyết định khả năng cài đặt.

## QA

1. Manifest hợp lệ, PNG đúng size và `/sw.js`, `/offline.html` có trong `dist`.
2. HTTPS/localhost Chrome/Edge: install và chạy standalone, ba route hoạt động online như trước.
3. Sau lần online đầu tiên, bật Offline rồi reload từng route: chỉ xuất hiện offline notice; cache không có điểm, session, HTML hay phản hồi API.
4. Bật online lại: tải lại đúng route, xác thực/nháp/import/điểm/Board tiếp tục như cũ.
5. Phiên bản mới không force reload tab đang thao tác.
6. iOS Safari Home Screen và màn hình nhỏ: biểu tượng/cách cài đặt và offline notice đọc được.

CI chỉ chứng minh syntax/build/pure-unit; browser/device QA ghi NOT RUN nếu không thực tế chạy. Không gọi Supabase hosted để thử.

Manifest và các icon được phục vụ như static assets, không yêu cầu dịch vụ cài đặt bên ngoài; đây không phải ứng dụng offline đầy đủ.
