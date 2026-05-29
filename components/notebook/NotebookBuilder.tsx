"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Brain, Printer, Save, UploadCloud } from "lucide-react";
import { NotebookControls } from "@/components/notebook/NotebookControls";
import { NotebookExportButtons } from "@/components/notebook/NotebookExportButtons";
import { NotebookPresetDialog } from "@/components/notebook/NotebookPresetDialog";
import { NotebookPreview } from "@/components/notebook/NotebookPreview";
import { storeNotebookPrintConfig } from "@/components/notebook/print/NotebookPrintRouteClient";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import {
  DEFAULT_NOTEBOOK_CONFIG,
  normalizeNotebookConfig
} from "@/lib/notebook/defaultNotebookConfig";
import type { NotebookConfig, NotebookItem } from "@/lib/notebook/types";
import type { NotebookPreset } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface NotebookBuilderProps {
  presets: NotebookPreset[];
  availableTopics: string[];
  availableTags: string[];
}

type NotebookBuildResponse = {
  config: NotebookConfig;
  items: NotebookItem[];
  previewItems: NotebookItem[];
  item_count: number;
  warning?: string;
};

type AiMode = "suggest_preset" | "missing_sections" | "cover_summary";

export function NotebookBuilder({ presets: initialPresets, availableTopics, availableTags }: NotebookBuilderProps) {
  const defaultPreset = initialPresets.find((preset) => preset.is_default);
  const [config, setConfig] = useState<NotebookConfig>(() =>
    defaultPreset ? normalizeNotebookConfig(defaultPreset.config) : DEFAULT_NOTEBOOK_CONFIG
  );
  const [presets, setPresets] = useState(initialPresets);
  const [items, setItems] = useState<NotebookItem[]>([]);
  const [previewItems, setPreviewItems] = useState<NotebookItem[]>([]);
  const [itemCount, setItemCount] = useState(0);
  const [warning, setWarning] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderAll, setRenderAll] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"Build" | "Preview" | "Export">("Build");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState<AiMode>("suggest_preset");
  const [aiGoal, setAiGoal] = useState("");
  const [aiResult, setAiResult] = useState<{ markdown?: string; configPatch?: unknown } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const visibleItems = useMemo(() => (renderAll ? items : previewItems), [items, previewItems, renderAll]);

  const loadNotebook = useCallback(async (nextConfig: NotebookConfig) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/export/notebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: nextConfig })
      });
      if (!response.ok) throw new Error("Could not build notebook preview.");
      const data = (await response.json()) as NotebookBuildResponse;
      setItems(data.items);
      setPreviewItems(data.previewItems);
      setItemCount(data.item_count);
      setWarning(data.warning);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not build notebook preview.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadNotebook(config);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [config, loadNotebook]);

  function updateConfig(nextConfig: NotebookConfig) {
    setRenderAll(false);
    setConfig(normalizeNotebookConfig(nextConfig));
  }

  function clearFilters() {
    updateConfig({
      ...config,
      topics: [],
      noteTypes: [],
      tags: [],
      reviewStatuses: [],
      problemStatuses: [],
      difficultyMin: 1,
      difficultyMax: 12
    });
  }

  function printNotebook() {
    setRenderAll(true);
    storeNotebookPrintConfig(config);
    window.open("/app/notebook/print?autoprint=1", "_blank", "noopener,noreferrer");
  }

  async function runAi() {
    setAiBusy(true);
    setAiResult(null);
    try {
      const response = await fetch("/api/ai/notebook-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: aiMode, goal: aiGoal, config })
      });
      if (!response.ok) throw new Error("Notebook AI helper failed.");
      setAiResult(await response.json());
    } catch (aiError) {
      setAiResult({ markdown: aiError instanceof Error ? aiError.message : "Notebook AI helper failed." });
    } finally {
      setAiBusy(false);
    }
  }

  function applyAiConfigPatch() {
    if (!aiResult?.configPatch || typeof aiResult.configPatch !== "object") return;
    updateConfig(normalizeNotebookConfig({ ...config, ...(aiResult.configPatch as Record<string, unknown>) }));
  }

  function applyAiCoverSummary() {
    if (!aiResult?.markdown) return;
    updateConfig({ ...config, coverSummary: aiResult.markdown.trim() });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f9f9f9] lg:h-screen lg:max-h-screen lg:overflow-hidden">
      <div className="notebook-print-hidden sticky top-16 z-20 flex-none border-b border-[#c3c6d0] bg-white px-4 py-4 lg:top-0 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[#1a1c1c]">Notebook Builder</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#43474f]">
              Build printable theorem sheets, formula banks, problem booklets, and full notebooks.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setPresetOpen(true)}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Save Preset
            </Button>
            <Button type="button" variant="secondary" onClick={() => setPresetOpen(true)}>
              Load Preset
            </Button>
            <Button type="button" variant="secondary" onClick={() => setMobileTab("Export")}>
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              Export
            </Button>
            <Button type="button" onClick={printNotebook}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print
            </Button>
          </div>
        </div>
      </div>

      <div className="notebook-print-hidden flex flex-none border-b border-[#c3c6d0] bg-white px-4 lg:hidden">
        {(["Build", "Preview", "Export"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={cn(
              "px-4 py-3 text-sm font-medium text-[#43474f]",
              mobileTab === tab && "border-b-2 border-[#0e3b69] text-[#0e3b69]"
            )}
            onClick={() => setMobileTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row lg:overflow-hidden">
        <aside className={cn("notebook-print-hidden codex-scrollbar w-full bg-white p-4 lg:block lg:w-[340px] lg:flex-none lg:border-r lg:border-[#c3c6d0] lg:h-full lg:overflow-y-auto lg:p-6 lg:pb-6 pb-20", mobileTab !== "Build" && "hidden")}>
          <NotebookControls
            config={config}
            availableTopics={availableTopics}
            availableTags={availableTags}
            onChange={updateConfig}
          />

          <section className="mt-5 rounded-lg border border-[#c3c6d0] bg-white p-4">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left text-base font-semibold text-[#1a1c1c]"
              onClick={() => setAiOpen((current) => !current)}
            >
              <span className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-[#0e3b69]" aria-hidden="true" />
                AI Notebook Helper
              </span>
              <span className="text-sm text-[#0e3b69]">{aiOpen ? "Hide" : "Open"}</span>
            </button>
            {aiOpen ? (
              <div className="mt-4 grid gap-3">
                <Field label="Mode">
                  <select className={inputClassName()} value={aiMode} onChange={(event) => setAiMode(event.target.value as AiMode)}>
                    <option value="suggest_preset">Suggest Notebook Preset</option>
                    <option value="missing_sections">Identify Missing Sections</option>
                    <option value="cover_summary">Generate Cover Summary</option>
                  </select>
                </Field>
                <Field label="Goal">
                  <textarea
                    className={inputClassName("min-h-24")}
                    value={aiGoal}
                    onChange={(event) => setAiGoal(event.target.value)}
                    placeholder="PAMO number theory revision, formula sheet, weak geometry topics..."
                  />
                </Field>
                <Button type="button" variant="secondary" onClick={() => void runAi()} loading={aiBusy} loadingLabel="Thinking...">
                  Generate suggestion
                </Button>
                {aiResult?.markdown ? (
                  <div className="rounded border border-[#d5d7de] bg-[#f9f9f9] p-3 text-sm leading-6 text-[#43474f]">
                    <pre className="whitespace-pre-wrap font-sans">{aiResult.markdown}</pre>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {aiResult.configPatch ? (
                        <Button type="button" variant="secondary" onClick={applyAiConfigPatch}>
                          Apply config suggestion
                        </Button>
                      ) : null}
                      {aiMode === "cover_summary" ? (
                        <Button type="button" variant="secondary" onClick={applyAiCoverSummary}>
                          Use as cover summary
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </aside>

        <main className={cn("flex-1 bg-[#f9f9f9] p-4 lg:block lg:h-full lg:min-w-0 lg:overflow-y-auto codex-scrollbar lg:p-8 pb-20 lg:pb-8", mobileTab === "Build" && "hidden")}>
          <div className="mx-auto max-w-4xl">
            <div className={cn("notebook-print-hidden mb-4 rounded-lg border border-[#c3c6d0] bg-white p-4", mobileTab !== "Export" && "hidden lg:block")}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-[#1a1c1c]">{busy ? "Building preview..." : `${itemCount} selected items`}</p>
                  {error ? <p className="mt-1 text-sm text-[#8f1d15]">{error}</p> : null}
                </div>
                <NotebookExportButtons config={config} onBeforePrint={() => setRenderAll(true)} />
              </div>
            </div>

            <div className={cn(mobileTab === "Export" && "hidden lg:block")}>
              <NotebookPreview
                config={config}
                items={visibleItems}
                itemCount={itemCount}
                warning={warning}
                renderAll={renderAll}
                onRenderAll={() => setRenderAll(true)}
                onClearFilters={clearFilters}
              />
            </div>
          </div>
        </main>
      </div>

      <NotebookPresetDialog
        open={presetOpen}
        presets={presets}
        config={config}
        onClose={() => setPresetOpen(false)}
        onLoad={(nextConfig) => {
          updateConfig(nextConfig);
          setPresetOpen(false);
        }}
        onPresetsChange={setPresets}
      />
    </div>
  );
}
