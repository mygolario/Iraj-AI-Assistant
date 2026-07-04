"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster
        theme="system"
        position="bottom-right"
        closeButton
        toastOptions={{
          style: {
            background: "var(--bg-elevated)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-3)",
          },
        }}
      />
    </ThemeProvider>
  );
}
