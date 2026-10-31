# AI-IA01 — Intent-aware conversation improvement / Draft PR #37 (2026-10-31)

**Branch under review:** [feature/ai-assistant-intent-aware-chat-20261031](INTENT_AWARE_EXECPLAN.md).
General Vietnamese questions no longer retrieve Board by default; explicit website
questions use fresh published-only sources, ambiguous intent can invoke bounded Qwen
classification, and mixed answers carry a visible provenance note. Pure CI passed on
`a4d242a`; newer browser fixture and latest CI require separate receipt. This is
**source-only on Draft PR #37**: no hosted model test, Worker production deployment,
Gradebook/Auth/schema change or merge. Browser/hosted acceptance remains NOT RUN.
Earlier Pilot/V2 paragraphs below are historical and must not supersede the
[normal live contract](LIVE_CHAT_ACCEPTANCE.md).

---

# Desktop correction và owner preview — 2026-10-29

**Luồng hiện hành:** [Live chatbot](LIVE_CHAT_ACCEPTANCE.md), Worker entry live.js,
general knowledge +published Board thật, history trong memory, rate-limit3/10 giây.
Không owner token, expiry, lifetime reservation hoặc permanent failure-stop trong
live path. Main dùng createLiveAssistantRequest; các mục Pilot/UAT dưới đây là lịch
sử, không phải hướng dẫn bật chatbot hay quota hiện hành.

**Current: [V2 explicit pilot](V2_PILOT_ACCEPTANCE.md) Hosted Pilot PASS trên hai
mẫu thật; [Owner hosted Start/Stop](OWNER_AI_PREVIEW.md) đã kiểm chứng.** Còn3/5
reservations,23/40 operations; ưu tiên2 lượt owner, Free receipt có hạn30 phút.
Final Worker disabled; không production-ready. Legacy blocked snapshot dưới
không thay cho authorization/receipt pilot mới và vẫn được giữ nguyên.

[Gate C Desktop](GATE_C_DESKTOP.md): date/privacy/server-clock corrections và
Chrome scripted QA hoàn tất. Hosted model/owner live BLOCKED do existing allowance
stopped/remaining0, không reset hoặc cấp mới. [Owner demo Start/Stop](OWNER_AI_PREVIEW.md)
chạy local, ghi rõ scripted offline. Worker cuối disabled/access cleared; không
merge/website deploy. Bằng chứng Gate A/B phía dưới giữ nguyên lịch sử.

---

# Gate A/B hiện hành — public content theo mọi topic

[Acceptance/ma trận U01–U20,T01–T10](GATE_AB_ACCEPTANCE.md), [ExecPlan](V2_EXECPLAN.md).
Không dùng preview1200/first24 làm corpus; full local text index + bounded passages + native citations.
Website guidance deterministic; temporal subcapability, partial coverage/file boundaries minh bạch.
Gate C/D không thực hiện; hosted/deploy0, không đổi PRODUCT_PROFILE/allowance/run ID. Hồ sơ cũ bên dưới
là lịch sử và không cấp quyền tự thực hiện hosted trong Gate A/B.

---

# Trợ lý học liệu trong website Vui học cùng cô Quỳnh

**Vai trò:** Trợ lý là tính năng của **Bảng học liệu** trong website **Vui học cùng
cô Quỳnh**; KHTN8 Board chỉ là tên lịch sử của ứng dụng học liệu.
[Mục đích và mô hình sản phẩm](../../PRODUCT_PROFILE.md).

Trợ lý có thể giới thiệu các ứng dụng ở mức công khai và hỗ trợ thống kê,
tìm, tóm tắt hoặc giải thích văn bản bài học published theo nguồn được phép.
Không thể đọc bảng điểm, dữ liệu lớp/Auth, file bytes/ảnh/video hoặc thực hiện ghi.
AI hosted mặc định tắt; đánh giá synthetic không tự cho phép dùng nội dung thật
hoặc phát hành công khai. [Acceptance V2](V2_ACCEPTANCE.md) ·
[ExecPlan](V2_EXECPLAN.md). Các log MVP bên dưới là lịch sử, không cấp thêm quyền.

**Website Knowledge / Navigation correction:** runtime profile được mở rộng
với công dụng và hướng dẫn mở các ứng dụng đã có; câu hỏi công khai về Bảng
điểm cá nhân không còn bị chặn bởi mỗi từ khóa "bảng điểm". Yêu cầu đọc/sửa
dữ liệu riêng vẫn bị từ chối. Nhãn lịch sử KHTN8 chỉ nằm trong documentation,
không có chatbot intent cho tên cũ. Đây là refinement CP01–CP02, không mở
AI public hay thay đổi roadmap và quyền truy cập.


---


# V2 corrective extension — 2026-10-29

[Implemented scope, tests, browser evidence and hosted ledger](V2_ACCEPTANCE.md).
[ExecPlan and pre-implementation decisions](V2_EXECPLAN.md). V1 evidence below remains historical;
V2 model quality is not inferred from earlier V1 hosted tests. No hosted V2 calls or deployments.

# Board Assistant MVP — execution contract

Baseline: `develop` / `4f254961e9fa3604e8e843e3c5f63a15f2e9edc7`, 2026-10-29.
Product requirements: [SPEC R07.1](../../SPEC.md#board-assistant-mvp).
User authorizes local development and a separate Cloudflare Worker deployment; no merge,
website deployment, main change, Supabase calls or real student data.
Autonomy applies only to this task. Do not change AGENTS.md or carry permissions to later
tasks. Any paid requirement, including Codex credits, card/trial/add-on/plan upgrade, stops
deployment and must be reported; zero cost takes precedence over completion.

## Concern/test matrix fixed before implementation

| Concern | Smallest verification | Gate |
| --- | --- | --- |
| Published-only projection / no attachment, credential or Gradebook fields | Pure finite projection/rejection cases | Required offline |
| Hybrid retrieval / unsupported question / exact source citation | Pure ranking and decoded output cases; synthetic hosted samples | Required; model quality remains bounded sample evidence |
| Read-only actions / stale or revoked sources | Pure action allowlist plus browser open/filter/reset | Required offline |
| Late response, cancel, close, refresh, route exit | Component ownership and finite browser cases | Required offline |
| Input/body/output/deadline budgets / no retry | Manual specialist Worker/transport tests, outside test:ci | Required offline |
| Cross-isolate global hosted allowance | One SQLite Durable Object counter, reserve before inference; finite local storage fault/concurrency cases | Required before hosted inference |
| UI and keyboard / small-screen overflow | Actual Chrome desktop and 390px viewport; no physical-device/Safari claim | Required before UI acceptance |
| Free plan / binding / deployed integration | Dashboard configuration + one approved finite synthetic run | Hosted gate |

Expected inventory: `src/utils/board-assistant.js`, `src/services/board-assistant.js`,
`src/components/board-assistant.js`, `src/styles/board-assistant.css`, narrow `src/main.js`
integration; `workers/board-assistant/` Worker/config; pure tests and separate specialist
tests; SPEC/overview/status/architecture/decisions/requirements map and this evidence file.
Do not change CI scope, stack, dependencies, existing local env/Vite edits or Gradebook.
Local tools, fixtures, screenshots and scratch runners remain ignored under `tests/local/`.

## Hosted authorization and stop conditions

User approved three separate activities, each with **maximum 20 Worker/model requests combined**, synthetic
questions/catalog only, no Supabase, no automatic retries. Count browser preflights and
inference invocations separately. Deployment/control-plane operations are recorded separately,
never mislabeled as test request counts. Stop immediately on 429, 503, timeout, Free-plan
uncertainty or budget exhaustion. Missing execution authority is BLOCKED, not offline PASS.

Codex weekly remaining quota threshold: stop safely if a checkpoint reports below 55%;
preserve source and record handoff. Final checkpoint observed69% remaining; shared-account timing prevents an
exact real-time threshold guarantee. No unattended background continuation is configured.

## Architecture decision for this MVP

The chat surface supports grounded retrieval and explicit read-only action buttons. BGE-M3
ranks a bounded, public text snapshot together with lexical matching. A text model selects
existing source IDs; the Worker derives excerpts from original source bytes and validates
them as exact substrings. The model cannot emit executable
actions. Answers are identified as excerpts, not claimed to be unrestricted generative chat.
No PDF/OCR/video extraction, persistent conversation, tool execution or Gradebook integration.
The browser rechecks the current published snapshot before accepting responses and actions.

For a small bounded MVP, embeddings are computed from the request snapshot, eliminating a
persisted stale index. This trades inference tokens for simpler revocation and is not the
final production indexing design. Larger catalogs use local keyword search until an index
and revocation contract is separately accepted. Source changes invalidate the conversation.

Cloudflare holds no Board database connection. One Durable Object stores only a counter and
stop flag, needed for a global finite inference ceiling; no D1/R2, content or IP persistence.
Default frontend/Worker activation remains off. Hosted preview expires and stops on failure.

## Evidence

**MVP SYNTHETIC E2E PASS. Production/public-release acceptance NOT RUN.** At E2E completion,
source was uncommitted on the original `develop` baseline; no commit, push, merge, Pages/site deploy,
AGENTS change, Gradebook/schema/Auth change or paid resource. Existing `.env.example` and
`vite.config.js` modifications preserved. Local Node25.2.1 / Vite8.3.5 / Prettier3.6.2;
Wrangler4.154.0 and its tools installed only under ignored `tests/local/ai-tools/`.

Subsequent owner request authorizes commit/push to **`ai-learning-assistant`** only. Publication
retains the tested source and uses `[CF-Pages-Skip]` as the commit prefix to skip Pages deployment
([official behavior](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/)).
No main/develop push, merge, new hosted test or deployment is authorized by that publication.
Existing local `.env.example`/`vite.config.js` edits and ignored tooling stay outside the commit.
Publication SHA/remote confirmation is reported after push; prior test evidence is retained without rerun.

### Offline checks and attempt counts

- Pure cases5/5, latest after lexical correction; two runs total, both PASS.
- Manual Worker specialists: six runs total (7,7,8,8,8,8 cases), each PASS after intervening
  implementation changes; latest8/8 includes ID schema/invalid IDs, completion envelopes,
  discarded Qwen think wrapper, permission/input gates, no-retry failure, stop flag and
  final-slot serialization. These tests are outside unchanged `test:ci`.
- Manual transport specialists5/5, one run: disabled/input zero-call, credentials omitted,
  exact citations, 429 single-attempt, oversized output and caller cancellation.
- Actual workerd/SQLite local counter: PASS seven finite local invocations, no AI/network.
  First harness attempt used old Miniflare options and failed validation; second encountered
  sandbox loopback EACCES; corrected V5 adapter and authorized loopback execution passed.
  This is not a reboot/disaster-recovery test or a load benchmark.
- `npm run test:ci`: two runs,131/131 each; second after mobile-filter integration correction.
  `npm run check`: three runs PASS; `npm run build`: three runs PASS including output exclusion.
  Source changed between runs. Existing large student-chart chunk warning retained, no threshold change.
- Scoped Prettier PASS for all changed/new code including Worker and local-preview config;
  no repository-wide format or full-format rerun. `git diff --check` PASS. Local preview config
  import/assertions confirm loopback host, replaced tunnel allowlist and inherited4173 port;
  this config was not launched against real Board data. GitHub Actions NOT RUN.

### Actual Chrome synthetic browser cases

Actual app/main/Board callbacks execute with only `client=null` and read-only Board snapshots
substituted by an ignored local Vite plugin. Unsupported writes throw; no successful fake
backend is part of production. All cards prominently identify synthetic data. The test page
does not load a Supabase client. No student lookup form was submitted.

PASS: published-only results/hidden exclusion, keyword/no-result/obvious identifier rejection,
native modal focus and Escape, source preview with correct focus, topic selection, filter and
reset, local keyword fallback after hosted503, cancellation and ignored late responses,
new conversation during pending, and browser Back away from Board during a six-second
simulated response. The latter leaves the student route visible without a chat/late result.
Refresh/route invalidation also has source review; instant backend revocation between
snapshots is not claimed.

Final desktop document width1521/scrollWidth1521; dialog clientHeight686/scrollHeight686,
submit bottom679.2 < dialog bottom704. Configured mobile390×844: document375/scrollWidth375
(native scrollbar), dialog810/810, submit bottom811.2 < dialog bottom828. Mobile `lực đẩy`
filter selects physics and updates the existing search input; reset clears the query.
Viewport override reset afterward. Short-height recovery has static CSS review only.
Physical mobile/Safari/screen-reader acceptance NOT RUN; responsive Chrome is not those devices.

### Hosted evidence and accounting

Cloudflare dashboard confirmed **Free / $0 / Current plan** before provisioning. OAuth
Wrangler scopes were separately approved; the first callback expired, the renewed same-scope
flow succeeded. No credential was read into source/output or Git. Deployment/control-plane
requests (including dashboard/OAuth) are separate from the following data-plane budgets;
their exact account-wide HTTP count is not measured.

| Activity | Worker POST | Model invocations | Budget-object calls | Preflight | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| Approved1, version9f1f89e5 | 1 | 0–2, not retained | 0–2, not retained | 0 | HTTP503; stopped immediately, no retry; at most5 total |
| Approved2, version77ccd479 | 3 | 6 | 4 including stop | 0 | HTTP200,200,503(validation);13 total; stopped immediately |
| Approved3, version14c703ad | 4 | 8 | 4 | 0 | HTTP200×4;16 total; no retry or fifth probe |

Same-origin localhost proxy avoids browser preflight; safe receipt headers confirm two
model invocations per completed run2/run3 POST. Each allowance has at most four reservations;
new allowance IDs were used only after the user's separate run2/run3 approval. No stress,
quota-exhaustion probe, polling or request-loop benchmark. Provider-internal infrastructure
traffic/processing is not independently counted by this evidence.

Run3 cases: physics paraphrase → physics source; capital-of-France question → no source;
request to publish/open private grades → related public gas source only, **no command or
Gradebook access** (not a claim of perfect refusal phrasing); gas paraphrase → gas source.
Actual UI clicked the final AI citation and opened the correct original post. This is finite
integration evidence, not Precision@3/latency/SLA certification or a broad Vietnamese benchmark.

Five successful Worker deployments, all the same Worker/namespace:40b8d6dc(initial),
9f1f89e5(abort handling before run1),77ccd479(run2),14c703ad(ID-only run3),
**2fe4ac69-1355-452d-906b-9c1ebec9e0c8(final disabled)**. Current Worker origin:
`https://khtn8-board-assistant-mvp.joemckahn.workers.dev`; `/chat` is deliberately disabled.
No HTTP probe was made after disabling. Final CLI deployment receipt shows
`AI_ENABLED="false"`, empty expiry and no run override. Initial dry-run path escaped the
workspace and was denied before output; corrected absolute ignored output succeeded.

Agent-issued Supabase test calls/SQL/Auth/Storage requests0. Existing owner localhost4173,
production tabs and possible background/HMR traffic were left alone and are unmeasured;
do not generalize the isolated QA count to the entire browser/account. No real Board content,
student data, secrets or runtime uploads were used for AI. No paid plan/card/trial/credit
request was accepted. Final weekly Codex remaining69%; safe-close threshold was not reached.

## Local use and next gate

Default `npm run dev` keeps keyword chat usable and cloud inference disabled. The persistent
[`local-preview.config.js`](../../../workers/board-assistant/local-preview.config.js) adds a
same-origin `/assistant/chat` proxy without changing the owner's Vite file or widening CSP.
It replaces the inherited tunnel host allowlist and rejects non-loopback Origin requests.
It does not change Workers Free, activate a Worker, approve real data or grant another test run.

After separately verifying Free/authorization/activation in a future task, the owner can set
the public `BOARD_ASSISTANT_WORKER_URL` origin and use the existing Vite binary with that
config. Do not start a second4173 server or send real content as an automatic acceptance test.
The ignored4174 QA harness is synthetic-only and not a production adapter or deliverable bundle.

Before public use: independent Vietnamese retrieval evaluation on an approved corpus,
index/revocation scaling beyond24 posts/1200 characters per summary/64KB payload, real-content
privacy acceptance and public API abuse controls. CORS is not authentication. No public site
deployment or new task's hosted test is authorized by this task's completion.

Official references checked 2026-10-29:
[Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/),
[BGE-M3](https://developers.cloudflare.com/workers-ai/models/bge-m3/),
[Qwen3](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/),
[data usage](https://developers.cloudflare.com/workers-ai/platform/data-usage/),
[Durable Objects Free](https://developers.cloudflare.com/durable-objects/platform/pricing/).
