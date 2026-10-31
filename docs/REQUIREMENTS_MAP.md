# Bản đồ yêu cầu

SPEC.md giữ brief đầy đủ của Bảng học liệu và hạ tầng ban đầu. Bảng này chỉ giúp
chọn phần cần đọc, không thay SPEC hoặc loại bỏ tiêu chí.
**Toàn website:** [PRODUCT_PROFILE](PRODUCT_PROFILE.md) (tên, mô hình, ý nghĩa, công dụng);
**Gradebook:** [BRIEF](features/personal-gradebook/BRIEF.md);
**Trợ lý:** [README](features/board-assistant/README.md).
Contract live mới theo SPEC R07.1: [chat liên tục/hybrid, short cooldown và nghiệm thu](features/board-assistant/LIVE_CHAT_ACCEPTANCE.md); Pilot/UAT gates cũ không áp dụng luồng live.
KHTN8 Board là tên lịch sử của ứng dụng Bảng học liệu, không phải tên toàn website.

| ID | Nhóm yêu cầu | Đọc cùng khi làm việc |
| --- | --- | --- |
| [R01](SPEC.md#r01) | Vai trò, mục tiêu và phạm vi ứng dụng Bảng học liệu | OVERVIEW.md; PRODUCT_PROFILE.md |
| [R02](SPEC.md#r02) | 0 USD, quota | ZERO_COST.md |
| [R03](SPEC.md#r03) | Tech stack | ARCHITECTURE.md |
| [R04](SPEC.md#r04) | Work và plugins | WORKFLOW.md |
| [R05](SPEC.md#r05) | UI, wireframe, placeholder; điều hướng overflow / reveal cột mới | TESTING.md |
| [R06](SPEC.md#r06) | 20 component JS | ARCHITECTURE.md |
| [R07](SPEC.md#r07) | Public, phạm vi loại trừ; [Board Assistant MVP](SPEC.md#board-assistant-mvp) | TESTING.md; features/board-assistant/README.md; features/board-assistant/V2_ACCEPTANCE.md; features/board-assistant/GATE_AB_ACCEPTANCE.md |
| [R08](SPEC.md#r08) | Admin 8.1–8.9; phiên qua reload và xác minh quyền | SECURITY.md, ADMIN_SETUP.md |
| [R09](SPEC.md#r09) | 6 bảng và trường dữ liệu | DATABASE.md |
| [R10](SPEC.md#r10) | 20 yêu cầu bảo mật | SECURITY.md |
| [R11](SPEC.md#r11) | Storage, upload từng phần | SECURITY.md |
| [R12](SPEC.md#r12) | localStorage / IndexedDB | ARCHITECTURE.md |
| [R13](SPEC.md#r13) | Đồng bộ / quota | ARCHITECTURE.md |
| [R14](SPEC.md#r14) | Responsive / accessibility | TESTING.md |
| [R15](SPEC.md#r15) | Dependency tùy chọn | ARCHITECTURE.md |
| [R16](SPEC.md#r16) | Cây repo dự kiến | ARCHITECTURE.md |
| [R17](SPEC.md#r17) | Git / nhánh / nội dung runtime | WORKFLOW.md |
| [R18](SPEC.md#r18) | Hosting tĩnh / Sites | DEPLOYMENT.md |
| [R19](SPEC.md#r19) | Functional / security / reliability / responsive | TESTING.md |
| [R20](SPEC.md#r20) | Hiệu năng | TESTING.md |
| [R21](SPEC.md#r21) | Backup / restore | DATABASE.md |
| [R22](SPEC.md#r22) | Seed placeholder | DATABASE.md |
| [R23](SPEC.md#r23) | Mở rộng tương lai, chưa làm | OVERVIEW.md |
| [R24](SPEC.md#r24) | Phase 0–6 | ROADMAP.md |
| [R25](SPEC.md#r25) | 20 điều kiện Done | TESTING.md |
| [R26](SPEC.md#r26) | Quy tắc AI | ../AGENTS.md |
| [R27](SPEC.md#r27) | Báo cáo / deliverables | WORKFLOW.md |
| [R28](SPEC.md#r28) | Lệnh bắt đầu / sản phẩm độc lập | ROADMAP.md |

Khi hoàn tất từng phase, ghi Rxx và tiểu mục đã xử lý, bằng chứng, điều kiện còn thiếu trong STATUS.md. Không đánh dấu toàn R08 hoàn tất nếu chỉ thực hiện một tiểu mục; không dùng độ phủ mục tài liệu như độ phủ test.

Gradebook owner amendment: [GB-10 full exports and global sorting](features/personal-gradebook/BRIEF.md#gb-10--full-export-and-table-sorting-owner-amendment-2026-10-31) → [acceptance matrix](features/personal-gradebook/FULL_EXPORT_SORT.md); distinct from Board R01–R28.
