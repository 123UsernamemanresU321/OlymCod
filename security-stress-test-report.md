# Olympiad Codex Security Stress Test Report

Date: 2026-06-15

Scope: local/passive repository review of the checked-out Next.js + Supabase app in `/Users/erichuang/Documents/OlymCod`, using `ai_app_security_stress_test_checklist.pdf`.

Live asset testing was not performed because the prompt supplied placeholder values for `<APP_URL>`, `<API_BASE_URL>`, `<ADMIN_URL>`, `<STORAGE_OR_CDN_DOMAIN>`, `<AUTH_PROVIDER>`, `<LLM_PROVIDER>`, and `<SMS_EMAIL_PROVIDER>`. No live test accounts were created, no production traffic was generated, and no third-party service was attacked.

## Test Account Matrix

Create these accounts in staging before launch validation:

| Account | Purpose |
| --- | --- |
| Unauthenticated visitor | Public notes, contribution guidelines, disabled states, direct private URL probes. |
| Normal user A | Contributor-owned suggestions and suggestion diagrams. |
| Normal user B | Cross-user IDOR/BOLA checks against user A's suggestions/storage paths. |
| Suspended/banned user | Ensure suggestions, comments, uploads, and status changes are blocked. |
| Unverified user | Verify allowed/blocked contribution behavior for unconfirmed accounts. |
| Verified user | Normal contributor baseline. |
| Moderator | Not applicable unless a separate moderator role is introduced. |
| Admin/owner | Owner-only app, settings, review queue, user management, exports, AI. |
| Deleted/deactivated user | Session invalidation and stale object access checks. |

## Asset Map

### Public Pages

- `/`
- `/login`
- `/notes`
- `/notes/[slug]`
- `/contribute`
- `/contribute/new`
- `/contribute/note/[noteId]`
- `/contribution-status`
- `/manifest.webmanifest`
- Public static assets: `/icon.svg`

### Authenticated Owner/Admin Pages

All `/app/*` routes are protected by `proxy.ts` session refresh plus the `/app` layout's `requireOwner()` check.

- `/app`
- `/app/notes`
- `/app/notes/new`
- `/app/notes/[id]`
- `/app/notes/[id]/edit`
- `/app/capture`
- `/app/inbox` -> redirects to `/app/capture`
- `/app/problems`
- `/app/problems/new`
- `/app/problems/[id]`
- `/app/problems/[id]/edit`
- `/app/mistakes`
- `/app/review`
- `/app/review/[id]`
- `/app/review-notes`
- `/app/notebook`
- `/app/notebook/print`
- `/app/revision-pack`
- `/app/mastery`
- `/app/workspace`
- `/app/templates`
- `/app/merge`
- `/app/import`
- `/app/views`
- `/app/taxonomy`
- `/app/diagrams`
- `/app/media`
- `/app/graph`
- `/app/manage`
- `/app/formula-bank`
- `/app/users`
- `/app/settings`

### API Routes

- `POST /api/ai/note-assist`
- `POST /api/ai/notebook-assist`
- `GET /api/diagrams/render?path=...`
- `POST /api/export/notebook`
- `POST /api/export/notebook/markdown`
- `POST /api/export/notebook/json`

### Supabase Tables

- `profiles`
- `notes`
- `suggestions`
- `contribution_comments`
- `audit_logs`
- `site_settings`
- `quick_captures`
- `problem_logs`
- `mistake_logs`
- `note_links`
- `note_reviews`
- `diagrams`
- `note_versions`
- `notebook_presets`
- `revision_packs`
- `note_templates`
- `saved_views`

### Storage Buckets

- `note-diagrams`: private bucket; owner uploads; anonymous read is allowed by policy only for diagrams referenced by public notes while public notes are enabled.
- `suggestion-diagrams`: private bucket; contributors upload into own user-prefixed paths; owners and owning contributors can read.

### Integrations

- Supabase Auth, Postgres, Storage.
- DeepSeek chat completions for owner-only AI assistance.
- Vercel/Next.js deployment.
- No app-level SMS provider integration found. Email/magic-link flow is Supabase Auth.
- No payments/subscriptions found.
- No webhooks, cron jobs, or background workers found.
- No sitemap or robots route found.

## Attack Surface Map

| Surface | Entry Points | Notes |
| --- | --- | --- |
| Auth | `/login`, Supabase password signup/signin, magic link | Supabase handles auth; app uses generic redirects but exposes provider error messages. |
| Public content | `/`, `/notes`, `/notes/[slug]` | Public notes require `visibility='public'`, not archived, and public notes enabled. |
| Contributions/UGC | `/contribute/*`, `suggestions`, `suggestion-diagrams` | Authenticated contributors can submit markdown and optional diagrams for owner review. |
| Uploads | Diagram upload components, Supabase Storage buckets | 5 MB bucket limit and path scoping exist; SVG is allowed. |
| AI | `/api/ai/note-assist`, `/api/ai/notebook-assist` | Owner-only, server-side API key, no app-level rate limits observed. |
| Exports | `/api/export/notebook*`, Settings exports in client | Owner-only, scoped by user ID, no explicit rate limit. |
| Search | Command palette, notes lists, graph, public notes | Mostly client-side filtering over authorized data. |
| Admin tools | `/app/users`, `/app/settings`, `/app/review`, `/app/manage` | Owner-only through layout/RLS. |
| Storage/CDN | Supabase signed URLs and storage policies | Private buckets, signed URLs, public read policy for public note diagrams. |
| Browser headers | `next.config.ts` global headers | CSP exists but currently allows inline/eval scripts and lacks HSTS/Permissions-Policy. |

## Findings

| ID | Severity | Affected Feature | Exact Risk | Safe Reproduction Steps | Evidence | Expected Secure Behavior | Recommended Fix | Regression Test To Add |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OC-SEC-001 | High | Diagram uploads / public note diagrams | SVG uploads are allowed for owner and contributor diagrams. Malicious SVG is active content if opened directly from a signed storage URL and can be used for phishing, browser exploitation chains, or unsafe content hosting. Public notes can expose signed diagram URLs for published notes. | In staging, upload a harmless SVG containing a canary `<script>alert(1)</script>` or external reference as a contributor suggestion and as an owner note diagram. Confirm whether the signed URL serves it as `image/svg+xml` and whether opening the signed URL directly executes/loads active content. | `lib/utils/files.ts:1-10` accepts `image/svg+xml` and `.svg`; `supabase/storage-policies.sql:1-16` permits SVG in both buckets; `app/notes/[slug]/page.tsx:24-30` creates public signed URLs for note diagrams. | User-uploaded files should not execute active content. Publicly reachable media should be inert or transformed. | Prefer disallowing SVG for contributor uploads and public note diagrams. If SVG is required, sanitize server-side with a strict allowlist, strip scripts/foreignObject/external refs, serve from an isolated non-cookie domain, and consider `Content-Disposition: attachment` for raw SVG. Update bucket MIME allowlists to match app validation. | Add a unit/contract test asserting SVG is rejected by `validateDiagramFile` for public/contributor upload, or a sanitizer test with a malicious SVG canary. Add storage policy tests asserting allowed MIME types exclude SVG unless sanitizer is present. |
| OC-SEC-002 | Medium | Public contributions, uploads, AI, exports, auth-triggering flows | No app-level rate limiting, quotas, CAPTCHA/risk challenge, or spend guard is visible for public contribution submissions, suggestion diagram uploads, owner AI calls, or notebook exports. Supabase Auth may have provider-level limits, but the app does not enforce endpoint/user/IP quotas. This creates spam, storage/egress cost, AI cost, and moderation workload risk once contributions are enabled. | In staging with synthetic accounts, submit repeated suggestions and diagram uploads from normal user A, then repeat from user B and unauthenticated direct calls where applicable. For owner account, repeatedly call `/api/ai/note-assist` and `/api/export/notebook`. Confirm whether a server-side 429 or cooldown appears. | `components/contribute/SuggestionForm.tsx:62-125` writes directly to `suggestions` and `suggestion-diagrams`; `app/api/ai/note-assist/route.ts:225-304` and `app/api/ai/notebook-assist/route.ts:45-111` have auth and validation but no rate limiter; export APIs at `app/api/export/notebook/route.ts:6-24` have no rate limiter. README already notes rate limiting/CAPTCHA should be added before broad contributions. | Expensive or public-write surfaces should enforce server-side quotas per user and IP, return 429 with retry guidance, and log abuse events. | Add a server-mediated contribution API or Supabase RPC with rate counters. Add Vercel/Supabase rate limiting for AI/export routes. Add Turnstile/CAPTCHA after suspicious contribution activity. Configure Supabase Auth email limits and provider budget alerts. | Add tests for repeated contribution submit returning 429, repeated AI calls returning 429, upload count/size quota enforcement, and banned-user upload denial. |
| OC-SEC-003 | Medium | Contribution text fields / database constraints | User-submitted suggestions have only non-empty database checks and no maximum title/body/reason/source/tag limits. A contributor can submit very large markdown bodies or metadata, causing database bloat, slow review pages, large owner previews, and potential cost/resource abuse. | In staging, submit a synthetic suggestion body near several megabytes through direct Supabase client/API tooling. Confirm whether the insert is accepted and whether `/app/review` or `/contribution-status` becomes slow. | `supabase/schema.sql:320-324` only checks non-empty suggestion title/body. `components/contribute/SuggestionForm.tsx:80-96` sends trimmed body/tags/reason/source without max length. | Public UGC should have explicit length and array cardinality limits enforced in the database and UI. | Add check constraints such as title <= 180 chars, body <= a defined reviewable limit, reason/source <= defined limits, tags count/length <= limits. Mirror those in form `maxLength` and validation messages. | Add DB/contract tests for over-limit suggestion body/title/tags rejection and UI tests for max length feedback. |
| OC-SEC-004 | Medium | Security headers / XSS defense-in-depth | CSP exists, but `script-src` allows `'unsafe-inline'` and `'unsafe-eval'`, and headers omit HSTS and Permissions-Policy. On a markdown/UGC-enabled app, a weak CSP reduces protection if a sanitizer bypass or dependency issue appears. | Run a header check against staging/production and inspect `Content-Security-Policy`, `Strict-Transport-Security`, and `Permissions-Policy`. Confirm unsafe inline/eval remains in production. | `next.config.ts:17-22` sets CSP with `'unsafe-inline'` and `'unsafe-eval'`, `X-Content-Type-Options`, and `Referrer-Policy`, but no HSTS or Permissions-Policy. | Production should have a tighter CSP, HSTS, no frame embedding, `nosniff`, referrer policy, and a conservative Permissions-Policy. | Remove `'unsafe-eval'` in production if possible. Replace broad inline allowance with nonces/hashes where practical. Add `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` after HTTPS validation, and add a minimal Permissions-Policy. | Add a contract test for required production security headers and absence of `'unsafe-eval'` in production CSP. |
| OC-SEC-005 | Medium | Dependencies | `npm audit` reports a moderate PostCSS advisory through the installed Next dependency range. The app uses `next@latest`, which can move unexpectedly and makes reproducibility/security triage harder. | Run `npm audit --omit=dev --audit-level=high`. | Audit output: `postcss <8.5.10`, `GHSA-qx2v-qp2m-jg93`, dependency path `next -> postcss`, 2 moderate vulnerabilities. `package.json` uses `next: latest`. | Production dependencies should be pinned or range-bounded and free of known moderate+ advisories where a safe patch exists. | Pin Next and other core dependencies to reviewed versions. Upgrade when Next releases a patched stable version that pulls fixed PostCSS. Avoid `npm audit fix --force` if it downgrades/breaks Next; track the advisory manually until a safe patch is available. | Add CI `npm audit --omit=dev --audit-level=moderate` or equivalent dependency scanning, with an allowlist entry only if consciously accepted. |
| OC-SEC-006 | Low | AI error handling | The note AI route returns the first 500 chars of upstream DeepSeek error details to the browser. That can leak provider metadata, request IDs, model/deployment detail, or unexpected upstream response fragments. | In staging, force DeepSeek to return an error using an invalid model or blocked request. Inspect the JSON response from `/api/ai/note-assist`. | `app/api/ai/note-assist/route.ts:300-304` returns `{ detail: detail.slice(0, 500) }` to the client. The notebook AI route uses a generic error at `app/api/ai/notebook-assist/route.ts:110-111`. | User-facing errors should be generic; detailed provider errors should be logged server-side with redaction. | Remove `detail` from production responses or gate it behind `NODE_ENV !== "production"`. Add redacted server logging with correlation IDs. | Add a route contract test asserting production AI failures do not include upstream `detail`. |
| OC-SEC-007 | Low | Public discovery / SEO controls | No explicit `robots.txt` or sitemap route was found. This is not a direct vulnerability, but public/private discovery rules are undocumented at crawler level. | Request `/robots.txt` and `/sitemap.xml` in staging. Confirm whether framework defaults or 404s are returned. | Asset inventory found `app/manifest.ts` but no `app/robots.ts` or `app/sitemap.ts`. | Public crawlers should be explicitly told which public routes may be indexed; private/admin paths should not be advertised. | Add `app/robots.ts` that allows public routes and disallows `/app`, `/login`, `/contribution-status` if desired. Add sitemap only for public notes when public notes are enabled. | Add a contract test asserting `robots.ts` exists and disallows `/app`. |

## Security Controls Already Working

- All core application tables in `public` have RLS enabled: `supabase/schema.sql:638-654`.
- Public notes require `visibility='public'`, `is_archived=false`, and `public_notes_enabled=true`: `supabase/schema.sql:679-693`.
- Official note insert/update/delete is owner-only: `supabase/schema.sql:695-712`.
- Suggestions are contributor-owned for reads and owner-only for delete: `supabase/schema.sql:714-759`.
- Site settings are public-readable but owner-only mutable: `supabase/schema.sql:801-818`.
- App owner pages use `requireOwner()` and banned owners are redirected: `lib/auth/server.ts:21-36`.
- Contributor routes use `requireContributor()` and banned users are redirected: `lib/auth/server.ts:39-54`.
- Root proxy refreshes Supabase sessions and redirects unauthenticated `/app` traffic: `proxy.ts:1-11`.
- DeepSeek API key is server-only; only `NEXT_PUBLIC_SUPABASE_*` variables are used client-side.
- AI routes are owner-only and validate request shapes with Zod.
- Markdown rendering uses `rehype-sanitize`: `lib/markdown/rendering.ts:1-7`.
- Public note route filters by public slug/visibility and creates time-limited diagram signed URLs: `app/notes/[slug]/page.tsx:12-30`.
- Notebook export APIs are owner-only and use `buildNotebookForUser()`, which filters by `user_id`: `app/api/export/notebook/route.ts:6-16`, `lib/notebook/server.ts:33-50`.
- Storage buckets are private, path-scoped by user ID, and have 5 MB bucket limits: `supabase/storage-policies.sql:1-21`.
- `npm test`, lint, typecheck, and production build pass.

## Monitoring And Alerting Gaps

- No app-level alerting was found for contribution spikes, upload/storage spikes, AI cost spikes, export spikes, or admin/user-management actions.
- Audit logs exist for suggestion creation and selected owner review/user actions, but no alert routing or tamper-resistant export was found.
- No explicit security event correlation ID strategy was found.
- No dependency scanning workflow/CI gate was found.
- No visible Supabase Auth/email provider budget or abuse alert configuration is represented in code.

## Final Launch Readiness

### Blockers Before Broad Public Launch

1. Resolve SVG upload risk for public/contributor-accessible diagrams.
2. Add rate limits/quotas/CAPTCHA or equivalent abuse controls before opening contribution mode broadly.
3. Add bounded database constraints for public UGC fields.

### Should Fix Soon

1. Tighten CSP and add HSTS/Permissions-Policy.
2. Pin dependency versions and track/fix the PostCSS advisory through Next.
3. Remove upstream AI error details from production responses.
4. Add `robots.ts` and, if public notes are intended for discovery, a controlled sitemap.

### Acceptable Risks For A Private Owner-Only Beta

- Owner-only AI routes without rate limits are acceptable for a short private beta if the owner account is protected and provider-side budgets are configured.
- Client-side Supabase mutations are acceptable because RLS enforces authorization, but staging IDOR tests should still verify every table/object.
- Public site settings read access is intentional because public pages need to know whether public notes/contributions are enabled.

### Required Staging Validation Before Launch

- User A cannot read/edit/delete user B suggestions, diagrams, presets, notes, problems, mistakes, review rows, captures, or saved views.
- Normal contributors cannot access `/app/*`, `/api/ai/*`, or `/api/export/*`.
- Banned users cannot submit suggestions, upload suggestion diagrams, or comment.
- Public direct note URLs return 404 for private/archived notes.
- Public direct diagram paths return 404/403 unless attached to an enabled public note.
- Repeated contribution and upload attempts hit server-side limits.
- AI routes reject unauthenticated and non-owner calls.
- Magic-link/password flows have Supabase-side rate limits and generic account-enumeration behavior.

## Commands Run

- `pdfinfo /Users/erichuang/Downloads/ai_app_security_stress_test_checklist.pdf`
- `pdftotext /Users/erichuang/Downloads/ai_app_security_stress_test_checklist.pdf -`
- `find app -maxdepth 5 -type f ...`
- `rg --files supabase lib components app`
- `rg` searches for Supabase, auth, env, markdown, headers, uploads, rate limits, and secrets.
- `npm test` - passed, 52 tests.
- `npm run lint` - passed.
- `npm run typecheck` - passed.
- `npm audit --omit=dev --audit-level=high` - completed with network approval; reported 2 moderate vulnerabilities through Next/PostCSS.
- `npm run build` - passed.

## Remediation Status Update

### OC-SEC-001

Remediation status: Fixed in code; manual cleanup required for existing SVG storage objects.

SVG and WebP uploads/rendering were removed from validation, file inputs, storage allowlists, and diagram path checks. Public/private signed URL generation now filters diagram paths through the PNG/JPG/JPEG-only path validator. Existing SVG objects must be converted to PNG/JPEG and removed from storage.

### OC-SEC-002

Remediation status: Fixed in code; provider/dashboard configuration required.

Server-side rate limits were added for contributions, magic-link sends, AI routes, and notebook exports. Public contribution submission now goes through `POST /api/contributions`, and direct suggestion inserts are protected by a database trigger. Supabase Auth email rate limits and provider spend alerts still require dashboard confirmation.

### OC-SEC-003

Remediation status: Fixed.

Suggestion and contribution-comment length/count limits are enforced in shared app validation and database constraints. Oversized title, body, reason, source reference, tag arrays, tag lengths, and diagram arrays are rejected.

### OC-SEC-004

Remediation status: Fixed; HSTS preload submission remains manual.

The global headers now include HSTS and Permissions-Policy, and the CSP no longer allows `unsafe-eval`. Production domain HTTPS/preload readiness must be validated before preload submission.

### OC-SEC-005

Remediation status: Fixed.

Dependencies were pinned away from `latest`, and a narrow PostCSS override was added. `npm install --package-lock-only` completed with zero reported vulnerabilities.

### OC-SEC-006

Remediation status: Fixed.

The note AI route no longer returns upstream DeepSeek error details. It returns a generic error with a correlation ID and logs only redacted failure metadata server-side.

### OC-SEC-007

Remediation status: Fixed.

Explicit `robots.ts` and `sitemap.ts` routes were added. Robots disallows `/app`, `/login`, and `/contribution-status`; the sitemap includes public notes only when public notes are enabled.
