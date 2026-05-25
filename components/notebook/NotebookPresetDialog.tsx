"use client";

import { useState } from "react";
import { Save, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { BUILT_IN_NOTEBOOK_PRESETS, normalizeNotebookConfig } from "@/lib/notebook/defaultNotebookConfig";
import type { NotebookConfig } from "@/lib/notebook/types";
import { createClient } from "@/lib/supabase/client";
import type { NotebookPreset } from "@/lib/types";

interface NotebookPresetDialogProps {
  open: boolean;
  presets: NotebookPreset[];
  config: NotebookConfig;
  onClose: () => void;
  onLoad: (config: NotebookConfig) => void;
  onPresetsChange: (presets: NotebookPreset[]) => void;
}

export function NotebookPresetDialog({
  open,
  presets,
  config,
  onClose,
  onLoad,
  onPresetsChange
}: NotebookPresetDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!open) return null;

  async function reloadPresets() {
    const supabase = createClient();
    const { data } = await supabase
      .from("notebook_presets")
      .select("*")
      .order("updated_at", { ascending: false });
    onPresetsChange((data ?? []) as NotebookPreset[]);
  }

  async function savePreset() {
    if (!name.trim()) {
      setMessage("Preset name is required.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");
      const { error } = await supabase.from("notebook_presets").insert({
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        config,
        is_default: false
      });
      if (error) throw error;
      setName("");
      setDescription("");
      await reloadPresets();
      setMessage("Preset saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save preset.");
    } finally {
      setBusy(false);
    }
  }

  async function updatePreset(preset: NotebookPreset) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("notebook_presets").update({ config }).eq("id", preset.id);
    if (error) setMessage(error.message);
    else {
      await reloadPresets();
      setMessage("Preset updated.");
    }
    setBusy(false);
  }

  async function deletePreset(preset: NotebookPreset) {
    if (!window.confirm(`Delete preset "${preset.name}"?`)) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("notebook_presets").delete().eq("id", preset.id);
    if (error) setMessage(error.message);
    else await reloadPresets();
    setBusy(false);
  }

  async function setDefaultPreset(preset: NotebookPreset) {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("notebook_presets").update({ is_default: false }).neq("id", preset.id);
    const { error } = await supabase.from("notebook_presets").update({ is_default: true }).eq("id", preset.id);
    if (error) setMessage(error.message);
    else {
      await reloadPresets();
      setMessage("Default preset updated.");
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[900] grid place-items-center bg-black/45 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-[#c3c6d0] bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[#1a1c1c]">Save Preset</h2>
            <p className="mt-1 text-sm text-[#43474f]">Load built-in presets or save your current Notebook Builder setup.</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <section className="mt-5 rounded border border-[#d5d7de] bg-[#f9f9f9] p-4">
          <h3 className="text-base font-semibold text-[#1a1c1c]">Save Current Config</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Name">
              <input className={inputClassName()} value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Description">
              <input
                className={inputClassName()}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
            <Button type="button" className="self-end" onClick={() => void savePreset()} loading={busy} loadingLabel="Saving...">
              <Save className="h-4 w-4" aria-hidden="true" />
              Save
            </Button>
          </div>
          {message ? <p className="mt-3 text-sm text-[#0e3b69]">{message}</p> : null}
        </section>

        <section className="mt-5">
          <h3 className="text-base font-semibold text-[#1a1c1c]">Built-in Presets</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {BUILT_IN_NOTEBOOK_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="rounded border border-[#c3c6d0] bg-[#f9f9f9] p-3 text-left hover:bg-white"
                onClick={() => onLoad(preset.config)}
              >
                <span className="font-semibold text-[#1a1c1c]">{preset.name}</span>
                <span className="mt-1 block text-sm leading-6 text-[#43474f]">{preset.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-base font-semibold text-[#1a1c1c]">Saved Presets</h3>
          <div className="mt-3 grid gap-2">
            {presets.length ? (
              presets.map((preset) => (
                <div key={preset.id} className="rounded border border-[#d5d7de] bg-[#f9f9f9] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-[#1a1c1c]">
                        {preset.name} {preset.is_default ? <span className="text-[#0e3b69]">(default)</span> : null}
                      </p>
                      {preset.description ? <p className="mt-1 text-sm text-[#43474f]">{preset.description}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => onLoad(normalizeNotebookConfig(preset.config))}>
                        Load
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => void updatePreset(preset)} loading={busy} loadingLabel="Updating...">
                        Update
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => void setDefaultPreset(preset)} loading={busy} loadingLabel="Updating...">
                        <Star className="h-4 w-4" aria-hidden="true" />
                        Default
                      </Button>
                      <Button type="button" variant="danger" onClick={() => void deletePreset(preset)} loading={busy} loadingLabel="Deleting...">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded border border-[#d5d7de] p-3 text-sm text-[#43474f]">No saved presets yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
