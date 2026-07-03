"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  FileText,
  Map,
  Loader2,
  Download,
  Sparkles,
  PenLine,
  Route,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, downloadText } from "@/lib/utils";
import { Markdown } from "@/components/ui/markdown";

const CONTRACT_GRADES = [
  "DIN B500B",
  "ASTM A615 Grade 60",
  "JIS G3112 SD390",
  "A3",
  "A4",
  "GB/T 1499.2 HRB400",
];

type Tab = "contract" | "roadmap";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/20";

function ContractDrafter() {
  const [buyer, setBuyer] = React.useState("");
  const [seller, setSeller] = React.useState("");
  const [grade, setGrade] = React.useState(CONTRACT_GRADES[0]);
  const [tonnage, setTonnage] = React.useState(250);
  const [price, setPrice] = React.useState(550);
  const [md, setMd] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const generate = async () => {
    if (!buyer.trim() || !seller.trim()) {
      toast.error("Buyer and seller names are required");
      return;
    }
    setLoading(true);
    setMd("");
    try {
      const res = await api.sales.contract({
        buyer,
        seller,
        rebar_grade: grade,
        tonnage,
        price_per_ton: price,
      });
      setMd(res.markdown);
      toast.success("Contract drafted");
    } catch (e) {
      toast.error("Contract generation failed", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <div className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <PenLine className="size-4 text-primary" />
          <h3 className="font-display text-sm font-semibold">Contract Details</h3>
        </div>
        <div className="grid gap-3">
          <Field label="Buyer Company">
            <input className={inputCls} value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Buyer name" />
          </Field>
          <Field label="Seller Company">
            <input className={inputCls} value={seller} onChange={(e) => setSeller(e.target.value)} placeholder="Seller name" />
          </Field>
          <Field label="Rebar Grade">
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className={cn(inputCls, "cursor-pointer")}>
              {CONTRACT_GRADES.map((g) => (
                <option key={g} value={g} className="bg-[#12121d]">{g}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tonnage (t)">
              <input type="number" min={1} className={inputCls} value={tonnage} onChange={(e) => setTonnage(Number(e.target.value) || 0)} />
            </Field>
            <Field label="Unit Price ($/t)">
              <input type="number" min={1} className={inputCls} value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
            </Field>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="mt-1 flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading ? "Drafting…" : "Generate Contract"}
          </button>
        </div>
      </div>

      <div className="glass gradient-border rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold">Formatted Draft</h3>
          {md && (
            <button
              onClick={() => downloadText(`Sales_Contract_${buyer.replace(/\s+/g, "_")}.md`, md)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/5"
            >
              <Download className="size-3.5" />
              Download .md
            </button>
          )}
        </div>
        {loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-white/[0.04]" style={{ width: `${90 - i * 12}%` }} />
            ))}
          </div>
        ) : md ? (
          <Markdown>{md}</Markdown>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Fill in the details and generate a contract draft.
          </p>
        )}
      </div>
    </div>
  );
}

function RoadmapGenerator() {
  const [company, setCompany] = React.useState("");
  const [market, setMarket] = React.useState("");
  const [md, setMd] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const generate = async () => {
    if (!company.trim() || !market.trim()) {
      toast.error("Company and target market are required");
      return;
    }
    setLoading(true);
    setMd("");
    try {
      const res = await api.sales.roadmap({ company_name: company, target_market: market });
      setMd(res.markdown);
      toast.success("Roadmap generated");
    } catch (e) {
      toast.error("Roadmap generation failed", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <div className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <Route className="size-4 text-secondary" />
          <h3 className="font-display text-sm font-semibold">Roadmap Inputs</h3>
        </div>
        <div className="grid gap-3">
          <Field label="Company Name">
            <input className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your company" />
          </Field>
          <Field label="Target Market">
            <input className={inputCls} value={market} onChange={(e) => setMarket(e.target.value)} placeholder="e.g. Southern regional construction" />
          </Field>
          <button
            onClick={generate}
            disabled={loading}
            className="mt-1 flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-secondary to-primary text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading ? "Compiling…" : "Compile Roadmap"}
          </button>
        </div>
      </div>

      <div className="glass gradient-border rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold">Transformation Roadmap</h3>
          {md && (
            <button
              onClick={() => downloadText(`Sales_Roadmap_${company.replace(/\s+/g, "_")}.md`, md)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/5"
            >
              <Download className="size-3.5" />
              Download .md
            </button>
          )}
        </div>
        {loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-white/[0.04]" style={{ width: `${90 - i * 12}%` }} />
            ))}
          </div>
        ) : md ? (
          <Markdown>{md}</Markdown>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Enter your company and target market to compile a roadmap.
          </p>
        )}
      </div>
    </div>
  );
}

export function SalesPage() {
  const [tab, setTab] = React.useState<Tab>("contract");
  const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: "contract", label: "Contract Drafter", icon: FileText },
    { id: "roadmap", label: "Sales Roadmap", icon: Map },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="glass inline-flex w-fit gap-1 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === t.id && (
              <motion.span
                layoutId="sales-tab"
                className="absolute inset-0 rounded-lg bg-white/[0.06] ring-1 ring-white/10"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <t.icon className="relative size-4" />
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {tab === "contract" ? <ContractDrafter /> : <RoadmapGenerator />}
      </motion.div>
    </div>
  );
}
