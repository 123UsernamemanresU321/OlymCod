# Olympiad Codex Security Stress Test Remediation

Date: 2026-06-15

## Summary

All seven findings from `security-stress-test-report.md` were reviewed against the codebase. Six are fixed in code. One dependency finding is fixed through dependency pinning plus an npm override and audit verification. Provider/dashboard hardening remains as manual launch work where it cannot be applied from the repository.

## Findings

### OC-SEC-001 - High - SVG uploads / public note diagrams

- Original issue: SVG uploads were accepted by app validation and Supabase storage policies, and public note pages could create signed URLs for uploaded SVG diagrams.
- Remediation performed: SVG and WebP are blocked in `lib/utils/files.ts`, `lib/utils/diagrams.ts`, upload inputs, `supabase/storage-policies.sql`, and signed URL generation. App routes now only accept PNG/JPG/JPEG diagram paths.
- Code references: `lib/utils/files.ts`, `lib/utils/diagrams.ts`, `app/api/diagrams/render/route.ts`, `app/notes/[slug]/page.tsx`, `app/app/notes/[id]/page.tsx`, `app/app/review/[id]/page.tsx`, `supabase/storage-policies.sql`.
- Test references: `tests/security-remediation-contract.test.mjs`.
- Remaining manual steps: Convert existing SVG diagrams to PNG/JPEG and delete old SVG objects from `note-diagrams` and `suggestion-diagrams`.
- Final status: Fixed; manual storage cleanup required for existing SVG objects.

### OC-SEC-002 - Medium - Missing rate limits / quotas

- Original issue: contribution submissions, suggestion uploads, AI calls, exports, and magic-link sends had no app-level rate limits.
- Remediation performed: Added hashed server-side rate limits through `security_rate_limits`, `check_rate_limit`, route helpers, a direct suggestion insert trigger, `POST /api/contributions`, and `POST /api/auth/magic-link`.
- Code references: `lib/security/rateLimit.ts`, `app/api/contributions/route.ts`, `app/api/auth/magic-link/route.ts`, `app/api/ai/note-assist/route.ts`, `app/api/ai/notebook-assist/route.ts`, `app/api/export/notebook/route.ts`, `app/api/export/notebook/markdown/route.ts`, `app/api/export/notebook/json/route.ts`, `supabase/migrations/20260615161427_security_remediation.sql`.
- Test references: `tests/security-remediation-contract.test.mjs`.
- Remaining manual steps: Configure Supabase Auth email rate limits, redirect URL allowlists, email provider spend limits, and DeepSeek/Vercel/Supabase budget alerts.
- Final status: Fixed in code; provider/dashboard configuration required.

### OC-SEC-003 - Medium - Unbounded contribution text fields

- Original issue: suggestions only required non-empty title/body and had no database max lengths for public UGC fields.
- Remediation performed: Added shared validation constants, server-side validation, UI max-length mirroring, and database constraints for suggestion title/body/reason/source/tags/diagram count and contribution comments.
- Code references: `lib/security/contributionLimits.ts`, `app/api/contributions/route.ts`, `components/contribute/SuggestionForm.tsx`, `supabase/schema.sql`, `supabase/migrations/20260615161427_security_remediation.sql`.
- Test references: `tests/security-remediation-contract.test.mjs`.
- Remaining manual steps: Apply the migration to staging and production.
- Final status: Fixed.

### OC-SEC-004 - Medium - Security headers

- Original issue: CSP allowed `unsafe-eval`; HSTS and Permissions-Policy were missing.
- Remediation performed: Removed `unsafe-eval`, added HSTS, added Permissions-Policy, kept frame blocking, `nosniff`, and strict referrer policy.
- Code references: `next.config.ts`.
- Test references: `tests/security-remediation-contract.test.mjs`.
- Remaining manual steps: Validate HTTPS/preload readiness before submitting the domain to the HSTS preload list.
- Final status: Fixed; preload submission remains manual.

### OC-SEC-005 - Medium - Dependency advisory and unpinned dependencies

- Original issue: dependencies used `latest`, and npm audit reported a nested Next/PostCSS advisory.
- Remediation performed: Replaced `latest` ranges with lockfile-pinned versions and added a narrow `postcss` override. `npm install --package-lock-only` completed with zero vulnerabilities.
- Code references: `package.json`, `package-lock.json`.
- Test references: `tests/security-remediation-contract.test.mjs`; `npm audit --omit=dev --audit-level=moderate`.
- Remaining manual steps: Keep dependency scanning enabled in CI/release checks.
- Final status: Fixed.

### OC-SEC-006 - Low - AI provider error detail leakage

- Original issue: `/api/ai/note-assist` returned upstream DeepSeek error details to the browser.
- Remediation performed: Removed upstream detail from client responses, added a correlation ID, and rate-limited AI routes.
- Code references: `app/api/ai/note-assist/route.ts`, `app/api/ai/notebook-assist/route.ts`, `lib/security/rateLimit.ts`.
- Test references: `tests/security-remediation-contract.test.mjs`.
- Remaining manual steps: Configure DeepSeek budget/cost alerts.
- Final status: Fixed.

### OC-SEC-007 - Low - Public discovery / crawler controls

- Original issue: no explicit robots or sitemap route existed.
- Remediation performed: Added `app/robots.ts` and `app/sitemap.ts`; sitemap includes public notes only when public notes are enabled.
- Code references: `app/robots.ts`, `app/sitemap.ts`.
- Test references: `tests/security-remediation-contract.test.mjs`.
- Remaining manual steps: Set `NEXT_PUBLIC_SITE_URL` correctly in production and staging.
- Final status: Fixed.

## Manual provider/dashboard steps

1. Apply `supabase/migrations/20260615161427_security_remediation.sql` and `supabase/storage-policies.sql` to staging and production.
2. Convert existing SVG diagrams to PNG/JPEG, update note/suggestion references if needed, and remove old SVG objects from both diagram buckets.
3. Confirm Supabase Auth email/magic-link rate limits, redirect URL allowlist, and email provider spend limits.
4. Configure DeepSeek, Vercel, and Supabase budget/abuse alerts.
5. Set `RATE_LIMIT_SALT` to a random server-only value in Vercel.
6. Set `NEXT_PUBLIC_SITE_URL` to the canonical deployment URL.
7. Validate HSTS preload readiness before submitting the production domain to the preload list.
