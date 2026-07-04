"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { IconMoon, IconSun } from "@/components/ui/icons";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch: next-themes resolves client-side only.
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-card px-2.5 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:bg-bg-subtle hover:text-ink"
      title={isDark ? "Switch to light" : "Switch to dark"}
      aria-label="Toggle color theme"
      suppressHydrationWarning
    >
      {mounted ? (
        isDark ? (
          <IconSun className="size-3.5" />
        ) : (
          <IconMoon className="size-3.5" />
        )
      ) : (
        <IconMoon className="size-3.5" />
      )}
    </button>
  );
}
