"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-emerald-700",
        secondary: "bg-zinc-900 text-white hover:bg-zinc-800 focus-visible:outline-zinc-900",
        ghost: "bg-transparent text-zinc-800 hover:bg-zinc-100 focus-visible:outline-zinc-500",
        danger: "bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700",
        outline: "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 focus-visible:outline-zinc-500"
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
