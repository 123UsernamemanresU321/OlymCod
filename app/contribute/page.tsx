import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { SiteSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ContributePage() {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("*").eq("id", "main").single();
  const settings = data as SiteSettings | null;

  return (
    <main className="min-h-screen bg-[#f9f9f9] px-4 py-12 text-[#1a1c1c] lg:px-10">
      <section className="mx-auto max-w-3xl rounded-lg border border-[#c3c6d0] bg-white p-6 lg:p-10">
        <Link href="/" className="text-sm font-medium text-[#0e3b69]">Olympiad Codex</Link>
        <h1 className="mt-4 text-4xl font-semibold">Contribution Guidelines</h1>
        <p className="mt-4 text-lg leading-8 text-[#43474f]">
          Contributions are suggestions only. The owner reviews everything before publication.
        </p>
        <div className="mt-8 grid gap-4 rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-5 text-sm leading-6 text-[#43474f]">
          <p>Submitting does not guarantee acceptance.</p>
          <p>Do not submit copyrighted material unless you have permission.</p>
          <p>Do not submit offensive, spammy, or irrelevant content.</p>
          <p>Mathematical corrections should include reasoning or a source when useful.</p>
          <p>Use LaTeX where possible for formulas and symbols.</p>
          <p>Spam or abusive submissions may lead to account suspension.</p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/contribute/new"
            className="inline-flex min-h-10 items-center justify-center rounded border border-[#2c5282] bg-[#2c5282] px-4 py-2 text-[13px] font-medium tracking-[0.04em] text-white"
          >
            Submit New Proposal
          </Link>
          <Link
            href="/contribution-status"
            className="inline-flex min-h-10 items-center justify-center rounded border border-[#c3c6d0] bg-white px-4 py-2 text-[13px] font-medium tracking-[0.04em] text-[#0e3b69]"
          >
            Check Contribution Status
          </Link>
        </div>
        {!settings?.contributions_enabled ? (
          <p className="mt-6 rounded border border-[#ffdad6] bg-[#fff4f2] p-3 text-sm text-[#8f1d15]">
            Contribution mode is currently disabled by the owner.
          </p>
        ) : null}
      </section>
    </main>
  );
}
