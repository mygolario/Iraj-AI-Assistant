"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { IconPanelCollapse, IconPanelExpand, IconClose } from "@/components/ui/icons";
import { getNavItems } from "./nav-config";
import { cn } from "@/lib/utils";

function Brand({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations();
  return (
    <Link href="/" className="flex items-center gap-3 px-2 py-1">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-line-strong bg-card shadow-[var(--shadow-1)]">
        <span className="font-display text-lg leading-none text-accent">I</span>
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="font-display text-sm leading-tight tracking-tight text-ink">
            {t("sidebar.brand")}
          </span>
          <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-subtle">
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
    <nav className="flex flex-col gap-0.5">
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
              "group relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors duration-150",
              active
                ? "bg-accent-soft text-accent-ink"
                : "text-ink-muted hover:bg-bg-subtle hover:text-ink",
              collapsed && "justify-center",
            )}
          >
            {active && (
              <span
                aria-hidden
                className="absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-accent"
              />
            )}
            <Icon
              className={cn(
                "size-[18px] shrink-0 transition-colors",
                active ? "text-accent" : "text-ink-subtle group-hover:text-ink",
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
        "sticky top-0 hidden h-screen shrink-0 flex-col border-e border-line bg-bg-subtle transition-[width] duration-300 lg:flex",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className="flex h-16 items-center border-b border-line px-3">
        <Brand collapsed={collapsed} />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks collapsed={collapsed} />
      </div>
      <div className="border-t border-line p-3">
        <button
          onClick={onToggleCollapse}
          className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-bg-subtle hover:text-ink"
        >
          {collapsed ? (
            <IconPanelExpand className="size-[18px] mx-auto" />
          ) : (
            <>
              <IconPanelCollapse className="size-[18px]" />
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-y-0 start-0 z-50 flex w-72 flex-col border-e border-line bg-bg-subtle shadow-[var(--shadow-3)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left">
          <div className="flex h-16 items-center justify-between border-b border-line pe-3">
            <Brand collapsed={false} />
            <Dialog.Close className="rounded-sm p-2 text-ink-muted transition-colors hover:bg-bg-elevated hover:text-ink">
              <IconClose className="size-5" />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <NavLinks collapsed={false} onNavigate={() => onOpenChange(false)} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
