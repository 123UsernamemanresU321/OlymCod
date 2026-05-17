"use client";

import { Clipboard, Download, Printer } from "lucide-react";
import { storeNotebookPrintConfig } from "@/components/notebook/print/NotebookPrintRouteClient";
import { Button } from "@/components/ui/Button";
import type { NotebookConfig } from "@/lib/notebook/types";

interface NotebookExportButtonsProps {
  config: NotebookConfig;
  onBeforePrint: () => void;
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function postExport(path: string, config: NotebookConfig) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config })
  });
  if (!response.ok) throw new Error("Export failed.");
  return response;
}

export function NotebookExportButtons({ config, onBeforePrint }: NotebookExportButtonsProps) {
  async function exportMarkdown(copy = false) {
    const response = await postExport("/api/export/notebook/markdown", config);
    const markdown = await response.text();
    if (copy) {
      try {
        await navigator.clipboard.writeText(markdown);
      } catch {
        downloadFile("olympiad-codex-notebook.md", markdown, "text/markdown");
      }
      return;
    }
    downloadFile("olympiad-codex-notebook.md", markdown, "text/markdown");
  }

  async function exportJson() {
    const response = await postExport("/api/export/notebook/json", config);
    const json = await response.text();
    downloadFile("olympiad-codex-notebook.json", json, "application/json");
  }

  function printNotebook() {
    onBeforePrint();
    storeNotebookPrintConfig(config);
    window.open("/app/notebook/print?autoprint=1", "_blank", "noopener,noreferrer");
  }

  return (
    <div className="notebook-print-hidden grid gap-2">
      <p className="max-w-xl text-xs leading-5 text-[#5c6068]">
        Print opens a dedicated notebook document. For browser PDF fallback, disable headers and footers in the print dialog.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={printNotebook}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print / Save as PDF
        </Button>
        <Button type="button" variant="secondary" onClick={() => void exportMarkdown(false)}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Export Markdown
        </Button>
        <Button type="button" variant="secondary" onClick={() => void exportJson()}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Export JSON
        </Button>
        <Button type="button" variant="secondary" onClick={() => void exportMarkdown(true)}>
          <Clipboard className="h-4 w-4" aria-hidden="true" />
          Copy Markdown
        </Button>
      </div>
    </div>
  );
}
