"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-[15px] leading-7 text-ink",
        "[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4",
        "[&_blockquote]:border-s-2 [&_blockquote]:border-line-strong [&_blockquote]:ps-4 [&_blockquote]:text-ink-muted",
        "[&_code]:rounded-sm [&_code]:bg-bg-sunken [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px]",
        "[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:font-display [&_h1]:text-2xl [&_h1]:leading-tight [&_h1]:tracking-tight [&_h1]:text-ink",
        "[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:leading-tight [&_h2]:tracking-tight [&_h2]:text-ink",
        "[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-lg [&_h3]:text-ink",
        "[&_li]:ms-5 [&_li]:list-disc",
        "[&_p]:my-2",
        "[&_strong]:font-semibold [&_strong]:text-ink",
        "[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
        "[&_td]:border [&_td]:border-line [&_td]:px-3 [&_td]:py-1.5",
        "[&_th]:border [&_th]:border-line [&_th]:bg-bg-subtle [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-start [&_th]:font-semibold [&_th]:text-ink",
        "[&_ul]:my-2 [&_ul]:list-disc",
        "[&_ol]:my-2 [&_ol]:list-decimal",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
