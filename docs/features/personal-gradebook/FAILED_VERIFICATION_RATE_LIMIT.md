# Gradebook verification limiter — failure-only 10/15m

## Approval / goal

Owner approved changing per-identity throttling from **five total verifications** to **ten failed verifications** per fifteen-minute fixed window. Correct CCCD+DOB requests do not consume the identity failure budget. Scope is security-only; no changes to student UI, AI Learning Insights, Board, scores or class data.

## Security invariants

- `public.gb_limit` continues to charge the *global* minute/window budgets (60 per minute and 300 per 15 minutes for verification, 120 per minute for reads); malformed identifiers still count against the global quota.
- `public.gb_pair_check` now atomically validates credentials and increments *only* failed identity attempts in `pair_identity_failed_window`. A matching, active class/student pair never increments this count.
- Successful checks remain available for attempts 1–10; **the eleventh request after ten failures** is blocked until the fixed window ends, even if correct. This prevents bypassing a lock by guessing the right DOB after exhaustion. No new external API or privileges.
- Every attempt locks the same row in `gradebook.lookup_attempts` using an upsert before checking DOB. The fixed-window transaction prevents parallel failures from exceeding the cap.
- The new scope does not reinterpret historical `pair_identity_window` rows (which included successful lookups). The old scope remains in the schema solely until retention cleanup; no manual reset.
- Identity keys are already a HMAC blind index; no raw CCCD or DOB is written to the limiter. The result wrapper exposes only allowed/retryAfter/pair, with neutral wrong-pair behavior and `Retry-After` on 429.
- All privileged calls stay `SECURITY INVOKER` with empty search path and service-role-only EXECUTE.
- Keep `gb_limit`'s original signature and `gb_pair_check`'s argument signature. The **result** of `gb_pair_check` changes to a status wrapper, so SQL migration and Edge release must be coordinated. Apply SQL migration first and deploy updated Edge immediately; note transient cross-version incompatibility.

## Verification / release checklist

- Offline: run curated unit suite and specialist Edge tests, PostgreSQL migration tests using disposable PGlite. No real student data, no hosted authentication retries, no unnecessary API smoke loop.
- Required acceptance: repeated correct identity checks remain uncounted; ten wrong attempts count, eleventh blocked; blocked correct check receives 429; other identity unaffected; malformed/global limits unchanged; read limits unchanged; SQL ACL and schema intact.
- Hosted: apply one additive migration and deploy one updated student-lookup function only after offline pass. A single controlled synthetic API read/verification case only if the production fixture is already documented and safe. Do not brute force hosted test.
- Rollback must restore both old SQL functions and old Edge version together; do **not** use uncoordinated partial rollback.
- Never mark production PASS without actual migration/deploy + read-only verification.
