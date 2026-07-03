"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { getNavItems } from "./nav-config";
import { cn } from "@/lib/utils";

function Brand({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations();
  return (
    <Link href="/" className="flex items-center gap-3 px-2 py-1">
      <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-[0_4px_14px_-4px_rgba(99,102,241,0.7)]">
        <span className="font-display text-lg font-extrabold text-white">I</span>
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-accent shadow-[0_0_8px_2px_rgba(34,211,238,0.6)]" />
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="font-display text-sm font-bold tracking-tight text-foreground">
            {t("sidebar.brand")}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("sidebar.subtitle")}
          </span>
        </div>
      )}
    </Link>
  );
}

function NavLinks({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const locale = useLocale();
  const items = getNavItems(t);

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const href = item.href;
        const active =
          href === "/"
            ? pathname === `/${locale}` || pathname === "/"
            : pathname.startsWith(`/${locale}${href}`) || pathname.startsWith(href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-white/[0.06] text-foreground"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              collapsed && "justify-center",
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary to-secondary" />
            )}
            <Icon
              className={cn(
                "size-[18px] shrink-0 transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground",
              )}
            />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const t = useTranslations();
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.06] bg-black/20 backdrop-blur-xl transition-[width] duration-300 lg:flex",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between px-3">
        <Brand collapsed={collapsed} />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <NavLinks collapsed={collapsed} />
      </div>
      <div className="border-t border-white/[0.06] p-3">
        <button
          onClick={onToggleCollapse}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-[18px] mx-auto" />
          ) : (
            <>
              <PanelLeftClose className="size-[18px]" />
              <span>{t("common.collapse")}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-[#0c0c14]/95 backdrop-blur-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left">
          <div className="flex h-16 items-center justify-between pr-3">
            <Brand collapsed={false} />
            <Dialog.Close className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2">
            <NavLinks collapsed={false} onNavigate={() => onOpenChange(false)} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
