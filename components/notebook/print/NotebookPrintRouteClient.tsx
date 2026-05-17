"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { NotebookPrintDocument } from "@/components/notebook/print/NotebookPrintDocument";
import { Button } from "@/components/ui/Button";
import { DEFAULT_NOTEBOOK_CONFIG, normalizeNotebookConfig } from "@/lib/notebook/defaultNotebookConfig";
import type { NotebookConfig, NotebookItem } from "@/lib/notebook/types";

const PRINT_CONFIG_STORAGE_KEY = "olympiad-codex:notebook-print-config";

type NotebookBuildResponse = {
  config: NotebookConfig;
  items: NotebookItem[];
  item_count: number;
  warning?: string;
};

function readStoredPrintConfig() {
  if (typeof window === "undefined") return DEFAULT_NOTEBOOK_CONFIG;
  const stored = window.localStorage.getItem(PRINT_CONFIG_STORAGE_KEY);
  if (!stored) return DEFAULT_NOTEBOOK_CONFIG;
  try {
    return normalizeNotebookConfig(JSON.parse(stored));
  } catch {
    return DEFAULT_NOTEBOOK_CONFIG;
  }
}

export function storeNotebookPrintConfig(config: NotebookConfig) {
  window.localStorage.setItem(PRINT_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function NotebookPrintRouteClient() {
  const [config] = useState<NotebookConfig>(() => readStoredPrintConfig());
  const [items, setItems] = useState<NotebookItem[]>([]);
  const [itemCount, setItemCount] = useState(0);
  const [warning, setWarning] = useState<string | undefined>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const autoPrint = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("autoprint") === "1";
  }, []);

  useEffect(() => {
    async function loadPrintDocument() {
      setStatus("loading");
      setError(null);
      try {
        const response = await fetch("/api/export/notebook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config })
        });
        if (!response.ok) throw new Error("Could not build the print notebook.");
        const data = (await response.json()) as NotebookBuildResponse;
        setItems(data.items);
        setItemCount(data.item_count);
        setWarning(data.warning);
        setStatus("ready");
      } catch (loadError) {
        setStatus("error");
        setError(loadError instanceof Error ? loadError.message : "Could not build the print notebook.");
      }
    }

    void loadPrintDocument();
  }, [config]);

  useEffect(() => {
    if (!autoPrint || status !== "ready") return;
    const timer = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(timer);
  }, [autoPrint, status]);

  return (
    <div className="min-h-screen bg-white">
      <div className="notebook-print-hidden border-b border-[#c3c6d0] bg-[#f9f9f9] px-4 py-3">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/app/notebook" className="inline-flex items-center gap-2 text-sm font-medium text-[#0e3b69]">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to builder
            </Link>
            <span className="hidden h-4 w-px bg-[#c3c6d0] sm:block" />
            <p className="text-sm text-[#43474f]">
              For the cleanest browser PDF, disable headers and footers in the print dialog.
            </p>
          </div>
          <Button type="button" onClick={() => window.print()} disabled={status !== "ready"}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      {status === "loading" ? (
        <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-[#43474f]">Preparing print notebook...</div>
      ) : null}

      {status === "error" ? (
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-2xl font-semibold text-[#1a1c1c]">Could not prepare notebook PDF.</h1>
          <p className="mt-3 text-sm text-[#8f1d15]">{error}</p>
        </div>
      ) : null}

      {status === "ready" ? (
        <NotebookPrintDocument config={config} items={items} itemCount={itemCount} warning={warning} />
      ) : null}
    </div>
  );
}
