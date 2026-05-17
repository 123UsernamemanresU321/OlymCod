import type { NotebookConfig, NotebookItem } from "@/lib/notebook/types";

export function exportNotebookJson(items: NotebookItem[], config: NotebookConfig) {
  return {
    exported_at: new Date().toISOString(),
    app: "Olympiad Codex",
    config,
    item_count: items.length,
    items
  };
}
