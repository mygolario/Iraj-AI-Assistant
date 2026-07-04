import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Panel — a structural surface container.
 * Use `tone="subtle"` for recessed areas (table bodies, code wells),
 * `tone="elevated"` (default) for raised cards, `tone="sunken"` for inputs.
 */
function Panel({
  className,
  tone = "elevated",
  ...props
}: React.ComponentProps<"div"> & {
  tone?: "elevated" | "subtle" | "sunken";
}) {
  const toneClass = {
    elevated: "bg-card border-line shadow-[var(--shadow-1)]",
    subtle: "bg-bg-subtle border-line",
    sunken: "bg-bg-sunken border-line",
  }[tone];

  return (
    <div
      data-slot="panel"
      className={cn("rounded-md border", toneClass, className)}
      {...props}
    />
  );
}

function PanelHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-header"
      className={cn(
        "flex items-center justify-between gap-4 border-b border-line px-6 py-4",
        className,
      )}
      {...props}
    />
  );
}

function PanelTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-title"
      className={cn("font-display text-base leading-tight text-ink", className)}
      {...props}
    />
  );
}

function PanelBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="panel-body" className={cn("p-6", className)} {...props} />
  );
}

export { Panel, PanelHeader, PanelTitle, PanelBody };
