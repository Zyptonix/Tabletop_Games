"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 focus-visible:outline-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.38)]",
        secondary: "border border-emerald-400/40 bg-[#101c1a] text-emerald-100 hover:bg-[#12231f] focus-visible:outline-emerald-400",
        ghost: "bg-transparent text-emerald-50 hover:bg-emerald-500/14 focus-visible:outline-emerald-400",
        danger: "bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700",
        outline: "border border-emerald-400/60 bg-[#0b1217] text-emerald-50 hover:bg-[#11211d] hover:border-emerald-300 focus-visible:outline-emerald-400"
      },
      size: {
        sm: "min-h-9 px-3 text-xs",
        md: "min-h-11 px-4",
        lg: "min-h-12 px-5 text-base",
        icon: "h-11 w-11 px-0"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
