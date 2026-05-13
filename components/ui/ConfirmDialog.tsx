"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  busy
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4">
      <div className="w-full max-w-[370px] rounded-lg border border-[#c3c6d0] bg-white p-6 shadow-[0_16px_40px_rgba(26,32,44,0.18)]">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-[#b42318]" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-[#1a1c1c]">{title}</h2>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#43474f]">{body}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Deleting..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
