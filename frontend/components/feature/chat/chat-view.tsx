"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import {
  IconSend,
  IconCopilot,
  IconStop,
  IconTrash,
  IconUser,
  IconBot,
} from "@/components/ui/icons";
import { api } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/markdown";

export function ChatView() {
  const t = useTranslations("chat");
  const tc = useTranslations("common");
  const locale = useLocale();

  const initialChat: ChatMessage[] = React.useMemo(
    () => [{ role: "assistant" as const, content: locale === "fa" ? t("initial_message_fa") : t("initial_message_en") }],
    [locale, t],
  );

  const suggestions = React.useMemo(
    () => [t("suggestion_1"), t("suggestion_2"), t("suggestion_3"), t("suggestion_4")],
    [t],
  );

  const [messages, setMessages] = React.useState<ChatMessage[]>(initialChat);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("iraj-chat");
      if (saved) setMessages(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem("iraj-chat", JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;

    const userMsg: ChatMessage = { role: "user", content };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let acc = "";
      for await (const token of api.chat.stream({ messages: history, language: locale }, controller.signal)) {
        acc += token;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      }
      if (!acc.trim()) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: t("empty_response"),
          };
          return next;
        });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: `${tc("error_prefix")}${(e as Error).message}`,
          };
          return next;
        });
        toast.error(t("error_title"), { description: (e as Error).message });
      } else {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last.role === "assistant" && !last.content) {
            next.pop();
          }
          return next;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const clear = () => {
    setMessages(initialChat);
    localStorage.removeItem("iraj-chat");
  };

  return (
    <div className="flex h-[calc(100dvh-13rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-sm border border-line bg-bg-subtle text-accent">
            <IconCopilot className="size-4" />
          </div>
          <div>
            <h2 className="font-display text-base leading-tight tracking-tight text-ink">{t("title")}</h2>
            <span className="text-[12px] text-ink-muted">{t("subtitle")}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={clear}>
          <IconTrash className="size-3.5" />
          {tc("clear")}
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-md border border-line bg-card p-4 shadow-[var(--shadow-1)]"
      >
        <div className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-sm border border-line",
                    msg.role === "user"
                      ? "bg-bg-subtle text-ink"
                      : "bg-accent-soft text-accent",
                  )}
                >
                  {msg.role === "user" ? <IconUser className="size-4" /> : <IconBot className="size-4" />}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-md border px-4 py-3",
                    msg.role === "user"
                      ? "border-line bg-bg-subtle"
                      : "border-line bg-bg-subtle",
                  )}
                >
                  {msg.role === "assistant" ? (
                    msg.content ? (
                      <Markdown>{msg.content}</Markdown>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm text-ink-muted">
                        <span className="size-2 animate-bounce rounded-full bg-ink-subtle [animation-delay:-0.3s]" />
                        <span className="size-2 animate-bounce rounded-full bg-ink-subtle [animation-delay:-0.15s]" />
                        <span className="size-2 animate-bounce rounded-full bg-ink-subtle" />
                      </span>
                    )
                  ) : (
                    <p className="text-sm text-ink">{msg.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-sm border border-line bg-card px-3 py-1.5 text-[13px] text-ink-muted transition-colors hover:bg-bg-subtle hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 rounded-md border border-line bg-card p-2 shadow-[var(--shadow-1)]"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={t("placeholder")}
          className="max-h-32 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink outline-none placeholder:text-ink-subtle"
        />
        {streaming ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={stop}
            className="text-negative hover:bg-bg-subtle"
          >
            <IconStop className="size-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim()}
          >
            <IconSend className="size-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
