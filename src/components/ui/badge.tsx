import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "gradient-bg text-white",
        secondary: "bg-surface border border-border text-foreground",
        outline: "border border-border text-foreground",
        muted: "bg-muted text-foreground/70",
        gold: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
        silver: "bg-slate-400/20 text-slate-300 border border-slate-400/30",
        bronze: "bg-orange-600/20 text-orange-400 border border-orange-600/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
