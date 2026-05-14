# Olympiad Codex

Production deployment: https://olympiad-codex.vercel.app

Olympiad Codex is a private owner-edited Olympiad Mathematics knowledge base with an optional moderated contribution workflow. The owner is the editor-in-chief. Contributors can submit suggestions, corrections, diagrams, and new note proposals, but they cannot directly edit or publish official notes.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres with Row Level Security
- Supabase Storage
- React Markdown, remark-gfm, remark-math, rehype-sanitize, rehype-katex, KaTeX

## Roles

- `owner`: full control of official notes, users, settings, suggestions, audit logs, and exports.
- `trusted_contributor`: can submit suggestions and view their own suggestions.
- `contributor`: can submit suggestions and view their own suggestions.
- `viewer`: can view public notes only.
- `banned`: cannot submit, upload, or comment.

The configured owner email is:

```text
erichuang.shangjing@outlook.com
```

When this user logs in, `public.ensure_current_profile()` assigns the `owner` role.

## Environment

Create `.env.local`:

```bash
cp .env.example .env.local
```

Required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://cneuoscyhucvijjqgzfl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
OWNER_EMAIL=erichuang.shangjing@outlook.com
```

Only the two `NEXT_PUBLIC_` variables are used in browser code. Do not expose a Supabase service role key.

## Install

```bash
npm install
```

## Supabase Setup

Open Supabase SQL Editor and run:

```text
supabase/schema.sql
```

Then run:

```text
supabase/storage-policies.sql
```

This creates:

- `profiles`
- `notes`
- `suggestions`
- `contribution_comments`
- `audit_logs`
- `site_settings`
- private `note-diagrams` and `suggestion-diagrams` buckets
- RLS policies for owner-only official note editing and contributor-only suggestions

## RLS Model

- Public users can select only `notes.visibility = 'public'` and `is_archived = false`, and only when public notes are enabled.
- Owners can select, insert, update, and delete official notes.
- Contributors cannot update or delete official notes.
- Contributors can insert suggestions only when not banned and contributions are enabled.
- Contributors can see their own suggestions.
- Owners can see and moderate all suggestions.
- Owners can see audit logs.

## Contribution Workflow

Public pages:

- `/notes`
- `/notes/[slug]`
- `/contribute`
- `/contribute/new`
- `/contribute/note/[noteId]`
- `/contribution-status`

Owner pages:

- `/app`
- `/app/notes`
- `/app/review`
- `/app/review/[id]`
- `/app/users`
- `/app/settings`

Submitted suggestions start as `pending`. The official note does not change until the owner merges or converts the suggestion.

## Owner Review

The owner can:

- approve
- reject
- mark needs changes
- mark spam
- merge into an existing note through a manual merge editor
- convert a new proposal into an official note
- delete inappropriate suggestions
- leave owner feedback and internal notes

## Settings

In `/app/settings`, the owner can:

- enable or disable public notes
- enable or disable contribution mode
- require login to contribute
- export official notes as JSON
- export official notes as Markdown
- export suggestions as JSON
- view recent audit logs

## Upload Safety

Accepted diagram types:

- SVG
- PNG
- JPG/JPEG

File size limit: 5 MB.

The client validates extension, MIME type, and filename. Storage policies restrict contributors to `suggestion-diagrams/{user_id}/...`; official note diagrams are owner-managed in `note-diagrams`.

## Markdown And LaTeX Safety

Markdown rendering uses `react-markdown`, `remark-math`, `rehype-sanitize`, and `rehype-katex`. Raw HTML is not enabled. Use:

```md
If $\gcd(a,n)=1$, then

$$a^{\varphi(n)} \equiv 1 \pmod n.$$
```

## Run Locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Quality Checks

Run these one at a time:

```bash
npm run typecheck
npm run lint
npm run build
```

`npm run build` uses `next build --webpack`.

## Deploy To Vercel

Set Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OWNER_EMAIL`

Deploy:

```bash
vercel deploy --prod
```

Add these Supabase Auth redirect URLs:

- `http://localhost:3000/**`
- `https://olympiad-codex.vercel.app/**`
- Vercel preview URL pattern

## Owner Recovery

If the owner role is not assigned, run this in Supabase SQL Editor:

```sql
update public.profiles
set role = 'owner', is_banned = false
where lower(email) = 'erichuang.shangjing@outlook.com';
```

If no profile exists yet, log in once with the owner email, then run the update again.

## Security Notes

- Do not use a service role key in frontend code.
- Do not make contribution approval optional.
- Do not allow direct public editing of official notes.
- Keep RLS enabled on all public tables.
- Keep Storage buckets private.
- Add production rate limiting or CAPTCHA before opening contribution mode broadly.
