"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { IconMenu, IconDatabase, IconActivity, IconKey } from "@/components/ui/icons";
import { getNavItems } from "./nav-config";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { api } from "@/lib/api";
import type { SystemHealth } from "@/lib/types";
import { cn } from "@/lib/utils";

function usePageTitle(pathname: string, locale: string) {
  const t = useTranslations();
  const items = getNavItems(t);
  const item = items.find((i) => {
    const href = i.href;
    return href === "/"
      ? pathname === `/${locale}` || pathname === "/"
      : pathname.startsWith(`/${locale}${href}`) || pathname.startsWith(href);
  });
  return item ?? { label: t("nav.dashboard"), description: "" };
}

function HealthBadges() {
  const t = useTranslations();
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      api
        .health()
        .then((h) => active && setHealth(h))
        .catch(() => active && setHealth(null));
    load();
    const id = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const keyOk = health?.api_key_configured ?? false;

  return (
    <div className="hidden items-center gap-2 md:flex">
      <span className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-card px-2.5 py-1.5 text-[12px] font-medium text-ink-muted">
        <IconDatabase className="size-3.5 text-ink-subtle" />
        {t("header.rag")}
        <span className="font-semibold text-ink tabular-nums">
          {health?.rag_records ?? "—"}
        </span>
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-card px-2.5 py-1.5 text-[12px] font-medium text-ink-muted">
        <IconActivity className="size-3.5 text-ink-subtle" />
        {t("header.cache")}
        <span className="font-semibold text-ink tabular-nums">
          {health?.cache_count ?? "—"}
        </span>
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-sm border border-line bg-card px-2.5 py-1.5 text-[12px] font-medium",
          keyOk ? "text-positive" : "text-negative",
        )}
        title={keyOk ? t("header.ai_key_ok") : t("header.ai_key_missing")}
      >
        <IconKey className="size-3.5" />
        {t("header.ai")}
        <span
          className={cn(
            "size-1.5 rounded-full",
            keyOk ? "bg-positive" : "bg-negative",
          )}
        />
      </span>
    </div>
  );
}

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const { label, description } = usePageTitle(pathname, locale);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-background px-4 md:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-sm p-2 text-ink-muted transition-colors hover:bg-bg-subtle hover:text-ink lg:hidden"
        aria-label={t("header.open_menu")}
      >
        <IconMenu className="size-5" />
      </button>
      <div className="flex flex-col">
        <h1 className="font-display text-xl leading-tight tracking-tight text-ink">
          {label}
        </h1>
        {description && (
          <span className="mt-0.5 hidden text-[13px] text-ink-muted sm:block">
            {description}
          </span>
        )}
      </div>
      <div className="ms-auto flex items-center gap-3">
        <ThemeToggle />
        <LanguageSwitcher />
        <HealthBadges />
      </div>
    </header>
  );
}
