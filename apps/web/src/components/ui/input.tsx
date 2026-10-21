import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "min-h-11 w-full rounded-md border border-emerald-500/30 bg-[#081118] px-3 py-2 text-sm text-emerald-50 outline-none transition placeholder:text-emerald-100/45 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
