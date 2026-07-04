"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { IconCopilot } from "@/components/ui/icons";

export function CopilotFab() {
  const t = useTranslations();
  const pathname = usePathname();
  const locale = useLocale();
  const isChat =
    pathname.startsWith(`/${locale}/chat`) || pathname === "/chat";
  if (isChat) return null;

  return (
    <Link
      href="/chat"
      className="fixed bottom-6 end-6 z-40 flex items-center gap-2 rounded-sm border border-line bg-card py-2.5 ps-3 pe-4 text-sm font-medium text-ink shadow-[var(--shadow-2)] transition-colors hover:bg-bg-subtle hover:text-accent"
    >
      <span className="flex size-7 items-center justify-center rounded-sm bg-accent-soft text-accent">
        <IconCopilot className="size-4" />
      </span>
      {t("fab.ask_copilot")}
    </Link>
  );
}
