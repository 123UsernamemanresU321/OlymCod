# Olympiad Codex

Olympiad Codex is a private full-stack Olympiad Mathematics knowledge base. It lets a logged-in user create, edit, preview, search, filter, favorite, export, and maintain Markdown notes with LaTeX and geometry diagrams from desktop or mobile.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres with Row Level Security
- Supabase Storage for diagrams
- React Markdown, remark-math, rehype-katex, KaTeX

## Install

```bash
npm install
```

## Supabase Project

Create or open the Supabase project:

```text
cneuoscyhucvijjqgzfl
```

The project URL is:

```text
https://cneuoscyhucvijjqgzfl.supabase.co
```

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://cneuoscyhucvijjqgzfl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Never put a service role key in frontend code or `.env.local` for this app.

## Database Setup

In the Supabase SQL editor, run:

```sql
-- paste supabase/schema.sql
```

This creates `public.notes`, an `updated_at` trigger, indexes, full-text search support, and RLS policies so users can only access their own notes.

## Storage Setup

Create a private Supabase Storage bucket named:

```text
diagrams
```

Then run:

```sql
-- paste supabase/storage-policies.sql
```

The app stores diagrams at:

```text
{user_id}/{note_id}/{safe_filename}
```

Accepted file types are SVG, PNG, JPG, and JPEG. The bucket is private; the app renders diagram previews through signed URLs.

## Run Locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Deploy To Vercel

1. Push the project to GitHub.
2. Import the repo in Vercel.
3. Add these environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.
5. In Supabase Auth settings, add the Vercel domain to the allowed redirect URLs.

## Writing LaTeX

Inline math:

```md
If $\gcd(a,n)=1$, then Euler's theorem applies.
```

Block math:

```md
$$
a^{\varphi(n)} \equiv 1 \pmod n
$$
```

Markdown supports headings, lists, bold, italic, links, images, inline math, and block math.

## Uploading Diagrams

Save a note first. After the note has an ID, the diagram upload area accepts SVG, PNG, JPG, and JPEG files. Uploaded paths are stored in `diagram_urls` and rendered through private signed URLs.

## Exporting Notes

Go to `/app/settings`:

- Export all notes as JSON
- Export all notes as one combined Markdown file with metadata front matter

Archived inbox notes are not included in the export.

## Security Notes

- Do not expose a Supabase service role key.
- Browser code uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- RLS is enabled on `public.notes`.
- All note writes set `user_id` from the authenticated Supabase user.
- Storage policies restrict diagram paths to the authenticated user's folder.

## Troubleshooting

If login redirects fail, check Supabase Auth redirect URLs and `.env.local`.

If notes do not load, confirm `supabase/schema.sql` was run and RLS policies exist.

If diagram upload fails, confirm the `diagrams` bucket exists, is private, and `supabase/storage-policies.sql` was run.

If KaTeX does not render, confirm the Markdown uses `$...$` for inline math and `$$...$$` for block math.

If production build fails because environment variables are missing, add both public Supabase variables in the deployment environment.

## Quality Commands

```bash
npm run lint
npm run typecheck
npm run build
```
