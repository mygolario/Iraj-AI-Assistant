import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function PagePlaceholder({
  title,
  description,
  icon: Icon,
  phase,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  phase: string;
}) {
  return (
    <div className="glass gradient-border flex min-h-[60vh] flex-col items-center justify-center rounded-2xl p-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Icon className="size-7" />
      </div>
      <h2 className="mt-5 font-display text-2xl font-bold tracking-tight">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      <span
        className={cn(
          "mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground",
        )}
      >
        <span className="size-1.5 animate-pulse rounded-full bg-accent" />
        {phase}
      </span>
    </div>
  );
}
