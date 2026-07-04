"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { IconGlobe } from "@/components/ui/icons";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const toggle = () => {
    const next = locale === "en" ? "fa" : "en";
    router.replace(pathname, { locale: next });
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-card px-2.5 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:bg-bg-subtle hover:text-ink"
      title={locale === "en" ? "Switch to Farsi" : "Switch to English"}
    >
      <IconGlobe className="size-3.5" />
      {locale === "en" ? "FA" : "EN"}
    </button>
  );
}
