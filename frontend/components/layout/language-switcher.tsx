"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Globe } from "lucide-react";

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
      className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
      title={locale === "en" ? "Switch to Farsi" : "Switch to English"}
    >
      <Globe className="size-3.5" />
      {locale === "en" ? "FA" : "EN"}
    </button>
  );
}
