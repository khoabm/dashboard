# Triển khai frontend tĩnh

Nguồn: SPEC R03–04, R17–18, R24–28; quy trình chi tiết ở WORKFLOW. **Đã có build static dist; chưa có Site hoặc deployment.** Không tạo configuration nhà cung cấp khác.

## Điều kiện

- Người dùng đã yêu cầu triển khai trong phạm vi/audience cụ thể; nếu chỉ code/docs/QA thì không deploy. Sites mặc định private; không đổi audience để né lỗi deploy.

- Xác minh 0 USD theo ZERO_COST; không giả định hosting miễn phí chỉ vì tool có sẵn. Nếu không đạt, bàn giao source và blocker; không thay ràng buộc chi phí.

- Đúng snapshot main đã nghiệm thu, source đầy đủ trên GitHub, không secrets; QA/bảo mật trọng yếu đã đạt. Develop dùng cho phát triển/QA; ngoại lệ phát hành preview nếu người dùng yêu cầu phải ghi rõ ref, không gọi đó là production main đã nghiệm thu.

- Frontend static, HTTPS, JS modules/assets đúng đường dẫn; SPA fallback chỉ khi routing cần, không serverless thừa. Supabase URL/publishable key là public, còn secrets không nằm trong bundle/archive.

## Thực hiện theo skill Sites hiện hành

1. Nếu đã có Site: get_site, audience/ownership hiện tại, source credential và mở checkout chính xác; giữ project_id. Nếu mới: create_site đúng một lần, persist ID; chưa tạo lại khi kết quả chưa chắc chắn.

2. Chuẩn bị static.directory thật. Buildless bỏ install/build không cần; Vite có scripts/build output đã kiểm chứng. Không commit dist nếu quy trình không cần, nhưng deployment archive phải chứa output thật.

3. Đồng bộ snapshot GitHub ↔ Sites source như WORKFLOW, kiểm tra thay đổi ngoài ý muốn. Hoàn thiện hosting manifest, checks/build, push source rồi package archive từ đúng commit bằng helper.

4. Dùng native save/deploy đúng audience. Owner-private đã được xác nhận dùng thao tác private của skill; trường hợp khác dùng tool phù hợp. Không thay sharing để deploy. Giữ saved_version_id/deployment_id khi resume, không lưu/deploy trùng.

5. Poll chỉ khi pending/building/publishing; kết quả terminal thành công kèm URL là bằng chứng deployment hạ tầng. Không tuyên bố end-to-end, public ẩn danh hoặc admin hoạt động chỉ từ status đó.

6. Kiểm tra runtime/network/public/admin/mobile qua khả năng truy cập thật. Browser managed chỉ dùng terminal.local, không hứa kiểm tra URL production bằng browser đó. Ghi production smoke BLOCKED nếu không có đường được hỗ trợ. Không coi preview local thay production smoke.

## Bằng chứng phải bổ sung khi thực hiện

### Loại test khỏi website

Chỉ đặt document root/static.directory là `dist/` sau `npm run build` thành công; không publish checkout GitHub, không dùng `npm run dev` làm server production. Test/fixture được giữ trong Git phục vụ regression, không phải nội dung website. Build chặn import module trong `test/`/`tests/`; `tests/check-production-build.mjs` kiểm allowlist output và byte placeholder. CI đang chạy lệnh build này nên gate cũng áp dụng khi merge vào main.

Trước phát hành, thử `/test`, `/test/session`, `/tests/session.html`, `/tests/audit.html` và `/tests/viewport.html`: không URL nào được trả fixture/test source. Hosting có SPA fallback có thể trả index ứng dụng thay vì 404; nếu yêu cầu HTTP 404, cấu hình rule tại hosting đã chọn và kiểm lại. Không suy kiểm build local thành bằng chứng routing production; hosting hiện chưa được tạo/deploy.

GitHub SHA, Sites source SHA và đối chiếu nội dung, project_id/version/deployment_id, URL, audience, ngày, public config sử dụng, checks, quota/chi phí, production smoke và giới hạn. Không ghi credential, signed URL nhạy cảm hoặc token.

Cập nhật học liệu Supabase không cần deploy frontend; đổi source/config client mới cần bản phát hành. Giữ hướng dẫn chạy độc lập ngoài Sites và xuất ZIP khi được yêu cầu. Lệnh thật: npm ci, npm run dev, npm test, npm run check, npm run build. Static output dist chỉ chứa ứng dụng/placeholder; tests/*.html không nằm trong build. Vite allowedHosts chỉ thêm terminal.local để QA nội bộ. Không có hosting.json giả hoặc auto-deploy.
