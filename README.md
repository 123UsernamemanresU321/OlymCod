# Olympiad Codex

Production deployment: https://olympiad-codex.vercel.app

Olympiad Codex is a private owner-edited Olympiad Mathematics knowledge base with an optional moderated contribution workflow. The owner is the editor-in-chief. Contributors can submit suggestions, corrections, diagrams, and new note proposals, but they cannot directly edit or publish official notes.

Part 2 adds the daily-use layer: quick capture, inbox conversion, problem logs, mistake logs, explicit backlinks, light review scheduling, a diagram manager, version history, local draft preservation, command search, and AI actions that behave like a personal Olympiad librarian.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres with Row Level Security
- Supabase Storage
- React Markdown, remark-gfm, remark-math, rehype-sanitize, rehype-katex, KaTeX
- DeepSeek V4 for owner-only AI writing assistance

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
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-v4-pro
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

Only the two `NEXT_PUBLIC_` variables are used in browser code. Do not expose a Supabase service role key.
Do not prefix `DEEPSEEK_API_KEY` with `NEXT_PUBLIC_`; it is used only by the server API route.

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
- `quick_captures`
- `problem_logs`
- `mistake_logs`
- `note_links`
- `note_reviews`
- `diagrams`
- `note_versions`
- private `note-diagrams` and `suggestion-diagrams` buckets
- RLS policies for owner-only official note editing and contributor-only suggestions

After pulling Part 2 changes, run either the full `supabase/schema.sql` or the focused migration `supabase/migrations/20260514_part2_daily_use.sql` in the Supabase SQL Editor. Both are written with `create table if not exists`, `drop policy if exists`, and idempotent triggers so they can be rerun safely.

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
- `/app/capture`
- `/app/problems`
- `/app/problems/[id]`
- `/app/mistakes`
- `/app/review-notes`
- `/app/diagrams`
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

- change the account password after logging in
- enable or disable public notes
- enable or disable contribution mode
- require login to contribute
- export official notes as JSON
- export official notes as Markdown
- export suggestions as JSON
- export problems, mistakes, captures, or a full JSON backup
- view recent audit logs

## Daily-Use Features

### Quick Capture

Use the sidebar **Quick Capture** button, the mobile floating `+`, or `Cmd/Ctrl + J`.

Only the raw idea is required. Optional fields are capture type, topic guess, comma-separated tags, and one SVG/PNG/JPG/JPEG attachment. Captures are stored in `quick_captures` under the logged-in user.

### Inbox-To-Note Conversion

Open `/app/capture`, choose **Convert to Full Note**, then pick a template:

- Theorem
- Lemma
- Technique
- Formula
- Geometry
- Mistake
- Problem Pattern

The converter prefills title, topic, tags, and Markdown body, then creates a private official note and marks the capture as converted.

### Problem Log

Open `/app/problems`. Use it to store contest source, status, problem text, solution summary, key idea, mistake made, tags, and linked notes. The detail page can link notes, create a mistake entry from the problem, or create a technique note from the problem.

### Mistake Log

Open `/app/mistakes`. Track repeated errors by topic, type, severity, correct principle, and resolved status. Mistakes can link back to notes and source problems.

### Note Links And Backlinks

Saved note edit pages include a **Linked Notes** panel. Add relation types like `prerequisite`, `commonly confused`, or `used together`. Note view pages show related notes, backlinks, linked problems, and linked mistakes.

Directional links are always labeled from the page you are viewing to the other note, and reciprocal links are created automatically. For example, an Euler Phi Theorem note should link to Fermat's Little Theorem as `special case`; the Fermat's Little Theorem note should link back to Euler Phi Theorem as `generalization`. `stronger version` reverses to `weaker version`; symmetric relations like `related`, `commonly confused`, and `used together` mirror themselves.

### Light Review

Open `/app/review-notes`. Reviews are deliberately simple:

- Forgot: next review tomorrow
- Shaky: next review in 3 days
- Good: next review in 7 days
- Mastered: next review in 30 days

Note pages also include quick buttons for needs practice, comfortable, and mastered.

### Command Palette

Use `Cmd/Ctrl + K` or the mobile command button. It searches notes, problem logs, mistake logs, captures, topics, and common actions. Supported quick filters include:

- `tag:modular`
- `topic:geometry`
- `type:theorem`
- `status:needs_practice`

### Diagram Manager

Open `/app/diagrams`. Upload SVG/PNG/JPG/JPEG diagrams, attach them to notes, copy Markdown image syntax, remove diagrams from notes, or delete unused diagrams. Files stay in the private `note-diagrams` bucket and previews use signed URLs.

In the note editor, save the note once, upload a diagram in the Geometry diagrams panel, then click **Insert in Markdown** on the uploaded diagram card. The app inserts Markdown like:

```md
![diagram-name.svg](/api/diagrams/render?path=...)
```

You do not need to manually find the Supabase storage path. The `/api/diagrams/render` route verifies that the current user can read a note containing that diagram, then creates a short-lived signed preview URL. The editor preview renders the image immediately, and the saved Markdown remains stable because it does not contain an expiring Supabase signed URL.

### Local Drafts And Versions

The editor saves a browser-local draft shortly after changes. Cloud saves also write the previous note body and metadata to `note_versions`, and the edit page can show and restore recent versions.

### Mobile Editor

On mobile, the note editor uses tabs:

- Edit
- Preview
- Metadata

The save button stays accessible at the bottom of the screen.

## DeepSeek AI Writing Assistant

The owner note editor includes an AI panel for drafting and improving notes. It can create starter drafts, fill missing sections, improve the selected section, analyze mistakes, scaffold past problem notes, suggest descriptions/tags, ask your Codex using existing notes as context, clean rough captures, suggest related notes, generate recall questions, find common mistakes, and turn problems into technique drafts.

AI requests go through `POST /api/ai/note-assist`, which requires the logged-in `owner` role. The browser never receives the DeepSeek key, and AI output is never auto-saved. Use the preview actions to insert, append, replace the draft body, or apply metadata.

Install the validator dependency if it is not already installed:

```bash
npm install zod
```

For local AI calls, set:

```bash
DEEPSEEK_API_KEY=your_deepseek_key_here
DEEPSEEK_MODEL=deepseek-v4-pro
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

For Vercel production:

```bash
npx vercel env add DEEPSEEK_API_KEY production
npx vercel env add DEEPSEEK_MODEL production
npx vercel env add DEEPSEEK_BASE_URL production
npx vercel deploy --prod
```

## Note Formats

The editor uses note-type-specific formats. Changing the note type updates the starter template while the note body is still untouched; after manual edits, use **Apply template** if you intentionally want to replace the body.

Topics use a compact chip picker instead of a long combination dropdown. You can select one or more core subjects and the app stores them as a combined topic such as `Combinatorics + Geometry` or `Algebra + Number Theory`. Special buckets such as `Formula Bank`, `Problem Patterns`, and `Inbox` remain single-choice buckets. Filtering by `Geometry` will still match `Combinatorics + Geometry`.

Current official note types:

- `Theorem`: statement, conditions, intuition, proof sketch, examples, mistakes, related techniques.
- `Lemma`: claim, setup, proof, example use, mistakes, related results.
- `Technique`: triggers, core idea, application steps, example, mistakes, variations.
- `Formula`: formula, variables, conditions, when to use it, quick example; no difficulty field.
- `Formula Log`: compact formula recall entry; no difficulty field.
- `Trick`: narrow move, trigger, why it works, example, mistakes.
- `Common Mistake`: wrong idea, warning signs, correction, fix, example.
- `Problem Pattern`: recurring structure, trigger phrases, strategy, worked example, variations.
- `Past Problem`: source, problem statement, first observations, solution, mistakes, key takeaway.
- `Definition`: definition, notation, examples, non-examples; no difficulty field.
- `Example`: worked example with goal, solution, key move, mistakes, generalization.
- `Inbox`: rough capture before converting to a full note.

## Upload Safety

Accepted diagram types:

- SVG
- PNG
- JPG/JPEG

File size limit: 5 MB.

The client validates extension, MIME type, filename, and file size. Storage policies restrict contributors to `suggestion-diagrams/{user_id}/...`; official note diagrams and quick-capture attachments are owner-managed in `note-diagrams`.

## Markdown And LaTeX Safety

Markdown rendering uses `react-markdown`, `remark-math`, `rehype-sanitize`, and `rehype-katex`. Raw HTML is not enabled. Use:

```md
If $\gcd(a,n)=1$, then

$$a^{\varphi(n)} \equiv 1 \pmod n.$$
```

The Markdown editor toolbar includes a LaTeX command dropdown for common wrappers and symbols such as `$...$`, `$$...$$`, `\frac{}`, `\sqrt{}`, `\begin{aligned}`, `\binom{}`, `\mathbb{}`, congruences, angle notation, parallel, and perpendicular.

The renderer accepts both standard Codex delimiters and DeepSeek-style delimiters:

- inline: `$...$` and `\(...\)`
- block: `$$...$$` and `\[...\]`

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
npm test
npm run build
```

`npm run build` uses `next build --webpack`.

## Deploy To Vercel

Set Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OWNER_EMAIL`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL`
- `DEEPSEEK_BASE_URL`

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
- Every daily-use table has `user_id` and RLS policies that restrict rows to the owner of the row or the owner role.
- AI output is draft-only; it does not overwrite notes unless the owner clicks an apply action.
- Raw HTML is not enabled in Markdown rendering.
- Diagram uploads reject unknown file types and files over 5 MB.
- Add production rate limiting or CAPTCHA before opening contribution mode broadly.

## Troubleshooting

- If `/app/capture`, `/app/problems`, `/app/mistakes`, `/app/review-notes`, or `/app/diagrams` shows empty data after deploy, rerun `supabase/schema.sql`.
- If diagram previews fail, confirm the `note-diagrams` bucket exists and `supabase/storage-policies.sql` has been applied.
- If AI actions fail with `Missing DEEPSEEK_API_KEY`, add the server-only DeepSeek variables locally and in Vercel.
- If tags appear to disappear while typing, make sure you are on the latest build; tags are entered as comma-separated text and saved as a Postgres `text[]`.
