"use client";

import { useEffect, useState } from "react";
import { FileImage, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { safeFilename, validateDiagramFile } from "@/lib/utils/files";

interface SignedDiagram {
  path: string;
  signedUrl: string;
}

interface DiagramUploadProps {
  noteId: string | null;
  paths: string[];
  onChange: (paths: string[]) => void;
}

export function DiagramUpload({ noteId, paths, onChange }: DiagramUploadProps) {
  const bucket = "note-diagrams";
  const [signed, setSigned] = useState<SignedDiagram[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSignedUrls() {
      if (!paths.length) {
        setSigned([]);
        return;
      }

      const supabase = createClient();
      const { data, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrls(paths, 60 * 60);

      if (cancelled) return;

      if (signedError) {
        setError(signedError.message);
        return;
      }

      setSigned(
        (data ?? []).flatMap((item) =>
          item.path && item.signedUrl ? [{ path: item.path, signedUrl: item.signedUrl }] : []
        )
      );
    }

    loadSignedUrls();
    return () => {
      cancelled = true;
    };
  }, [paths]);

  async function persistPaths(nextPaths: string[]) {
    if (!noteId) return;

    const supabase = createClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error(userError?.message ?? "You must be logged in to update diagrams.");
    }

    const { error: updateError } = await supabase
      .from("notes")
      .update({ diagram_urls: nextPaths })
      .eq("id", noteId)
      .eq("user_id", user.id);

    if (updateError) throw updateError;
  }

  async function uploadFile(file: File) {
    setError(null);

    if (!noteId) {
      setError("Save the note before uploading diagrams.");
      return;
    }

    const validationError = validateDiagramFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(userError?.message ?? "You must be logged in to upload diagrams.");
      }

      const storagePath = `${user.id}/${noteId}/${safeFilename(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined
        });

      if (uploadError) throw uploadError;

      const nextPaths = [...paths, storagePath];
      try {
        await persistPaths(nextPaths);
      } catch (persistError) {
        await supabase.storage.from(bucket).remove([storagePath]);
        throw persistError;
      }
      onChange(nextPaths);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function removePath(path: string) {
    setError(null);
    const nextPaths = paths.filter((item) => item !== path);
    try {
      const supabase = createClient();
      await persistPaths(nextPaths);
      onChange(nextPaths);
      const { error: removeError } = await supabase.storage.from(bucket).remove([path]);
      if (removeError) {
        setError("Removed from this note, but storage cleanup failed. Try again later.");
      }
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove diagram.");
    }
  }

  return (
    <section className="rounded-lg border border-dashed border-[#c3c6d0] bg-[#f9f9f9] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-[#1a1c1c]">
            <FileImage className="h-5 w-5 text-[#0e3b69]" aria-hidden="true" />
            Geometry diagrams
          </h3>
          <p className="mt-1 text-sm text-[#43474f]">Upload SVG, PNG, JPG, or JPEG files.</p>
        </div>
        <label className="inline-flex">
          <input
            className="sr-only"
            type="file"
            accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
            disabled={uploading || !noteId}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = "";
              if (file) void uploadFile(file);
            }}
          />
          <span className="inline-flex min-h-9 items-center justify-center gap-2 rounded border border-[#2c5282] bg-[#2c5282] px-4 py-2 text-[13px] font-medium tracking-[0.04em] text-white hover:bg-[#23466f]">
            <Upload className="h-4 w-4" aria-hidden="true" />
            {uploading ? "Uploading..." : "Upload"}
          </span>
        </label>
      </div>

      {!noteId ? (
        <p className="mt-4 rounded border border-[#c3c6d0] bg-white p-3 text-sm text-[#43474f]">
          Save this note once to enable diagram uploads.
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded border border-[#ffb4ab] bg-[#ffdad6] p-3 text-sm text-[#8f1d15]">
          {error}
        </p>
      ) : null}

      {signed.length ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {signed.map((item) => (
            <figure key={item.path} className="rounded border border-[#c3c6d0] bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.signedUrl}
                alt="Uploaded geometry diagram"
                className="h-44 w-full object-contain"
              />
              <figcaption className="mt-3 flex items-center justify-between gap-3 text-xs text-[#43474f]">
                <span className="truncate">{item.path.split("/").pop()}</span>
                <button
                  type="button"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded text-[#8f1d15] hover:bg-[#ffdad6]"
                  aria-label="Remove diagram"
                  onClick={() => void removePath(item.path)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </section>
  );
}
