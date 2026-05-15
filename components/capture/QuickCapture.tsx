"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { TopicSelector } from "@/components/notes/TopicSelector";
import { CAPTURE_TYPES } from "@/lib/constants/daily";
import { createClient } from "@/lib/supabase/client";
import { validateDiagramFile, safeFilename } from "@/lib/utils/files";
import { parseTags } from "@/lib/utils/tags";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";

interface QuickCaptureProps {
  buttonLabel?: string;
  floating?: boolean;
  enableShortcut?: boolean;
}

export function QuickCapture({
  buttonLabel = "Quick Capture",
  floating = false,
  enableShortcut = false
}: QuickCaptureProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [captureType, setCaptureType] = useState("Rough Note");
  const [topicGuess, setTopicGuess] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enableShortcut) return;
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enableShortcut]);

  function reset() {
    setRawText("");
    setCaptureType("Rough Note");
    setTopicGuess("");
    setTagsText("");
    setFile(null);
    setError(null);
  }

  async function saveCapture(convertAfterSave = false) {
    if (!rawText.trim()) {
      setError("Write the idea before saving.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (file) {
        const validation = validateDiagramFile(file);
        if (validation) throw new Error(validation);
      }

      const supabase = createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(userError?.message ?? "You must be logged in to capture ideas.");
      }

      const { data, error: insertError } = await supabase
        .from("quick_captures")
        .insert({
          user_id: user.id,
          raw_text: rawText.trim(),
          capture_type: captureType,
          topic_guess: topicGuess || null,
          tags: parseTags(tagsText),
          attachment_urls: []
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      if (file) {
        const path = `${user.id}/captures/${data.id}/${safeFilename(file.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("note-diagrams")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;

        await supabase
          .from("quick_captures")
          .update({ attachment_urls: [path] })
          .eq("id", data.id);
        await supabase.from("diagrams").insert({
          user_id: user.id,
          storage_path: path,
          filename: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          caption: "Quick capture attachment"
        });
      }

      reset();
      setOpen(false);
      if (convertAfterSave) {
        router.push(`/app/capture?convert=${data.id}`);
      } else {
        router.refresh();
      }
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : "Could not save capture.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          floating
            ? "fixed bottom-24 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#2c5282] text-white shadow-[0_16px_30px_rgba(26,32,44,0.2)] lg:hidden"
            : "flex min-h-9 items-center justify-center gap-2 border border-[#c3c6d0] bg-white px-4 py-2 text-[13px] font-medium tracking-[0.04em] text-[#0e3b69] hover:bg-[#eef4ff]"
        }
        aria-label={buttonLabel}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {!floating ? buttonLabel : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/30 p-0 sm:place-items-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg border border-[#c3c6d0] bg-white p-5 shadow-xl sm:max-w-2xl sm:rounded-lg">
            <div className="flex items-start justify-between gap-4 border-b border-[#c3c6d0] pb-3">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">
                  Cmd/Ctrl + J
                </p>
                <h2 className="text-xl font-semibold text-[#1a1c1c]">Quick Capture</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded border border-[#c3c6d0] text-[#43474f] hover:bg-[#f9f9f9]"
                aria-label="Close quick capture"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <Field label="Raw idea">
                <textarea
                  autoFocus
                  className={inputClassName("min-h-36")}
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  placeholder="Write the theorem, mistake, pattern, or rough thought."
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Type">
                  <select
                    className={inputClassName()}
                    value={captureType}
                    onChange={(event) => setCaptureType(event.target.value)}
                  >
                    {CAPTURE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Topic guess">
                  <TopicSelector value={topicGuess} onChange={setTopicGuess} allowEmpty />
                </Field>
              </div>

              <Field label="Tags">
                <input
                  className={inputClassName()}
                  value={tagsText}
                  onChange={(event) => setTagsText(event.target.value)}
                  placeholder="invariant, parity, geometry"
                />
              </Field>

              <label className="flex cursor-pointer items-center gap-3 rounded border border-[#c3c6d0] bg-[#f9f9f9] px-3 py-3 text-sm text-[#43474f]">
                <ImagePlus className="h-4 w-4 text-[#0e3b69]" aria-hidden="true" />
                <span className="flex-1 truncate">{file ? file.name : "Optional diagram/image"}</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>

              {error ? (
                <p className="rounded border border-[#ffb4ab] bg-[#ffdad6] px-3 py-2 text-sm text-[#8f1d15]">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" variant="secondary" onClick={() => void saveCapture(true)} disabled={busy}>
                  Save and Convert
                </Button>
                <Button type="button" onClick={() => void saveCapture(false)} disabled={busy}>
                  {busy ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
