import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm border text-[12px] font-medium leading-none whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "border-line bg-bg-subtle text-ink-muted",
        accent: "border-line bg-accent-soft text-accent-ink",
        outline: "border-line-strong bg-transparent text-ink",
        positive: "border-line bg-bg-subtle text-positive",
        negative: "border-line bg-bg-subtle text-negative",
        warning: "border-line bg-bg-subtle text-warning",
        info: "border-line bg-bg-subtle text-info",
      },
      size: {
        sm: "h-5 px-2",
        default: "h-6 px-2.5",
      },
    },
    defaultVariants: { variant: "neutral", size: "default" },
  },
);

export function Badge({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { badgeVariants };
