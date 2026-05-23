# Olympiad Codex

Production deployment: https://olympiad-codex.vercel.app

Olympiad Codex is a private owner-edited Olympiad Mathematics knowledge base with an optional moderated contribution workflow. The owner is the editor-in-chief. Contributors can submit suggestions, corrections, diagrams, and new note proposals, but they cannot directly edit or publish official notes.

Part 2 adds the daily-use layer: quick capture, inbox conversion, problem logs, mistake logs, explicit backlinks, light review scheduling, a diagram manager, version history, local draft preservation, command search, and AI actions that behave like a personal Olympiad librarian.

Part 3 adds recognition triggers, common false uses, stronger problem/mistake pattern tracking, notebook whitelist/blacklist selection, contest revision packs, a mastery heatmap, and directional note-link display. The Part 3 extension adds LaTeX-rendered learning metadata, type-specific Note Quality criteria, concept-level labeling for notes, structured AI link suggestions, a math snippet palette, a Section Editor, a visual note graph, a bulk metadata manager, and a reusable media library.

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
- `notebook_presets`
- `revision_packs`
- private `note-diagrams` and `suggestion-diagrams` buckets
- RLS policies for owner-only official note editing and contributor-only suggestions

After pulling Part 2 changes, run either the full `supabase/schema.sql` or the focused migration `supabase/migrations/20260514_part2_daily_use.sql` in the Supabase SQL Editor. For Notebook Builder presets, also run `supabase/migrations/20260517000100_notebook_presets.sql` if you are applying migrations manually.

After pulling Part 3 changes, run `supabase/migrations/20260518000100_part3_learning_system.sql` or rerun the full schema. This adds `notes.recognition_triggers`, `notes.false_uses`, `problem_logs.topic`, `problem_logs.mistake_category`, `revision_packs`, and drops the old reciprocal note-link triggers.

After pulling the Part 3 extension, also run:

```text
supabase/migrations/20260520000100_part3_extensions.sql
```

This safely upgrades the existing `diagrams` table into the media-library backing table by adding `title`, `alt_text`, and `tags`. These files are written with `create table if not exists`, `add column if not exists`, `drop policy if exists`, and idempotent triggers so they can be rerun safely.

After pulling the creation and organization tools pass, run:

```text
supabase/migrations/20260522000100_creation_organization_tools.sql
```

This adds user-owned `note_templates` and `saved_views` tables with RLS, updated-at triggers, and indexes. It does not modify or delete existing notes.

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
- `/app/mastery`
- `/app/review-notes`
- `/app/notebook`
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
- `/app/review`
- `/app/review/[id]`
- `/app/revision-pack`
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

### Recognition Triggers And Common False Uses

Every note can store two structured lists:

- `recognition_triggers`: short phrases that describe when the theorem, lemma, formula, or technique should come to mind.
- `false_uses`: traps, missing conditions, or situations where the idea should not be applied.

These appear on note pages, can be edited in the note metadata panel, are searchable from the notes library/command palette, and can be included in Notebook Builder exports. The owner-only AI assistant has **Suggest Recognition Triggers** and **Suggest False Uses** modes. AI suggestions are drafts only; they are not saved until applied.

Recognition triggers and common false uses are rendered through the same safe Markdown/KaTeX pipeline as note bodies. Inline `$...$`, block `$$...$$`, `\(...\)`, and `\[...\]` math works on the note page, editor preview, Notebook preview/print/export, revision packs, and AI metadata previews. Raw HTML is still not enabled.

### Type-Specific Note Levels vs Problem Difficulty

Official notes use type-specific level names, not contest-placement difficulty. The stored `notes.difficulty` field is kept for compatibility, but the UI labels it based on the note type: theorems and lemmas use **Concept Level**, techniques use **Recognition Difficulty**, tricks use **Execution Difficulty**, common mistakes use **Trap Severity**, problem patterns use **Pattern Difficulty**, past-problem notes use **Problem Difficulty**, and formula/definition/inbox notes hide the difficulty field.

The concept-style 1-12 scale is:

- `1`: Basic fact
- `2`: Direct-use tool
- `3`: Condition-aware tool
- `4`: Multi-step application
- `5`: Pattern-recognition tool
- `6`: Structural tool
- `7`: Multi-technique connector
- `8`: Abstract general principle
- `9`: High-risk tool
- `10`: Advanced olympiad concept
- `11`: Deep framework
- `12`: Rare/specialist tool

Problem logs still use **Problem Difficulty** with the contest-style BMO/AMO/PAMO/IMO scale. Notebook Builder, Revision Pack, Mastery Heatmap, note cards, and problem cards distinguish these labels.

### Type-Specific Note Quality

The Note Quality panel adapts to the note type. Theorems and lemmas look for statements, conditions, proof/proof sketch, examples, use cases, mistakes, and related notes. Techniques emphasize core idea, recognition triggers, example patterns, failure cases, and related notes. Formula notes emphasize formula, variables, conditions, use case, example, and related formulae, and do not require a level. Past-problem and example notes use problem/example structure instead of recognition-trigger metadata. Geometry notes require configuration, diagram, key relation, recognition cues, traps, and related notes.

`false_uses.length > 0` satisfies the Common Mistakes/Traps criterion, so you do not need to duplicate false uses inside Markdown. `recognition_triggers.length > 0` satisfies Recognition/When-to-use criteria where that note type uses them. The panel shows source explanations such as “Common mistakes covered through Common False Uses metadata.”

### Problem Log

Open `/app/problems`. Use it to store contest source, topic, status, problem text, solution summary, key idea, mistake made, mistake category, tags, and linked notes. Dedicated routes `/app/problems/new` and `/app/problems/[id]/edit` expose the full form. The detail page can link notes, create a mistake entry from the problem, create a technique note from the problem, mark it review-later/mastered, or ask AI to analyze the mistake.

Mistake categories include:

- `Did not know theorem`
- `Knew theorem but did not recognize it`
- `Forgot condition`
- `Algebra slip`
- `False assumption`
- `Weak diagram`
- `Bad casework`
- `Misread problem`
- `Overcomplicated solution`
- `Gave up too early`
- `Incomplete proof`
- `Other`

### Mistake Log

Open `/app/mistakes`. Track repeated errors by topic, type, severity, correct principle, and resolved status. Mistakes can link back to notes and source problems.

The top of `/app/mistakes` includes a **Mistake Pattern Detector**. It groups failed and review-later problem logs by mistake category, topic, recognition failures, forgotten conditions, and notes linked to repeated failures. This analysis is deterministic and does not require AI.

### Note Links And Backlinks

Saved note edit pages include a **Linked Notes** panel. Add relation types like `prerequisite`, `commonly confused`, `used together`, `generalization`, or `special case`. Note view pages normalize outgoing and incoming links into directional groups such as **Prerequisites**, **Used By**, **Generalizations**, **Special Cases**, **Commonly Confused**, and **Related Notes**.

Only one directional row is stored in `note_links`. Reverse labels are computed for display. For example, if Ceva's Theorem links to Area of Triangle as `prerequisite`, Ceva shows Area of Triangle only under **Prerequisites**. Area of Triangle shows Ceva only under **Used By**. It is not duplicated under `used together` or `prerequisite`.

The linked-note selector has a search input above the note dropdown. Search by title, topic, type, description, or tag to find the note you want to link without scrolling through the full library.

The **Suggest Related Notes** AI action returns structured note-link suggestions only:

```json
{
  "targetNoteId": "existing-note-id",
  "targetTitle": "Area of Triangle",
  "relationType": "prerequisite",
  "reason": "Ceva often uses area ratios in its proof.",
  "confidence": 0.91
}
```

It does not rewrite the note body, append a related-notes section to Markdown, or create links automatically. The app filters suggestions to existing note IDs. Non-existing title ideas are shown separately as possible new notes.

### Math Snippet Palette

The Markdown editor toolbar includes **Snippets** for common olympiad LaTeX. Use `Cmd/Ctrl + M` to open it quickly. Built-in categories include Number Theory, Geometry, Algebra, Inequalities, and Proof. Clicking a snippet inserts it at the cursor; wrapper snippets such as `$...$`, `\frac{}{}`, and `\boxed{}` wrap selected text when useful.

### Structured Section Editor

The note editor has a **Raw Markdown / Section Editor** toggle. Section Editor parses Markdown headings into collapsible blocks, lets you rename sections, move sections up/down, delete sections with confirmation, and add sections from note-type templates. The saved content remains plain `body_markdown`, so exports, search, version history, and Markdown rendering continue to work normally.

### Visual Note Graph

Open `/app/graph` to view a dependency-free SVG relationship map of current-user notes and note links. Filter by topic, note type, relation type, or search text. Prerequisite edges are directional, and clicking a node opens the note.

### Bulk Metadata Manager

Open `/app/manage` for a table view of notes. Select filtered notes and bulk edit topic, note type, type-specific level, tags, archive state, favorite state, or delete. Bulk delete requires typing `DELETE`. Filters help find missing metadata, missing recognition triggers, missing common false uses, or notes below an 80% quality score.

### Media Library

Open `/app/media` for reusable diagrams and media assets. The media library uses the existing `diagrams` table with additional title, alt text, and tag metadata. It supports grid/list views, search by filename/title/caption/alt/tags, SVG/PNG/JPG/JPEG/WEBP upload, attach/detach from notes, caption and alt text edits, Markdown copy, and safe deletion. `/app/diagrams` remains as a compatibility diagram manager entry.

### Light Review

Open `/app/review-notes`. Reviews are deliberately simple:

- Forgot: next review tomorrow
- Shaky: next review in 3 days
- Good: next review in 7 days
- Mastered: next review in 30 days

Note pages also include quick buttons for needs practice, comfortable, and mastered.

### Command Palette

Use `Cmd/Ctrl + K` or the mobile command button. It searches notes, problem logs, mistake logs, captures, topics, templates, saved views, and common actions such as Workspace, Import, Taxonomy, Merge Notes, Media, Graph, and Manage. Supported quick filters include:

- `tag:modular`
- `topic:geometry`
- `type:theorem`
- `status:needs_practice`

### Diagram Manager

Open `/app/diagrams` or `/app/media`. Upload SVG/PNG/JPG/JPEG/WEBP diagrams, attach them to notes, copy Markdown image syntax, remove diagrams from notes, or delete unused diagrams. Files stay in the private `note-diagrams` bucket and previews use signed URLs.

In the note editor, save the note once, upload a diagram in the Geometry diagrams panel, then click **Insert in Markdown** on the uploaded diagram card. The app inserts Markdown like:

```md
![diagram-name.svg](/api/diagrams/render?path=...)
```

You do not need to manually find the Supabase storage path. The `/api/diagrams/render` route verifies that the current user can read a note containing that diagram, then creates a short-lived signed preview URL. The editor preview renders the image immediately, and the saved Markdown remains stable because it does not contain an expiring Supabase signed URL.

### Local Drafts And Versions

The editor saves a browser-local draft shortly after changes. Cloud saves write the previous note body and metadata to `note_versions` only when the cloud copy actually changed, avoiding duplicate version rows. Version History can preview an old version, compare it against the current note with a readable line diff, copy old content, or restore with a backup of the current state first.

### Creation And Organization Tools

These routes improve writing, importing, reorganizing, and viewing notes without adding more study scheduling:

- `/app/templates`: browse built-in templates, create custom templates, duplicate built-ins, edit custom templates, and delete custom templates. New notes can apply a selected template, and the editor can save the current note structure as a reusable template.
- `/app/merge`: merge several small notes into one new note. You choose the order, title, type, and whether originals should be archived. Originals are not deleted by default.
- Note pages and edit pages include **Split Note**, which detects Markdown sections, creates selected sections as new notes, optionally replaces the original sections with `[[note:Title]]` embeds, and can create related-note links.
- `/app/workspace`: a desktop multi-pane workspace with note search, open-note tabs, an editor/preview pane, and a related-note reference pane. Mobile collapses to one pane at a time.
- Note view and edit pages include an outline/minimap generated from Markdown headings. In view mode, clicking an outline item scrolls to the rendered section. In edit mode, it jumps the editor cursor near that heading.
- `/app/views`: saved views for Notes and Manage filters. The Notes page can save the current search/filter/sort state and reload it later.
- `/app/taxonomy`: topic and tag management with usage counts, affected-note previews, rename, merge, and duplicate-tag detection.
- Note pages have view modes: Clean Reading, Compact, Focus, Metadata Rich, and Split With Related Notes. The preference is stored locally.
- Inline note embeds use `[[note:Area of Triangle]]` or `[[note:Area of Triangle#Formula]]`. The embed renders a safe preview with KaTeX and links back to the source note. Nested embeds are collapsed to prevent circular render loops.
- `/app/import`: paste Markdown/text or upload `.md`/`.txt`, preview the content, detect title/headings/type/topic/tags, extract Recognition Triggers and Common False Uses sections, and import as one note or split by top-level headings.

Notebook section extraction is level-aware. Statement Mode, Compact Revision Mode, Standard Notebook Mode, and Formula Sheet Mode render the full selected section, including multiple paragraphs, lists, display math, images, and nested lower-level headings, stopping only at the next heading of the same or higher level.

### Mobile Editor

On mobile, the note editor uses tabs:

- Edit
- Preview
- Metadata

The save button stays accessible at the bottom of the screen.

## Notebook Builder

Open `/app/notebook` to turn your notes into a printable or exportable mathematical notebook. The route is protected by the owner-only app layout, and every export API filters tables with `user_id = auth.uid()`/the current user before building the notebook.

The builder can include:

- notes and Formula Bank notes
- problem logs
- mistake logs
- quick captures and inbox notes
- diagrams
- notes due for review

Selection mode controls how filters behave:

- **Include only**: include matching topics, note types, tags, difficulties, review statuses, and selected note IDs.
- **Include everything except**: start with the selected content sources, then remove excluded topics, note types, tags, difficulty bands, review statuses, mastered notes, or explicit note IDs.

The builder controls are compact collapsible panels so the filter list does not dominate the preview. Section controls also have their own mode:

- **Show selected**: only checked metadata/content sections appear.
- **Hide selected**: start with every notebook section and hide only checked sections.

Section selection includes statements, when-to-use notes, recognition signs, intuition, conditions, how-to-recognize sections, proofs, examples, common mistakes, diagram traps, why-it-happens/how-to-avoid sections, recognition triggers, common false uses, related notes, backlinks, linked problems, linked mistakes, diagrams, problem applications, problem statements, solution summaries, source references, key ideas, correct principles, dates, review status, topic page breaks, and the table of contents.

Notebook metadata uses each note type's level label and distinguishes those from **Problem Difficulty** on problem-log items. Recognition triggers and common false uses render LaTeX in preview and print because they are emitted as Markdown sections and passed through the shared safe KaTeX renderer.

Detail levels control how much appears:

- `Index Mode`: title, metadata, tags.
- `Statement Mode`: statement, formula, core idea, or key relation only.
- `Compact Revision Mode`: statement/core idea, when to use it, common mistakes, and optionally recognition triggers/false uses.
- `Standard Notebook Mode`: statement, use cases, intuition, examples, mistakes, related items, and diagrams.
- `Full Detail Mode`: complete Markdown bodies plus linked problems, mistakes, reviews, and diagrams.
- `Formula Sheet Mode`: compact formula, conditions, and use case.
- `Problem Booklet Mode`: problem source, statement, key idea, solution summary, linked techniques, and mistakes.

Common workflows:

- Compact theorem sheet: load **Compact Theorem Sheet**, then print or export Markdown.
- Full personal notebook: load **Full Personal Notebook** and keep `Standard Notebook Mode` or `Full Detail Mode`.
- Formula sheet: load **Formula Sheet**; it includes formula notes and notes tagged by the Formula Bank topic.
- Problem booklet: load **Problem Review Booklet**, then enable or disable problem statements and solution summaries.
- Weak-topic revision pack: load **Weak Topics Review** to focus on `learning` and `needs_practice` review statuses.
- False uses sheet: load **False Uses Sheet** to make a trap checklist.
- Recognition trigger sheet: load **Recognition Trigger Sheet** to practice choosing techniques from problem cues.
- All except mastered: use blacklist mode to exclude `mastered` and `ignored` notes.

Presets:

- Built-in presets are code defaults and are not inserted into Supabase automatically.
- Use **Save Preset** to store the current builder configuration in `notebook_presets`.
- Saved presets can be loaded, updated, deleted, or marked as default.

Notebook Preview, Print View, and PDF:

- `/app/notebook` is the interactive builder and screen preview.
- `/app/notebook/print` is the dedicated print document view. It renders only the notebook document: cover, table of contents, topics, entries, diagrams, and mathematical content.
- **Print / Save as PDF** stores the current builder config, opens `/app/notebook/print`, and then uses browser print from that clean document route. Choose “Save as PDF” in the browser dialog.
- Browser PDF headers and footers are controlled by the browser, not the app. In Safari or Chrome, disable “Print headers and footers” or similar options for a clean PDF without URL/date/title/page text.
- Server-side app-generated PDF is intentionally not shipped yet because it would require Puppeteer or serverless Chromium and deployment-specific tuning. There is no fake PDF button; browser print is the supported PDF path.
- **Export Markdown** respects the selected filters, detail level, section toggles, grouping, and sort order.
- **Export JSON** returns `{ exported_at, app, config, item_count, items }` for backup or later processing.
- **Copy Markdown** uses the Clipboard API and falls back to a Markdown download if clipboard access is blocked.

Notebook AI helpers are optional and owner-only. `POST /api/ai/notebook-assist` can suggest a preset from a goal, identify missing sections, or draft a cover summary. AI output is previewed first and never changes notebook content unless you apply it manually.

## Contest Revision Pack

Open `/app/revision-pack` before a contest. Choose timing, focus topics, pack style, and whether to include weak notes, failed problems, common false uses, recognition triggers, formulae, diagrams, recent notes, or higher-difficulty notes.

The generator is deterministic first:

- `+40` for `needs_practice`
- `+30` for `learning`
- `+25` when linked to a failed problem
- `+20` when linked to a review-later problem
- bonuses for triggers, false uses, formulae, geometry diagrams, mid-range note levels, and recent updates
- penalties for mastered/ignored notes or overly basic notes before a near contest

Actions:

- export the generated pack as Markdown through the Notebook export API
- save it as a Notebook preset
- save a `revision_packs` row for backup/reference

## Mastery Heatmap

Open `/app/mastery` for a topic-level heatmap. Rows are core topics and columns include total notes, mastered notes, needs-practice/learning notes, failed/review-later problems, unresolved mistakes, average confidence, average note level, average Problem Difficulty, and a score.

Labels:

- `0-25`: Weak
- `26-50`: Developing
- `51-75`: Good
- `76-100`: Strong

The dashboard shows a compact Mastery Heatmap card and a Mistake Pattern card without adding heavy charting or clutter.

PDF limitations:

- Very large exports may take time to render; the builder preview starts with the first 50 items and warns above 300 items. The print route renders the full selected notebook.
- Browser print quality depends on the browser and printer driver. Use the dedicated print route rather than printing the builder page.
- If math appears unrendered, wait for `/app/notebook/print` to finish loading before opening the print dialog; KaTeX CSS is loaded globally.
- If diagrams do not appear, confirm you are logged in and the private diagram render route can read the note containing the diagram path.
- If page breaks look poor, try disabling two-column layout except for Formula Sheet mode, use Compact Revision or Statement mode, or enable topic page breaks in the builder.
- Private diagrams render through app routes and signed Supabase URLs, so export while logged in.

## DeepSeek AI Writing Assistant

The owner note editor includes an AI panel for drafting and improving notes. It can create starter drafts, fill missing sections, improve the selected section, analyze mistakes, scaffold past problem notes, suggest descriptions/tags, suggest recognition triggers, suggest false uses, ask your Codex using existing notes as context, clean rough captures, suggest related notes, generate recall questions, find common mistakes, and turn problems into technique drafts.

For **Suggest Related Notes**, the AI route is constrained to return structured `link_suggestions` only. Existing-note suggestions can be added from the Linked Notes panel; possible non-existing note ideas are shown separately. This mode never returns a full rewritten document and never modifies `body_markdown`.

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

Topics use a compact chip picker instead of a long combination dropdown. You can select one or more core subjects and the app stores them as a combined topic such as `Combinatorics + Geometry` or `Algebra + Number Theory`. Collection chips such as `Formula Bank` and `Problem Patterns` can be combined with core subjects, for example `Formula Bank + Combinatorics`. `Inbox` remains exclusive because it means the item has not been organized yet. Filtering by `Geometry` will still match `Combinatorics + Geometry`.

`Formula Bank` is a collection/view: it means "show this in the formula bank." `Formula` and `Formula Log` are note types/templates: they control the fields, template, and whether difficulty is shown. A combinatorics formula should usually be `note_type = Formula Log` or `Formula` and `topic = Formula Bank + Combinatorics`.

Current official note types:

- `Theorem`: statement, conditions, intuition, proof sketch, examples, mistakes, related techniques, Concept Level.
- `Lemma`: claim, setup, proof, example use, mistakes, related results.
- `Technique`: triggers, core idea, application steps, example, mistakes, variations.
- `Formula`: formula, variables, conditions, when to use it, quick example; no level field.
- `Formula Log`: compact formula recall entry; no level field.
- `Trick`: narrow move, trigger, why it works, example, mistakes.
- `Common Mistake`: wrong idea, warning signs, correction, fix, example.
- `Problem Pattern`: recurring structure, trigger phrases, strategy, worked example, variations.
- `Past Problem`: source, problem statement, first observations, solution, mistakes, key takeaway.
- `Definition`: definition, notation, examples, non-examples; no level field.
- `Example`: worked example with goal, solution, key move, mistakes, generalization.
- `Inbox`: rough capture before converting to a full note.

## Upload Safety

Accepted diagram types:

- SVG
- PNG
- JPG/JPEG
- WEBP

File size limit: 5 MB.

The client validates extension, MIME type, filename, and file size. Storage policies restrict contributors to `suggestion-diagrams/{user_id}/...`; official note diagrams and quick-capture attachments are owner-managed in `note-diagrams`.

## Markdown And LaTeX Safety

Markdown rendering uses `react-markdown`, `remark-math`, `rehype-sanitize`, and `rehype-katex`. Raw HTML is not enabled. Use:

```md
If $\gcd(a,n)=1$, then

$$a^{\varphi(n)} \equiv 1 \pmod n.$$
```

The Markdown editor toolbar includes a LaTeX command dropdown and a Snippets palette for common wrappers and symbols such as `$...$`, `$$...$$`, `\frac{}`, `\sqrt{}`, `\begin{aligned}`, `\binom{}`, `\mathbb{}`, congruences, angle notation, parallel, and perpendicular. Use `Cmd/Ctrl + M` to open the snippet palette from the editor.

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
- `revision_packs` and Notebook presets are user-owned rows with RLS.
- Media-library rows are stored in `diagrams`, scoped by `user_id`, and the Part 3 extension migration only adds safe metadata columns.
- Notebook exports and revision-pack exports use the current user's data only.
- AI output is draft-only; it does not overwrite notes unless the owner clicks an apply action.
- AI related-note suggestions are filtered to existing current-user notes before they become addable links.
- Raw HTML is not enabled in Markdown rendering.
- Diagram uploads reject unknown file types and files over 5 MB.
- Add production rate limiting or CAPTCHA before opening contribution mode broadly.

## Troubleshooting

- If `/app/capture`, `/app/problems`, `/app/mistakes`, `/app/review-notes`, `/app/revision-pack`, `/app/mastery`, `/app/graph`, `/app/manage`, `/app/media`, or `/app/diagrams` shows empty data after deploy, rerun `supabase/schema.sql`.
- If `supabase db push` reports an old duplicate migration version, repair the migration history first, then pull/apply the schema so local and remote migration tables agree.
- If diagram previews fail, confirm the `note-diagrams` bucket exists and `supabase/storage-policies.sql` has been applied.
- If AI actions fail with `Missing DEEPSEEK_API_KEY`, add the server-only DeepSeek variables locally and in Vercel.
- If tags appear to disappear while typing, make sure you are on the latest build; tags are entered as comma-separated text and saved as a Postgres `text[]`.
