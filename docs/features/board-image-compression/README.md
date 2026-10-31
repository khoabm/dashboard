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
