import { MarkdownPreview } from "@/components/editor/MarkdownPreview";

interface NotebookPrintSectionProps {
  label: string;
  markdown: string;
}

export function NotebookPrintSection({ label, markdown }: NotebookPrintSectionProps) {
  if (!markdown.trim()) return null;

  return (
    <section className="print-section">
      <h3 className="print-section-title">{label}</h3>
      <MarkdownPreview markdown={markdown} className="print-section-body" />
    </section>
  );
}
