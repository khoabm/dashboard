# Board image optimization — development candidate 2026-10-31

## Target / limits
- Branch: `feature/client-file-compression-20261031`, base `develop@b6f340559f0364a2406e778142936fdbd1b47790`.
- Draft PR #38; implementation `e3a0447`. Do not merge or deploy until owner approval.
- Only Board post `AttachmentUploader` images are optimized on-device. JPG, PNG, WebP
  may convert to WebP at progressively lower quality (0.82, 0.72, 0.62, 0.50),
  **keeping the decoded original pixel width and height**. No resizing, cropping,
  stretching or enlargement.
- Optimize only if final bytes <2,000,000 and strictly smaller; for originals already
  below the Storage limit require ≥10% AND ≥20 KB saving. For previously oversized
  images, any valid smaller-than-original output below the limit qualifies.
- Bounds: original image ≤12,000,000 bytes, decoded pixel count ≤24,000,000; do not
  attempt browser processing outside limits. Decode/encoding failures retain original.
- Original file is never mutated. Converted filename and MIME become .webp/image/webp,
  then the ordinary `validateFile` and `verifyFileSignature` checks run.
- UI shows checked-by-default opt-in plus a per-file result when selecting files:
  compressed original→final size, percentage saved, unchanged size, or the best
  unsuccessful result and upload rejection. These results show **before** any upload.
- Non-images PDF, DOCX, PPTX, XLSX pass unchanged; no video support, PDF rebuild,
  Excel rewrite or automatic backend transformation.

## Explicit preserved invariants
- Existing private `learning-resources` bucket, its exact provider MIME and size caps,
  database attachment constraints, Auth/RLS and API/Edge contracts remain unchanged.
- No third-party image service, new package, transcoder, remote compression calls,
  key/secret, Supabase migration or Cloudflare build setting.
- Existing `uploadAttachments` quota/cleanup/metadata flow and draft recovery wait
  for asynchronous file acceptance. IndexedDB retains the actually selected optimized
  file and the original remains on the owner's device.

## Acceptance matrix
| Concern | Verification | Current result |
| --- | --- | --- |
| MIME/extension, size thresholds and fallback selection | Four focused Node pure tests in `tests/validation.test.js` | PASS |
| Existing file/signature/upload business rules | Unchanged validation/Storage services, curated unit suite | PASS within offline scope |
| Static/syntax, production build, Prettier | GitHub [run #41172134389](https://github.com/khoabm/dashboard/actions/runs/41172134389) at `e3a0447` | PASS, 184/184 unit |
| Canvas retains original decoded pixel dimensions and tries lower encoding qualities | Scoped browser API mocks in `tests/validation.test.js` | PASS in unit harness |
| Browser image appearance, color/transparency/EXIF | Compare JPG/PNG/WebP samples and before/after on Chrome, Safari, Android | NOT RUN |
| Large image >2 MB compresses below 2 MB, input >12 MB rejected | Browser local file test, no remote request until approved | NOT RUN |
| Toggle off, PDF/DOCX/PPTX/XLSX unchanged, video rejected | Browser selector and attachment preview/draft restoration | NOT RUN |
| Mobile 375/390, tablet 768, desktop 1440, dialog close while processing | Browser responsive/focus/keyboard/device resource QA | NOT RUN |
| Actual Supabase upload and download integrity | Requires bounded owner approval and hosted quota plan | NOT RUN |

## Risks and fallbacks
Some photos will not shrink enough to meet the existing 2 MB policy; they remain
rejected. Images containing tiny text/diagrams may require keeping originals to
preserve readability; the checkbox permits opting out. Converting JPEG/PNG to WebP
may change metadata and pixel representation; quality verification is a browser QA
gate, not established by the Node tests. The browser must have available RAM and
WebP Canvas encode support; unsupported environments use original bytes. The
optimization is strictly client-side. Existing bucket/database size and MIME
constraints plus permission checks remain enforced by the provider; image signature
validation remains in the existing browser-side flow, not a new backend check.

No hosted request, billable add-on, external service, migration, merge, or deploy
was performed in this feature task.

## Owner revision: resolution and selection feedback (2026-10-31)

- Do not resize photographs. The optimized WebP keeps the original decoded pixel
  width and height; only encoder quality changes, and the first useful result
  below the existing 2 MB bound is selected.
- The prior longest-edge 1,600px policy is superseded. Large images above the
  existing decoded pixel safety cap return the original and may fail validation;
  this is an explicit memory-safety fallback, not a request to rescale them.
- A separate readable result is shown for each selected file, including successful
  before/after sizes and percent reduced, failed compression (best candidate if
  available), disabled compression, and documents kept intact.
- Validation message becomes "Mỗi tệp phải nhỏ hơn 2 MB." only; the byte limit
  of 2,000,000 remains unchanged in client validation and provider/database.
- Code SHA / CI for this revision: see PR #38 checks. Real device and actual
  hosted Storage testing remain NOT RUN until owner browser QA.
 
## QA diagnostic follow-up — unexplained 2.83 MB rejection

A selected, signature-valid JPEG of 2.83 MB may be rejected *before any WebP
encoding* if its decoded width × height exceeds the existing 24,000,000-pixel
browser safety cap. Other possible outcomes include Canvas or WebP unavailable
and image decoding/encoding errors. Previously all of those resulted in the
ambiguous message “Chưa nén được” despite `optimizeImage` returning a
specific `reason`. The uploader now distinguishes these causes and, for
the pixel-limit case, displays actual decoded dimensions and megapixels.
The cap, original-resolution guarantee, 2 MB Storage ceiling and backend
contracts are unchanged. This is an explanatory UI correction, **not**
confirmation of the cause for the owner’s specific file; the unchanged source
JPG is required for that determination. Packaging the JPG in a ZIP archive
before attaching it to ChatGPT preserves the original file for inspection.


## 2026-10-31 — Safe 48.77 MP trial (owner-approved follow-up)

The original ZIP's source JPEG is **2,829,094 bytes, 8,064 × 6,048 pixels
(48,771,072 pixels = 48.77 MP)**, not a compressed chat preview. A previous
24 MP guard rejected this JPEG before WebP encoding; it was not a case of
WebP being inherently unable to fit below 2 MB.

The new code retains the previous 24 MP main-thread Canvas ceiling, but can
select a separate **module Web Worker + OffscreenCanvas** path for high-resolution
images. The worker decodes/encodes at the original pixel dimensions, attempts
the existing WebP quality sequence, and returns a candidate only when the
existing strict <2 MB rule passes.

Safety gates are conservative advisory capacity checks:
- No Worker/OffscreenCanvas/createImageBitmap: max 24 MP as before.
- Worker present, reported memory >=4 GB and >=4 logical cores: up to 32 MP.
- Worker present, memory >=8 GB and >=4 logical cores: up to **60 MP**.
- If memory is not reported, the 60 MP tier is only used on desktops reporting
  >=8 logical cores and zero touch points; touch devices without a memory
  estimate remain at 24 MP.
- JPEG and PNG pixel dimensions are inspected from small header slices to reject
  over-budget images **before** allocating decoded bitmap/canvas memory.
  The worker independently verifies the decoded dimensions.
- Large-image Worker has an **90-second deadline** and a visible **Hủy nén ảnh lớn**
  action; closing the editor aborts/terminates it. Failed/unsupported/timed-out
  tasks retain the original file and are subject to the same 2 MB upload rule.

Important limitations:
- Browser navigator.deviceMemory is an approximate advisory, not a guarantee
  of free RAM. A 49 MP encode can require several hundred MB of temporary
  memory even inside a Worker. Unsupported devices are intentionally refused.
- Web Worker isolation helps avoid UI-thread freezing but cannot guarantee
  that every browser will remain responsive under heavy memory pressure.
- No file is ever uploaded solely to test compression; no server, bucket,
  database, API, Edge, Auth, package, Cloudflare or storage-quota change.
- Tests of pure budget/header policies, worker response/cancellation wiring,
  syntax, build and unit contracts provide **offline evidence** only. Actual
  cross-device browser compression quality/performance and hosted upload remain
  owner-QA gates. Do not merge/deploy this Draft PR without approval.


## 2026-10-31 — Focused upload progress UI polish

- Replaced the standalone technical checkbox + long explanatory paragraph with a
  compact, native-checkbox-backed **“Tự động nén ảnh”** choice. It has a concise
  human-readable hint: **“Giảm dung lượng, giữ nguyên độ phân giải.”**
- The option stays checked by default and preserves the original `optimizeChoice`
  state, file validation and compression worker. CSS renders it as a themed
  switch; keyboard, focus, label-click and screen-reader checkbox semantics
  remain native.
- Progress uses plain language (**“Đang chuẩn bị ảnh…”** /
  **“Đang giảm dung lượng ảnh…”**) and places **“Dừng nén”** next to the
  active status on the same surface. Both remain hidden when inactive.
- Successful compression still appears once beside the selected attachment.
  Failed/rejected file messages remain visible. Existing storage, API, database,
  image pixel resolution, quotas, and cancellation behavior are unchanged.
- Responsive layout targets narrow phones and desktop drawer widths. Automated
  CI must pass on this revision; real device/browser visual acceptance remains
  with the owner. No merge or deploy.


## Switch visual overflow correction — 2026-10-31

Owner QA identified a toggle thumb displaced outside the upload setting. The
underlying cause was leftover, more-specific CSS for the previous checkbox
representation. The switch is now a standalone `SwitchControl` in shared
`src/components/form-controls.js`. It preserves the original checkbox as the
source of truth and draws the track/thumb separately. The 44×26px visual track
has an 18×18px thumb with constrained 18px travel. Its label/description are
linked with unique IDs; focus, checked, disabled and keyboard behavior remain
native. Styles moved to `main.css` and stale upload-specific checkbox styles
were removed from `editor.css`. The editor continues to use the same
`optimizeChoice.checked` and handlers.

The new DOM contract test checks the component structure and event identity;
cross-browser responsive visuals are not yet verified. This remains a Draft
PR with no merge or deployment.
