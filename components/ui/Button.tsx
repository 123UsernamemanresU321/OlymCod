"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex min-h-9 items-center justify-center gap-2 rounded border px-4 py-2 text-[13px] font-medium tracking-[0.04em] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2c5282] focus:ring-offset-2",
        variant === "primary" && "border-[#2c5282] bg-[#2c5282] text-white hover:bg-[#23466f]",
        variant === "secondary" &&
          "border-[#c3c6d0] bg-[#f9f9f9] text-[#0e3b69] hover:bg-white",
        variant === "ghost" &&
          "border-transparent bg-transparent text-[#0e3b69] hover:bg-[#eef4ff]",
        variant === "danger" && "border-[#b42318] bg-[#b42318] text-white hover:bg-[#8f1d15]",
        className
      )}
      {...props}
    />
  );
});
