"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Send,
  Sparkles,
  Square,
  Trash2,
  User,
  Bot,
} from "lucide-react";
import { api, INITIAL_CHAT } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/markdown";

const SUGGESTIONS = [
  "What are the yield strength specs for ASTM A615 Grade 60?",
  "Summarize the latest live market prices",
  "Draft a sales strategy for Southern regional contractors",
  "How do I improve my deal profit margins?",
];

export function ChatView() {
  const [messages, setMessages] = React.useState<ChatMessage[]>(INITIAL_CHAT);
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
      for await (const token of api.chat.stream({ messages: history }, controller.signal)) {
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
            content: "I couldn't generate a response. Please try again.",
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
            content: `⚠️ Error: ${(e as Error).message}`,
          };
          return next;
        });
        toast.error("Copilot error", { description: (e as Error).message });
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
    setMessages(INITIAL_CHAT);
    localStorage.removeItem("iraj-chat");
  };

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
            <Sparkles className="size-4 text-white" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold leading-none">AI Sales Copilot</h2>
            <span className="text-[11px] text-muted-foreground">
              Context-aware · RAG + live prices injected
            </span>
          </div>
        </div>
        <button
          onClick={clear}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <Trash2 className="size-3.5" />
          Clear
        </button>
      </div>

      <div
        ref={scrollRef}
        className="glass flex-1 overflow-y-auto rounded-2xl p-4"
      >
        <div className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    msg.role === "user"
                      ? "bg-primary/15 text-primary"
                      : "bg-secondary/15 text-secondary",
                  )}
                >
                  {msg.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    msg.role === "user"
                      ? "rounded-tr-sm border border-primary/30 bg-primary/[0.06]"
                      : "rounded-tl-sm border border-secondary/30 bg-secondary/[0.06]",
                  )}
                >
                  {msg.role === "assistant" ? (
                    msg.content ? (
                      <Markdown>{msg.content}</Markdown>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <span className="size-2 animate-bounce rounded-full bg-secondary [animation-delay:-0.3s]" />
                        <span className="size-2 animate-bounce rounded-full bg-secondary [animation-delay:-0.15s]" />
                        <span className="size-2 animate-bounce rounded-full bg-secondary" />
                      </span>
                    )
                  ) : (
                    <p className="text-sm text-foreground">{msg.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="glass rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
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
        className="glass flex items-end gap-2 rounded-2xl p-2"
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
          placeholder="Ask about specs, prices, margins, or strategy…"
          className="max-h-32 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {streaming ? (
          <button
            type="button"
            onClick={stop}
            className="flex size-10 items-center justify-center rounded-xl bg-destructive/15 text-destructive transition-colors hover:bg-destructive/25"
          >
            <Square className="size-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
          >
            <Send className="size-4" />
          </button>
        )}
      </form>
    </div>
  );
}
