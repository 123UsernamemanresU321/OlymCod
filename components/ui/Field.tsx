import { cn } from "@/lib/utils/cn";

interface FieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  description?: string;
  error?: string | null;
  required?: boolean;
}

export function Field({ label, children, className, description, error, required = false }: FieldProps) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="text-[13px] font-medium uppercase tracking-[0.05em] text-[#43474f]">
        {label}
        {required ? <span className="ml-1 text-[#8f1d15]">*</span> : null}
      </span>
      {children}
      {description ? <span className="text-xs leading-5 text-[#5d6470]">{description}</span> : null}
      {error ? <span className="text-xs leading-5 text-[#8f1d15]">{error}</span> : null}
    </label>
  );
}

export function inputClassName(className?: string) {
  return cn(
    "min-h-10 w-full rounded border border-[#c3c6d0] bg-[#f9f9f9] px-3 py-2 text-base text-[#1a1c1c] outline-none transition focus:border-[#2c5282] focus:ring-2 focus:ring-[#a5c8ff]",
    className
  );
}
