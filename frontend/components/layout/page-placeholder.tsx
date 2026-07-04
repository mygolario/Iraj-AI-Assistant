import { cn } from "@/lib/utils";
import type { IconComponent } from "@/components/ui/icons";

export function PagePlaceholder({
  title,
  description,
  icon: Icon,
  phase,
}: {
  title: string;
  description: string;
  icon: IconComponent;
  phase: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-md border border-line bg-card p-10 text-center shadow-[var(--shadow-1)]">
      <div className="flex size-14 items-center justify-center rounded-sm border border-line bg-bg-subtle text-accent">
        <Icon className="size-7" />
      </div>
      <h2 className="mt-5 font-display text-2xl leading-tight tracking-tight text-ink">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm text-ink-muted">{description}</p>
      <span
        className={cn(
          "mt-5 inline-flex items-center gap-1.5 rounded-sm border border-line bg-bg-subtle px-3 py-1 text-[12px] font-medium text-ink-muted",
        )}
      >
        <span className="size-1.5 animate-pulse rounded-full bg-accent" />
        {phase}
      </span>
    </div>
  );
}
