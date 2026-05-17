import { MarkdownPreview } from "@/components/editor/MarkdownPreview";

interface NotebookSectionProps {
  label: string;
  markdown: string;
}

export function NotebookSection({ label, markdown }: NotebookSectionProps) {
  if (!markdown.trim()) return null;
  return (
    <section className="mt-5">
      <h4 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#0e3b69]">
        {label}
      </h4>
      <MarkdownPreview markdown={markdown} className="mt-2 text-[0.98rem]" />
    </section>
  );
}
