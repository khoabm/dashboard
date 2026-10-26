# CP01-B5 — CURATED CODE-QUALITY CI; PR CONFLICT / ACTIONS BLOCKED / 2026-10-26

Baseline `c9e18c1`, feature/personal-gradebook. Latest policy supersedes SQL CI approval: newly staged PGlite dependency/SQL step/ad-hoc runner removed, lock restored exactly; accepted B1–B4/Edge/Prettier/build preserved. CI uses explicit test:ci with six component/pure-unit files; no API/HTTP/Supabase integration, SQL/runtime or browser suites. [Consolidated concern matrix, inclusion/exclusion and pre-merge asset inventory](features/personal-gradebook/B5_OFFLINE_REVIEW.md#current-policy-correction--baselinec9e18c1-supersedes-sql-ci-approval). Prior120/120 Node and temporary20 SQL-group results remain historical; no new integration acceptance. Final curated gate: test:ci66/66 PASS (566ms), check/build/format/diff PASS; no specialist/SQL repetition.

**GB-B5-REV-001/P1 CONFIRMED / OPEN:** PR5 Draft, mergeable=false/dirty against develop307b6c6. Read-only three-tree diagnostic identifies docs/BUG_FIX_LOG.md (competing Gradebook/AUD-020 insertions); docs/STATUS.md changes on both sides without conflict markers. No merge/rebase/conflict resolution/force-push/develop edit performed. GitHub pull_request CI is blocked until a separately authorized reconciliation; no exact-HEAD Actions PASS. GB-B5-REV-002/P2 boundary preserved: PGlite is supplementary regression, not native17 or hosted/security acceptance.

Hosted Supabase/Auth/migrations/deployments0; secretsNO; real dataNONE; stress/load/soak/stretchNONE. Deno/native17/CP01-C/real-data gate NOT RUN, CP02 NOT STARTED. Specialist assets retained pending separate pre-merge cleanup; no premature deletion. Earlier dependency blocker and B5 snapshots below are historical.

---

# CP01-B5 — PARTIAL IMPLEMENTATION / SQL CI BLOCKED / 2026-10-26

Baseline `8f2bcfb`, feature/personal-gradebook. B4 accepted as draft. [B5 coverage/evidence/handoff](features/personal-gradebook/B5_OFFLINE_REVIEW.md): syntax covers13 Edge files; exact Prettier3.6.2 installed/locked, Edge format scope added, B4 files formatting-only; Node adapter loads both actual entrypoints with pinned SDK and zero network. One final-code run: check PASS, tests120/120 PASS, build PASS, format PASS, diff PASS. No accepted SQL/B1/frontend behavior changed.

**Remaining B5 blocker:** automatic approval review rejected adding PGlite alongside Prettier; no dependency workaround. Separate approval is required for a pinned test-only SQL runtime before wiring existing focused disposable SQL tests into CI. Their prior results remain historical, not new CI evidence. Native Deno/bundle NOT RUN (runtime absent); exact-final-SHA Actions outcome reported after publication. Prettier's earlier ENOTCACHED is now resolved locally; no inferred hosted acceptance.

Hosted Supabase/Auth/migrations/deployments0; secretsNO, real dataNONE, stress/load/soak/stretchNONE. CP01-C/native17/rollout/real-data gates NOT RUN; CP02 NOT STARTED. No automatic continuation or merge. Earlier snapshots below are historical.

---

# GB-B4-REV-001 — FIXED IN DRAFT; CP01-B4 READY FOR FINAL REVIEW / 2026-10-26

Baseline `e036521e`, feature/personal-gradebook. Shared OPTIONS allowlist now includes pinned SDK2.118.0's `x-client-info`; explicit origins, POST/OPTIONS, capability header, no-store and authentication unchanged. [Focused review/concern preservation](features/personal-gradebook/B4_INTEGRATION_REVIEW.md#gb-b4-rev-001--sdk-cors-correction-2026-10-26), [bug trace](BUG_FIX_LOG.md#2026-10-26--gb-b4-rev-001--p2-supabase-sdk-cors-header-compatibility-fixed-in-draft). One focused offline run `node --test --test-name-pattern='CORS preflight|HTTP boundaries' tests/gradebook-edge.test.js` **4/4 PASS**; syntax/diff checks PASS. Actual SDK headers captured with synthetic transport; OPTIONS performs no backend work. No full-suite rerun or new crypto/retry acceptance claim.

Hosted Supabase requests/Auth/migrations/deployments0; real dataNONE; stress/load/soak/stretchNONE. Formatting/CI NOT RUN (previous ENOTCACHED), B5 NOT STARTED; native17/hosted JWT/RLS/API/CP01-C/rollout/real-data gates NOT RUN. No deployment or automatic next checkpoint. Earlier snapshots below remain historical.

---

# CP01-B4 — READY FOR REVIEW / 2026-10-26

Baseline `29a7f2a`, feature/personal-gradebook. Implemented draft `grades-admin` and `student-lookup`,13 JS modules plus function config, isolated pinned SDK2.118.0 clients, verified JWT/profile/server actor binding, AES-GCM/HMAC keyrings and secure reveal redaction, encrypted capabilities, B1-bound preview commitments, B3 preflight/atomic apply and committed limiter integration. SQL/B1/Board/frontend/dependencies unchanged. [Five mandatory concern confirmations and HTTP/crypto contracts](features/personal-gradebook/B4_INTEGRATION_REVIEW.md#cp01-b4-implementation--mandatory-concern-confirmations-2026-10-26).

**CON-002 and CON-004 PASS offline.** First focused Node/Web Crypto/SDK-with-mocked-fetch run29/29 PASS; self-review fixed GB-B4-001/P2 enum type coercion with2/2 targeted PASS; three additional keyring/claims/GET503 tests3/3 PASS; publication-race mapping GB-B4-002/P2 fixed with2/2 affected cases PASS; Retry-After CORS/limiter check1/1 PASS. No repeat full suite; current34-test source has no claimed final full34/34 run. Syntax/static/diff checks PASS. **CON-001 static assessment PASS; native17 NOT RUN. CON-003 formatting NOT RUN (offline ENOTCACHED), CI/Deno execution NOT RUN. CON-005 scope PASS.**

Hosted project requests/Auth/migrations/deployments0; production secretsNO; real dataNONE; stress/load/soak/stretchNONE. B4 is ready for review, not deployed or security-accepted. B5 NOT STARTED; CP01-C, migration rollout reconciliation, native17, real-data/key-recovery gates NOT RUN. No automatic B5/deploy. Earlier states below are historical.

---

# CP01-B4 reviewer concerns recorded — 2026-10-26

**Independent static/offline review accepted** `GB-B4-INT-001` reveal correction at `feb256a`; no new test/deploy. Before and during B4 implementation Work must explicitly confirm [five carry-forward concerns](features/personal-gradebook/B4_INTEGRATION_REVIEW.md#cp01-b4-reviewer-concerns--mandatory-confirmation-register-2026-10-26): PostgreSQL17 cross-version assumptions **NOT RUN / CP01-C**, full AES-GCM/HMAC verification and Edge DTO redaction **B4 hard gate**, Prettier previously **ENOTCACHED / B5 CI**, prevention of 40001/PostgREST retry storm **B4 hard gate**, and hosted/real-data prohibitions. Work must return a status/evidence/owner for each; neither PG17 nor Edge crypto/CI is claimed PASS here. B4 remains NOT STARTED until implemented. 0 hosted Supabase requests, migrations applied0, deployments0 for this docs-only handoff.

---
# CP01-B3-FIX-REVEAL — READY FOR REVIEW / 2026-10-26

Baseline `76102e2`, feature/personal-gradebook. **GB-B4-INT-001/P1 FIXED IN DRAFT / NOT APPLIED**: additive `20261026060000_gradebook_reveal_identity_context.sql` adds stored `identityLookup` and row `lookupKeyVersion` only to `gb_student_read(reveal=true)`. Exact body hashes and full metadata preservation guards; ordinary DTO, authorization, class locking, audit and ACL unchanged. [Correction/self-review](features/personal-gradebook/B4_INTEGRATION_REVIEW.md).

One focused disposable PGlite SQL run **7/7 groups PASS**; syntax/source-hash/diff checks PASS. No app/B2/B3 full suite, build or browser test. Prettier offline unavailable (ENOTCACHED), manual formatting review only. Hosted requests/Auth0, migrations applied0, Edge deployments0, secretsNO, real dataNONE, stress/load/soak/stretchNONE. B4/B5 **NOT STARTED**; B4 cryptography/native17/hosted security/CP01-C/real-data gate **NOT RUN**. Prior B4 blocker below is historical, superseded only for this corrected SQL dependency. No automatic B4 continuation.

---

# CP01-B4 preflight BLOCKED — 2026-10-26

Baseline `0bbd0c3`, feature/personal-gradebook. **GB-B4-INT-001 / P1 OPEN:** B3 `gb_student_read(reveal=true)` omits the stored blind index and lookup-key generation needed for the approved AES-GCM AAD and HMAC verification. No current RPC provides that selected record's missing context. [Evidence and minimal upstream correction plan](features/personal-gradebook/B4_INTEGRATION_REVIEW.md). B4 cannot complete secure reveal without a separately reviewed additive B3 correction; accepted migrations are unchanged. No incomplete Edge implementation created.

This turn is documentation/static review only: testsNONE, hosted requests0, migrationsNO, Edge deploymentNO, secrets provisionedNO, stress/load/soak/stretchNONE. B4 **BLOCKED at integration preflight**; B5 NOT STARTED; CP01-C and real-data gate NOT RUN. No hosted failure or new retry incident is asserted. Earlier snapshots below are historical.

---

# CP01-B3 accepted offline / CP01-B4 handoff — 2026-10-26

**B3 correction ACCEPTED at static/offline review** (baseline 778600d); eight custom 40001 business conflicts corrected to PT409 in draft migration. Focused PGlite SQL 13/13 and DOM 4/4 PASS as reported, not independently rerun. **Not hosted integration acceptance.** Board hotfix applied per previously recorded metadata. Three attempted Work smoke-test workflows BLOCKED before authentication/RPC (0 test requests), so observed HTTP409 and lack of PostgREST internal retries remain NOT RUN/INCONCLUSIVE. See [recurrence warning](DATABASE.md#cảnh-báo-tái-diễn-gb-ops-001--sqlstate-retryable-cho-xung-đột-nghiệp-vụ).

**B4 is next for offline code implementation; NOT STARTED.** B5 NOT STARTED; CP01-C and real-personal-data gate NOT RUN. B2/B3/correction NOT APPLIED on hosted, no new secret deployment or hosted testing approved. Continue with [quota policy](TESTING.md#chính-sách-kiểm-thử-tiết-kiệm-quota--bắt-buộc).

---
# CP01-B3 focused correction — 2026-10-26

Baseline `13292a3`, feature/personal-gradebook; **B3 CORRECTION READY FOR REVIEW / NOT DEPLOYED**. GB-B3-REV-003 P1 corrected in additive `20261026050000_gradebook_nonretryable_conflicts.sql`: eight exact business-conflict definitions become PT409 with body/metadata guards. Old migrations unchanged. Board PT409 feedback is now localized safely. [Correction evidence](features/personal-gradebook/B3_TRANSACTION_REVIEW.md#gb-b3-rev-003-correction--2026-10-26), [rollout gate](DATABASE.md#gradebook-migration-rollout-gate--gb-ops-rev-002).

One focused SQL execution13/13 groups PASS (disposable PGlite18.6), DOM tests4/4 PASS; targeted syntax/format/diff only. Full B3/app suites, build, browser, native17, concurrency and hosted integration NOT RUN. **Hosted requests0; hosted migration executionNO; stress/load/soak/stretchNONE.** Board hotfix remains applied according to existing recorded evidence; B2/B3/correction remain drafts. B4/B5 NOT STARTED, CP01-C/real-data gate NOT RUN. No ledger repair/deploy/merge/rebase.

GB-OPS-REV-002 handled by documented dependency/pending-version review and a no-Gradebook-traffic rollout gate, not by altering applied history. GB-OPS-REV-003 quota policy remains RESOLVED. Earlier snapshots below are historical.

---

# GB-OPS-001 — hosted board retry fix applied, 2026-10-26

**Board hotfix APPLIED / metadata verified.** Explicit user authorization followed the initial approval rejection. Supabase migration `20261026034549_stop_business_conflict_retries` replaces business-conflict40001 with PT409 in only `public.reorder_posts(uuid[],integer[])` and `public.save_post(jsonb,jsonb,integer)`. Local filename reconciled to actual hosted migration version; SQL content unchanged.

Verified: both functions contain PT409/no40001, owner postgres, SECURITY INVOKER, empty search_path, anon EXECUTE false/authenticated true. Previously identified looping backend131961 was terminated with explicit permission; exact session absent afterward. No business data mutation, RLS/Auth setting change, project restart or Gradebook apply. No hosted RPC reproducer/load test. Backend work in apply turn: one migration + two bounded metadata reads (first returned only final statement, requiring combined result query).

B3 draft still contains custom40001 and requires correction before apply; B4/B5 not started, CP01-C/real-data gate NOT RUN. Earlier incident snapshots below are historical and superseded by this entry.

---

# Incident GB-OPS-001 — hosted retry storm, 2026-10-26

**P1 / fix prepared, hosted execution BLOCKED by automatic approval review.** PostgREST14.18 repeatedly retries existing board reorder_posts business conflicts raised as40001. Bounded logs/activity confirmed backend131961 with known session start. Prepared additive board-only PT409 hotfix and focused disposable regression PASS. Migration apply and exact-session termination were rejected and did not execute. No live load test. [Finding/evidence](BUG_FIX_LOG.md#2026-10-26--gb-ops-001--p1-postgrest-retry-storm-hosted-fix-blocked).

B3's unhosted custom40001 paths share this risk: **B3 requires correction before hosted apply**, superseding earlier draft-ready status below. No Gradebook migration applied. Earlier B3 implementation evidence remains historical; no B4 work started.

---

# CP01-B3 — transactional RPC draft, 2026-10-26

Branch `feature/personal-gradebook`, baseline `d86627f` matched remote/clean. B1/B2 ACCEPTED; **B3 READY FOR REVIEW, draft only**. 22 service-only invoker RPCs, class-first serialization, shared preview/apply planner + complete private state hash, atomic audit and separate atomic limiter. [B3 review/evidence/boundaries](features/personal-gradebook/B3_TRANSACTION_REVIEW.md).

PGlite18.6: B3 14/14 groups, B2 18/18 groups PASS; app81/81 and npm ci/check/build/format/diff PASS. Native17/multi-connection/hosted/browser/CI NOT RUN. B4/B5 NOT STARTED; CP01-C/real-data gate NOT RUN. No hosted migration/query/config, deployment, merge/rebase or frontend change.

The B2 and older snapshots below are historical.

---

# CP01-B2 — schema/security migration draft, 2026-10-26

Branch `feature/personal-gradebook`, baseline local/remote `282bebc89f630fe773c016c0ec7bb94b7681143e`, clean; develop `307b6c6`, not merged/rebased. **B1 ACCEPTED; B2 DRAFT READY FOR REVIEW / NOT APPLIED TO SUPABASE.** Six isolated tables, exact catalogs, RLS/ACL and narrow boolean session helper. Migration file exists in Git; no hosted changes, public RPCs, Functions, UI or new project dependency.

Local **18/18 SQL groups PASS** on disposable in-memory PGlite 0.5.11 / PostgreSQL18.6 with synthetic platform dependencies + four old migrations. **81/81 offline app tests**, npm ci/check/build/format/diff PASS. Native PostgreSQL17/hosted JWT/API/security acceptance and GitHub CI on B2 commit NOT RUN. [B2 review/evidence and safe rollout/rollback](features/personal-gradebook/B2_MIGRATION_REVIEW.md). Existing B1 findings remain fixed.

B3–B5 and CP02–CP07 NOT STARTED; CP01-C and real-personal-data gate NOT RUN. No migration apply/PR/merge/rebase/deploy. CLI generated the filename, then automatic approval blocked telemetry; no retry, no further CLI operation. Remaining work follows the review's separate acceptance matrix.

The older snapshot below is historical and does not override the B1/B2 status above.

---

# Trạng thái dự án — baseline kiểm chứng 2026-10-26

**Repo:** `khoabm/dashboard`. **Source tích hợp:** `develop` tại `307b6c611ca36d8d8e05a6cccf8dadd86d754a30`; GitHub Offline CI **PASS** cho push tại chính SHA này (đọc GitHub ngày 2026-10-26). **Branch feature docs:** `feature/personal-gradebook`, correction CP00 baseline `eba7c18e`, CP01-A refinement reviewed baseline `31f887bd`. Branch feature xuất phát từ `develop` `af43f51`, đang thiếu một commit branding/UI/preview của develop tại thời điểm đối chiếu; chưa merge/rebase. Không suy kết quả CI của develop sang feature HEAD.

| Luồng | Trạng thái được xác minh / việc còn thiếu |
| --- | --- |
| Bảng học liệu | Đã có frontend static Vite, admin Auth/session, CMS, Storage/RLS và regression offline. **Chưa đạt Definition of Done**: real admin/non-admin JWT, upload/thu hồi file, Safari/thiết bị thật, backup/restore và production smoke còn cần bằng chứng; xem [TESTING](TESTING.md) và [QA_REPORT](QA_REPORT.md). |
| Bảng điểm cá nhân | [Brief V1.1](features/personal-gradebook/BRIEF.md), [Data/security](features/personal-gradebook/DATA_AND_SECURITY.md), [CP00–CP07](features/personal-gradebook/CHECKPOINTS.md). **CP00 docs PASS; CP01-A REFINED / READY (docs-only); CP01-B và CP02–CP07 implementation NOT STARTED; CP01-C security acceptance NOT RUN**. [GB-A-REV-001..003](features/personal-gradebook/CP01_TECHNICAL_DESIGN.md#143-accepted-refinement-disposition) sửa phạm vi epoch, fingerprint UPSERT và DOB date-only; BRIEF không đổi. Chưa có source/migration/Function/dữ liệu học sinh được tạo. |
| Database hiện có | 6 bảng `public` cho học liệu, 4 migration học liệu đã apply theo tài liệu baseline. Gradebook gồm 6 bảng **chỉ là đề xuất**, chưa apply; không được tạo tài khoản học sinh thật để test. |
| Security Advisor (kiểm tra 2026-10-26) | Supabase hiện trả **1 WARN**: `auth_leaked_password_protection` (Leaked Password Protection Disabled). Xem [remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Đây là advisory cấu hình Auth, **không phải bằng chứng lỗi Gradebook**; không tự bật gói trả phí. |
| Quy trình an toàn | [Real personal data gate](features/personal-gradebook/DATA_AND_SECURITY.md#h-real-personal-data-gate) **NOT RUN**. Không xử lý dữ liệu học sinh thật trước khi có bằng chứng cần thiết; triển khai/test synthetic có thể chuẩn bị theo checkpoint được phép. Không có deployment/merge thuộc lượt docs này. |

**Bằng chứng CP00 docs:** correction `eba7c18e` đối chiếu [GB-REV-001..008](features/personal-gradebook/CHECKPOINTS.md#cp00-finding-dispositions); lượt sau làm rõ file Excel/CSV học sinh chỉ gồm `CMND/CCCD` và `Ngày sinh` cũng hợp lệ, bổ sung regression checklist. Các kết quả kiểm tra Markdown là **docs-only**; unit/browser/backend Gradebook, grants/RLS và migration thật **NOT RUN**. Mọi thao tác tiếp theo cần kiểm tra ref/HEAD mới thay vì dùng snapshot này như sự thật vĩnh viễn.

**CP01-A refinement / 2026-10-26:** local/remote `31f887bd`, working tree sạch trước sửa; develop `307b6c6`, feature ahead 5/behind 1, không có commit remote mới, không merge/rebase. Ba finding được sửa trong thiết kế, acceptance và B1–B5; không đổi BRIEF, không truy vấn lại Supabase, không chạy runtime/security/browser tests. Xem disposition và commit chứa dòng này cho diff docs-only; real-data gate **NOT RUN**.

**Thiết kế CP01-A ban đầu / 2026-10-26 (snapshot):** input HEAD local/remote `f522266`; develop `307b6c6`, ahead 4/behind 1 trước lượt đó. Read-only Supabase xác nhận dashboard/Free/PG17.11, 4 migration khớp repo, 6 bảng học liệu RLS, chưa có schema gradebook/Edge Functions; Data API zero-row public 200/private 406. Default grants public còn rộng và service_role không đọc auth.sessions: thiết kế yêu cầu revoke RPC và helper session chỉ đọc, không đổi quyền thật. Audit server INSERT đã có. Metadata này không phải nghiệm thu backend.

---

## Snapshot lịch sử — ghi nhận ngày 2026-10-25 (không phải baseline hiện tại)

Nội dung dưới đây giữ nguyên bối cảnh và bằng chứng AUD-015–019 tại thời điểm lập; mọi câu mô tả branch đang làm, chưa merge, số lượng test và kết quả Security Advisor là thông tin lịch sử, **không đại diện trạng thái hiện tại của `develop`**. Xem phần đầu trang để lấy baseline mới.

Cập nhật 2026-10-25. Repo `khoabm/dashboard`, branch `enhancement/acceptance-refinements` từ `develop` tại `ad8c78c`; baseline lượt AUD-017 là `ff8c567`. Develop đã chứa các sửa AUD-001–014; branch này dành cho các hạng mục hoàn thiện nghiệm thu. **Đã có implementation, chưa đạt Definition of Done.**

| Thành phần | Bằng chứng hiện tại |
| --- | --- |
| Frontend | AUD-017: giữ UI hiện tại, thêm native scrollbar phía trên + trái/phải sticky khi tất cả chủ đề overflow; không có “Đi đến”. Giữ anchor qua refresh, reveal/focus cột mới sau snapshot xác nhận. Mobile giữ một cột/bộ chọn cũ. Stack/dependency không đổi; build static PASS |
| CI / Code style (2026-10-24) | Prettier 3.6.2 đã format toàn bộ 28 file thực thi/test tại `4058de8`; bước debug-check AST, unit, syntax, build và format-check hoàn tất trước commit của GitHub runner. CI chính kiểm tra toàn bộ code, không còn baseline. PR #1 tại `20772f1` đã fail format; upstream `e5605d8` sửa hai dòng trắng thừa và CI PR #1 tại upstream đã PASS (run `40054261324`). CI baseline 306958f PASS (run 40064785504). Bản hoàn thiện pulse có 30 unit; kiểm Checks của PR nhánh hiện tại tại đúng HEAD, không suy PASS từ SHA cũ. CI không gọi API/Supabase |
| Comment coverage (2026-10-24) | Đã áp dụng [COMMENTING_GUIDELINES](COMMENTING_GUIDELINES.md) cho các module thực thi, bổ sung quy tắc DOM container/cha–con/render lifecycle và callback side effect cùng good/bad case. Source được chú thích theo vai trò vùng UI (board shell, bộ lọc, board/admin regions, card, dialog/editor/media). Các sửa logic audit được ghi riêng trong [BUG_FIX_LOG](BUG_FIX_LOG.md), áp dụng cùng quy ước format/comment |
| Supabase | `dashboard` / `vgciiqtwmxcdqppntgnt`, PostgreSQL 17.11; tổ chức `qvosfzztldzaxxodxzlx` plan/tier Free theo plugin. 4 migrations đã apply; private bucket, RLS, audit, optimistic save/reorder và quota RPC |
| Auth / CMS | AUD-016: SDK giữ phiên trong sessionStorage theo tab; bootstrap xác minh Auth user + active admin profile trước khi bật quản trị; lỗi giữ UI khóa/retry, generation chặn kết quả sau SIGNED_OUT. 35 unit PASS; QA-A18 dùng SDK/storage thật + transport giả, 0 Supabase live. SQL cũ xác nhận một active admin; server signup/anonymous và E2E Auth/JWT thật vẫn chưa nghiệm thu |
| QA | 38 unit/check/build PASS khi chạy lại 2026-10-25. QA-A19 PASS các yêu cầu điều hướng đã chốt bằng IAB và iframe360/390/768/1024/1440, Auth/transport mock. Test/fixture frontend ở tests/; ảnh/check logs/scratch ở tests/local/ đã ignore. Các bằng chứng AUD-001–016 giữ tại [QA_REPORT](QA_REPORT.md); không suy mock thành JWT/Storage/thiết bị thật |
| Security | Security Advisor: 0 lint. Performance: còn INFO unused sections_board_order trên dữ liệu mới; không có WARN multiple policies sau migration cuối. Non-admin/admin JWT thật và file runtime access chưa test |
| Sync | Refresh sau ghi/active/manual, không polling hoặc Realtime. Chưa test hai context với admin thật |
| Quota / chi phí | Snapshot 2026-10-23: DB physical estimate ~11,55 MB, Storage runtime 0 byte; chưa đo lại usage, egress UNKNOWN. App cảnh báo 70%/critical 90%, chặn upload từ Storage 90% và khi không đọc được usage. Lượt sửa không bật dịch vụ trả phí/add-on/hosting. Lượt AUD-015 chỉ debug offline, 0 request Auth/REST/Storage tới Supabase thật. Lịch sử lượt audit trước: 1 batch SQL rollback thành công, 1 lần lỗi connector hết hạn không có kết quả SQL. Chưa xác minh phí hosting Sites |
| Sites / main | Chỉ preview nội bộ bằng Sites supervisor; không tạo Site, hosting manifest, version/deployment/public URL, không đổi audience hoặc merge main |
| Wireframe | Bám mô tả R05, có ảnh UI trong docs/qa; chưa có ảnh wireframe quản trị gốc để đối chiếu hoặc visual acceptance |

### Kế hoạch đã ghi tại snapshot 2026-10-25 (tham khảo lịch sử)

Trên `develop` baseline `af43f51`, vùng mô tả tối thiểu 3 dòng + 2 cm CSS (giảm 3 cm so với lượt trước), không clamp và cho chuỗi dài xuống dòng; footer giữ khoảng cách cũ. Browser Codex/IAB đã truy cập được Vite chạy loopback ngoài sandbox: QA iframe 360/390/1024/1440 PASS, thẻ ngắn giảm ~113,4 CSS px; mô tả dài/chuỗi liền hiển thị đầy đủ, không tràn ngang. Check/build/format CSS PASS. Xem AUD-020; giữ nguyên thay đổi local khác. Thiết bị thật NOT RUN.

AUD-019 (baseline `34b2ff0`): sửa hai assertion message cũ bằng bất biến nháp/cleanup tại `bd6acb1`, format riêng 5 file upstream tại `c1230c3`. 41/41 unit/check/build/format PASS local; Offline CI run `40152051421` PASS tại `c1230c3`, gồm đủ unit/build/format. Working tree sạch sau khôi phục EOL checkout; chưa merge/đổi Draft/deploy. Commit cập nhật docs sau đó cần kiểm CI riêng theo HEAD. Xem BUG_FIX_LOG.

AUD-018 (2026-10-25, baseline `6bf2069`): bổ sung regression/fixture còn thiếu vào Git, giữ tests/local được ignore. Build production có gate chặn test module và kiểm allowlist dist; 38 unit/check/build cùng hai negative checks PASS. Chỉ deploy dist; URL test production NOT RUN, chưa deploy. Chi tiết BUG_FIX_LOG và DEPLOYMENT.

Lượt AUD-017 tiếp tục trên cùng branch, baseline `ff8c567`, giữ phạm vi thiết kế đã được chấp nhận. Gate Prettier nguyên bản FAIL ở 27 file không sửa, đã xác nhận chỉ khác CRLF checkout so với blob LF tại HEAD; kiểm tra EOL auto toàn code PASS. Chi tiết QA-A19. Không format toàn repo, không thay dependency/schema/policy/Auth server hoặc deploy. Ảnh Auth QA-A18 đã chuyển từ docs/qa sang tests/local/artifacts theo yêu cầu gom output local, không đưa lên Git.

Admin đã tồn tại. Đối chiếu [ADMIN_SETUP](ADMIN_SETUP.md) để xác minh server signup/anonymous sign-ins đang tắt; không tạo thêm admin. Tiếp tục nghiệm thu login/logout/CMS/upload/private file/signed expiry/thumbnail/sync với phiên thật trong một lượt có mục tiêu. Không yêu cầu password/OTP/token qua chat.

Gate chưa xong: native filechooser/OS (QA-A10 File API đã PASS); real admin/non-admin JWT, upload/partial failure và file revoke thực, offline/session expiry, Safari/iPhone/Android thật, full backup/restore, xác minh hosting 0 USD và audience. Không báo hoàn thành sản phẩm hoặc public deployment khi thiếu gate này. [IMPLEMENTATION_PLAN](IMPLEMENTATION_PLAN.md) map Phase 0–6; [QA_REPORT](QA_REPORT.md) giữ chi tiết test thay vì nối log tại đây.
