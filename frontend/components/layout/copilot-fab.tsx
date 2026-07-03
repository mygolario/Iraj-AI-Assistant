"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function CopilotFab() {
  const pathname = usePathname();
  if (pathname.startsWith("/chat")) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 400, damping: 22 }}
      className="fixed bottom-6 right-6 z-40"
    >
      <Link
        href="/chat"
        className="glow-violet group flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary py-3 pl-3 pr-4 text-sm font-semibold text-white shadow-[0_8px_30px_-6px_rgba(139,92,246,0.6)] transition-transform hover:-translate-y-0.5"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-white/20">
          <Sparkles className="size-4" />
        </span>
        Ask AI Copilot
      </Link>
    </motion.div>
  );
}
