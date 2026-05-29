"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    disabled,
    fullWidth = false,
    loading = false,
    loadingLabel,
    size = "md",
    variant = "primary",
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded border font-medium tracking-[0.04em] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2c5282] focus:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55",
        size === "sm" && "min-h-8 px-3 py-1.5 text-[12px]",
        size === "md" && "min-h-9 px-4 py-2 text-[13px]",
        size === "lg" && "min-h-11 px-5 py-2.5 text-sm",
        fullWidth && "w-full",
        variant === "primary" && "border-[#2c5282] bg-[#2c5282] text-white hover:bg-[#23466f]",
        variant === "secondary" &&
          "border-[#c3c6d0] bg-[#f9f9f9] text-[#0e3b69] hover:bg-white",
        variant === "ghost" &&
          "border-transparent bg-transparent text-[#0e3b69] hover:bg-[#eef4ff]",
        variant === "danger" && "border-[#b42318] bg-[#b42318] text-white hover:bg-[#8f1d15]",
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
      ) : null}
      {loading ? loadingLabel ?? children : children}
    </button>
  );
});
