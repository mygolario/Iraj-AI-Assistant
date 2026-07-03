"use client";

import * as React from "react";
import { Sidebar, MobileSidebar } from "./sidebar";
import { Header } from "./header";
import { PriceTicker } from "./price-ticker";
import { CopilotFab } from "./copilot-fab";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(() => {
    try { return localStorage.getItem("iraj-sidebar-collapsed") === "1"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const toggleCollapse = React.useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("iraj-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <div className="sticky top-16 z-20 border-b border-white/[0.04] bg-[#08080d]/60 px-4 py-2 backdrop-blur-md md:px-6">
          <PriceTicker />
        </div>
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
      <CopilotFab />
    </div>
  );
}
