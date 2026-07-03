"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Menu, Database, Activity, KeyRound } from "lucide-react";
import { getNavItems } from "./nav-config";
import { LanguageSwitcher } from "./language-switcher";
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
      <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <Database className="size-3.5 text-secondary" />
        {t("header.rag")}
        <span className="font-semibold text-foreground">
          {health?.rag_records ?? "—"}
        </span>
      </span>
      <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <Activity className="size-3.5 text-primary" />
        {t("header.cache")}
        <span className="font-semibold text-foreground">
          {health?.cache_count ?? "—"}
        </span>
      </span>
      <span
        className={cn(
          "glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
          keyOk ? "text-success" : "text-destructive",
        )}
        title={keyOk ? t("header.ai_key_ok") : t("header.ai_key_missing")}
      >
        <KeyRound className="size-3.5" />
        {t("header.ai")}
        <span className={cn("size-1.5 rounded-full", keyOk ? "bg-success" : "bg-destructive", "animate-pulse")} />
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-[#08080d]/70 px-4 backdrop-blur-xl md:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground lg:hidden"
        aria-label={t("header.open_menu")}
      >
        <Menu className="size-5" />
      </button>
      <div className="flex flex-col">
        <h1 className="font-display text-lg font-bold leading-none tracking-tight text-foreground">
          {label}
        </h1>
        {description && (
          <span className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
            {description}
          </span>
        )}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <LanguageSwitcher />
        <HealthBadges />
      </div>
    </header>
  );
}
