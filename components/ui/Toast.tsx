"use client";

import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import type { ToastKind } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface ToastProps {
  kind: ToastKind;
  title: string;
  message?: string;
  onClose: () => void;
}

export function Toast({ kind, title, message, onClose }: ToastProps) {
  const Icon = kind === "success" ? CheckCircle2 : kind === "error" ? AlertTriangle : Info;

  return (
    <div
      className={cn(
        "fixed bottom-24 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] gap-4 rounded border bg-white p-4 text-[#1a1c1c] shadow-[0_16px_40px_rgba(26,32,44,0.16)]",
        kind === "success" && "border-[#82c79d]",
        kind === "error" && "border-[#ffb4ab]",
        kind === "info" && "border-[#a5c8ff]"
      )}
      role="status"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#0e3b69]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {message ? <p className="mt-1 text-sm text-[#43474f]">{message}</p> : null}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        className="h-6 w-6 text-[#43474f] hover:text-[#1a1c1c]"
        onClick={onClose}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
